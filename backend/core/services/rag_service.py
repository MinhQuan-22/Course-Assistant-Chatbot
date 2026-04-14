from .vector_store import query_chroma


def generate_answer(query: str):
    results = query_chroma(query, top_k=5)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not documents:
        return {
            "answer": "No relevant information found in the uploaded documents.",
            "sources": []
        }

    filtered_chunks = []
    filtered_sources = []

    for doc, meta, dist in zip(documents, metadatas, distances):
        # Smaller distance = more relevant
        if dist is not None and dist > 1.2:
            continue

        cleaned = " ".join(doc.split())
        if cleaned not in filtered_chunks:
            filtered_chunks.append(cleaned)
            filtered_sources.append({
                "document_name": meta.get("document_name"),
                "chunk_index": meta.get("chunk_index")
            })

    if not filtered_chunks:
        return {
            "answer": "I couldn't find relevant information in the uploaded documents. Please try rephrasing your question.",
            "sources": []
        }

    answer = f"""Answer:
    {filtered_chunks[0]}
    (Extracted from course materials)
    """

    return {
        "answer": answer,
        "sources": filtered_sources[:2]
    }