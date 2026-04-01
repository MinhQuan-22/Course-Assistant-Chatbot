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
-- 0.1) kiểm tra class_section phải thuộc đúng subject
-- dùng chung cho chat_sessions và quizzes
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_class_section_matches_subject()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id UUID;
BEGIN
  IF NEW.class_section_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subject_id
  INTO v_subject_id
  FROM class_sections
  WHERE id = NEW.class_section_id;

  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'class_section_id % does not exist', NEW.class_section_id;
  END IF;

  IF v_subject_id <> NEW.subject_id THEN
    RAISE EXCEPTION 'class_section_id % belongs to subject % but row subject_id is %',
      NEW.class_section_id, v_subject_id, NEW.subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.2) đồng bộ last_message_at cho chat_sessions
-- =========================================================
CREATE OR REPLACE FUNCTION refresh_chat_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE chat_sessions
    SET last_message_at = (
      SELECT MAX(created_at)
      FROM chat_messages
      WHERE chat_session_id = OLD.chat_session_id
    )
    WHERE id = OLD.chat_session_id;

    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.chat_session_id IS DISTINCT FROM OLD.chat_session_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      UPDATE chat_sessions
      SET last_message_at = (
        SELECT MAX(created_at)
        FROM chat_messages
        WHERE chat_session_id = OLD.chat_session_id
      )
      WHERE id = OLD.chat_session_id;
    END IF;

    UPDATE chat_sessions
    SET last_message_at = (
      SELECT MAX(created_at)
      FROM chat_messages
      WHERE chat_session_id = NEW.chat_session_id
    )
    WHERE id = NEW.chat_session_id;

    RETURN NEW;
  ELSE
    UPDATE chat_sessions
    SET last_message_at = (
      SELECT MAX(created_at)
      FROM chat_messages
      WHERE chat_session_id = NEW.chat_session_id
    )
    WHERE id = NEW.chat_session_id;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.3) chỉ assistant message mới được gắn citation
-- đồng thời chụp snapshot metadata từ knowledge base
-- =========================================================
CREATE OR REPLACE FUNCTION prepare_message_citation_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_role VARCHAR(20);
  v_page_number INT;
  v_section_label VARCHAR(255);
  v_document_version_id UUID;
  v_original_file_name VARCHAR(255);
  v_source_label VARCHAR(255);
BEGIN
  SELECT cm.role
  INTO v_role
  FROM chat_messages cm
  WHERE cm.id = NEW.chat_message_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'chat_message_id % does not exist', NEW.chat_message_id;
  END IF;

  IF v_role <> 'assistant' THEN
    RAISE EXCEPTION 'Only assistant messages can have citations. chat_message_id % has role %',
      NEW.chat_message_id, v_role;
  END IF;

  SELECT
    dc.page_number,
    dc.section_label,
    dc.document_version_id,
    dv.original_file_name,
    d.source_label
  INTO
    v_page_number,
    v_section_label,
    v_document_version_id,
    v_original_file_name,
    v_source_label
  FROM document_chunks dc
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.id = NEW.document_chunk_id;

  IF v_document_version_id IS NULL THEN
    RAISE EXCEPTION 'document_chunk_id % does not exist or is invalid', NEW.document_chunk_id;
  END IF;

  IF NEW.page_number_snapshot IS NULL THEN
    NEW.page_number_snapshot := v_page_number;
  END IF;

  IF NEW.section_label_snapshot IS NULL THEN
    NEW.section_label_snapshot := v_section_label;
  END IF;

  IF NEW.document_version_id_snapshot IS NULL THEN
    NEW.document_version_id_snapshot := v_document_version_id;
  END IF;

  IF NEW.file_name_snapshot IS NULL THEN
    NEW.file_name_snapshot := v_original_file_name;
  END IF;

  IF NEW.source_label_snapshot IS NULL THEN
    NEW.source_label_snapshot := v_source_label;
  END IF;

  IF NEW.citation_label IS NULL THEN
    NEW.citation_label := COALESCE(v_source_label, v_original_file_name, 'Citation');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.4) source_chunk của quiz_question phải cùng subject với quiz
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_question_source_chunk_matches_subject()
RETURNS TRIGGER AS $$
DECLARE
  v_quiz_subject_id UUID;
  v_chunk_subject_id UUID;
