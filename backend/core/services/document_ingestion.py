from pathlib import Path
from .file_parser import parse_file, parse_pdf_pages
from .chunking import chunk_text
from .vector_store import add_chunks_to_chroma


def ingest_document(document):
    ext = Path(document.file_path).suffix.lower()

    chunks = []
    metadatas = []
    ids = []

    if ext == ".pdf":
        pages = parse_pdf_pages(document.file_path)

        chunk_counter = 0
        for page_data in pages:
            page_chunks = chunk_text(page_data["text"], chunk_size=1200, overlap=150)

            for page_chunk in page_chunks:
                chunks.append(page_chunk)
                metadatas.append({
                    "document_id": document.id,
                    "document_name": document.name,
                    "page": page_data["page"],
                    "chunk_index": chunk_counter,
                })
                ids.append(f"doc_{document.id}_page_{page_data['page']}_chunk_{chunk_counter}")
                chunk_counter += 1
    else:
        text = parse_file(document.file_path)
        text_chunks = chunk_text(text, chunk_size=1200, overlap=150)

        for idx, chunk in enumerate(text_chunks):
            chunks.append(chunk)
            metadatas.append({
                "document_id": document.id,
                "document_name": document.name,
                "chunk_index": idx,
            })
            ids.append(f"doc_{document.id}_chunk_{idx}")

    if not chunks:
        raise ValueError("No text chunks generated from document")

    add_chunks_to_chroma(chunks, metadatas, ids)

    return {
        "chunk_count": len(chunks)
    }