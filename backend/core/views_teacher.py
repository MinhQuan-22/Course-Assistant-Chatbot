import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg
from .auth_utils import decode_jwt_token
from .models import (
    User, Subject, ClassSection, TeachingAssignment,
    StudentProfile, Enrollment, Quiz, QuizQuestion, QuizAttempt, Message
)

def _get_teacher(request):
    """Return (user, error_response). Only allows teacher or admin."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, JsonResponse({"error": "Authorization token required"}, status=401)

    payload = decode_jwt_token(auth.split(" ", 1)[1])
    if not payload:
        return None, JsonResponse({"error": "Invalid or expired token"}, status=401)

    user = User.objects.filter(id=payload["user_id"]).first()
    if not user:
        return None, JsonResponse({"error": "User not found"}, status=404)
    if user.role not in ["teacher", "admin"]:
        return None, JsonResponse({"error": "Teacher access required"}, status=403)
    return user, None

@csrf_exempt
def teacher_stats(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user, err = _get_teacher(request)
    if err: return err

    try:
        if user.role == 'teacher':
            assignments = TeachingAssignment.objects.filter(teacher_profile__user_id=user.id)
            class_section_ids = assignments.values_list('class_section_id', flat=True)
            enrollments = Enrollment.objects.filter(class_section_id__in=class_section_ids, status='enrolled')
        else:
            enrollments = Enrollment.objects.filter(status='enrolled')
            
        student_profiles = StudentProfile.objects.filter(id__in=enrollments.values_list('student_profile_id', flat=True)).select_related('user')
        
        student_stats = []
        for sp in student_profiles:
            student_user_id = sp.user.id
            attempts = QuizAttempt.objects.filter(user_id=student_user_id)
            quiz_count = attempts.count()
            
            avg_score_dict = attempts.aggregate(avg_val=Avg('score'))
            avg_score = round(avg_score_dict['avg_val'] or 0, 1)

            msg_count = Message.objects.filter(conversation__user_id=student_user_id, role='user').count()

            student_stats.append({
                "student_id": student_user_id,
                "name": sp.user.name,
                "student_code": sp.student_code,
                "class_name": sp.class_name,
                "quizzes": quiz_count,
                "avgScore": avg_score,
                "messages": msg_count
            })

        total_students = len(student_stats)
        total_avg_score = round(sum(s['avgScore'] for s in student_stats) / total_students, 1) if total_students > 0 else 0
        total_messages = sum(s['messages'] for s in student_stats)
        
        return JsonResponse({
            "summary": {
                "total_students": total_students,
                "avg_score": total_avg_score,
                "total_messages": total_messages
            },
            "students": student_stats
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def teacher_quizzes(request):
    user, err = _get_teacher(request)
    if err: return err

    if request.method == 'GET':
        try:
            if user.role == 'teacher':
                quizzes = Quiz.objects.filter(created_by_id=user.id).select_related('class_section', 'class_section__subject').order_by('-created_at')
            else:
                quizzes = Quiz.objects.all().select_related('class_section', 'class_section__subject').order_by('-created_at')
                
            data = []
            for q in quizzes:
                class_section_name = None
                if q.class_section:
                    class_section_name = f"{q.class_section.subject.name} ({q.class_section.section_code})" if q.class_section.subject else q.class_section.section_code
                
                data.append({
                    "id": q.id,
                    "title": q.title,
                    "subject_id": q.subject_id,
                    "class_section_id": q.class_section_id,
                    "class_section_name": class_section_name,
                    "description": q.description,
                    "chapter_label": q.chapter_label,
                    "is_published": q.is_published,
                    "created_at": q.created_at.isoformat() if q.created_at else None,
                    "question_count": QuizQuestion.objects.filter(quiz_id=q.id).count()
                })
            return JsonResponse({"quizzes": data})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            class_section_id_raw = body.get('class_section_id')
            
            # Convert to int or None
            if class_section_id_raw:
                try:
                    class_section_id = int(class_section_id_raw)
                except (ValueError, TypeError):
                    class_section_id = None
            else:
                class_section_id = None
            
            quiz = Quiz.objects.create(
                title=body.get('title', 'Untitled Quiz'),
                subject_id=body.get('subject_id'),
                class_section_id=class_section_id,
                created_by_id=user.id,
                source_type='teacher_created',
                description=body.get('description', ''),
                chapter_label=body.get('chapter_label', ''),
                is_published=False
            )
            return JsonResponse({
                "id": quiz.id,
                "title": quiz.title,
                "message": "Quiz created successfully."
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def teacher_quizzes_generate_ai(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    user, err = _get_teacher(request)
    if err: return err

    try:
        body = json.loads(request.body)
        title = body.get('title', 'AI Generated Quiz')
        class_section_id_raw = body.get('class_section_id')
        document_id_raw = body.get('document_id')
        question_count = int(body.get('question_count', 5))
        
        # Convert to int
        try:
            class_section_id = int(class_section_id_raw) if class_section_id_raw else None
            document_id = int(document_id_raw) if document_id_raw else None
        except (ValueError, TypeError):
            return JsonResponse({"error": "Invalid class_section_id or document_id format"}, status=400)
        
        if not class_section_id or not document_id:
            return JsonResponse({"error": "class_section_id and document_id are required"}, status=400)
            
        from .models import Document, SystemSetting, ClassSection, Subject
        doc = Document.objects.filter(id=document_id).first()
        if not doc:
            return JsonResponse({"error": "Document not found"}, status=404)
            
        cs = ClassSection.objects.filter(id=class_section_id).first()
        subject_id = cs.subject_id if cs else None

        # 1. Read document text
        from .services.file_parser import parse_file
        try:
            full_text = parse_file(doc.file_path.path if hasattr(doc.file_path, 'path') else str(doc.file_path))
            # Truncate to first 10000 chars to avoid massive API cost
            source_text = full_text[:10000]
        except Exception as e:
            return JsonResponse({"error": f"Failed to read document: {str(e)}"}, status=500)

        # 2. Get LLM Settings
        api_key_setting = SystemSetting.objects.filter(setting_key='openai_api_key').first()
        model_setting = SystemSetting.objects.filter(setting_key='ai_model').first()
        api_key = api_key_setting.setting_value if api_key_setting else ""
        model_name = model_setting.setting_value if model_setting else "gpt-3.5-turbo"
        
        if not api_key:
            return JsonResponse({"error": "OpenAI API Key is not configured in Settings."}, status=500)

        is_openrouter = api_key.startswith("sk-or-v1-")
        if is_openrouter and "/" not in model_name:
            model_name = f"openai/{model_name}"

        # 3. Call Langchain
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
        
        llm_kwargs = {
            "model": model_name,
            "api_key": api_key,
            "temperature": 0.2,
        }
        if is_openrouter:
            llm_kwargs["base_url"] = "https://openrouter.ai/api/v1"
            
        llm = ChatOpenAI(**llm_kwargs)
        
        sys_prompt = f"Sinh {question_count} câu hỏi trắc nghiệm tiếng Việt dựa trên nội dung tài liệu sau. TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON ARRAY. Mỗi object có: 'question' (chuỗi), 'option_a' (chuỗi), 'option_b' (chuỗi), 'option_c' (chuỗi), 'option_d' (chuỗi), 'correct_answer' (một chữ cái in hoa 'A' hoặc 'B' hoặc 'C' hoặc 'D'), 'explanation' (chuỗi giải thích ngắn gọn). KHÔNG trả về Markdown, CHỈ trả về đoạn JSON chứa Array."
        
        resp = llm.invoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content=source_text)
        ])
        
        content = resp.content.strip()
        if content.startswith('```json'):
            content = content.replace('```json', '').replace('```', '').strip()
        if content.startswith('```'):
            content = content.replace('```', '').strip()
            
        questions_data = json.loads(content)
        if not isinstance(questions_data, list):
            raise ValueError("LLM did not return a JSON array.")

        # 4. Save Quiz
        quiz = Quiz.objects.create(
            title=title,
            subject_id=subject_id,
            class_section_id=class_section_id,
            created_by_id=user.id,
            source_type='ai_generated',
            description=f"Generated by AI from {doc.name}",
            chapter_label='',
            is_published=False
        )
        
        # 5. Bulk create questions
        for q in questions_data[:question_count]:
            QuizQuestion.objects.create(
                quiz=quiz,
                question=q.get('question', 'Unknown Question'),
                option_a=q.get('option_a', 'N/A'),
                option_b=q.get('option_b', 'N/A'),
                option_c=q.get('option_c', 'N/A'),
                option_d=q.get('option_d', 'N/A'),
                correct_answer=q.get('correct_answer', 'A')[:1].upper(),
                explanation=q.get('explanation', '')
            )
            
        return JsonResponse({
            "id": quiz.id,
            "title": quiz.title,
            "message": f"Successfully generated {len(questions_data)} questions via AI."
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Failed to parse AI response. AI hallucinated non-JSON output."}, status=500)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def teacher_quiz_detail(request, quiz_id):
    user, err = _get_teacher(request)
    if err: return err

    try:
        if user.role == 'teacher':
            quiz = Quiz.objects.filter(id=quiz_id, created_by_id=user.id).first()
        else:
            quiz = Quiz.objects.filter(id=quiz_id).first()
            
        if not quiz:
            return JsonResponse({"error": "Quiz not found or access denied"}, status=404)

        if request.method == 'GET':
            questions = QuizQuestion.objects.filter(quiz_id=quiz.id)
            q_data = []
            for q in questions:
                q_data.append({
                    "id": q.id,
                    "question": q.question,
                    "option_a": q.option_a,
                    "option_b": q.option_b,
                    "option_c": q.option_c,
                    "option_d": q.option_d,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                })
                
            return JsonResponse({
                "id": quiz.id,
                "title": quiz.title,
                "subject_id": quiz.subject_id,
                "class_section_id": quiz.class_section_id,
                "description": quiz.description,
                "chapter_label": quiz.chapter_label,
                "is_published": quiz.is_published,
                "questions": q_data
            })

        elif request.method == 'PATCH':
            body = json.loads(request.body)
            if 'title' in body: quiz.title = body['title']
            if 'description' in body: quiz.description = body['description']
            if 'is_published' in body: quiz.is_published = bool(body['is_published'])
            quiz.save()
            return JsonResponse({"message": "Quiz updated successfully."})
            
        elif request.method == 'DELETE':
            quiz.delete()
            return JsonResponse({"message": "Quiz deleted successfully."})
            
        else:
            return JsonResponse({"error": "Method not allowed"}, status=405)
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def teacher_quiz_questions(request, quiz_id):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    user, err = _get_teacher(request)
    if err: return err

    try:
        if user.role == 'teacher':
            quiz = Quiz.objects.filter(id=quiz_id, created_by_id=user.id).first()
        else:
            quiz = Quiz.objects.filter(id=quiz_id).first()
            
        if not quiz:
            return JsonResponse({"error": "Quiz not found"}, status=404)
            
        body = json.loads(request.body)
        q = QuizQuestion.objects.create(
            quiz_id=quiz.id,
            question=body['question'],
            option_a=body['option_a'],
            option_b=body['option_b'],
            option_c=body['option_c'],
            option_d=body['option_d'],
            correct_answer=body['correct_answer'],
            explanation=body.get('explanation', '')
        )
        return JsonResponse({"id": q.id, "message": "Question added"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def teacher_quiz_question_detail(request, quiz_id, question_id):
    user, err = _get_teacher(request)
    if err: return err

    try:
        if user.role == 'teacher':
            quiz = Quiz.objects.filter(id=quiz_id, created_by_id=user.id).first()
        else:
            quiz = Quiz.objects.filter(id=quiz_id).first()
            
        if not quiz:
            return JsonResponse({"error": "Quiz not found"}, status=404)
            
        q = QuizQuestion.objects.filter(id=question_id, quiz_id=quiz.id).first()
        if not q:
            return JsonResponse({"error": "Question not found"}, status=404)

        if request.method == 'DELETE':
            q.delete()
            return JsonResponse({"message": "Question deleted"})
            
        elif request.method in ['PUT', 'PATCH']:
            body = json.loads(request.body)
            if 'question' in body: q.question = body['question']
            if 'option_a' in body: q.option_a = body['option_a']
            if 'option_b' in body: q.option_b = body['option_b']
            if 'option_c' in body: q.option_c = body['option_c']
            if 'option_d' in body: q.option_d = body['option_d']
            if 'correct_answer' in body: q.correct_answer = body['correct_answer']
            if 'explanation' in body: q.explanation = body['explanation']
            q.save()
            return JsonResponse({"message": "Question updated"})
            
        else:
            return JsonResponse({"error": "Method not allowed"}, status=405)
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