BEGIN
  IF NEW.source_chunk_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT q.subject_id
  INTO v_quiz_subject_id
  FROM quizzes q
  WHERE q.id = NEW.quiz_id;

  SELECT dc.subject_id
  INTO v_chunk_subject_id
  FROM document_chunks dc
  WHERE dc.id = NEW.source_chunk_id;

  IF v_quiz_subject_id IS NULL THEN
    RAISE EXCEPTION 'quiz_id % does not exist', NEW.quiz_id;
  END IF;

  IF v_chunk_subject_id IS NULL THEN
    RAISE EXCEPTION 'source_chunk_id % does not exist', NEW.source_chunk_id;
  END IF;

  IF v_quiz_subject_id <> v_chunk_subject_id THEN
    RAISE EXCEPTION 'source_chunk_id % belongs to subject % but quiz % belongs to subject %',
      NEW.source_chunk_id, v_chunk_subject_id, NEW.quiz_id, v_quiz_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.5) kiểm tra student có quyền làm quiz không
-- - nếu quiz gắn class_section -> student phải thuộc lớp đó
-- - nếu quiz chỉ ở mức subject -> student phải học ít nhất 1 lớp của subject đó
-- - nếu có chat_session_id -> phải cùng user và cùng subject
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_attempt_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_quiz_subject_id UUID;
  v_quiz_class_section_id UUID;
  v_student_user_id UUID;
  v_chat_user_id UUID;
  v_chat_subject_id UUID;
BEGIN
  SELECT q.subject_id, q.class_section_id
  INTO v_quiz_subject_id, v_quiz_class_section_id
  FROM quizzes q
  WHERE q.id = NEW.quiz_id;

  IF v_quiz_subject_id IS NULL THEN
    RAISE EXCEPTION 'quiz_id % does not exist', NEW.quiz_id;
  END IF;

  SELECT sp.user_id
  INTO v_student_user_id
  FROM student_profiles sp
  WHERE sp.id = NEW.student_id;

  IF v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'student_id % does not exist', NEW.student_id;
  END IF;

  IF NEW.chat_session_id IS NOT NULL THEN
    SELECT cs.user_id, cs.subject_id
    INTO v_chat_user_id, v_chat_subject_id
    FROM chat_sessions cs
    WHERE cs.id = NEW.chat_session_id;

    IF v_chat_user_id IS NULL THEN
      RAISE EXCEPTION 'chat_session_id % does not exist', NEW.chat_session_id;
    END IF;

    IF v_chat_user_id <> v_student_user_id THEN
      RAISE EXCEPTION 'chat_session_id % belongs to user % but student_id % belongs to user %',
        NEW.chat_session_id, v_chat_user_id, NEW.student_id, v_student_user_id;
    END IF;

    IF v_chat_subject_id <> v_quiz_subject_id THEN
      RAISE EXCEPTION 'chat_session_id % belongs to subject % but quiz % belongs to subject %',
        NEW.chat_session_id, v_chat_subject_id, NEW.quiz_id, v_quiz_subject_id;
    END IF;
  END IF;

  IF v_quiz_class_section_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM enrollments e
      WHERE e.class_section_id = v_quiz_class_section_id
        AND e.student_id = NEW.student_id
        AND e.status IN ('enrolled', 'completed')
    ) THEN
      RAISE EXCEPTION 'student_id % is not eligible for class-specific quiz %', NEW.student_id, NEW.quiz_id;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM enrollments e
      JOIN class_sections cs ON cs.id = e.class_section_id
      WHERE e.student_id = NEW.student_id
        AND cs.subject_id = v_quiz_subject_id
        AND e.status IN ('enrolled', 'completed')
    ) THEN
      RAISE EXCEPTION 'student_id % is not enrolled in any class of subject % for quiz %',
        NEW.student_id, v_quiz_subject_id, NEW.quiz_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.6) quiz_answer phải thuộc đúng quiz/question
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_answer_matches_attempt_question()
RETURNS TRIGGER AS $$
DECLARE
  v_attempt_quiz_id UUID;
  v_question_quiz_id UUID;
  v_question_points NUMERIC(8,2);
