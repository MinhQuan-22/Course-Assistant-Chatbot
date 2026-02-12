# Course Assistant Chatbot (RAG) — Full-stack

Course Assistant Chatbot là hệ thống chatbot “Trợ giảng” cho từng môn học, trả lời dựa trên **tài liệu môn học** bằng kỹ thuật **RAG (Retrieval-Augmented Generation)**.

## Tech Stack (chốt theo đề cương)
- **Frontend:** ReactJS + TypeScript (Vite)
- **Backend:** Python + Django (Django REST Framework)
- **Main DB:** PostgreSQL (User, chat history, metadata…)
- **Vector DB:** ChromaDB (lưu embeddings tài liệu)
- **LLM/RAG Core:** LangChain (OpenAI/Gemini API)
- **Deploy:** Docker Compose

## Ports / Services
- Frontend: http://localhost:5173
- Backend:  http://localhost:8001
- ChromaDB: http://localhost:8000
- PostgreSQL: localhost:5432

---

# Quickstart (Docker — khuyến nghị)
## 0) Prerequisites
- Docker Desktop (Mac M2 OK)
- Git

## 1) Setup env
```bash
cp .env.example .env
