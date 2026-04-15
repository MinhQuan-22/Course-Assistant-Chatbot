from pathlib import Path
from pypdf import PdfReader
from docx import Document as DocxDocument


def parse_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def parse_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    texts = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            texts.append(page_text)

    return "\n".join(texts)


def parse_docx(file_path: str) -> str:
    doc = DocxDocument(file_path)
    texts = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(texts)


def parse_file(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()

    if ext == ".txt":
        return parse_txt(file_path)
    if ext == ".pdf":
        return parse_pdf(file_path)
    if ext == ".docx":
        return parse_docx(file_path)

    raise ValueError(f"Unsupported file type: {ext}")

def parse_pdf_pages(file_path: str):
    reader = PdfReader(file_path)
    pages = []

    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        cleaned = clean_text(page_text)
        if cleaned:
            pages.append({
                "page": idx + 1,
                "text": cleaned
            })

    return pages