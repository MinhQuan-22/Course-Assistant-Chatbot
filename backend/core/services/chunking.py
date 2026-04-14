def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100):
    if not text.strip():
        return []

    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) + 1 <= chunk_size:
            current_chunk += paragraph + "\n"
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())

            if overlap > 0 and chunks:
                overlap_text = current_chunk[-overlap:]
                current_chunk = overlap_text + "\n" + paragraph + "\n"
            else:
                current_chunk = paragraph + "\n"

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks