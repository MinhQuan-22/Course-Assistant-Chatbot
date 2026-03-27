BEGIN;

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
  source_label VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
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
      'processing',
      'ready',
      'archived',
      'failed'
    )),

  CONSTRAINT ck_documents_current_version_no
    CHECK (current_version_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_subject_id
ON documents(subject_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_user_id
ON documents(uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS idx_documents_is_active
ON documents(is_active);

-- =========================================================
-- 2) document_versions
-- =========================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  version_no INT NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_extension VARCHAR(20) NOT NULL,
  mime_type VARCHAR(100) NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_checksum_sha256 VARCHAR(64) NOT NULL,
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

  CONSTRAINT ck_document_versions_file_size
    CHECK (file_size_bytes >= 0),

  CONSTRAINT ck_document_versions_page_count
    CHECK (page_count IS NULL OR page_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id
ON document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_is_active
ON document_versions(is_active);

CREATE INDEX IF NOT EXISTS idx_document_versions_checksum
ON document_versions(file_checksum_sha256);

-- =========================================================
-- 3) ingestion_jobs
-- =========================================================
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL,
  job_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  total_chunks INT NOT NULL DEFAULT 0,
  processed_chunks INT NOT NULL DEFAULT 0,
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

  CONSTRAINT ck_ingestion_jobs_processed_chunks
    CHECK (processed_chunks >= 0),

  CONSTRAINT ck_ingestion_jobs_chunk_progress
    CHECK (processed_chunks <= total_chunks),

  CONSTRAINT ck_ingestion_jobs_time_range
    CHECK (
      finished_at IS NULL
      OR started_at IS NULL
      OR finished_at >= started_at
    )
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_document_version_id
ON ingestion_jobs(document_version_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status
ON ingestion_jobs(status);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_job_type
ON ingestion_jobs(job_type);

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
  chunk_checksum_sha256 VARCHAR(64) NOT NULL,
  token_count INT NULL,
  character_count INT NOT NULL DEFAULT 0,
  heading_path TEXT NULL,
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

  CONSTRAINT uq_document_chunks_version_page_chunk
    UNIQUE (document_version_id, page_number, chunk_index),

  CONSTRAINT ck_document_chunks_chunk_index
    CHECK (chunk_index >= 0),

  CONSTRAINT ck_document_chunks_page_number
    CHECK (page_number IS NULL OR page_number >= 0),

  CONSTRAINT ck_document_chunks_token_count
    CHECK (token_count IS NULL OR token_count >= 0),

  CONSTRAINT ck_document_chunks_character_count
    CHECK (character_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_subject_id
ON document_chunks(subject_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_version_id
ON document_chunks(document_version_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_is_active
ON document_chunks(is_active);

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

COMMIT;