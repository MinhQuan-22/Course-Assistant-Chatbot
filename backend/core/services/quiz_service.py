import re
import random
from .vector_store import query_chroma


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\u00a0", " ")
    text = text.replace("•", " ")
    text = text.replace("", " ")
    text = text.replace("«", " ")
    text = text.replace("»", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_sentences(text: str):
    text = clean_text(text)
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if len(p.strip()) > 40]


def is_good_sentence(sentence: str) -> bool:
    lowered = sentence.lower()

    bad_starts = (
        "chapter",
        "lecture",
        "unit",
        "page",
        "software engineering",
        "key points",
    )

    if len(sentence) < 40 or len(sentence) > 220:
        return False

    if any(lowered.startswith(x) for x in bad_starts):
        return False

    if sentence.count("-") > 3:
        return False

    return True


def build_distractors(correct_sentence: str, pool: list[str], count: int = 3):
    distractors = []

    for sentence in pool:
        cleaned = clean_text(sentence)

        if cleaned.lower() == correct_sentence.lower():
            continue

        if not is_good_sentence(cleaned):
            continue

        if cleaned not in distractors:
            distractors.append(cleaned)

        if len(distractors) >= count:
            break

    while len(distractors) < count:
        fallback_options = [
            "A hardware installation procedure.",
            "A network cable configuration standard.",
            "A business policy unrelated to software engineering.",
            "A financial accounting process.",
        ]
        candidate = fallback_options[len(distractors) % len(fallback_options)]
        if candidate not in distractors:
            distractors.append(candidate)

    return distractors[:count]


def build_question(correct_sentence: str, all_sentences: list[str], index: int):
    distractors = build_distractors(correct_sentence, all_sentences, count=3)

    options = [correct_sentence] + distractors
    random.shuffle(options)

    answer_index = options.index(correct_sentence)

    return {
        "id": index,
        "question": "Which of the following statements is correct according to the course materials?",
        "statement": None,
        "options": options,
        "answer": answer_index,
    }


def generate_quiz(question_count=5):
    results = query_chroma("software engineering concepts definitions principles testing architecture process", top_k=25)
    documents = results.get("documents", [[]])[0]

    all_sentences = []
    seen = set()

    for doc in documents:
        for sentence in split_sentences(doc):
            cleaned = clean_text(sentence)
            key = cleaned.lower()

            if key in seen:
                continue

            if not is_good_sentence(cleaned):
                continue

            seen.add(key)
            all_sentences.append(cleaned)

    random.shuffle(all_sentences)

    questions = []
    for i, sentence in enumerate(all_sentences[:question_count], start=1):
        questions.append(build_question(sentence, all_sentences, i))

    return questions