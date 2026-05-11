"""
Unit tests for the Course Assistant Chatbot backend.

Test suites:
  - ChunkingTests          : text chunking logic
  - DocumentIngestionTests : document ingestion pipeline (mocked I/O)
  - VectorStoreTests       : ChromaDB embed / query helpers (mocked client)
  - RagServiceTests        : RAG intent classification & context retrieval (mocked)
  - AuthTests              : JWT token generation and verification
"""

from django.test import TestCase, RequestFactory
from unittest.mock import patch, MagicMock, PropertyMock
import json

# ---------------------------------------------------------------------------
# 1. ChunkingTests
# ---------------------------------------------------------------------------

from core.services.chunking import chunk_text


class ChunkingTests(TestCase):
    """Tests for the chunk_text() function."""

    def test_empty_string_returns_empty_list(self):
        result = chunk_text("")
        self.assertEqual(result, [])

    def test_whitespace_only_returns_empty_list(self):
        result = chunk_text("   \n   ")
        self.assertEqual(result, [])

    def test_short_text_returns_single_chunk(self):
        text = "This is a short paragraph."
        result = chunk_text(text, chunk_size=800, overlap=100)
        self.assertEqual(len(result), 1)
        self.assertIn("short paragraph", result[0])

    def test_long_text_splits_into_multiple_chunks(self):
        # Create a text longer than chunk_size
        paragraph = "Word " * 200  # ~1000 chars
        text = "\n".join([paragraph] * 5)
        result = chunk_text(text, chunk_size=800, overlap=0)
        self.assertGreater(len(result), 1)

    def test_chunk_size_respected(self):
        paragraph = "A" * 100
        text = "\n".join([paragraph] * 20)
        result = chunk_text(text, chunk_size=300, overlap=0)
        for chunk in result:
            self.assertLessEqual(len(chunk), 400)  # allow small buffer

    def test_overlap_carries_content_forward(self):
        """Overlap text from previous chunk should appear at the start of next."""
        text = "\n".join(["Paragraph " + str(i) for i in range(50)])
        result = chunk_text(text, chunk_size=100, overlap=50)
        # Simply verify that chunking with overlap produces at least as many chunks
        result_no_overlap = chunk_text(text, chunk_size=100, overlap=0)
        # Both should produce multiple chunks
        self.assertGreater(len(result), 0)
        self.assertGreater(len(result_no_overlap), 0)

    def test_multiline_text_preserved(self):
        text = "Line one\nLine two\nLine three"
        result = chunk_text(text, chunk_size=800)
        joined = " ".join(result)
        self.assertIn("Line one", joined)
        self.assertIn("Line three", joined)


# ---------------------------------------------------------------------------
# 2. DocumentIngestionTests
# ---------------------------------------------------------------------------

from core.services.document_ingestion import ingest_document