BEGIN
  SELECT qa.quiz_id
  INTO v_attempt_quiz_id
  FROM quiz_attempts qa
  WHERE qa.id = NEW.quiz_attempt_id;

  SELECT qq.quiz_id, qq.points
  INTO v_question_quiz_id, v_question_points
  FROM quiz_questions qq
  WHERE qq.id = NEW.question_id;

  IF v_attempt_quiz_id IS NULL THEN
    RAISE EXCEPTION 'quiz_attempt_id % does not exist', NEW.quiz_attempt_id;
  END IF;

  IF v_question_quiz_id IS NULL THEN
    RAISE EXCEPTION 'question_id % does not exist', NEW.question_id;
  END IF;

  IF v_attempt_quiz_id <> v_question_quiz_id THEN
    RAISE EXCEPTION 'question_id % belongs to quiz % but quiz_attempt_id % belongs to quiz %',
      NEW.question_id, v_question_quiz_id, NEW.quiz_attempt_id, v_attempt_quiz_id;
  END IF;

  IF NEW.awarded_score IS NOT NULL AND NEW.awarded_score > v_question_points THEN
    RAISE EXCEPTION 'awarded_score % exceeds question points % for question_id %',
      NEW.awarded_score, v_question_points, NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 0.7) lựa chọn đáp án phải thuộc đúng question của answer
-- nếu question là single_choice thì chỉ cho 1 choice/answer
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_answer_choice_matches_question()
RETURNS TRIGGER AS $$
DECLARE
  v_answer_question_id UUID;
  v_choice_question_id UUID;
  v_question_type VARCHAR(30);
BEGIN
  SELECT qa.question_id, qq.question_type
  INTO v_answer_question_id, v_question_type
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qq.id = qa.question_id
  WHERE qa.id = NEW.quiz_answer_id;

  SELECT qc.question_id
  INTO v_choice_question_id
  FROM quiz_choices qc
  WHERE qc.id = NEW.choice_id;

  IF v_answer_question_id IS NULL THEN
    RAISE EXCEPTION 'quiz_answer_id % does not exist', NEW.quiz_answer_id;
  END IF;

  IF v_choice_question_id IS NULL THEN
    RAISE EXCEPTION 'choice_id % does not exist', NEW.choice_id;
  END IF;

  IF v_answer_question_id <> v_choice_question_id THEN
    RAISE EXCEPTION 'choice_id % belongs to question % but quiz_answer_id % belongs to question %',
      NEW.choice_id, v_choice_question_id, NEW.quiz_answer_id, v_answer_question_id;
  END IF;

  IF v_question_type = 'single_choice' AND EXISTS (
    SELECT 1
    FROM quiz_answer_choices qac
    WHERE qac.quiz_answer_id = NEW.quiz_answer_id
      AND qac.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'question % is single_choice, so quiz_answer_id % can only have one selected choice',
      v_answer_question_id, NEW.quiz_answer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 1) chat_sessions
-- =========================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_section_id UUID NULL,
  title VARCHAR(255) NULL,
  selected_model VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id),

  CONSTRAINT fk_chat_sessions_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id),

  CONSTRAINT fk_chat_sessions_class_section
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id),

  CONSTRAINT ck_chat_sessions_status
    CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_subject
