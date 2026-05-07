import json
import time
import datetime
from .vector_store import query_chroma
from .quiz_service import generate_quiz
from ..models import ExamSchedule, Subject, SystemSetting
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


# Helper functions
def _get_llm_config():
    api_key_setting = SystemSetting.objects.filter(setting_key='openai_api_key').first()
    model_setting = SystemSetting.objects.filter(setting_key='ai_model').first()

    api_key = (api_key_setting.setting_value or "").strip() if api_key_setting else ""
    model_name = (model_setting.setting_value or "gpt-3.5-turbo").strip() if model_setting else "gpt-3.5-turbo"

    is_openrouter = api_key.startswith("sk-or-v1-")
    if is_openrouter and "/" not in model_name:
        model_name = f"openai/{model_name}"

    return api_key, model_name, is_openrouter


def _build_llm(api_key: str, model_name: str, is_openrouter: bool,
               temperature: float = 0.1, streaming: bool = True,
               max_tokens: int = None) -> ChatOpenAI:
    kwargs = {
        "model": model_name,
        "api_key": api_key,
        "temperature": temperature,
        "streaming": streaming,
    }
    if max_tokens:
        kwargs["max_tokens"] = max_tokens
    if is_openrouter:
        kwargs["base_url"] = "https://openrouter.ai/api/v1"
    return ChatOpenAI(**kwargs)


def _classify_intent(query: str, context: str, api_key: str, model_name: str, is_openrouter: bool) -> str:
    if api_key:
        try:
            router_llm = _build_llm(api_key, model_name, is_openrouter,
                                     temperature=0.0, streaming=False, max_tokens=20)
            router_system = SystemMessage(content=(
                "Phân loại câu hỏi thành ĐÚNG MỘT nhãn (chỉ trả về nhãn, không giải thích):\n"
                "- 'exam_schedule': hỏi về lịch thi, ngày thi, giờ thi, phòng thi, loại kỳ thi\n"
                "- 'quiz_generation': yêu cầu tạo câu hỏi trắc nghiệm, ôn tập, đề thi thử\n"
                "- 'document_qa': hỏi về kiến thức, lý thuyết, khái niệm, nội dung bài giảng, tài liệu\n"
                "- 'general_chat': chào hỏi, hỏi thăm, giới thiệu bản thân, câu hỏi ngoài học thuật"
            ))
            resp = router_llm.invoke([router_system, HumanMessage(content=context)])
            detected = resp.content.strip().lower()
            if "exam_schedule" in detected:
                return "exam_schedule"
            elif "quiz_generation" in detected or "quiz" in detected:
                return "quiz_generation"
            elif "document_qa" in detected:
                return "document_qa"
            else:
                return "general_chat"
        except Exception:
            pass

    q = query.lower()
    if any(kw in q for kw in ['tạo câu hỏi', 'bài tập', 'trắc nghiệm', 'quiz', 'ôn tập', 'đề thi']):
        return "quiz_generation"
    if any(kw in q for kw in ['lịch thi', 'thi cuối kỳ', 'thi giữa kỳ', 'khi nào thi', 'phòng thi', 'ngày thi']):
        return "exam_schedule"
    if any(kw in q for kw in ['chào', 'hello', 'hi', 'bạn là ai', 'bây giờ là', 'hôm nay là']):
        return "general_chat"
    return "document_qa"


# RAG config
RAG_RELEVANCE_THRESHOLD = 1.35
RAG_TOP_K = 5
RAG_CONTEXT_CHUNKS = 3

def _retrieve_rag_context(query: str, top_k: int = RAG_TOP_K):
    results = query_chroma(query, top_k=top_k)
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    filtered = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        if dist is None or dist > RAG_RELEVANCE_THRESHOLD:
            continue
        cleaned = " ".join(doc.split())
        if len(cleaned) > 30:
            filtered.append((cleaned, meta, dist))

    if not filtered:
        return "", [], False

    filtered.sort(key=lambda x: x[2])
    top_chunks = filtered[:RAG_CONTEXT_CHUNKS]

    context_parts = []
    sources = []
    for i, (chunk, meta, _) in enumerate(top_chunks, 1):
        doc_name = meta.get("document_name", "Tài liệu không rõ tên")
        page = meta.get("page")
        page_str = f" (Trang {page})" if page else ""
        context_parts.append(f"[Đoạn {i} – {doc_name}{page_str}]\n{chunk}")
        if i == 1:
            sources.append({
                "document_name": doc_name,
                "page": page,
                "chunk_index": meta.get("chunk_index"),
            })

    return context_str, sources, True