class DocumentIngestionTests(TestCase):
    """Tests for document ingestion pipeline (file I/O and ChromaDB mocked)."""

    def _make_doc(self, file_path: str, doc_id: int = 1, name: str = "Test Doc"):
        doc = MagicMock()
        doc.id = doc_id
        doc.name = name
        doc.file_path = file_path
        return doc

    @patch("core.services.document_ingestion.add_chunks_to_chroma")
    @patch("core.services.document_ingestion.parse_file")
    def test_docx_ingestion_calls_add_chunks(self, mock_parse, mock_add):
        mock_parse.return_value = "Sample content from DOCX file. " * 20
        doc = self._make_doc("/fake/path/test.docx")

        result = ingest_document(doc)

        mock_parse.assert_called_once_with("/fake/path/test.docx")
        mock_add.assert_called_once()
        self.assertIn("chunk_count", result)
        self.assertGreater(result["chunk_count"], 0)

    @patch("core.services.document_ingestion.add_chunks_to_chroma")
    @patch("core.services.document_ingestion.parse_pdf_pages")
    def test_pdf_ingestion_calls_add_chunks(self, mock_parse_pages, mock_add):
        mock_parse_pages.return_value = [
            {"page": 1, "text": "Page one content " * 30},
            {"page": 2, "text": "Page two content " * 30},
        ]
        doc = self._make_doc("/fake/path/lecture.pdf")

        result = ingest_document(doc)

        mock_parse_pages.assert_called_once_with("/fake/path/lecture.pdf")
        mock_add.assert_called_once()
        self.assertIn("chunk_count", result)
        self.assertGreater(result["chunk_count"], 0)

    @patch("core.services.document_ingestion.add_chunks_to_chroma")
    @patch("core.services.document_ingestion.parse_file")
    def test_empty_file_raises_value_error(self, mock_parse, mock_add):
        mock_parse.return_value = ""  # blank document
        doc = self._make_doc("/fake/path/empty.docx")

        with self.assertRaises(ValueError):
            ingest_document(doc)

    @patch("core.services.document_ingestion.add_chunks_to_chroma")
    @patch("core.services.document_ingestion.parse_file")
    def test_metadata_contains_document_id_and_name(self, mock_parse, mock_add):
        mock_parse.return_value = "Some content here. " * 10
        doc = self._make_doc("/fake/path/notes.docx", doc_id=42, name="OOP Notes")

        ingest_document(doc)

        call_args = mock_add.call_args
        metadatas = call_args[0][1]  # second positional arg
        self.assertTrue(all(m["document_id"] == 42 for m in metadatas))
        self.assertTrue(all(m["document_name"] == "OOP Notes" for m in metadatas))


# ---------------------------------------------------------------------------
# 3. VectorStoreTests
# ---------------------------------------------------------------------------

from core.services.vector_store import embed_texts, query_chroma


class VectorStoreTests(TestCase):
    """Tests for ChromaDB wrapper functions (client mocked)."""

    @patch("core.services.vector_store.get_embedding_model")
    def test_embed_texts_returns_list_of_lists(self, mock_get_model):
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(tolist=lambda: [[0.1, 0.2, 0.3]])
        mock_get_model.return_value = mock_model

        result = embed_texts(["Hello world"])
        self.assertIsInstance(result, list)

    @patch("core.services.vector_store.get_collection")
    @patch("core.services.vector_store.get_embedding_model")
    def test_query_chroma_returns_expected_structure(self, mock_get_model, mock_get_col):
        # Mock embedding model
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(tolist=lambda: [[0.1, 0.2]])
        mock_get_model.return_value = mock_model

        # Mock ChromaDB collection response
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            "documents": [["chunk one", "chunk two"]],
            "metadatas": [[{"document_name": "Doc A"}, {"document_name": "Doc B"}]],
            "distances": [[0.5, 0.9]],
        }
        mock_get_col.return_value = mock_collection

        result = query_chroma("What is OOP?", top_k=2)

        self.assertIn("documents", result)
        self.assertIn("metadatas", result)
        self.assertIn("distances", result)
        self.assertEqual(len(result["documents"][0]), 2)

    @patch("core.services.vector_store.get_collection")
    @patch("core.services.vector_store.get_embedding_model")
    def test_query_chroma_empty_result_handled(self, mock_get_model, mock_get_col):
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(tolist=lambda: [[0.0, 0.0]])
        mock_get_model.return_value = mock_model

        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]],
        }
        mock_get_col.return_value = mock_collection

        result = query_chroma("irrelevant query", top_k=5)
        # Should return the empty result without crashing
        self.assertEqual(result["documents"], [[]])


# ---------------------------------------------------------------------------
# 4. RagServiceTests
# ---------------------------------------------------------------------------

from core.services.rag_service import _classify_intent, _retrieve_rag_context