ON chat_sessions(user_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at
ON chat_sessions(last_message_at);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_last_message_at
ON chat_sessions(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_class_section_id
ON chat_sessions(class_section_id);

-- =========================================================
-- 2) chat_messages
-- =========================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL,
  message_index INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  content_text TEXT NOT NULL,
  content_markdown TEXT NULL,
  model_name VARCHAR(100) NULL,
  stream_status VARCHAR(20) NOT NULL DEFAULT 'completed',
  prompt_tokens INT NULL,
  completion_tokens INT NULL,
  latency_ms INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id),

  CONSTRAINT uq_chat_messages_session_message_index
    UNIQUE (chat_session_id, message_index),

  CONSTRAINT ck_chat_messages_message_index
    CHECK (message_index >= 0),

  CONSTRAINT ck_chat_messages_role
    CHECK (role IN ('user', 'assistant', 'system', 'tool')),

  CONSTRAINT ck_chat_messages_stream_status
    CHECK (stream_status IN ('pending', 'streaming', 'completed', 'failed')),

  CONSTRAINT ck_chat_messages_prompt_tokens
    CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),

  CONSTRAINT ck_chat_messages_completion_tokens
    CHECK (completion_tokens IS NULL OR completion_tokens >= 0),

  CONSTRAINT ck_chat_messages_latency_ms
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_session_id
ON chat_messages(chat_session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at
ON chat_messages(chat_session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_role
ON chat_messages(role);

-- =========================================================
-- 3) message_citations
-- =========================================================
CREATE TABLE IF NOT EXISTS message_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_message_id UUID NOT NULL,
  document_chunk_id UUID NOT NULL,
  rank_no INT NOT NULL,
  page_number_snapshot INT NULL,
  file_name_snapshot VARCHAR(255) NULL,
  source_label_snapshot VARCHAR(255) NULL,
  section_label_snapshot VARCHAR(255) NULL,
  document_version_id_snapshot UUID NULL,
  citation_label VARCHAR(255) NULL,
  relevance_score NUMERIC(6,4) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_message_citations_chat_message
    FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id),

  CONSTRAINT fk_message_citations_document_chunk
    FOREIGN KEY (document_chunk_id) REFERENCES document_chunks(id),

  CONSTRAINT uq_message_citations_rank
    UNIQUE (chat_message_id, rank_no),

  CONSTRAINT uq_message_citations_message_chunk
    UNIQUE (chat_message_id, document_chunk_id),

  CONSTRAINT ck_message_citations_rank_no
    CHECK (rank_no > 0),

  CONSTRAINT ck_message_citations_page_number_snapshot
    CHECK (page_number_snapshot IS NULL OR page_number_snapshot >= 0),

  CONSTRAINT ck_message_citations_relevance_score
    CHECK (relevance_score IS NULL OR relevance_score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_message_citations_chat_message_id
ON message_citations(chat_message_id);

CREATE INDEX IF NOT EXISTS idx_message_citations_document_chunk_id
ON message_citations(document_chunk_id);

-- =========================================================
-- 4) quizzes
-- =========================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  class_section_id UUID NULL,
  created_by_user_id UUID NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  chapter_label VARCHAR(255) NULL,
  difficulty_level VARCHAR(30) NULL,
  time_limit_seconds INT NULL,
  max_attempts INT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quizzes_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id),

  CONSTRAINT fk_quizzes_class_section
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id),

  CONSTRAINT fk_quizzes_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id),

  CONSTRAINT ck_quizzes_source_type
    CHECK (source_type IN ('ai_generated', 'teacher_created')),

  CONSTRAINT ck_quizzes_time_limit_seconds
    CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),

  CONSTRAINT ck_quizzes_max_attempts
    CHECK (max_attempts IS NULL OR max_attempts > 0),

  CONSTRAINT ck_quizzes_published_at
    CHECK (published_at IS NULL OR published_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id
ON quizzes(subject_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_class_section_id
ON quizzes(class_section_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_created_by_user_id
ON quizzes(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_is_published
ON quizzes(is_published);

-- =========================================================
-- 5) quiz_questions
-- =========================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL DEFAULT 'single_choice',
  points NUMERIC(8,2) NOT NULL DEFAULT 1.00,
  explanation_text TEXT NULL,
  source_chunk_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quiz_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),

  CONSTRAINT fk_quiz_questions_source_chunk
    FOREIGN KEY (source_chunk_id) REFERENCES document_chunks(id),

  CONSTRAINT uq_quiz_questions_order
    UNIQUE (quiz_id, question_order),

  CONSTRAINT ck_quiz_questions_order
    CHECK (question_order > 0),

  CONSTRAINT ck_quiz_questions_type
    CHECK (question_type IN ('single_choice', 'multiple_choice')),

  CONSTRAINT ck_quiz_questions_points
    CHECK (points > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id
ON quiz_questions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_source_chunk_id
ON quiz_questions(source_chunk_id);

-- =========================================================
-- 6) quiz_choices
-- =========================================================
CREATE TABLE IF NOT EXISTS quiz_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  choice_key VARCHAR(5) NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  choice_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quiz_choices_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id),

  CONSTRAINT uq_quiz_choices_key
    UNIQUE (question_id, choice_key),

  CONSTRAINT uq_quiz_choices_order
    UNIQUE (question_id, choice_order),

  CONSTRAINT ck_quiz_choices_order
    CHECK (choice_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_choices_question_id
ON quiz_choices(question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_choices_question_correct
ON quiz_choices(question_id, is_correct);

-- =========================================================
-- 7) quiz_attempts
-- =========================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  student_id UUID NOT NULL,
  attempt_no INT NOT NULL DEFAULT 1,
  chat_session_id UUID NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL,
  duration_seconds INT NULL,
  total_score NUMERIC(8,2) NULL,
  correct_count INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quiz_attempts_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),

  CONSTRAINT fk_quiz_attempts_student
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),

  CONSTRAINT fk_quiz_attempts_chat_session
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id),

  CONSTRAINT uq_quiz_attempts_quiz_student_attempt
    UNIQUE (quiz_id, student_id, attempt_no),

  CONSTRAINT ck_quiz_attempts_attempt_no
    CHECK (attempt_no > 0),

  CONSTRAINT ck_quiz_attempts_status
    CHECK (status IN ('in_progress', 'submitted', 'graded')),

  CONSTRAINT ck_quiz_attempts_duration_seconds
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0),

  CONSTRAINT ck_quiz_attempts_total_score
    CHECK (total_score IS NULL OR total_score >= 0),

  CONSTRAINT ck_quiz_attempts_correct_count
    CHECK (correct_count IS NULL OR correct_count >= 0),

  CONSTRAINT ck_quiz_attempts_submitted_at
    CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id
