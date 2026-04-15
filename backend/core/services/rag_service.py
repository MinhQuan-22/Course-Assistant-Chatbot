from .vector_store import query_chroma


def generate_answer(query: str):
    results = query_chroma(query, top_k=5)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not documents:
        return {
            "answer": "I could not find relevant information in the uploaded course documents.",
            "sources": []
        }

    filtered = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        if dist is not None and dist > 1.1:
            continue

        cleaned = " ".join(doc.split())
        filtered.append((cleaned, meta, dist))

    if not filtered:
        return {
            "answer": "I could not find highly relevant content for this question. Please try using simpler or more specific keywords.",
            "sources": []
        }

    best_chunk, best_meta, _ = filtered[0]

    answer = (
        "Based on the course materials, here is the clearest explanation I found:\n\n"
        f"{best_chunk}"
    )

    source = {
        "document_name": best_meta.get("document_name"),
        "page": best_meta.get("page"),
        "chunk_index": best_meta.get("chunk_index"),
    }

    return {
        "answer": answer,
        "sources": [source]
    }