# System prompts
TA_PERSONA = (
    "Bạn là 3N – Trợ Giảng AI của hệ thống Course Assistant, đóng vai một người trợ giảng thân thiện, "
    "nhiệt tình và hiểu biết sâu về môn học. Phong cách trả lời: tự nhiên như đang nói chuyện với sinh viên, "
    "giải thích rõ ràng, dùng ví dụ cụ thể khi cần, và luôn khuyến khích sinh viên học hỏi thêm. "
    "Trả lời bằng tiếng Việt, có thể dùng Markdown để trình bày mạch lạc.\n"
)

def _build_system_prompt_exam(context_str: str, now_str: str) -> str:
    return (
        TA_PERSONA +
        f"Hôm nay là: {now_str}.\n\n"
        "Dưới đây là toàn bộ lịch thi được hệ thống ghi nhận:\n"
        f"```\n{context_str}\n```\n\n"
        "Hướng dẫn trả lời:\n"
        "- Trả lời chính xác theo dữ liệu trên, phân biệt rõ giữa kỳ giữa kỳ / cuối kỳ / bổ sung.\n"
        "- Nếu sinh viên hỏi một mốc thời gian cụ thể, hãy lọc và chỉ đề cập những kỳ thi thực sự xảy ra trong khoảng đó.\n"
        "- Nếu không có kỳ thi nào cho điều kiện đó, hãy nói rõ ràng là chưa có.\n"
        "- Đừng bịa thêm thông tin ngoài danh sách trên.\n"
        "- Giao tiếp thân thiện, tránh liệt kê máy móc."
    )

def _build_system_prompt_rag(context_str: str) -> str:
    return (
        TA_PERSONA +
        "Bạn đã tìm thấy các đoạn tài liệu liên quan sau đây từ bộ tài liệu khóa học:\n\n"
        f"{context_str}\n\n"
        "Hướng dẫn trả lời:\n"
        "- Ưu tiên giải thích dựa trên nội dung tài liệu trên.\n"
        "- Bạn có thể bổ sung thêm kiến thức nền tảng của mình nếu nó giúp sinh viên hiểu rõ hơn, "
        "  nhưng hãy làm rõ phần nào là từ tài liệu, phần nào là kiến thức chung.\n"
        "- Trình bày sinh động, có ví dụ minh họa nếu phù hợp.\n"
        "- Cuối câu trả lời, có thể gợi ý sinh viên đọc thêm phần liên quan trong tài liệu."
    )

def _build_system_prompt_ai_only() -> str:
    return (
        TA_PERSONA +
        "Câu hỏi này không tìm thấy trong tài liệu khóa học hiện có, nhưng đây là một câu hỏi kiến thức "
        "học thuật mà bạn có thể trả lời từ kiến thức nền tảng của mình.\n\n"
        "Hướng dẫn:\n"
        "- Trả lời tận tình và đầy đủ như một trợ giảng giỏi.\n"
        "- Thông báo nhẹ nhàng rằng câu trả lời dựa trên kiến thức tổng quát, vì tài liệu khóa học "
        "  chưa đề cập đến chủ đề này.\n"
        "- Gợi ý sinh viên hỏi giảng viên nếu cần câu trả lời chính thống theo giáo trình."
    )

def _build_system_prompt_general(now_str: str) -> str:
    return (
        TA_PERSONA +
        f"Thời gian hiện tại là: {now_str}.\n\n"
        "Đây là một cuộc hội thoại thông thường. Hãy trả lời thân thiện và tự nhiên. "
        "Nếu sinh viên có vẻ muốn hỏi về nội dung học tập, hãy khuyến khích họ đặt câu hỏi cụ thể hơn "
        "để mình có thể tìm trong tài liệu giúp nhé."
    )