ON quiz_attempts(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id
ON quiz_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_chat_session_id
ON quiz_attempts(chat_session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status
ON quiz_attempts(status);

-- =========================================================
-- 8) quiz_answers
-- =========================================================
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_attempt_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer_text TEXT NULL,
  is_correct BOOLEAN NULL,
  awarded_score NUMERIC(8,2) NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quiz_answers_attempt
    FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id),

  CONSTRAINT fk_quiz_answers_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id),

  CONSTRAINT uq_quiz_answers_attempt_question
    UNIQUE (quiz_attempt_id, question_id),

  CONSTRAINT ck_quiz_answers_awarded_score
    CHECK (awarded_score IS NULL OR awarded_score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id
ON quiz_answers(quiz_attempt_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id
ON quiz_answers(question_id);

-- =========================================================
-- 9) quiz_answer_choices
-- =========================================================
CREATE TABLE IF NOT EXISTS quiz_answer_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_answer_id UUID NOT NULL,
  choice_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_quiz_answer_choices_answer
    FOREIGN KEY (quiz_answer_id) REFERENCES quiz_answers(id),

  CONSTRAINT fk_quiz_answer_choices_choice
    FOREIGN KEY (choice_id) REFERENCES quiz_choices(id),

  CONSTRAINT uq_quiz_answer_choices_answer_choice
    UNIQUE (quiz_answer_id, choice_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answer_choices_answer_id
ON quiz_answer_choices(quiz_answer_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answer_choices_choice_id
ON quiz_answer_choices(choice_id);

-- =========================================================
-- 10) updated_at triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_chat_sessions_set_updated_at ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_set_updated_at
BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_messages_set_updated_at ON chat_messages;
CREATE TRIGGER trg_chat_messages_set_updated_at
BEFORE UPDATE ON chat_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quizzes_set_updated_at ON quizzes;
CREATE TRIGGER trg_quizzes_set_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quiz_questions_set_updated_at ON quiz_questions;
CREATE TRIGGER trg_quiz_questions_set_updated_at
BEFORE UPDATE ON quiz_questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quiz_choices_set_updated_at ON quiz_choices;
CREATE TRIGGER trg_quiz_choices_set_updated_at
BEFORE UPDATE ON quiz_choices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quiz_attempts_set_updated_at ON quiz_attempts;
CREATE TRIGGER trg_quiz_attempts_set_updated_at
BEFORE UPDATE ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quiz_answers_set_updated_at ON quiz_answers;
CREATE TRIGGER trg_quiz_answers_set_updated_at
BEFORE UPDATE ON quiz_answers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 11) business-rule triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_chat_sessions_check_subject_consistency ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_check_subject_consistency
BEFORE INSERT OR UPDATE OF subject_id, class_section_id
ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION ensure_class_section_matches_subject();

DROP TRIGGER IF EXISTS trg_chat_messages_refresh_session_last_message ON chat_messages;
CREATE TRIGGER trg_chat_messages_refresh_session_last_message
AFTER INSERT OR UPDATE OR DELETE
ON chat_messages
FOR EACH ROW EXECUTE FUNCTION refresh_chat_session_last_message();

DROP TRIGGER IF EXISTS trg_message_citations_prepare_snapshot ON message_citations;
CREATE TRIGGER trg_message_citations_prepare_snapshot
BEFORE INSERT OR UPDATE OF chat_message_id, document_chunk_id
ON message_citations
FOR EACH ROW EXECUTE FUNCTION prepare_message_citation_snapshot();

DROP TRIGGER IF EXISTS trg_quizzes_check_subject_consistency ON quizzes;
CREATE TRIGGER trg_quizzes_check_subject_consistency
BEFORE INSERT OR UPDATE OF subject_id, class_section_id
ON quizzes
FOR EACH ROW EXECUTE FUNCTION ensure_class_section_matches_subject();

DROP TRIGGER IF EXISTS trg_quiz_questions_check_source_chunk ON quiz_questions;
CREATE TRIGGER trg_quiz_questions_check_source_chunk
BEFORE INSERT OR UPDATE OF quiz_id, source_chunk_id
ON quiz_questions
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_question_source_chunk_matches_subject();

DROP TRIGGER IF EXISTS trg_quiz_attempts_check_eligibility ON quiz_attempts;
CREATE TRIGGER trg_quiz_attempts_check_eligibility
BEFORE INSERT OR UPDATE OF quiz_id, student_id, chat_session_id
ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_attempt_eligibility();

DROP TRIGGER IF EXISTS trg_quiz_answers_check_attempt_question ON quiz_answers;
CREATE TRIGGER trg_quiz_answers_check_attempt_question
BEFORE INSERT OR UPDATE OF quiz_attempt_id, question_id, awarded_score
ON quiz_answers
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_answer_matches_attempt_question();

DROP TRIGGER IF EXISTS trg_quiz_answer_choices_check_match ON quiz_answer_choices;
CREATE TRIGGER trg_quiz_answer_choices_check_match
BEFORE INSERT OR UPDATE OF quiz_answer_id, choice_id
ON quiz_answer_choices
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_answer_choice_matches_question();

COMMIT;
