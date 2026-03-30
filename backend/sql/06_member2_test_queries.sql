SELECT 'documents' AS table_name, COUNT(*) AS total FROM documents
UNION ALL
SELECT 'document_versions', COUNT(*) FROM document_versions
UNION ALL
SELECT 'ingestion_jobs', COUNT(*) FROM ingestion_jobs
UNION ALL
SELECT 'document_chunks', COUNT(*) FROM document_chunks;

-- Kiểm tra logic tài liệu

SELECT
  d.document_code,
  d.material_type,
  dv.version_no,
  dv.file_extension,
  dv.original_file_name
FROM documents d
JOIN document_versions dv ON dv.document_id = d.id
ORDER BY d.document_code;

-- Kiểm tra chunk + Chroma ID

SELECT
  d.document_code,
  dc.page_number,
  dc.chunk_index,
  dc.section_label,
  dc.chroma_id
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
ORDER BY d.document_code, dc.page_number, dc.chunk_index;
