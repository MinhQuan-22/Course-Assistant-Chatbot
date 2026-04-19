import json
import io
import openpyxl

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from .auth_utils import decode_jwt_token, hash_password
from .models import (
    User, Subject, ClassSection, TeacherProfile, StudentProfile,
    TeachingAssignment, Enrollment, ImportBatch, ImportBatchError
)
from .views_admin import _get_admin, _auto_create_profile


@csrf_exempt
@require_http_methods(["POST"])
def admin_import_excel(request, entity_type):
    admin, err = _get_admin(request)
    if err:
        return err

    valid_entities = ['users', 'subjects', 'class_sections', 'teaching_assignments', 'enrollments']
    if entity_type not in valid_entities:
        return JsonResponse({"error": f"Invalid entity_type. Must be one of {valid_entities}"}, status=400)

    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    filename = uploaded.name.lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        return JsonResponse({"error": "Only .xlsx / .xls files are supported"}, status=400)

    # Create ImportBatch record
    batch = ImportBatch.objects.create(
        entity_type=entity_type,
        file_name=uploaded.name,
        uploaded_by=admin,
        status='processing',
        started_at=timezone.now()
    )

    success_count = 0
    failed_count = 0
    errors = []

    try:
        wb = openpyxl.load_workbook(file=io.BytesIO(uploaded.read()), read_only=True, data_only=True)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            raise ValueError("Excel file is empty or missing data rows")

        # Normalize headers
        raw_headers = [str(h).strip().lower() if h is not None else "" for h in rows[0]]
        col = {h: i for i, h in enumerate(raw_headers)}

        def get_val(row, field):
            v = row[col[field]] if field in col else None
            return str(v).strip() if v is not None else ""

        # Process rows - each row catches its own error (no global rollback)
        for row_idx, row in enumerate(rows[1:], start=2):
            if all(c is None for c in row):
                continue  # skip empty rows

            try:
                with transaction.atomic():
                    if entity_type == 'users':
                        _import_user(row, col, get_val)
                    elif entity_type == 'subjects':
                        _import_subject(row, col, get_val)
                    elif entity_type == 'class_sections':
                        _import_class_section(row, col, get_val)
                    elif entity_type == 'teaching_assignments':
                        _import_teaching_assignment(row, col, get_val)
                    elif entity_type == 'enrollments':
                        _import_enrollment(row, col, get_val)

                success_count += 1

            except Exception as ex:
                failed_count += 1
                err_msg = str(ex)
                errors.append({"row": row_idx, "error": err_msg})
                ImportBatchError.objects.create(
                    batch=batch,
                    row_number=row_idx,
                    error_message=err_msg,
                    raw_payload={h: str(row[i]) for i, h in enumerate(raw_headers) if i < len(row)}
                )

        # Update batch completion
        batch.total_rows = success_count + failed_count
        batch.success_rows = success_count
        batch.failed_rows = failed_count
        batch.status = 'completed' if failed_count == 0 else 'failed'
        batch.finished_at = timezone.now()
        batch.save()

        return JsonResponse({
            "message": "Import finished",
            "batch_id": batch.id,
            "status": batch.status,
            "total": batch.total_rows,
            "success": batch.success_rows,
            "failed": batch.failed_rows,
            "errors": errors
        }, status=200)

    except Exception as e:
        batch.status = 'failed'
        batch.finished_at = timezone.now()
        batch.save()
        return JsonResponse({"error": f"Failed to process file: {str(e)}"}, status=500)


def _import_user(row, col, get_val):
    required = {"name", "email", "password", "role"}
    if not required.issubset(set(col.keys())):
        raise ValueError(f"Missing headers. Required: {', '.join(required)}")

    name = get_val(row, "name")
    email = get_val(row, "email")
    password = get_val(row, "password")
    role = get_val(row, "role")
    username = get_val(row, "username") or None

    if not name or not email or not password:
        raise ValueError("name/email/password required")
    if role not in ("student", "teacher", "admin"):
        raise ValueError(f"Invalid role '{role}'")
    if User.objects.filter(email=email).exists():
        raise ValueError(f"Email {email} already exists")
    if username and User.objects.filter(username=username).exists():
        raise ValueError(f"Username {username} already exists")

    # Build profile body from excel columns
    profile_body = {
        'teacher_code': get_val(row, 'teacher_code'),
        'department': get_val(row, 'department'),
        'title': get_val(row, 'title'),
        'student_code': get_val(row, 'student_code'),
        'major': get_val(row, 'major'),
        'cohort_year': get_val(row, 'cohort_year') or None,
        'class_name': get_val(row, 'class_name'),
    }

    user = User.objects.create(
        name=name, username=username, email=email,
        password=hash_password(password), role=role, is_active=True
    )
    # Auto-create profile
    _auto_create_profile(user, profile_body)


