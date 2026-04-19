"""
Admin Academic views:
  Subjects CRUD, ClassSections CRUD,
  TeachingAssignment CRUD, Enrollment CRUD,
  Documents (JWT-based upload/delete, filter by subject),
  System Settings (AI model config),
  ExamSchedules CRUD,
  Announcements CRUD + read-tracking.
"""
import json
import os
import threading

from django.db import transaction, IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .auth_utils import decode_jwt_token
from .models import (
    User, Subject, ClassSection, TeacherProfile, StudentProfile,
    TeachingAssignment, Enrollment, ImportBatch, ImportBatchError,
    Document, SystemSetting, ExamSchedule, Announcement, AnnouncementRead,
)


# ──────────────────────────────────────────────────────
# Shared auth helper
# ──────────────────────────────────────────────────────

def _auth(request, allowed_roles=('admin',)):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, JsonResponse({'error': 'Authorization token required'}, status=401)
    payload = decode_jwt_token(auth.split(' ', 1)[1])
    if not payload:
        return None, JsonResponse({'error': 'Invalid or expired token'}, status=401)
    user = User.objects.filter(id=payload['user_id']).first()
    if not user:
        return None, JsonResponse({'error': 'User not found'}, status=404)
    if user.role not in allowed_roles:
        return None, JsonResponse({'error': f'Access denied. Required: {allowed_roles}'}, status=403)
    return user, None


# ══════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════

def _serialize_subject(s):
    return {
        'id': s.id, 'code': s.code, 'name': s.name,
        'description': s.description, 'credits': s.credits,
        'is_active': s.is_active,
        'created_at': s.created_at.isoformat() if s.created_at else None,
    }