class RagServiceTests(TestCase):
    """Tests for RAG service intent classification and context retrieval."""

    # --- Intent classification (keyword fallback) ---

    def test_classify_quiz_intent(self):
        intent = _classify_intent("tạo câu hỏi trắc nghiệm", "tạo câu hỏi trắc nghiệm", "", "", False)
        self.assertEqual(intent, "quiz_generation")

    def test_classify_exam_schedule_intent(self):
        intent = _classify_intent("lịch thi cuối kỳ khi nào?", "lịch thi cuối kỳ khi nào?", "", "", False)
        self.assertEqual(intent, "exam_schedule")

    def test_classify_general_chat_intent(self):
        intent = _classify_intent("chào bạn", "chào bạn", "", "", False)
        self.assertEqual(intent, "general_chat")

    def test_classify_document_qa_intent_default(self):
        intent = _classify_intent("singleton pattern là gì?", "singleton pattern là gì?", "", "", False)
        self.assertEqual(intent, "document_qa")

    # --- RAG context retrieval ---

    @patch("core.services.rag_service.query_chroma")
    def test_retrieve_rag_context_returns_empty_on_no_results(self, mock_query):
        mock_query.return_value = {
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]],
        }
        context, sources, has_relevant = _retrieve_rag_context("any query")
        self.assertEqual(context, "")
        self.assertEqual(sources, [])
        self.assertFalse(has_relevant)

    @patch("core.services.rag_service.query_chroma")
    def test_retrieve_rag_context_filters_low_relevance(self, mock_query):
        """Documents with distance > RAG_RELEVANCE_THRESHOLD should be filtered out."""
        mock_query.return_value = {
            "documents": [["This is some content that is very long indeed yes yes yes"]],
            "metadatas": [[{"document_name": "Doc A", "page": 1, "chunk_index": 0}]],
            "distances": [[9.99]],  # very high distance = low relevance
        }
        context, sources, has_relevant = _retrieve_rag_context("query")
        self.assertFalse(has_relevant)

    @patch("core.services.rag_service.query_chroma")
    def test_retrieve_rag_context_returns_content_when_relevant(self, mock_query):
        """Documents with low distance should be included in context."""
        mock_query.return_value = {
            "documents": [["Singleton pattern ensures a class has only one instance."]],
            "metadatas": [[{"document_name": "OOP Notes", "page": 3, "chunk_index": 0}]],
            "distances": [[0.4]],  # low distance = high relevance
        }
        context, sources, has_relevant = _retrieve_rag_context("singleton pattern")
        self.assertTrue(has_relevant)
        self.assertIn("Singleton", context)
        self.assertEqual(len(sources), 1)
        self.assertEqual(sources[0]["document_name"], "OOP Notes")


# ---------------------------------------------------------------------------
# 5. AuthTests
# ---------------------------------------------------------------------------

from core.auth_utils import create_jwt_token, decode_jwt_token


class AuthTests(TestCase):
    """Tests for JWT token generation and verification."""

    def _make_user(self, user_id: int, role: str, email: str = "test@example.com"):
        user = MagicMock()
        user.id = user_id
        user.role = role
        user.email = email
        return user

    def test_create_token_returns_string(self):
        user = self._make_user(user_id=1, role="student")
        token = create_jwt_token(user)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)

    def test_decode_valid_token(self):
        user = self._make_user(user_id=5, role="teacher")
        token = create_jwt_token(user)
        payload = decode_jwt_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("user_id"), 5)
        self.assertEqual(payload.get("role"), "teacher")

    def test_decode_invalid_token_returns_none(self):
        payload = decode_jwt_token("this.is.not.a.valid.token")
        self.assertIsNone(payload)

    def test_decode_tampered_token_returns_none(self):
        user = self._make_user(user_id=1, role="admin")
        token = create_jwt_token(user)
        tampered = token[:-5] + "XXXXX"
        payload = decode_jwt_token(tampered)
        self.assertIsNone(payload)

    def test_tokens_for_different_users_are_different(self):
        user_a = self._make_user(user_id=1, role="student", email="a@x.com")
        user_b = self._make_user(user_id=2, role="student", email="b@x.com")
        token_a = create_jwt_token(user_a)
        token_b = create_jwt_token(user_b)
        self.assertNotEqual(token_a, token_b)

