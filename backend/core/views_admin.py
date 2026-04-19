"""
Admin core views: User CRUD, Stats, Profile audit.

Role-change profile strategy:
  teacher → student  : delete teacher_profile → create student_profile
  student → teacher  : delete student_profile → create teacher_profile
  * → admin          : delete both profiles (admins have no academic profile)
  admin → *          : create appropriate profile

Google login policy (enforced in views.py):
  - Existing DB users → link Google ID, preserve existing role (admin stays admin)
  - New Google users  → always created as 'student' (admin MUST be created via admin panel)
  - Role escalation via Google is IMPOSSIBLE
"""
import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .auth_utils import decode_jwt_token, hash_password
from .models import User, TeacherProfile, StudentProfile


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_admin(request):
    """Return (admin_user, error_response). error_response is None on success."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, JsonResponse({"error": "Authorization token required"}, status=401)

    payload = decode_jwt_token(auth.split(" ", 1)[1])
    if not payload:
        return None, JsonResponse({"error": "Invalid or expired token"}, status=401)

    user = User.objects.filter(id=payload["user_id"]).first()
    if not user:
        return None, JsonResponse({"error": "User not found"}, status=404)
    if user.role != "admin":
        return None, JsonResponse({"error": "Admin access required"}, status=403)
    return user, None


def _serialize_user(u):
    base = {
        "id": u.id,
        "name": u.name,
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }
    if u.role == "teacher":
        tp = TeacherProfile.objects.filter(user=u).first()
        if tp:
            base["profile"] = {
                "teacher_code": tp.teacher_code,
                "department": tp.department,
                "title": tp.title,
            }
    elif u.role == "student":
        sp = StudentProfile.objects.filter(user=u).first()
        if sp:
            base["profile"] = {
                "student_code": sp.student_code,
                "major": sp.major,
                "cohort_year": sp.cohort_year,
                "class_name": sp.class_name,
            }
    return base


def _auto_create_profile(user, body: dict):
    """Create teacher_profile or student_profile if it doesn't exist yet."""
    if user.role == "teacher":
        if not TeacherProfile.objects.filter(user=user).exists():
            teacher_code = (body.get("teacher_code") or "").strip()
            if not teacher_code:
                teacher_code = f"GV{user.id:03d}"
                while TeacherProfile.objects.filter(teacher_code=teacher_code).exists():
                    teacher_code += "X"
            TeacherProfile.objects.create(
                user=user,
                teacher_code=teacher_code,
                department=(body.get("department") or "").strip() or None,
                title=(body.get("title") or "").strip() or None,
            )
    elif user.role == "student":
        if not StudentProfile.objects.filter(user=user).exists():
            student_code = (body.get("student_code") or "").strip()
            if not student_code:
                student_code = f"SV{user.id:05d}"
                while StudentProfile.objects.filter(student_code=student_code).exists():
                    student_code += "X"
            cohort_year = body.get("cohort_year")
            StudentProfile.objects.create(
                user=user,
                student_code=student_code,
                major=(body.get("major") or "").strip() or None,
                cohort_year=int(cohort_year) if cohort_year else None,
                class_name=(body.get("class_name") or "").strip() or None,
            )


def _cleanup_old_profiles(user, old_role: str, new_role: str):
    """
    When a user's role changes, remove the profile from the old role
    and ensure the new role profile is ready to be created.

    Strategy:
      teacher → student/admin : delete teacher_profile
      student → teacher/admin : delete student_profile
      admin   → teacher       : create teacher_profile (no old profile to delete)
      admin   → student       : create student_profile (no old profile to delete)
    """
    if old_role == new_role:
        return

    if old_role == "teacher":
        deleted, _ = TeacherProfile.objects.filter(user=user).delete()
        if deleted:
            print(f"[AdminAudit] Deleted teacher_profile for user {user.id} (role: {old_role}→{new_role})")

    elif old_role == "student":
        deleted, _ = StudentProfile.objects.filter(user=user).delete()
        if deleted:
            print(f"[AdminAudit] Deleted student_profile for user {user.id} (role: {old_role}→{new_role})")

    # If new role is 'admin', also clear any residual opposite profile
    if new_role == "admin":
        TeacherProfile.objects.filter(user=user).delete()
        StudentProfile.objects.filter(user=user).delete()


# ──────────────────────────────────────────────
# GET /api/admin/users/
# POST /api/admin/users/
# ──────────────────────────────────────────────

