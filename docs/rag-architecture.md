# RAG Architecture – Course Assistant Chatbot

## Overview

The Course Assistant Chatbot uses a **Retrieval-Augmented Generation (RAG)** pipeline to answer student questions based on course materials uploaded by teachers. Instead of relying purely on a pre-trained LLM's internal knowledge, the system grounds its responses in the actual documents (PDFs, DOCX) provided for each subject.

This prevents hallucination and ensures answers stay relevant to the course content.

---

## Full Pipeline Diagram

```
Teacher uploads document
        │
        ▼
┌─────────────────────┐
│   File Parser        │  (file_parser.py)
│  PDF → text/pages   │  pypdf  →  parse_pdf_pages()
│  DOCX → paragraphs  │  python-docx → parse_docx()
└────────┬────────────┘
         │ raw text
         ▼
┌─────────────────────┐
│   Text Cleaning      │  (file_parser.py → clean_text())
│  Remove noise chars  │  &nbsp, bullets, extra whitespace
└────────┬────────────┘
         │ cleaned text
         ▼
┌─────────────────────┐
│   Chunking           │  (chunking.py → chunk_text())
│  chunk_size = 1200   │  Paragraph-aware splitting
│  overlap    = 150    │  Sliding window overlap
└────────┬────────────┘
         │ list of text chunks
         ▼
┌──────────────────────────┐
│   Embedding Generation    │  (vector_store.py → embed_texts())
│  Model: all-MiniLM-L6-v2  │  Sentence Transformers (local, no API cost)
│  Output: 384-dim vectors  │
└──────────┬───────────────┘
           │ embeddings + metadata
           ▼
┌─────────────────────┐
│   ChromaDB Storage   │  (vector_store.py → add_chunks_to_chroma())
│  Persistent HTTP     │  chromadb.HttpClient
│  Collection: course_ │  Stores: document, embedding, metadata
│    documents         │  (doc_id, doc_name, page, chunk_index)
└─────────────────────┘


──────────────  QUERY TIME  ──────────────


Student sends a question
        │
        ▼
┌──────────────────────────┐
│   Intent Classification   │  (rag_service.py → _classify_intent())
│  LLM-based (if API key)   │  Labels: exam_schedule | quiz_generation
│  Keyword fallback         │          document_qa   | general_chat
└────────┬─────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │                                   │
    ▼ document_qa                        ▼ exam_schedule / general_chat
┌─────────────────────┐          ┌───────────────────────┐
│   Hybrid Retrieval   │          │  Structured DB Query   │
│  (vector_store.py)   │          │  (Django ORM)          │
│                      │          │  ExamSchedule.objects  │
│  1. Semantic search  │          └──────────┬────────────┘
│     ChromaDB top-3k  │                     │
│  2. Keyword scoring  │                     │
│     (token overlap)  │                     │
│  3. RRF re-ranking   │                     │
│     (Reciprocal Rank │                     │
│      Fusion)         │                     │
│  4. Distance filter  │                     │
│     threshold = 1.35 │                     │
└────────┬────────────┘                     │
         │ top-k relevant chunks            │ exam data (structured text)
         └──────────┬────────────────────────┘
                    │ context string
                    ▼
┌──────────────────────────────┐
│   Prompt Construction         │  (rag_service.py)
│  System: TA persona + rules  │
│  + context (document chunks  │
│    or exam schedule data)    │
│  Human: student's question   │
└────────┬─────────────────────┘
         │ messages
         ▼
┌─────────────────────────────┐
│   LLM Generation             │  (LangChain → ChatOpenAI)
│  Model: GPT-3.5/4 or        │  Streaming response (SSE)
│         OpenRouter models    │  temperature = 0.3
└────────┬────────────────────┘
         │ streamed tokens
         ▼
┌─────────────────────┐
│   Response to User   │
│  Text + Source refs  │  document_name, page, chunk_index
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Chat History Save  │  (Django ORM)
│  Conversation        │  conversation_id → user
│  Message (role=user) │  content, sources_json
│  Message (role=asst) │  stored in MySQL
└─────────────────────┘
```

---

## Component Details

### 1. File Parser (`file_parser.py`)

| Function | Input | Output |
|---|---|---|
| `parse_pdf_pages()` | PDF file path | List of `{page, text}` dicts |
| `parse_docx()` | DOCX file path | Plain text string |
| `clean_text()` | Raw text string | Cleaned text (no noise chars) |

Supported formats: `.pdf`, `.docx`, `.txt`

---

### 2. Chunking (`chunking.py`)

```python
chunk_text(text, chunk_size=1200, overlap=150)
```

- **Strategy**: Paragraph-aware splitting. Tries to keep paragraphs together.
- **Overlap**: Last `overlap` characters of previous chunk are prepended to the next, preserving context across boundaries.
- **Why 1200 chars?** Balances context richness with ChromaDB query efficiency.

---

### 3. Embedding (`vector_store.py`)

- **Model**: `all-MiniLM-L6-v2` from Sentence Transformers (runs locally, no external API needed)
- **Dimension**: 384
- **Stored fields per chunk**:
  - `document_id` – FK to MySQL `documents` table
  - `document_name` – human-readable name for citation
  - `page` – page number (PDF only)
  - `chunk_index` – position within document

---

### 4. Retrieval – Hybrid Search with RRF (`vector_store.py → query_chroma()`)

Two ranking signals are combined:

| Signal | Method |
|---|---|
| **Semantic similarity** | Cosine distance via ChromaDB embedding query |
| **Keyword overlap** | Token intersection count between query and chunk |

**Reciprocal Rank Fusion (RRF)**:
```
rrf_score = 1/(k + semantic_rank) + 1/(k + keyword_rank)   [k = 60]
```

Top results are then distance-filtered (`distance < 1.35`) to remove irrelevant chunks.

---

### 5. Intent Classification (`rag_service.py → _classify_intent()`)

| Intent | Trigger | Handler |
|---|---|---|
| `exam_schedule` | Keywords: "lịch thi", "phòng thi", etc. | Query MySQL ExamSchedule |
| `quiz_generation` | Keywords: "tạo câu hỏi", "trắc nghiệm" | Call `quiz_service.generate_quiz()` |
| `document_qa` | Default academic question | RAG pipeline |
| `general_chat` | Greetings, off-topic | Direct LLM (no retrieval) |

When an API key is available, an LLM classifier is used for better accuracy. Keyword fallback is used when no API key is configured.

---

### 6. LLM Integration

- **Primary**: OpenAI GPT (via LangChain `ChatOpenAI`)
- **Alternative**: OpenRouter (auto-detected by `sk-or-v1-` prefix)
- **Streaming**: Yes – responses streamed token-by-token via Server-Sent Events (SSE)
- **Temperature**: 0.3 (balanced accuracy vs. creativity)

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Local embedding model | Zero API cost for document indexing; runs offline |
| ChromaDB HTTP client | Decoupled vector DB, easy to containerize |
| Hybrid search (RRF) | Better than pure semantic or keyword alone |
| Distance threshold (1.35) | Prevents irrelevant chunks from polluting context |
| Intent classification | Routes queries to the correct data source (DB vs. vector store) |
| Streaming SSE | Better UX – student sees response as it generates |

---

## Data Flow Summary

```
[Teacher] → Upload PDF/DOCX
         → Parse → Clean → Chunk → Embed → ChromaDB

[Student] → Ask question
         → Classify intent
         → Retrieve context (ChromaDB hybrid search OR MySQL exam data)
         → Build prompt (persona + context + question)
         → Stream LLM response
         → Save to chat history (MySQL)
```