def _import_subject(row, col, get_val):
    required = {"code", "name"}
    if not required.issubset(set(col.keys())):
        raise ValueError(f"Missing headers. Required: {', '.join(required)}")

    code = get_val(row, "code").upper()
    name = get_val(row, "name")
    if not code or not name:
        raise ValueError("code and name required")
    if Subject.objects.filter(code=code).exists():
        raise ValueError(f"Subject code {code} already exists")

    credits_val = get_val(row, "credits")
    credits = int(credits_val) if credits_val.isdigit() else None

    Subject.objects.create(
        code=code, name=name, description=get_val(row, "description") or None,
        credits=credits, is_active=True
    )


def _import_class_section(row, col, get_val):
    required = {"subject_code", "section_code", "semester", "academic_year"}
    if not required.issubset(set(col.keys())):
        raise ValueError(f"Missing headers. Required: {', '.join(required)}")

    subj_code = get_val(row, "subject_code").upper()
    section_code = get_val(row, "section_code")
    semester = get_val(row, "semester")
    academic_year = get_val(row, "academic_year")

    if not all([subj_code, section_code, semester, academic_year]):
        raise ValueError("subject_code, section_code, semester, academic_year required")

    subj = Subject.objects.filter(code=subj_code).first()
    if not subj:
        raise ValueError(f"Subject '{subj_code}' not found")

    if ClassSection.objects.filter(subject=subj, semester=semester, academic_year=academic_year, section_code=section_code).exists():
        raise ValueError("Class section already exists")

    ClassSection.objects.create(
        subject=subj, section_code=section_code, semester=semester, academic_year=academic_year,
        section_name=get_val(row, "section_name") or None, status='active'
    )


def _import_teaching_assignment(row, col, get_val):
    required = {"teacher_code", "subject_code", "section_code", "semester", "academic_year"}
    if not required.issubset(set(col.keys())):
        raise ValueError(f"Missing headers. Required: {', '.join(required)}")

    tc, sc, sec, sem, ay = (
        get_val(row, "teacher_code"), get_val(row, "subject_code"),
        get_val(row, "section_code"), get_val(row, "semester"), get_val(row, "academic_year")
    )
    if not all([tc, sc, sec, sem, ay]):
        raise ValueError("Missing required fields")

    tp = TeacherProfile.objects.filter(teacher_code=tc).first()
    if not tp:
        raise ValueError(f"Teacher '{tc}' not found")

    cs = ClassSection.objects.filter(subject__code=sc, section_code=sec, semester=sem, academic_year=ay).first()
    if not cs:
        raise ValueError(f"ClassSection not found for subject {sc}, sec {sec}, sem {sem}, year {ay}")

    TeachingAssignment.objects.filter(class_section=cs).delete()  # Override existing
    TeachingAssignment.objects.create(class_section=cs, teacher_profile=tp)


def _import_enrollment(row, col, get_val):
    required = {"student_code", "subject_code", "section_code", "semester", "academic_year"}
    if not required.issubset(set(col.keys())):
        raise ValueError(f"Missing headers. Required: {', '.join(required)}")

    stc, sc, sec, sem, ay = (
        get_val(row, "student_code"), get_val(row, "subject_code"),
        get_val(row, "section_code"), get_val(row, "semester"), get_val(row, "academic_year")
    )
    if not all([stc, sc, sec, sem, ay]):
        raise ValueError("Missing required fields")

    sp = StudentProfile.objects.filter(student_code=stc).first()
    if not sp:
        raise ValueError(f"Student '{stc}' not found")

    cs = ClassSection.objects.filter(subject__code=sc, section_code=sec, semester=sem, academic_year=ay).first()
    if not cs:
        raise ValueError(f"ClassSection not found")

    if Enrollment.objects.filter(class_section=cs, student_profile=sp).exists():
        raise ValueError(f"Student '{stc}' already enrolled in this class")

    Enrollment.objects.create(class_section=cs, student_profile=sp, status='enrolled')
