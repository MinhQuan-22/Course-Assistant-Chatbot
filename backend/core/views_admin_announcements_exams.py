import json
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .auth_utils import decode_jwt_token
from .models import User, Announcement, ExamSchedule, Subject, ClassSection, SystemSetting

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

# ================================
# ANNOUNCEMENTS
# ================================
def _serialize_announcement(a):
    return {
        'id': a.id,
        'title': a.title,
        'content': a.content,
        'target_role': a.target_role,
        'subject_id': a.subject_id,
        'class_section_id': a.class_section_id,
        'created_by': a.created_by.name if a.created_by else None,
        'is_active': a.is_active,
        'published_at': a.published_at.isoformat() if a.published_at else None,
        'expires_at': a.expires_at.isoformat() if a.expires_at else None,
        'created_at': a.created_at.isoformat() if a.created_at else None,
    }

@csrf_exempt
def admin_announcements(request):
    user, err = _auth(request)
    if err: return err

    if request.method == 'GET':
        qs = Announcement.objects.select_related('created_by').all().order_by('-created_at')
        return JsonResponse([_serialize_announcement(a) for a in qs], safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            a = Announcement.objects.create(
                title=body.get('title', '').strip(),
                content=body.get('content', '').strip(),
                target_role=body.get('target_role', 'all'),
                subject_id=body.get('subject_id'),
                class_section_id=body.get('class_section_id'),
                created_by=user,
                is_active=body.get('is_active', True),
                published_at=body.get('published_at') or timezone.now(),
                expires_at=body.get('expires_at')
            )
            
            # Notify logic could go here or via trigger/signal
            
            return JsonResponse(_serialize_announcement(a), status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def admin_announcement_detail(request, pk):
    user, err = _auth(request)
    if err: return err

    a = Announcement.objects.filter(id=pk).first()
    if not a: return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_serialize_announcement(a))

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
            if 'title' in body: a.title = body['title'].strip()
            if 'content' in body: a.content = body['content'].strip()
            if 'target_role' in body: a.target_role = body['target_role']
            if 'subject_id' in body: a.subject_id = body['subject_id']
            if 'class_section_id' in body: a.class_section_id = body['class_section_id']
            if 'is_active' in body: a.is_active = body['is_active']
            if 'published_at' in body: a.published_at = body['published_at']
            if 'expires_at' in body: a.expires_at = body['expires_at']
            a.save()
            return JsonResponse(_serialize_announcement(a))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        a.delete()
        return JsonResponse({'message': 'Deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ================================
# EXAM SCHEDULES
# ================================
def _serialize_exam(e):
    return {
        'id': e.id,
        'subject_id': e.subject_id,
        'subject_name': e.subject.name if e.subject else None,
        'class_section_id': e.class_section_id,
        'section_name': e.class_section.section_name if e.class_section else None,
        'exam_type': e.exam_type,
        'exam_date': str(e.exam_date) if e.exam_date else None,
        'start_time': str(e.start_time) if e.start_time else None,
        'end_time': str(e.end_time) if e.end_time else None,
        'room': e.room,
        'note': e.note,
    }

@csrf_exempt
def admin_exam_schedules(request):
    user, err = _auth(request)
    if err: return err

    if request.method == 'GET':
        qs = ExamSchedule.objects.select_related('subject', 'class_section').all().order_by('-exam_date', '-start_time')
        return JsonResponse([_serialize_exam(e) for e in qs], safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            e = ExamSchedule.objects.create(
                subject_id=body.get('subject_id'),
                class_section_id=body.get('class_section_id'),
                exam_type=body.get('exam_type', 'final'),
                exam_date=body.get('exam_date'),
                start_time=body.get('start_time'),
                end_time=body.get('end_time'),
                room=body.get('room'),
                note=body.get('note')
            )
            return JsonResponse(_serialize_exam(ExamSchedule.objects.select_related('subject', 'class_section').get(id=e.id)), status=201)
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def admin_exam_schedule_detail(request, pk):
    user, err = _auth(request)
    if err: return err

    e = ExamSchedule.objects.select_related('subject', 'class_section').filter(id=pk).first()
    if not e: return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(_serialize_exam(e))

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
            if 'subject_id' in body: e.subject_id = body['subject_id']
            if 'class_section_id' in body: e.class_section_id = body['class_section_id']
            if 'exam_type' in body: e.exam_type = body['exam_type']
            if 'exam_date' in body: e.exam_date = body['exam_date']
            if 'start_time' in body: e.start_time = body['start_time']
            if 'end_time' in body: e.end_time = body['end_time']
            if 'room' in body: e.room = body['room']
            if 'note' in body: e.note = body['note']
            e.save()
            return JsonResponse(_serialize_exam(e))
        except Exception as ex:
            return JsonResponse({'error': str(ex)}, status=500)

    if request.method == 'DELETE':
        e.delete()
        return JsonResponse({'message': 'Deleted'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)