@csrf_exempt
def admin_users(request):
    admin, err = _get_admin(request)
    if err:
        return err

    if request.method == "GET":
        role_filter = request.GET.get("role")
        qs = User.objects.all().order_by("role", "name")
        if role_filter:
            qs = qs.filter(role=role_filter)
        return JsonResponse([_serialize_user(u) for u in qs], safe=False)

    if request.method == "POST":
        try:
            body = json.loads(request.body)
            name     = body.get("name", "").strip()
            username = body.get("username", "").strip() or None
            email    = body.get("email", "").strip()
            password = body.get("password", "").strip()
            role     = body.get("role", "student").strip()

            if not name or not email or not password:
                return JsonResponse({"error": "name, email and password are required"}, status=400)
            if role not in ("student", "teacher", "admin"):
                return JsonResponse({"error": "Invalid role"}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({"error": "Email already exists"}, status=400)
            if username and User.objects.filter(username=username).exists():
                return JsonResponse({"error": "Username already exists"}, status=400)

            if role == "teacher":
                tc = (body.get("teacher_code") or "").strip()
                if tc and TeacherProfile.objects.filter(teacher_code=tc).exists():
                    return JsonResponse({"error": f"Teacher code '{tc}' already exists"}, status=400)

            if role == "student":
                sc = (body.get("student_code") or "").strip()
                if sc and StudentProfile.objects.filter(student_code=sc).exists():
                    return JsonResponse({"error": f"Student code '{sc}' already exists"}, status=400)

            with transaction.atomic():
                user = User.objects.create(
                    name=name, username=username, email=email,
                    password=hash_password(password), role=role, is_active=True,
                )
                _auto_create_profile(user, body)

            return JsonResponse(_serialize_user(user), status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ──────────────────────────────────────────────
# GET/PATCH/DELETE /api/admin/users/<id>/
# ──────────────────────────────────────────────

@csrf_exempt
def admin_user_detail(request, user_id):
    admin, err = _get_admin(request)
    if err:
        return err

    target = User.objects.filter(id=user_id).first()
    if not target:
        return JsonResponse({"error": "User not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_user(target))

    if request.method in ("PUT", "PATCH"):
        try:
            body = json.loads(request.body)
            old_role = target.role

            if "name" in body:
                target.name = body["name"].strip()
            if "username" in body:
                new_uname = (body["username"] or "").strip() or None
                if new_uname and new_uname != target.username:
                    if User.objects.filter(username=new_uname).exclude(id=user_id).exists():
                        return JsonResponse({"error": "Username already exists"}, status=400)
                target.username = new_uname
            if "email" in body:
                new_email = body["email"].strip()
                if new_email != target.email:
                    if User.objects.filter(email=new_email).exclude(id=user_id).exists():
                        return JsonResponse({"error": "Email already exists"}, status=400)
                target.email = new_email
            if "role" in body:
                new_role = body["role"]
                if new_role not in ("student", "teacher", "admin"):
                    return JsonResponse({"error": "Invalid role"}, status=400)
                target.role = new_role
            if "is_active" in body:
                target.is_active = bool(body["is_active"])
            if "password" in body and body["password"]:
                target.password = hash_password(body["password"].strip())

            new_role = target.role

            with transaction.atomic():
                target.save()

                # ── CRITICAL: Clean up old profile if role changed ──
                if old_role != new_role:
                    _cleanup_old_profiles(target, old_role, new_role)

                # Create new profile if it doesn't exist
                _auto_create_profile(target, body)

                # Update existing profile fields if provided
                if new_role == "teacher":
                    tp = TeacherProfile.objects.filter(user=target).first()
                    if tp:
                        if "teacher_code" in body and (body["teacher_code"] or "").strip():
                            new_tc = body["teacher_code"].strip()
                            if new_tc != tp.teacher_code and TeacherProfile.objects.filter(teacher_code=new_tc).exclude(id=tp.id).exists():
                                return JsonResponse({"error": f"Teacher code '{new_tc}' already exists"}, status=400)
                            tp.teacher_code = new_tc
                        if "department" in body:
                            tp.department = (body["department"] or "").strip() or None
                        if "title" in body:
                            tp.title = (body["title"] or "").strip() or None
                        tp.save()
                elif new_role == "student":
                    sp = StudentProfile.objects.filter(user=target).first()
                    if sp:
                        if "student_code" in body and (body["student_code"] or "").strip():
                            new_sc = body["student_code"].strip()
                            if new_sc != sp.student_code and StudentProfile.objects.filter(student_code=new_sc).exclude(id=sp.id).exists():
                                return JsonResponse({"error": f"Student code '{new_sc}' already exists"}, status=400)
                            sp.student_code = new_sc
                        if "major" in body:
                            sp.major = (body["major"] or "").strip() or None
                        if "cohort_year" in body:
                            sp.cohort_year = int(body["cohort_year"]) if body["cohort_year"] else None
                        if "class_name" in body:
                            sp.class_name = (body["class_name"] or "").strip() or None
                        sp.save()

            result = _serialize_user(target)
            if old_role != new_role:
                result["_role_changed"] = {"from": old_role, "to": new_role, "old_profile_deleted": True}
            return JsonResponse(result)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    if request.method == "DELETE":
        if target.id == admin.id:
            return JsonResponse({"error": "Cannot delete your own account"}, status=400)
            
        try:
            target.delete()
            return JsonResponse({"message": "User deleted successfully"})
        except Exception as e:
            return JsonResponse({"error": f"Lỗi hệ thống khi xóa: {str(e)}"}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ──────────────────────────────────────────────
# GET /api/admin/stats/
# ──────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def admin_stats(request):
    admin, err = _get_admin(request)
    if err:
        return err

    try:
        from .models import Document, Conversation, Message, Subject, ClassSection
        return JsonResponse({
            "total_students":       User.objects.filter(role="student").count(),
            "total_teachers":       User.objects.filter(role="teacher").count(),
            "total_admins":         User.objects.filter(role="admin").count(),
            "total_subjects":       Subject.objects.count(),
            "total_class_sections": ClassSection.objects.count(),
            "total_documents":      Document.objects.count(),
            "total_conversations":  Conversation.objects.count(),
            "total_messages":       Message.objects.count(),
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ──────────────────────────────────────────────
# GET /api/admin/audit/profiles/
# Lists users whose academic profile is missing or mismatched.
# DB-level invariant: teacher→has teacher_profile, student→has student_profile.
# This endpoint surfaces any violations for admin to fix.
# ──────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def admin_audit_profiles(request):
    admin, err = _get_admin(request)
    if err:
        return err

    issues = []

    # Teachers without teacher_profile
    teachers = User.objects.filter(role="teacher", is_active=True)
    for t in teachers:
        if not TeacherProfile.objects.filter(user=t).exists():
            issues.append({
                "user_id": t.id, "name": t.name, "email": t.email,
                "role": "teacher", "issue": "Missing teacher_profile",
            })

    # Students without student_profile
    students = User.objects.filter(role="student", is_active=True)
    for s in students:
        if not StudentProfile.objects.filter(user=s).exists():
            issues.append({
                "user_id": s.id, "name": s.name, "email": s.email,
                "role": "student", "issue": "Missing student_profile",
            })

    # Users with stale profiles (e.g., teacher_profile but role != teacher)
    from .models import TeacherProfile as TP, StudentProfile as SP
    stale_teacher = TP.objects.exclude(user__role="teacher").select_related("user")
    for tp in stale_teacher:
        issues.append({
            "user_id": tp.user_id, "name": tp.user.name, "email": tp.user.email,
            "role": tp.user.role, "issue": f"Stale teacher_profile (user role is now '{tp.user.role}')",
        })

    stale_student = SP.objects.exclude(user__role="student").select_related("user")
    for sp in stale_student:
        issues.append({
            "user_id": sp.user_id, "name": sp.user.name, "email": sp.user.email,
            "role": sp.user.role, "issue": f"Stale student_profile (user role is now '{sp.user.role}')",
        })

    return JsonResponse({
        "total_issues": len(issues),
        "issues": issues,
    })


# ──────────────────────────────────────────────
# POST /api/admin/audit/fix-profiles/
# Auto-fix profile issues found by audit
# ──────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def admin_audit_fix_profiles(request):
    admin, err = _get_admin(request)
    if err:
        return err

    fixed = []

    # Fix teachers without profile
    for t in User.objects.filter(role="teacher", is_active=True):
        if not TeacherProfile.objects.filter(user=t).exists():
            code = f"GV{t.id:03d}"
            while TeacherProfile.objects.filter(teacher_code=code).exists():
                code += "X"
            TeacherProfile.objects.create(user=t, teacher_code=code)
            fixed.append({"user_id": t.id, "action": "created teacher_profile"})

    # Fix students without profile
    for s in User.objects.filter(role="student", is_active=True):
        if not StudentProfile.objects.filter(user=s).exists():
            code = f"SV{s.id:05d}"
            while StudentProfile.objects.filter(student_code=code).exists():
                code += "X"
            StudentProfile.objects.create(user=s, student_code=code)
            fixed.append({"user_id": s.id, "action": "created student_profile"})

    # Remove stale profiles
    from .models import TeacherProfile as TP, StudentProfile as SP
    for tp in TP.objects.exclude(user__role="teacher"):
        fixed.append({"user_id": tp.user_id, "action": "deleted stale teacher_profile"})
        tp.delete()

    for sp in SP.objects.exclude(user__role="student"):
        fixed.append({"user_id": sp.user_id, "action": "deleted stale student_profile"})
        sp.delete()

    return JsonResponse({"fixed_count": len(fixed), "fixed": fixed})