@csrf_exempt
def admin_subjects(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        qs = Subject.objects.all().order_by('code')
        is_active = request.GET.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return JsonResponse([_serialize_subject(s) for s in qs], safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            code = body.get('code', '').strip().upper()
            name = body.get('name', '').strip()
            if not code or not name:
                return JsonResponse({'error': 'code and name are required'}, status=400)
            if Subject.objects.filter(code=code).exists():
                return JsonResponse({'error': 'Subject code already exists'}, status=400)
            credits = body.get('credits')
            s = Subject.objects.create(
                code=code, name=name,
                description=body.get('description', '').strip() or None,
                credits=int(credits) if credits is not None else None,
                is_active=body.get('is_active', True),
            )
            return JsonResponse(_serialize_subject(s), status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_subject_detail(request, subject_id):
    user, err = _auth(request)
    if err:
        return err

    subj = Subject.objects.filter(id=subject_id).first()
    if not subj:
        return JsonResponse({'error': 'Subject not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_serialize_subject(subj))

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
            if 'name' in body:
                subj.name = body['name'].strip()
            if 'description' in body:
                subj.description = body['description'].strip() or None
            if 'credits' in body:
                subj.credits = int(body['credits']) if body['credits'] is not None else None
            if 'is_active' in body:
                subj.is_active = bool(body['is_active'])
            subj.save()
            return JsonResponse(_serialize_subject(subj))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        subj.delete()
        return JsonResponse({'message': 'Subject deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# CLASS SECTIONS
# ══════════════════════════════════════════════════════

def _serialize_section(cs):
    teacher_name = None
    try:
        ta = cs.assignment
        teacher_name = ta.teacher_profile.user.name
    except Exception:
        pass

    student_count = Enrollment.objects.filter(class_section=cs, status='enrolled').count()

    return {
        'id': cs.id,
        'subject_id': cs.subject_id,
        'subject_code': cs.subject.code,
        'subject_name': cs.subject.name,
        'section_code': cs.section_code,
        'semester': cs.semester,
        'academic_year': cs.academic_year,
        'section_name': cs.section_name,
        'starts_at': cs.starts_at.isoformat() if cs.starts_at else None,
        'ends_at': cs.ends_at.isoformat() if cs.ends_at else None,
        'status': cs.status,
        'teacher_name': teacher_name,
        'student_count': student_count,
    }


@csrf_exempt
def admin_class_sections(request):
    user, err = _auth(request, allowed_roles=('admin', 'teacher'))
    if err:
        return err

    if request.method == 'GET':
        subject_id = request.GET.get('subject_id')
        qs = ClassSection.objects.select_related('subject').all().order_by('-id')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return JsonResponse([_serialize_section(cs) for cs in qs], safe=False)

    if user.role != 'admin':
        return JsonResponse({'error': 'Admin access required to mutate'}, status=403)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            subject_id = body.get('subject_id')
            section_code = body.get('section_code', '').strip()
            semester = body.get('semester', '').strip()
            academic_year = body.get('academic_year', '').strip()
            if not all([subject_id, section_code, semester, academic_year]):
                return JsonResponse({'error': 'subject_id, section_code, semester, academic_year are required'}, status=400)
            subj = Subject.objects.filter(id=subject_id).first()
            if not subj:
                return JsonResponse({'error': 'Subject not found'}, status=404)
            cs = ClassSection.objects.create(
                subject=subj,
                section_code=section_code,
                semester=semester,
                academic_year=academic_year,
                section_name=body.get('section_name', '').strip() or None,
                starts_at=body.get('starts_at') or None,
                ends_at=body.get('ends_at') or None,
                status=body.get('status', 'active'),
            )
            return JsonResponse(_serialize_section(cs), status=201)
        except IntegrityError:
            return JsonResponse({'error': 'Class section with this code/semester/year already exists'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_class_section_detail(request, section_id):
    user, err = _auth(request)
    if err:
        return err

    cs = ClassSection.objects.select_related('subject').filter(id=section_id).first()
    if not cs:
        return JsonResponse({'error': 'Class section not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_serialize_section(cs))

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
            if 'section_name' in body:
                cs.section_name = body['section_name'].strip() or None
            if 'status' in body:
                cs.status = body['status']
            if 'starts_at' in body:
                cs.starts_at = body['starts_at'] or None
            if 'ends_at' in body:
                cs.ends_at = body['ends_at'] or None
            cs.save()
            return JsonResponse(_serialize_section(cs))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        cs.delete()
        return JsonResponse({'message': 'Class section deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# TEACHING ASSIGNMENTS
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_teaching_assignments(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        section_id = request.GET.get('section_id')
        qs = TeachingAssignment.objects.select_related(
            'class_section__subject', 'teacher_profile__user'
        ).all()
        if section_id:
            qs = qs.filter(class_section_id=section_id)
        data = []
        for ta in qs:
            data.append({
                'id': ta.id,
                'class_section_id': ta.class_section_id,
                'section_name': str(ta.class_section),
                'subject_name': ta.class_section.subject.name,
                'teacher_profile_id': ta.teacher_profile_id,
                'teacher_name': ta.teacher_profile.user.name,
                'teacher_code': ta.teacher_profile.teacher_code,
            })
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            section_id = body.get('class_section_id')
            teacher_profile_id = body.get('teacher_profile_id')
            if not section_id or not teacher_profile_id:
                return JsonResponse({'error': 'class_section_id and teacher_profile_id required'}, status=400)
            cs = ClassSection.objects.filter(id=section_id).first()
            if not cs:
                return JsonResponse({'error': 'Class section not found'}, status=404)
            tp = TeacherProfile.objects.filter(id=teacher_profile_id).first()
            if not tp:
                return JsonResponse({'error': 'Teacher profile not found'}, status=404)
            TeachingAssignment.objects.filter(class_section=cs).delete()
            ta = TeachingAssignment.objects.create(class_section=cs, teacher_profile=tp)
            return JsonResponse({
                'id': ta.id,
                'class_section_id': ta.class_section_id,
                'teacher_profile_id': ta.teacher_profile_id,
                'teacher_name': tp.user.name,
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_teaching_assignment_detail(request, assignment_id):
    user, err = _auth(request)
    if err:
        return err

    ta = TeachingAssignment.objects.filter(id=assignment_id).first()
    if not ta:
        return JsonResponse({'error': 'Assignment not found'}, status=404)

    if request.method == 'DELETE':
        ta.delete()
        return JsonResponse({'message': 'Assignment removed'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# ENROLLMENTS
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_enrollments(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        section_id = request.GET.get('section_id')
        student_id = request.GET.get('student_user_id')
        qs = Enrollment.objects.select_related(
            'class_section__subject', 'student_profile__user'
        ).all()
        if section_id:
            qs = qs.filter(class_section_id=section_id)
        if student_id:
            qs = qs.filter(student_profile__user_id=student_id)
        data = []
        for e in qs:
            data.append({
                'id': e.id,
                'class_section_id': e.class_section_id,
                'section_name': str(e.class_section),
                'subject_name': e.class_section.subject.name,
                'student_profile_id': e.student_profile_id,
                'student_name': e.student_profile.user.name,
                'student_code': e.student_profile.student_code,
                'status': e.status,
                'enrolled_at': e.enrolled_at.isoformat() if e.enrolled_at else None,
            })
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            section_id = body.get('class_section_id')
            student_profile_id = body.get('student_profile_id')
            if not section_id or not student_profile_id:
                return JsonResponse({'error': 'class_section_id and student_profile_id required'}, status=400)
            cs = ClassSection.objects.filter(id=section_id).first()
            if not cs:
                return JsonResponse({'error': 'Class section not found'}, status=404)
            sp = StudentProfile.objects.filter(id=student_profile_id).first()
            if not sp:
                return JsonResponse({'error': 'Student profile not found'}, status=404)
            if Enrollment.objects.filter(class_section=cs, student_profile=sp).exists():
                return JsonResponse({'error': 'Student already enrolled in this class'}, status=400)
            e = Enrollment.objects.create(class_section=cs, student_profile=sp, status='enrolled')
            return JsonResponse({'id': e.id, 'student_name': sp.user.name, 'status': e.status}, status=201)
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_enrollment_detail(request, enrollment_id):
    user, err = _auth(request)
    if err:
        return err

    e = Enrollment.objects.filter(id=enrollment_id).first()
    if not e:
        return JsonResponse({'error': 'Enrollment not found'}, status=404)

    if request.method == 'DELETE':
        e.delete()
        return JsonResponse({'message': 'Enrollment removed'})

    if request.method in ('PATCH', 'PUT'):
        try:
            body = json.loads(request.body)
            if 'status' in body and body['status'] in ('enrolled', 'dropped', 'completed'):
                e.status = body['status']
                if e.status == 'dropped':
                    e.dropped_at = timezone.now()
                e.save()
            return JsonResponse({'id': e.id, 'status': e.status})
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# TEACHER PROFILES (read-only list for dropdowns)
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_teacher_profiles(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        qs = TeacherProfile.objects.select_related('user').all().order_by('teacher_code')
        data = [{
            'id': tp.id,
            'user_id': tp.user_id,
            'name': tp.user.name,
            'email': tp.user.email,
            'teacher_code': tp.teacher_code,
            'department': tp.department,
            'title': tp.title,
        } for tp in qs]
        return JsonResponse(data, safe=False)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# STUDENT PROFILES (read-only list for dropdowns)
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_student_profiles(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        qs = StudentProfile.objects.select_related('user').all().order_by('student_code')
        data = [{
            'id': sp.id,
            'user_id': sp.user_id,
            'name': sp.user.name,
            'email': sp.user.email,
            'student_code': sp.student_code,
            'major': sp.major,
            'class_name': sp.class_name,
        } for sp in qs]
        return JsonResponse(data, safe=False)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# DOCUMENTS (JWT-based, admin can see & delete all)
# Filter by subject_id; upload accepts subject_id
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_documents(request):
    user, err = _auth(request, allowed_roles=('admin', 'teacher'))
    if err:
        return err

    if request.method == 'GET':
        qs = Document.objects.select_related('uploaded_by', 'subject', 'class_section').order_by('-uploaded_at')

        # ── Advanced filters ──────────────────────────────────────────────────
        subject_id    = request.GET.get('subject_id')
        status_filter = request.GET.get('status')
        uploader_id   = request.GET.get('uploader_id')
        search        = request.GET.get('search', '').strip()

        # Teachers can only see their own documents
        if user.role == 'teacher':
            qs = qs.filter(uploaded_by=user)
        elif uploader_id:
            qs = qs.filter(uploaded_by_id=uploader_id)

        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(name__icontains=search)

        def _fmt_size(b):
            if not b:
                return None
            if b < 1024:
                return f"{b} B"
            if b < 1024 ** 2:
                return f"{b / 1024:.1f} KB"
            return f"{b / 1024 ** 2:.1f} MB"

        data = [{
            'id': d.id,
            'name': d.name,
            'file_type': d.file_type,
            'file_size': d.file_size,
            'file_size_display': _fmt_size(d.file_size),
            'status': d.status,
            'subject_id': d.subject_id,
            'subject_name': d.subject.name if d.subject else None,
            'class_section_id': d.class_section_id,
            'class_section_name': str(d.class_section) if d.class_section else None,
            'uploaded_by_id': d.uploaded_by_id,
            'uploaded_by_name': d.uploaded_by.name,
            'uploaded_at': d.uploaded_at.isoformat() if d.uploaded_at else None,
        } for d in qs]
        return JsonResponse({
            'documents': data,
            'total': len(data),
        })

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_document_upload(request):
    user, err = _auth(request, allowed_roles=('admin', 'teacher'))
    if err:
        return err

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        from django.conf import settings as django_settings
        from django.core.files.storage import FileSystemStorage
        from .services.document_ingestion import ingest_document

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({'error': 'No file uploaded'}, status=400)

        # Optional subject_id / class_section_id from form data
        subject_id_raw = request.POST.get('subject_id') or None
        class_section_id_raw = request.POST.get('class_section_id') or None

        subject = None
        class_section = None
        if subject_id_raw:
            subject = Subject.objects.filter(id=int(subject_id_raw)).first()
        if class_section_id_raw:
            class_section = ClassSection.objects.filter(id=int(class_section_id_raw)).first()

        os.makedirs(django_settings.MEDIA_ROOT, exist_ok=True)
        fs = FileSystemStorage(location=django_settings.MEDIA_ROOT)
        saved_name = fs.save(uploaded_file.name, uploaded_file)
        saved_path = fs.path(saved_name)
        ext = os.path.splitext(uploaded_file.name)[1].replace('.', '').upper()

        doc = Document.objects.create(
            name=uploaded_file.name,
            file_path=saved_path,
            file_type=ext or 'UNKNOWN',
            file_size=uploaded_file.size,
            subject=subject,
            class_section=class_section,
            uploaded_by=user,
            status='processing',
        )

        def _ingest(doc_id):
            d = Document.objects.filter(id=doc_id).first()
            if not d:
                return
            try:
                ingest_document(d)
                d.status = 'ready'
                d.save(update_fields=['status'])
            except Exception as ex:
                d.status = 'error'
                d.save(update_fields=['status'])
                print(f'Ingestion error doc {doc_id}: {ex}')

        threading.Thread(target=_ingest, args=(doc.id,), daemon=True).start()

        return JsonResponse({
            'id': doc.id, 'name': doc.name, 'status': doc.status,
            'file_type': doc.file_type, 'file_size': doc.file_size,
            'subject_id': doc.subject_id,
            'subject_name': doc.subject.name if doc.subject else None,
        }, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def admin_document_detail(request, doc_id):
    user, err = _auth(request, allowed_roles=('admin', 'teacher'))
    if err:
        return err

    doc = Document.objects.select_related('uploaded_by', 'subject', 'class_section').filter(id=doc_id).first()
    if not doc:
        return JsonResponse({'error': 'Document not found'}, status=404)

    if user.role == 'teacher' and doc.uploaded_by_id != user.id:
        return JsonResponse({'error': 'You can only manage your own documents'}, status=403)

    if request.method == 'GET':
        return JsonResponse({
            'id': doc.id, 'name': doc.name,
            'file_path': doc.file_path, 'file_type': doc.file_type,
            'file_size': doc.file_size, 'status': doc.status,
            'subject_id': doc.subject_id,
            'subject_name': doc.subject.name if doc.subject else None,
            'class_section_id': doc.class_section_id,
            'class_section_name': str(doc.class_section) if doc.class_section else None,
            'uploaded_by_name': doc.uploaded_by.name,
            'uploaded_at': doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        })

    if request.method == 'PATCH':
        """
        Supported actions:
          action=archive   → set status='archived'  (soft remove from knowledge base)
          action=reprocess → set status='processing' then re-run ingestion pipeline
        Admin only for archive/reprocess.
        """
        try:
            body = json.loads(request.body)
            action = body.get('action', '').strip()

            if action == 'archive':
                if user.role != 'admin':
                    return JsonResponse({'error': 'Only admin can archive documents'}, status=403)
                doc.status = 'archived'
                doc.save(update_fields=['status'])
                return JsonResponse({'id': doc.id, 'status': doc.status, 'message': 'Document archived'})

            elif action == 'reprocess':
                if user.role != 'admin':
                    return JsonResponse({'error': 'Only admin can reprocess documents'}, status=403)
                if doc.status not in ('error', 'archived'):
                    return JsonResponse({'error': 'Can only reprocess documents with status error or archived'}, status=400)

                doc.status = 'processing'
                doc.save(update_fields=['status'])

                def _ingest(doc_id):
                    d = Document.objects.filter(id=doc_id).first()
                    if not d:
                        return
                    try:
                        from .services.document_ingestion import ingest_document
                        ingest_document(d)
                        d.status = 'ready'
                        d.save(update_fields=['status'])
                    except Exception as ex:
                        d.status = 'error'
                        d.save(update_fields=['status'])
                        print(f'Re-ingestion error doc {doc_id}: {ex}')

                threading.Thread(target=_ingest, args=(doc.id,), daemon=True).start()
                return JsonResponse({'id': doc.id, 'status': doc.status, 'message': 'Reprocessing started'})

            else:
                return JsonResponse({'error': 'Invalid action. Use action=archive or action=reprocess'}, status=400)
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    if request.method == 'DELETE':
        try:
            from .services.document_ingestion import delete_document_from_chroma
            delete_document_from_chroma(doc)
        except Exception:
            pass
        doc.delete()
        return JsonResponse({'message': 'Document deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# SYSTEM SETTINGS (AI model config)
# ══════════════════════════════════════════════════════

DEFAULT_SETTINGS = {
    'ai_model': ('gpt-3.5-turbo', 'Default AI model for chat responses'),
    'streaming_enabled': ('true', 'Enable streaming response'),
    'memory_enabled': ('true', 'Enable conversation memory'),
    'chunk_size': ('500', 'Vector DB chunk size (tokens)'),
    'chunk_overlap': ('50', 'Vector DB chunk overlap'),
    'top_k_results': ('5', 'Number of chunks to retrieve from vector DB'),
}


@csrf_exempt
def admin_settings(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        for key, (val, desc) in DEFAULT_SETTINGS.items():
            SystemSetting.objects.get_or_create(
                setting_key=key,
                defaults={'setting_value': val, 'description': desc},
            )
        settings_qs = SystemSetting.objects.all()
        data = {s.setting_key: s.setting_value for s in settings_qs}
        return JsonResponse(data)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            updated = {}
            for key, value in body.items():
                obj, _ = SystemSetting.objects.get_or_create(
                    setting_key=key,
                    defaults={'setting_value': str(value), 'description': DEFAULT_SETTINGS.get(key, ('', ''))[1]},
                )
                obj.setting_value = str(value)
                obj.updated_by = user
                obj.save()
                updated[key] = str(value)
            return JsonResponse({'message': 'Settings saved', 'updated': updated})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# EXAM SCHEDULES CRUD
# ══════════════════════════════════════════════════════

def _serialize_exam(e):
    return {
        'id': e.id,
        'subject_id': e.subject_id,
        'subject_code': e.subject.code,
        'subject_name': e.subject.name,
        'class_section_id': e.class_section_id,
        'class_section_name': str(e.class_section) if e.class_section else None,
        'exam_type': e.exam_type,
        'exam_date': e.exam_date.isoformat() if e.exam_date else None,
        'start_time': str(e.start_time) if e.start_time else None,
        'end_time': str(e.end_time) if e.end_time else None,
        'room': e.room,
        'note': e.note,
        'created_at': e.created_at.isoformat() if e.created_at else None,
        'updated_at': e.updated_at.isoformat() if e.updated_at else None,
    }


@csrf_exempt
def admin_exam_schedules(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        qs = ExamSchedule.objects.select_related('subject', 'class_section').all().order_by('exam_date', 'start_time')
        subject_id = request.GET.get('subject_id')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        month = request.GET.get('month')  # format: YYYY-MM
        year = request.GET.get('year')
        if month:
            try:
                y, m = month.split('-')
                qs = qs.filter(exam_date__year=int(y), exam_date__month=int(m))
            except Exception:
                pass
        elif year:
            qs = qs.filter(exam_date__year=int(year))
        return JsonResponse([_serialize_exam(e) for e in qs], safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            subject_id = body.get('subject_id')
            exam_date = body.get('exam_date')
            start_time = body.get('start_time')
            end_time = body.get('end_time')
            if not all([subject_id, exam_date, start_time, end_time]):
                return JsonResponse({'error': 'subject_id, exam_date, start_time, end_time are required'}, status=400)
            subj = Subject.objects.filter(id=subject_id).first()
            if not subj:
                return JsonResponse({'error': 'Subject not found'}, status=404)
            if start_time >= end_time:
                return JsonResponse({'error': 'start_time must be before end_time'}, status=400)
            cs_id = body.get('class_section_id')
            cs = ClassSection.objects.filter(id=cs_id).first() if cs_id else None
            e = ExamSchedule.objects.create(
                subject=subj,
                class_section=cs,
                exam_type=body.get('exam_type', 'final'),
                exam_date=exam_date,
                start_time=start_time,
                end_time=end_time,
                room=body.get('room', '').strip() or None,
                note=body.get('note', '').strip() or None,
            )
            return JsonResponse(_serialize_exam(e), status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_exam_schedule_detail(request, exam_id):
    user, err = _auth(request)
    if err:
        return err

    e = ExamSchedule.objects.select_related('subject', 'class_section').filter(id=exam_id).first()
    if not e:
        return JsonResponse({'error': 'Exam schedule not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_serialize_exam(e))

    if request.method in ('PUT', 'PATCH'):
        # Only allow editing if exam_date is in the future
        from datetime import date
        if e.exam_date < date.today():
            return JsonResponse({'error': 'Cannot edit past exam schedules'}, status=400)
        try:
            body = json.loads(request.body)
            if 'exam_type' in body:
                e.exam_type = body['exam_type']
            if 'exam_date' in body:
                e.exam_date = body['exam_date']
            if 'start_time' in body:
                e.start_time = body['start_time']
            if 'end_time' in body:
                e.end_time = body['end_time']
            if 'room' in body:
                e.room = body['room'].strip() or None
            if 'note' in body:
                e.note = body['note'].strip() or None
            if 'class_section_id' in body:
                cs_id = body['class_section_id']
                e.class_section = ClassSection.objects.filter(id=cs_id).first() if cs_id else None
            # Validate time
            if e.start_time >= e.end_time:
                return JsonResponse({'error': 'start_time must be before end_time'}, status=400)
            e.save()
            e.refresh_from_db()
            return JsonResponse(_serialize_exam(e))
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    if request.method == 'DELETE':
        from datetime import date
        if e.exam_date < date.today():
            return JsonResponse({'error': 'Cannot delete past exam schedules'}, status=400)
        e.delete()
        return JsonResponse({'message': 'Exam schedule deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ══════════════════════════════════════════════════════
# ANNOUNCEMENTS CRUD
# + Read tracking (unread count, mark as read)
# ══════════════════════════════════════════════════════

def _serialize_announcement(ann, user=None):
    is_read = False
    if user:
        is_read = AnnouncementRead.objects.filter(announcement=ann, user=user).exists()
    return {
        'id': ann.id,
        'title': ann.title,
        'content': ann.content,
        'target_role': ann.target_role,
        'subject_id': ann.subject_id,
        'subject_name': ann.subject.name if ann.subject else None,
        'class_section_id': ann.class_section_id,
        'created_by_id': ann.created_by_id,
        'created_by_name': ann.created_by.name,
        'is_active': ann.is_active,
        'published_at': ann.published_at.isoformat() if ann.published_at else None,
        'expires_at': ann.expires_at.isoformat() if ann.expires_at else None,
        'created_at': ann.created_at.isoformat() if ann.created_at else None,
        'updated_at': ann.updated_at.isoformat() if ann.updated_at else None,
        'is_read': is_read,
    }


@csrf_exempt
def admin_announcements(request):
    user, err = _auth(request)
    if err:
        return err

    if request.method == 'GET':
        qs = Announcement.objects.select_related('subject', 'created_by').all().order_by('-created_at')
        is_active = request.GET.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        data = [_serialize_announcement(ann, user) for ann in qs]
        # Count unread
        unread_count = sum(1 for item in data if not item['is_read'])
        return JsonResponse({'announcements': data, 'unread_count': unread_count})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            title = body.get('title', '').strip()
            content = body.get('content', '').strip()
            if not title or not content:
                return JsonResponse({'error': 'title and content are required'}, status=400)

            subject_id = body.get('subject_id')
            subj = Subject.objects.filter(id=subject_id).first() if subject_id else None
            cs_id = body.get('class_section_id')
            cs = ClassSection.objects.filter(id=cs_id).first() if cs_id else None

            ann = Announcement.objects.create(
                title=title,
                content=content,
                target_role=body.get('target_role', 'all'),
                subject=subj,
                class_section=cs,
                created_by=user,
                is_active=body.get('is_active', True),
                published_at=timezone.now(),
            )
            # Auto-mark as read by creator
            AnnouncementRead.objects.get_or_create(announcement=ann, user=user)
            return JsonResponse(_serialize_announcement(ann, user), status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_announcement_detail(request, ann_id):
    user, err = _auth(request)
    if err:
        return err

    ann = Announcement.objects.select_related('subject', 'created_by').filter(id=ann_id).first()
    if not ann:
        return JsonResponse({'error': 'Announcement not found'}, status=404)

    if request.method == 'GET':
        # Mark as read when fetching detail
        AnnouncementRead.objects.get_or_create(announcement=ann, user=user)
        return JsonResponse(_serialize_announcement(ann, user))

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
            if 'title' in body:
                ann.title = body['title'].strip()
            if 'content' in body:
                ann.content = body['content'].strip()
            if 'target_role' in body:
                ann.target_role = body['target_role']
            if 'is_active' in body:
                ann.is_active = bool(body['is_active'])
            if 'expires_at' in body:
                ann.expires_at = body['expires_at'] or None
            ann.save()
            return JsonResponse(_serialize_announcement(ann, user))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        ann.delete()
        return JsonResponse({'message': 'Announcement deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def admin_announcement_mark_read(request, ann_id):
    """POST /api/admin/announcements/<id>/read/ – mark announcement as read for current user."""
    user, err = _auth(request)
    if err:
        return err

    ann = Announcement.objects.filter(id=ann_id).first()
    if not ann:
        return JsonResponse({'error': 'Announcement not found'}, status=404)

    AnnouncementRead.objects.get_or_create(announcement=ann, user=user)
    return JsonResponse({'message': 'Marked as read'})


@csrf_exempt
def admin_announcements_mark_all_read(request):
    """POST /api/admin/announcements/read-all/ – mark all announcements as read."""
    user, err = _auth(request)
    if err:
        return err

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    all_ann = Announcement.objects.all()
    for ann in all_ann:
        AnnouncementRead.objects.get_or_create(announcement=ann, user=user)
    return JsonResponse({'message': 'All announcements marked as read'})


# ══════════════════════════════════════════════════════
# SSE – Real-time Announcements Stream
#
# EventSource doesn't support Authorization headers, so the JWT token
# is passed as a query parameter: GET /api/admin/announcements/stream/?token=<jwt>
#
# The server polls the DB every 3 seconds and pushes new announcements
# as SSE events. A heartbeat with unread_count is sent every 15 seconds.
# Note: This blocks one Django worker thread per connected client.
# For production scale, use Django Channels / Redis pub-sub.
# ══════════════════════════════════════════════════════

@csrf_exempt
def admin_announcements_sse(request):
    """GET /api/admin/announcements/stream/?token=<jwt>"""
    import time as _time

    token_str = request.GET.get('token', '')
    if not token_str:
        from django.http import HttpResponse
        return HttpResponse('Token required', status=401)

    from .auth_utils import decode_jwt_token as _decode
    payload = _decode(token_str)
    if not payload:
        from django.http import HttpResponse
        return HttpResponse('Invalid token', status=401)

    user = User.objects.filter(id=payload['user_id']).first()
    if not user or user.role not in ('admin',):
        from django.http import HttpResponse
        return HttpResponse('Admin access required', status=403)

    def sse_stream():
        # Start from the latest announcement id so we don't resend history
        last_id = Announcement.objects.order_by('-id').values_list('id', flat=True).first() or 0
        tick = 0

        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connected', 'last_id': last_id})}\n\n"

        while True:
            _time.sleep(3)
            tick += 1

            try:
                # Push any new announcements created after last_id
                new_anns = (
                    Announcement.objects
                    .filter(id__gt=last_id)
                    .order_by('id')
                    .select_related('created_by', 'subject')
                )
                for ann in new_anns:
                    serialized = _serialize_announcement(ann, user)
                    payload_str = json.dumps({'type': 'new_announcement', 'data': serialized})
                    yield f"data: {payload_str}\n\n"
                    last_id = ann.id

                # Heartbeat every 15 seconds (5 ticks × 3s)
                if tick % 5 == 0:
                    unread = Announcement.objects.exclude(
                        reads__user=user
                    ).filter(is_active=True).count()
                    hb = json.dumps({'type': 'heartbeat', 'unread_count': unread})
                    yield f"data: {hb}\n\n"

            except Exception as e:
                err_payload = json.dumps({'type': 'error', 'message': str(e)})
                yield f"data: {err_payload}\n\n"
                break

    from django.http import StreamingHttpResponse
    response = StreamingHttpResponse(
        sse_stream(),
        content_type='text/event-stream; charset=utf-8',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