def generate_answer_stream(query: str, subject_id: int = None, history: str = ""):
    api_key, model_name, is_openrouter = _get_llm_config()
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

    contextualized_query = f"{history}\nUser: {query}".strip() if history else query

    # Step 1: Classify intent
    intent = _classify_intent(query, contextualized_query, api_key, model_name, is_openrouter)

    if intent == "quiz_generation":
        count = 5
        for n in [3, 10, 15, 7]:
            if str(n) in query:
                count = n
                break

        questions = generate_quiz(question_count=count)
        if questions:
            quiz_json = json.dumps(questions, ensure_ascii=False)
            answer_text = (
                f"Mình đã tạo sẵn {len(questions)} câu hỏi ôn tập cho bạn! 📝\n"
                f"Hãy bấm vào từng câu để chọn đáp án nhé:\n\n"
                f"[QUIZ_DATA]{quiz_json}[/QUIZ_DATA]"
            )
        else:
            answer_text = (
                "Hiện tại bộ tài liệu chưa đủ dữ liệu để tự động tạo câu hỏi trắc nghiệm. "
                "Bạn có thể thử lại sau khi giảng viên upload thêm tài liệu lên hệ thống nhé!"
            )

        for i in range(0, len(answer_text), 10):
            yield {"text": answer_text[i:i+10], "sources": []}
            time.sleep(0.01)
        return

    if intent == "exam_schedule":
        exam_query = ExamSchedule.objects.all().order_by("exam_date")
        if subject_id:
            exam_query = exam_query.filter(class_section__subject_id=subject_id)

        exams = list(exam_query)
        if not exams:
            context_str = "Hiện tại chưa có lịch thi nào được công bố trong hệ thống."
        else:
            exam_type_map = {
                "midterm": "Thi giữa kỳ",
                "final":   "Thi cuối kỳ",
                "makeup":  "Thi bổ sung / Học lại",
                "other":   "Kỳ thi khác",
            }
            lines = []
            for ex in exams:
                etype = exam_type_map.get(ex.exam_type, "Kỳ thi")
                cls = (
                    f"Lớp {ex.class_section.section_name or ex.class_section.section_code}"
                    if ex.class_section else "Chung toàn khóa"
                )
                room = ex.room or "Chưa phân phòng"
                note = f" – {ex.note}" if ex.note else ""
                lines.append(
                    f"• {etype} | Môn: {ex.subject.name} | {cls} | "
                    f"Ngày: {ex.exam_date.strftime('%d/%m/%Y')} | "
                    f"Giờ: {ex.start_time.strftime('%H:%M')}–{ex.end_time.strftime('%H:%M')} | "
                    f"Phòng: {room}{note}"
                )
            context_str = "\n".join(lines)

        system_prompt = _build_system_prompt_exam(context_str, now_str)
        extracted_sources = []

    elif intent == "general_chat":
        system_prompt = _build_system_prompt_general(now_str)
        extracted_sources = []

    else:
        context_str, extracted_sources, has_relevant = _retrieve_rag_context(contextualized_query)

        if has_relevant:
            system_prompt = _build_system_prompt_rag(context_str)
        else:
            system_prompt = _build_system_prompt_ai_only()

    if not api_key:
        if intent == "exam_schedule":
            mock = f"[Mock Mode] Đã lấy được dữ liệu lịch thi nhưng chưa có AI API Key để phân tích."
        elif intent == "general_chat":
            mock = f"[Mock Mode] Bây giờ là {now_str}. Chào bạn! 👋"
        else:
            mock = "[Mock Mode] Chưa có API Key. Hệ thống RAG đã truy vấn tài liệu nhưng cần AI để tổng hợp câu trả lời."

        for word in mock.split(" "):
            yield {"text": word + " ", "sources": extracted_sources}
            time.sleep(0.02)
        return

    try:
        llm = _build_llm(api_key, model_name, is_openrouter, temperature=0.3, streaming=True)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=contextualized_query),
        ]
        for chunk in llm.stream(messages):
            if chunk.content:
                yield {"text": chunk.content, "sources": extracted_sources}

    except Exception as e:
        yield {
            "text": f"\n\n⚠️ Xin lỗi, mình gặp sự cố kết nối với AI lúc này. Lỗi kỹ thuật: `{str(e)}`",
            "sources": extracted_sources,
        }