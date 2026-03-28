BEGIN;

-- =========================================================
-- 0) prerequisites
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.1) kiểm tra file_extension có phù hợp material_type không
-- lecture_slide  -> ppt, pptx, pdf
-- pdf_document   -> pdf
-- docx_document  -> docx
-- txt_document   -> txt
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_document_version_extension_matches_material()
RETURNS TRIGGER AS $$
DECLARE
  v_material_type VARCHAR(30);
  v_ext VARCHAR(10);
BEGIN
  SELECT material_type
  INTO v_material_type
  FROM documents
  WHERE id = NEW.document_id;

  IF v_material_type IS NULL THEN
    RAISE EXCEPTION 'Document % does not exist or material_type is missing', NEW.document_id;
  END IF;

  v_ext := lower(NEW.file_extension);

  IF v_material_type = 'lecture_slide' AND v_ext NOT IN ('ppt', 'pptx', 'pdf') THEN
    RAISE EXCEPTION 'document_versions.file_extension % is invalid for material_type %', v_ext, v_material_type;
  ELSIF v_material_type = 'pdf_document' AND v_ext <> 'pdf' THEN
    RAISE EXCEPTION 'document_versions.file_extension % is invalid for material_type %', v_ext, v_material_type;
  ELSIF v_material_type = 'docx_document' AND v_ext <> 'docx' THEN
    RAISE EXCEPTION 'document_versions.file_extension % is invalid for material_type %', v_ext, v_material_type;
  ELSIF v_material_type = 'txt_document' AND v_ext <> 'txt' THEN
    RAISE EXCEPTION 'document_versions.file_extension % is invalid for material_type %', v_ext, v_material_type;
  END IF;

  NEW.file_extension := v_ext;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.2) kiểm tra consistency giữa subject/document/version ở chunks
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_document_chunk_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_document_id UUID;
  v_subject_id UUID;
BEGIN
  SELECT dv.document_id, d.subject_id
  INTO v_document_id, v_subject_id
  FROM document_versions dv
  JOIN documents d ON d.id = dv.document_id
  WHERE dv.id = NEW.document_version_id;

  IF v_document_id IS NULL OR v_subject_id IS NULL THEN
    RAISE EXCEPTION 'document_version_id % is invalid or has no linked document/subject', NEW.document_version_id;
  END IF;

  IF NEW.document_id <> v_document_id THEN
    RAISE EXCEPTION 'document_chunks.document_id % does not match document_versions.document_id %', NEW.document_id, v_document_id;
  END IF;

  IF NEW.subject_id <> v_subject_id THEN
    RAISE EXCEPTION 'document_chunks.subject_id % does not match documents.subject_id %', NEW.subject_id, v_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 1) documents
