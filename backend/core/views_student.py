import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .auth_utils import decode_jwt_token
from .models import (
    User, Subject, ClassSection, Enrollment, StudentProfile,
    Quiz, QuizQuestion, QuizAttempt, QuizAnswer, ExamSchedule
)

def _get_student(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, JsonResponse({"error": "Authorization token required"}, status=401)
    payload = decode_jwt_token(auth.split(" ", 1)[1])
    if not payload:
        return None, JsonResponse({"error": "Invalid or expired token"}, status=401)
    user = User.objects.filter(id=payload["user_id"]).first()
    if not user:
        return None, JsonResponse({"error": "User not found"}, status=404)
    if user.role != "student":
        return None, JsonResponse({"error": "Student access required"}, status=403)
    return user, None

@csrf_exempt
def student_subjects(request):
    if request.method != 'GET': return JsonResponse({"error": "Method not allowed"}, status=405)
    user, err = _get_student(request)
    if err: return err
    try:
        sp = StudentProfile.objects.filter(user=user).first()
        if not sp: return JsonResponse({"subjects": []})
        enrollments = Enrollment.objects.filter(student_profile=sp, status='enrolled').select_related('class_section__subject')
        subs = []
        for e in enrollments:
            sub = e.class_section.subject
            subs.append({
                "id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "class_section_id": e.class_section.id,
                "class_name": e.class_section.section_name or e.class_section.section_code
            })
        return JsonResponse({"subjects": subs})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def student_quizzes(request):
    if request.method != 'GET': return JsonResponse({"error": "Method not allowed"}, status=405)
    user, err = _get_student(request)
    if err: return err
    
    try:
        sp = StudentProfile.objects.filter(user=user).first()
        if not sp: return JsonResponse({"quizzes": []})
        
        class_ids = Enrollment.objects.filter(student_profile=sp, status='enrolled').values_list('class_section_id', flat=True)
        quizzes = Quiz.objects.filter(class_section_id__in=class_ids, is_published=True).order_by('-created_at')
        
        data = []
        for q in quizzes:
            attempts = QuizAttempt.objects.filter(user=user, quiz=q).count()
            best_attempt = QuizAttempt.objects.filter(user=user, quiz=q).order_by('-score').first()
            data.append({
                "id": q.id,
                "title": q.title,
                "subject_name": q.subject.name if q.subject else "",
                "question_count": QuizQuestion.objects.filter(quiz=q).count(),
                "attempts": attempts,
                "best_score": best_attempt.score if best_attempt else None
            })
        return JsonResponse({"quizzes": data})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def student_quiz_detail(request, quiz_id):
    user, err = _get_student(request)
    if err: return err
    try:
        quiz = Quiz.objects.filter(id=quiz_id, is_published=True).first()
        if not quiz: return JsonResponse({"error": "Quiz not found"}, status=404)
        
        if request.method == 'GET':
            questions = QuizQuestion.objects.filter(quiz=quiz)
            q_data = []
            for q in questions:
                q_data.append({
                    "id": q.id,
                    "question": q.question,
                    "options": [q.option_a, q.option_b, q.option_c, q.option_d]
                })
            return JsonResponse({"id": quiz.id, "title": quiz.title, "questions": q_data})
            
        elif request.method == 'POST':
            body = json.loads(request.body)
            answers = body.get('answers', {})
            
            questions = QuizQuestion.objects.filter(quiz=quiz)
            correct_count = 0
            total = questions.count()
            
            mapping = {0: 'A', 1: 'B', 2: 'C', 3: 'D'}
            
            attempt = QuizAttempt.objects.create(
                user=user, quiz=quiz, score=0, total_questions=total, correct_count=0
            )
            
            detailed_results = []
            for q in questions:
                student_ans_idx = answers.get(str(q.id))
                student_ans_letter = mapping.get(student_ans_idx, None)
                is_correct = (student_ans_letter == q.correct_answer)
                if is_correct: correct_count += 1
                
                QuizAnswer.objects.create(
                    attempt=attempt, question=q,
                    selected_option=student_ans_letter, is_correct=is_correct
                )
                
                detailed_results.append({
                    "question_id": q.id,
                    "is_correct": is_correct,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                })
            
            score_percent = int((correct_count / total) * 100) if total > 0 else 0
            attempt.correct_count = correct_count
            attempt.score = score_percent
            attempt.completed_at = timezone.now()
            attempt.save()
            
            return JsonResponse({
                "message": "Submitted",
                "score": score_percent,
                "correct_count": correct_count,
                "total": total,
                "details": detailed_results
            })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def student_exam_schedules(request):
    """
    GET /api/student/exam-schedules/?month=YYYY-MM
    Trả về lịch thi của các lớp học phần mà sinh viên đang đăng ký.
    Chỉ cho phép GET – Sinh viên không được thêm/sửa/xóa lịch thi.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user, err = _get_student(request)
    if err:
        return err

    try:
        sp = StudentProfile.objects.filter(user=user).first()
        if not sp:
            return JsonResponse([], safe=False)

        # Lấy danh sách class_section mà sinh viên đăng ký
        enrolled_section_ids = Enrollment.objects.filter(
            student_profile=sp, status="enrolled"
        ).values_list("class_section_id", flat=True)

        # Lọc theo tháng nếu có query param ?month=YYYY-MM
        month_param = request.GET.get("month", "")
        exam_qs = ExamSchedule.objects.filter(
            class_section_id__in=enrolled_section_ids
        ).select_related("subject", "class_section").order_by("exam_date", "start_time")

        if month_param:
            try:
                year_str, mon_str = month_param.split("-")
                exam_qs = exam_qs.filter(
                    exam_date__year=int(year_str),
                    exam_date__month=int(mon_str),
                )
            except ValueError:
                pass  # Bỏ qua nếu format sai, trả về toàn bộ

        data = []
        for ex in exam_qs:
            data.append({
                "id":                 ex.id,
                "subject_id":         ex.subject.id,
                "subject_code":       ex.subject.code,
                "subject_name":       ex.subject.name,
                "class_section_id":   ex.class_section.id if ex.class_section else None,
                "class_section_name": (
                    ex.class_section.section_name or ex.class_section.section_code
                ) if ex.class_section else None,
                "exam_type":          ex.exam_type,
                "exam_date":          ex.exam_date.strftime("%Y-%m-%d"),
                "start_time":         ex.start_time.strftime("%H:%M:%S"),
                "end_time":           ex.end_time.strftime("%H:%M:%S"),
                "room":               ex.room,
                "note":               ex.note,
            })

        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
