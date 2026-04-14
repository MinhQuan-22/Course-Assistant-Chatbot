import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_HOST = "127.0.0.1"
CHROMA_PORT = 8001
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

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )

    return results