-- =========================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(50) NOT NULL UNIQUE,
  subject_id UUID NOT NULL,
  uploaded_by_user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  material_type VARCHAR(30) NOT NULL,
  source_label VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_version_no INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_documents_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id),

  CONSTRAINT fk_documents_uploaded_by_user
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),

  CONSTRAINT ck_documents_material_type
    CHECK (material_type IN (
      'lecture_slide',
      'pdf_document',
      'docx_document',
      'txt_document'
    )),

  CONSTRAINT ck_documents_status
    CHECK (status IN (
      'draft',
      'active',
      'archived',
      'deleted'
    )),

  CONSTRAINT ck_documents_current_version_no
    CHECK (current_version_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_subject_id
ON documents(subject_id);

CREATE INDEX IF NOT EXISTS idx_documents_subject_is_active
ON documents(subject_id, is_active);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_user_id
ON documents(uploaded_by_user_id);

-- =========================================================
-- 2) document_versions
-- =========================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  version_no INT NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_checksum_sha256 VARCHAR(128) NOT NULL,
  page_count INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_document_versions_document
    FOREIGN KEY (document_id) REFERENCES documents(id),

  CONSTRAINT uq_document_versions_doc_version
    UNIQUE (document_id, version_no),

  CONSTRAINT ck_document_versions_version_no
    CHECK (version_no > 0),

  CONSTRAINT ck_document_versions_file_extension
    CHECK (file_extension IN ('pdf', 'docx', 'txt', 'ppt', 'pptx')),

  CONSTRAINT ck_document_versions_file_size
    CHECK (file_size_bytes >= 0),

  CONSTRAINT ck_document_versions_page_count
    CHECK (page_count IS NULL OR page_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id
ON document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_is_active
ON document_versions(document_id, is_active);

CREATE INDEX IF NOT EXISTS idx_document_versions_checksum
ON document_versions(file_checksum_sha256);

-- =========================================================
-- 3) ingestion_jobs
-- =========================================================
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL,
  job_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  total_chunks INT NOT NULL DEFAULT 0,
  embedded_chunks INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  parser_name VARCHAR(100) NULL,
  embedding_model VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_ingestion_jobs_document_version
    FOREIGN KEY (document_version_id) REFERENCES document_versions(id),

  CONSTRAINT ck_ingestion_jobs_job_type
    CHECK (job_type IN (
      'parse',
      'chunk',
      'embed',
      'reindex',
      'delete_sync'
    )),

  CONSTRAINT ck_ingestion_jobs_status
    CHECK (status IN (
      'pending',
      'processing',
      'completed',
      'failed'
    )),

  CONSTRAINT ck_ingestion_jobs_total_chunks
    CHECK (total_chunks >= 0),

  CONSTRAINT ck_ingestion_jobs_embedded_chunks
    CHECK (embedded_chunks >= 0),

  CONSTRAINT ck_ingestion_jobs_chunk_progress
    CHECK (embedded_chunks <= total_chunks),

  CONSTRAINT ck_ingestion_jobs_time_range
    CHECK (
      finished_at IS NULL
      OR started_at IS NULL
      OR finished_at >= started_at
    )
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_document_version_id
ON ingestion_jobs(document_version_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_document_version_status
ON ingestion_jobs(document_version_id, status);

-- =========================================================
-- 4) document_chunks
-- =========================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  document_id UUID NOT NULL,
  document_version_id UUID NOT NULL,
  page_number INT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_text_checksum VARCHAR(128) NOT NULL,
  token_count INT NULL,
  char_count INT NULL,
  heading_path VARCHAR(500) NULL,
  section_label VARCHAR(255) NULL,
  chroma_id VARCHAR(255) NULL UNIQUE,
  embedding_model VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_document_chunks_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id),

  CONSTRAINT fk_document_chunks_document
    FOREIGN KEY (document_id) REFERENCES documents(id),

  CONSTRAINT fk_document_chunks_document_version
    FOREIGN KEY (document_version_id) REFERENCES document_versions(id),

  CONSTRAINT ck_document_chunks_chunk_index
    CHECK (chunk_index >= 0),

  CONSTRAINT ck_document_chunks_page_number
    CHECK (page_number IS NULL OR page_number >= 0),

  CONSTRAINT ck_document_chunks_token_count
    CHECK (token_count IS NULL OR token_count >= 0),

  CONSTRAINT ck_document_chunks_char_count
    CHECK (char_count IS NULL OR char_count >= 0)
);

-- Với TXT, page_number có thể 0 hoặc NULL theo tài liệu.
-- Để chống trùng tốt hơn cả 2 trường hợp, dùng unique index với COALESCE(page_number, 0)
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_chunks_version_page_chunk
ON document_chunks(document_version_id, COALESCE(page_number, 0), chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_subject_document_version
ON document_chunks(subject_id, document_id, document_version_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_version_is_active
ON document_chunks(document_version_id, is_active);

CREATE INDEX IF NOT EXISTS idx_document_chunks_chroma_id
ON document_chunks(chroma_id);

-- =========================================================
-- 5) updated_at triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_documents_set_updated_at ON documents;
CREATE TRIGGER trg_documents_set_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_versions_set_updated_at ON document_versions;
CREATE TRIGGER trg_document_versions_set_updated_at
BEFORE UPDATE ON document_versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ingestion_jobs_set_updated_at ON ingestion_jobs;
CREATE TRIGGER trg_ingestion_jobs_set_updated_at
BEFORE UPDATE ON ingestion_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_chunks_set_updated_at ON document_chunks;
CREATE TRIGGER trg_document_chunks_set_updated_at
BEFORE UPDATE ON document_chunks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 6) business-rule triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_document_versions_check_material_extension ON document_versions;
CREATE TRIGGER trg_document_versions_check_material_extension
BEFORE INSERT OR UPDATE OF document_id, file_extension
ON document_versions
FOR EACH ROW EXECUTE FUNCTION ensure_document_version_extension_matches_material();

DROP TRIGGER IF EXISTS trg_document_chunks_check_consistency ON document_chunks;
CREATE TRIGGER trg_document_chunks_check_consistency
BEFORE INSERT OR UPDATE OF subject_id, document_id, document_version_id
ON document_chunks
FOR EACH ROW EXECUTE FUNCTION ensure_document_chunk_consistency();

COMMIT;
