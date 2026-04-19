import json
import time
import datetime
from .vector_store import query_chroma
from .quiz_service import generate_quiz
from ..models import ExamSchedule, Subject, SystemSetting
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

def generate_answer_stream(query: str, subject_id: int = None, history: str = ""):
    # ── SETTINGS CONFIG ──
    api_key_setting = SystemSetting.objects.filter(setting_key='openai_api_key').first()
    model_setting = SystemSetting.objects.filter(setting_key='ai_model').first()
    
    api_key = api_key_setting.setting_value if (api_key_setting and api_key_setting.setting_value) else ""
    model_name = model_setting.setting_value if (model_setting and model_setting.setting_value) else "gpt-3.5-turbo"
    
    is_openrouter = api_key.startswith("sk-or-v1-")
    if is_openrouter and "/" not in model_name:
        model_name = f"openai/{model_name}"

    query_lower = query.lower()
    contextualized_query = f"{history}\nUser: {query}".strip() if history else query
    
    # ── LLM ROUTER AGENT (INTENT CLASSIFICATION) ──
    intent = "general_chat" # Default fallback
    
    if api_key:
        llm_kwargs = {
            "model": model_name,
            "api_key": api_key,
            "temperature": 0.0,
            "max_tokens": 30
        }
        if is_openrouter:
            llm_kwargs["base_url"] = "https://openrouter.ai/api/v1"
            
        try:
            router_llm = ChatOpenAI(**llm_kwargs)
            router_prompt = SystemMessage(
                content="Phân loại câu hỏi của người dùng thành 1 trong 4 nhãn sau (TRẢ VỀ ĐÚNG MỘT NHÃN, KHÔNG GIẢI THÍCH): "
                        "'exam_schedule' (chỉ các câu hỏi trực tiếp tra cứu về lịch thi, ngày thi, giờ thi, tháng thi, phòng thi, loại kỳ thi), "
                        "'quiz_generation' (yêu cầu tạo quiz, giao bài tập trắc nghiệm, ôn tập kiểm tra), "
                        "'document_qa' (tra cứu nội dung lý thuyết, bài giảng, khái niệm học thuật, tài liệu ôn tập), "
                        "'general_chat' (hỏi ngày giờ hôm nay, hỏi thăm sức khỏe, chào hỏi thông thường, các vấn đề ngoài luồng học thuật)."
            )
            resp = router_llm.invoke([router_prompt, HumanMessage(content=contextualized_query)])
            detected = resp.content.strip().lower()
            if "exam_schedule" in detected: intent = "exam_schedule"
            elif "quiz_generation" in detected or "quiz" in detected: intent = "quiz_generation"
            elif "document_qa" in detected: intent = "document_qa"
            else: intent = "general_chat"
        except Exception as e:
            intent = "general_chat"
    else:
        # Fallback to Mock Rules if no API key
        if any(kw in query_lower for kw in ['tạo câu hỏi', 'bài tập', 'trắc nghiệm', 'quiz', 'ôn tập']):
            intent = "quiz_generation"
        elif any(kw in query_lower for kw in ['lịch thi', 'thi cuối kỳ', 'thi giữa kỳ', 'khi nào thi', 'phòng thi']):
            intent = "exam_schedule"
        elif any(kw in query_lower for kw in ['giờ', 'ngày mấy', 'chào', 'hello']):
            intent = "general_chat"

    # ── AGENT 1: Quiz Generation Action ──
    if intent == "quiz_generation":
        count = 5
        if '3' in query: count = 3
        elif '10' in query: count = 10
        elif '15' in query: count = 15
        
        questions = generate_quiz(question_count=count)
        quiz_json = json.dumps(questions, ensure_ascii=False)
        
        answer_text = f"Tôi đã phân tích tự động yêu cầu của bạn bằng AI Router và tạo ra {len(questions)} câu hỏi ôn tập.\nBạn có thể làm bài ngay dưới đây:\n\n[QUIZ_DATA]{quiz_json}[/QUIZ_DATA]"
        
        for i in range(0, len(answer_text), 10):
            yield {"text": answer_text[i:i+10], "sources": []}
            time.sleep(0.01)
        return

    extracted_sources = []
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

    # ── AGENT 2: Define System Prompt based on Intent ──
    if intent == "exam_schedule":
        yield {"text": "AI Router đã xác định bạn muốn tra cứu lịch thi. Đang tổng hợp dữ liệu hành chính và phản hồi...\n\n", "sources": []}
        time.sleep(0.5)
        
        exam_query = ExamSchedule.objects.all().order_by('exam_date')
        if subject_id:
            exam_query = exam_query.filter(class_section__subject_id=subject_id)
            
        exams = list(exam_query)
        context_str = f"Thời gian thực tế của hệ thống hiện tại là: {now_str}.\nDANH SÁCH LỊCH THI TRONG CƠ SỞ DỮ LIỆU CỦA USER ĐANG HỎI:\n"
        if not exams:
            context_str += "Hiện tại chưa có lịch thi nào được công bố cho hệ thống."
        else:
            for ex in exams:
                exam_type_dict = {'midterm': 'Thi giữa kỳ', 'final': 'Thi cuối kỳ', 'makeup': 'Thi bổ sung', 'other': 'Thi Khác'}
                exam_name = exam_type_dict.get(ex.exam_type, 'Kỳ thi')
                class_str = f"Lớp {ex.class_section.section_name or ex.class_section.section_code}" if ex.class_section else "Chung toàn khóa"
                context_str += f"- {exam_name} môn {ex.subject.name} ({class_str}): Ngày {ex.exam_date.strftime('%d/%m/%Y')} lúc {ex.start_time.strftime('%H:%M')} tại {ex.room or 'Chưa phân phòng'}.\n"
        
        system_prompt = (
            "Bạn là trợ lý tư vấn học vụ AI. Người dùng đang hỏi về lịch thi.\n"
            f"Dưới đây là DỮ LIỆU LỊCH THI DUY NHẤT mà bạn được biết:\n\"\"\"{context_str}\"\"\"\n"
            "Yêu cầu xử lý triệt để:\n"
            "- Trả lời CHÍNH XÁC dựa vào dữ liệu trên. Phải tự động rà soát phân biệt rõ loại hình thi như giữa kỳ (midterm) và cuối kỳ (final) mà người dùng yêu cầu.\n"
            "- Nếu người dùng hỏi 1 tháng/loại thi mà không có thông tin trong Bối cảnh, phải trả lời rõ ràng là KHÔNG có kỳ thi đó.\n"
            "- Bạn là một AI thông minh nên hãy ghép nối Logic các thông tin sao cho tự nhiên nhất."
        )

    elif intent == "general_chat":
        system_prompt = (
            "Bạn là 3N Chatbot, một trợ lý AI giáo dục thân thiện.\n"
            f"Thông tin thời gian thực lúc này: {now_str}.\n"
            "Hãy trả lời câu hỏi giao tiếp thông thường của người học bằng thái độ nền nã và thân thiện.\n"
            "Lưu ý bổ sung: Nếu nhận thấy người dùng muốn hỏi sâu về lịch thi hay kiến thức, hãy gợi ý họ đặt câu hỏi rõ ràng hơn để Router kích hoạt tra cứu cơ sở dữ liệu."
        )

    else:
        # Default document_qa RAG Flow
        results = query_chroma(contextualized_query, top_k=5)

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not documents:
            for word in "Tôi không tìm thấy thông tin liên quan trong hệ thống tài liệu hiện tại.".split(" "):
                yield {"text": word + " ", "sources": []}
                time.sleep(0.05)
            return

        filtered = []
        for doc, meta, dist in zip(documents, metadatas, distances):
            if dist is not None and dist > 1.1: continue
            cleaned = " ".join(doc.split())
            filtered.append((cleaned, meta, dist))

        if not filtered:
            for word in "Nội dung bạn hỏi khá sâu hoặc không có trong tài liệu. Vui lòng cung cấp thêm từ khóa cụ thể.".split(" "):
                yield {"text": word + " ", "sources": []}
                time.sleep(0.05)
            return

        best_chunk, best_meta, _ = filtered[0]
        
        extracted_sources = [{
            "document_name": best_meta.get("document_name"),
            "page": best_meta.get("page"),
            "chunk_index": best_meta.get("chunk_index"),
        }]
        
        system_prompt = (
            "Bạn là trợ lý AI giáo dục. Hãy trả lời câu hỏi của sinh viên dựa trên tài liệu được cung cấp.\n"
            f"Tài liệu trích dẫn:\n\"\"\"{best_chunk}\"\"\"\n\n"
            "Yêu cầu:\n"
            "- Ưu tiên trả lời dựa vào thông tin trong tài liệu.\n"
            "- Trả lời bằng tiếng Việt.\n"
            "- Trình bày mạch lạc, có thể dùng Markdown."
        )


    # ── AGENT EXECUTION (CALL REAL LLM) ──
    if not api_key:
        mock_resp = "Hệ thống đang chạy ở Mock Mode (chưa có API Key). "
        if intent == "exam_schedule":
            mock_resp += "Dữ liệu lịch thi đã được lấy nhưng không có AI LLM để format và filter."
        elif intent == "general_chat":
            mock_resp += f"Bây giờ là lúc {now_str}."
        else:
            mock_resp += f"Dựa trên tài liệu khóa học (Mock RAG)..."
            
        for word in mock_resp.split(" "):
            yield {"text": word + " ", "sources": extracted_sources}
            time.sleep(0.02)
        return

    llm_kwargs = {
        "model": model_name,
        "api_key": api_key,
        "temperature": 0.1,
        "streaming": True
    }
    if is_openrouter:
        llm_kwargs["base_url"] = "https://openrouter.ai/api/v1"

    try:
        llm = ChatOpenAI(**llm_kwargs)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=contextualized_query)
        ]
        
        for chunk in llm.stream(messages):
            if chunk.content:
                yield {"text": chunk.content, "sources": extracted_sources}
                
    except Exception as e:
        yield {"text": f"\n\n[System Error: LLM API failed - {str(e)}]", "sources": extracted_sources}