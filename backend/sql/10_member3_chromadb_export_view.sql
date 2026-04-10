BEGIN;

-- View to export active PostgreSQL chunk registry records into ChromaDB payloads.
-- Run after:
--   01_member1_user_academic_core.sql
--   04_member3_knowledge_base.sql
-- This does not create a new PostgreSQL table; it creates a sync-ready view.

CREATE OR REPLACE VIEW vw_course_material_chunks_sync AS
SELECT
  dc.id AS document_chunk_id,
  dc.chroma_id,
  dc.chunk_text,
  dc.subject_id,
  dc.document_id,
  dc.document_version_id,
  d.material_type,
  dv.file_extension,
  COALESCE(dc.page_number, 0) AS page_number_or_0,
  dc.page_number,
  dc.chunk_index,
  dc.heading_path,
  dc.section_label,
  d.source_label,
  dv.original_file_name,
  dc.embedding_model,
  dc.is_active,
  d.is_active AS document_is_active,
  dv.is_active AS version_is_active,
  d.status AS document_status,
  d.title AS document_title,
  d.document_code,
  dv.version_no,
  dv.storage_path,
  dv.mime_type,
  dv.file_size_bytes,
  dc.token_count,
  dc.char_count,
  dc.created_at AS chunk_created_at,
  dc.updated_at AS chunk_updated_at
FROM document_chunks dc
JOIN documents d
  ON d.id = dc.document_id
JOIN document_versions dv
  ON dv.id = dc.document_version_id
WHERE dc.chroma_id IS NOT NULL;

COMMENT ON VIEW vw_course_material_chunks_sync IS
'Export view for syncing PostgreSQL chunk registry records into ChromaDB collection course_material_chunks_v1.';

COMMIT;
