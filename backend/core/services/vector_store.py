import chromadb
from sentence_transformers import SentenceTransformer
from django.conf import settings

CHROMA_HOST = getattr(settings, "CHROMA_HOST", "127.0.0.1")
CHROMA_PORT = getattr(settings, "CHROMA_PORT", 8001)
COLLECTION_NAME = "course_documents"

client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def get_collection():
    return client.get_or_create_collection(name=COLLECTION_NAME)


def embed_texts(texts):
    model = get_embedding_model()
    return model.encode(texts).tolist()


def add_chunks_to_chroma(chunks, metadatas, ids):
    collection = get_collection()
    embeddings = embed_texts(chunks)

    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids,
        embeddings=embeddings
    )


def query_chroma(query_text, top_k=5):
    collection = get_collection()
    model = get_embedding_model()
    query_embedding = model.encode([query_text]).tolist()[0]

    candidate_k = top_k * 3
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=candidate_k,
        include=["documents", "metadatas", "distances"]
    )

    if not results or not results.get("documents") or not results["documents"][0]:
        return results

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    keywords = set(w.lower() for w in query_text.split() if len(w) > 2)

    candidates = []
    for i in range(len(documents)):
        doc_lower = documents[i].lower()
        keyword_score = sum(1 for kw in keywords if kw in doc_lower)
        candidates.append({
            "semantic_rank": i + 1,
            "keyword_score": keyword_score,
            "doc": documents[i],
            "meta": metadatas[i],
            "dist": distances[i]
        })

    candidates.sort(key=lambda x: x["keyword_score"], reverse=True)
    for rank, cand in enumerate(candidates, 1):
        cand["keyword_rank"] = rank

    rrf_k = 60
    for cand in candidates:
        cand["rrf_score"] = (1.0 / (rrf_k + cand["semantic_rank"])) + (1.0 / (rrf_k + cand["keyword_rank"]))

    candidates.sort(key=lambda x: x["rrf_score"], reverse=True)
    top_candidates = candidates[:top_k]

    return {
        "documents": [[c["doc"] for c in top_candidates]],
        "metadatas": [[c["meta"] for c in top_candidates]],
        "distances": [[c["dist"] for c in top_candidates]]
    }