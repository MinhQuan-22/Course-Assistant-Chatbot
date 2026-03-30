BEGIN;

-- ---------------------------------------------------------
-- 1) documents
-- ---------------------------------------------------------
INSERT INTO documents (
  document_code,
  subject_id,
  uploaded_by_user_id,
  title,
  material_type,
  source_label,
  status,
  current_version_no,
  is_active
)
SELECT
  x.document_code,
  s.id,
  u.id,
  x.title,
  x.material_type,
  x.source_label,
  x.status,
  x.current_version_no,
  x.is_active
FROM (
  VALUES
    ('DOC001', 'SE101', 'teacher1@course.local', 'Software Engineering Syllabus', 'pdf_document',  'Đề cương môn học',   'active', 1, TRUE),
    ('DOC002', 'DB201', 'teacher2@course.local', 'Database Notes TXT',            'txt_document',  'Ghi chú văn bản',    'active', 1, TRUE),
    ('DOC003', 'SE101', 'teacher1@course.local', 'SE101 Chapter 1 Slides',        'lecture_slide', 'Slide Chương 1',     'active', 1, TRUE),
    ('DOC004', 'DB201', 'teacher2@course.local', 'Database Lab Guide',            'docx_document', 'Hướng dẫn thực hành', 'active', 1, TRUE)
) AS x(document_code, subject_code, uploader_email, title, material_type, source_label, status, current_version_no, is_active)
JOIN subjects s ON s.code = x.subject_code
JOIN users u ON u.email = x.uploader_email;

-- ---------------------------------------------------------
-- 2) document_versions
-- Rule:
-- - pdf_document  -> pdf
-- - txt_document  -> txt
-- - lecture_slide -> ppt/pptx/pdf
-- - docx_document -> docx
-- ---------------------------------------------------------
INSERT INTO document_versions (
  document_id,
  version_no,
  original_file_name,
  file_extension,
  mime_type,
  storage_path,
  file_size_bytes,
  file_checksum_sha256,
  page_count,
  is_active
)
SELECT
  d.id,
  x.version_no,
  x.original_file_name,
  x.file_extension,
  x.mime_type,
  x.storage_path,
  x.file_size_bytes,
  x.file_checksum_sha256,
  x.page_count,
  x.is_active
