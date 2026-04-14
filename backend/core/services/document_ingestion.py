from .file_parser import parse_file
from .chunking import chunk_text
from .vector_store import add_chunks_to_chroma


def ingest_document(document):
    text = parse_file(document.file_path)
    chunks = chunk_text(text, chunk_size=500, overlap=50)

    if not chunks:
        raise ValueError("No text chunks generated from document")

    metadatas = []
    ids = []

    for idx, _chunk in enumerate(chunks):
        metadatas.append({
            "document_id": document.id,
            "document_name": document.name,
            "chunk_index": idx,
        })
        ids.append(f"doc_{document.id}_chunk_{idx}")

    add_chunks_to_chroma(chunks, metadatas, ids)

    return {
        "chunk_count": len(chunks)
    }