FROM (
  VALUES
    ('DOC001', 1, 'SE101_Syllabus.pdf',   'pdf',  'application/pdf',                                                         '/storage/se101/syllabus_v1.pdf',   204800, 'sha256_doc001_v1', 12, TRUE),
    ('DOC002', 1, 'DB201_Notes.txt',      'txt',  'text/plain',                                                               '/storage/db201/notes_v1.txt',       10240, 'sha256_doc002_v1',  0, TRUE),
    ('DOC003', 1, 'SE101_Chapter1.pptx',  'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '/storage/se101/ch1_v1.pptx',       512000, 'sha256_doc003_v1', 18, TRUE),
    ('DOC004', 1, 'DB201_LabGuide.docx',  'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   '/storage/db201/labguide_v1.docx', 153600, 'sha256_doc004_v1',  9, TRUE)
) AS x(document_code, version_no, original_file_name, file_extension, mime_type, storage_path, file_size_bytes, file_checksum_sha256, page_count, is_active)
JOIN documents d ON d.document_code = x.document_code;

-- ---------------------------------------------------------
-- 3) ingestion_jobs
-- Mẫu log pipeline embed hoàn tất
-- ---------------------------------------------------------
INSERT INTO ingestion_jobs (
  document_version_id,
  job_type,
  status,
  started_at,
  finished_at,
  total_chunks,
  embedded_chunks,
  error_message,
  parser_name,
  embedding_model
)
SELECT
  dv.id,
  x.job_type,
  x.status,
  x.started_at,
  x.finished_at,
  x.total_chunks,
  x.embedded_chunks,
  x.error_message,
  x.parser_name,
  x.embedding_model
FROM (
  VALUES
    ('DOC001', 1, 'embed', 'completed', now() - interval '20 minutes', now() - interval '18 minutes', 2, 2, NULL, 'docling',      'text-embedding-3-small'),
    ('DOC002', 1, 'embed', 'completed', now() - interval '17 minutes', now() - interval '16 minutes', 2, 2, NULL, 'txt-parser',   'text-embedding-3-small'),
    ('DOC003', 1, 'embed', 'completed', now() - interval '15 minutes', now() - interval '13 minutes', 2, 2, NULL, 'slides-parser','text-embedding-3-small'),
    ('DOC004', 1, 'embed', 'completed', now() - interval '12 minutes', now() - interval '10 minutes', 1, 1, NULL, 'docling',      'text-embedding-3-small')
) AS x(document_code, version_no, job_type, status, started_at, finished_at, total_chunks, embedded_chunks, error_message, parser_name, embedding_model)
JOIN documents d ON d.document_code = x.document_code
JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = x.version_no;

-- ---------------------------------------------------------
-- 4) document_chunks
-- TXT dùng page_number = 0, section_label = 'Text file' / 'Line block 1'
-- Chroma ID strategy:
-- sub_<subject_id>__ver_<document_version_id>__p_<page_number_or_0>__c_<chunk_index>
-- ---------------------------------------------------------
INSERT INTO document_chunks (
  subject_id,
  document_id,
  document_version_id,
  page_number,
  chunk_index,
  chunk_text,
  chunk_text_checksum,
  token_count,
  char_count,
  heading_path,
  section_label,
  chroma_id,
  embedding_model,
  is_active
)
SELECT
  s.id,
  d.id,
  dv.id,
  x.page_number,
  x.chunk_index,
  x.chunk_text,
  x.chunk_text_checksum,
  x.token_count,
  x.char_count,
  x.heading_path,
  x.section_label,
  CONCAT(
    'sub_', s.id,
    '__ver_', dv.id,
    '__p_', COALESCE(x.page_number, 0),
    '__c_', x.chunk_index
  ) AS chroma_id,
  x.embedding_model,
  x.is_active
FROM (
  VALUES
    -- DOC001: pdf_document
    ('DOC001', 1, 0, 'This syllabus introduces software engineering fundamentals.', 'chk_doc001_1', 10, 58, 'Syllabus > Overview',   'Trang 1',    'text-embedding-3-small', TRUE),
    ('DOC001', 1, 1, 'Course objectives and grading policy are listed here.',       'chk_doc001_2', 11, 55, 'Syllabus > Objectives', 'Trang 1',    'text-embedding-3-small', TRUE),

    -- DOC002: txt_document
    ('DOC002', 0, 0, 'These plain text notes explain primary keys and foreign keys.', 'chk_doc002_1', 12, 62, 'Text Notes', 'Text file',   'text-embedding-3-small', TRUE),
    ('DOC002', 0, 1, 'The second block describes normalization and common SQL joins.', 'chk_doc002_2', 12, 63, 'Text Notes', 'Line block 1','text-embedding-3-small', TRUE),

    -- DOC003: lecture_slide
    ('DOC003', 5, 0, 'Slide 5 introduces the software process and its main phases.',  'chk_doc003_1', 12, 58, 'Chương 1 > 1.1', 'Slide 5', 'text-embedding-3-small', TRUE),
    ('DOC003', 6, 0, 'Slide 6 explains waterfall, iterative, and agile process models.', 'chk_doc003_2', 13, 66, 'Chương 1 > 1.2', 'Slide 6', 'text-embedding-3-small', TRUE),

    -- DOC004: docx_document
    ('DOC004', 2, 0, 'This lab guide explains how to create tables, keys, and constraints in PostgreSQL.', 'chk_doc004_1', 15, 84, 'Lab Guide > Setup', 'Trang 2', 'text-embedding-3-small', TRUE)
) AS x(document_code, page_number, chunk_index, chunk_text, chunk_text_checksum, token_count, char_count, heading_path, section_label, embedding_model, is_active)
JOIN documents d ON d.document_code = x.document_code
JOIN subjects s ON s.id = d.subject_id
JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1;

COMMIT;