BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 1: chat_session.subject_id phải khớp class_section.subject_id nếu có class_section_id
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_chat_session_subject_consistency()
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

  IF NEW.subject_id <> v_subject_id THEN
    RAISE EXCEPTION 'chat_sessions.subject_id % must match class_sections.subject_id %', NEW.subject_id, v_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 2: quizzes.subject_id phải khớp class_section.subject_id nếu có class_section_id
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_subject_consistency()
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

  IF NEW.subject_id <> v_subject_id THEN
    RAISE EXCEPTION 'quizzes.subject_id % must match class_sections.subject_id %', NEW.subject_id, v_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 3: chỉ assistant message mới được gắn citation
-- đồng thời tự snapshot dữ liệu citation từ knowledge base nếu chưa truyền vào
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_message_citation_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_role VARCHAR(20);
  v_session_subject_id UUID;
  v_chunk_subject_id UUID;
  v_page_number INT;
  v_file_name VARCHAR(255);
  v_source_label VARCHAR(255);
  v_section_label VARCHAR(255);
  v_document_version_id UUID;
BEGIN
  SELECT
    cm.role,
    cs.subject_id
  INTO
    v_role,
    v_session_subject_id
  FROM chat_messages cm
  JOIN chat_sessions cs ON cs.id = cm.chat_session_id
  WHERE cm.id = NEW.chat_message_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'chat_message_id % does not exist', NEW.chat_message_id;
  END IF;

  IF v_role <> 'assistant' THEN
    RAISE EXCEPTION 'Citations can only be attached to assistant messages. message role = %', v_role;
  END IF;

  SELECT
    dc.subject_id,
    dc.page_number,
    dv.original_file_name,
    d.source_label,
    dc.section_label,
    dc.document_version_id
  INTO
    v_chunk_subject_id,
    v_page_number,
    v_file_name,
    v_source_label,
    v_section_label,
    v_document_version_id
  FROM document_chunks dc
  JOIN document_versions dv ON dv.id = dc.document_version_id
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.id = NEW.document_chunk_id;

  IF v_document_version_id IS NULL THEN
    RAISE EXCEPTION 'document_chunk_id % does not exist or cannot resolve source snapshot', NEW.document_chunk_id;
  END IF;

  IF v_session_subject_id <> v_chunk_subject_id THEN
    RAISE EXCEPTION 'message_citations.document_chunk_id % belongs to subject % but chat session belongs to subject %',
      NEW.document_chunk_id, v_chunk_subject_id, v_session_subject_id;
  END IF;

  NEW.page_number_snapshot := COALESCE(NEW.page_number_snapshot, v_page_number);
  NEW.file_name_snapshot := COALESCE(NEW.file_name_snapshot, v_file_name);
  NEW.source_label_snapshot := COALESCE(NEW.source_label_snapshot, v_source_label);
  NEW.section_label_snapshot := COALESCE(NEW.section_label_snapshot, v_section_label);
  NEW.document_version_id_snapshot := COALESCE(NEW.document_version_id_snapshot, v_document_version_id);

  IF NEW.citation_label IS NULL THEN
    NEW.citation_label := CONCAT(
      COALESCE(NEW.source_label_snapshot, 'Document'),
      CASE
        WHEN NEW.page_number_snapshot IS NOT NULL THEN CONCAT(' - page ', NEW.page_number_snapshot)
        WHEN NEW.section_label_snapshot IS NOT NULL THEN CONCAT(' - ', NEW.section_label_snapshot)
        ELSE ''
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 4: quiz_attempt phải hợp lệ theo enrollment + max_attempts
-- nếu có chat_session_id thì chat session phải cùng user và cùng subject với attempt
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_attempt_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_quiz_subject_id UUID;
  v_quiz_class_section_id UUID;
  v_max_attempts INT;
  v_student_user_id UUID;
  v_chat_user_id UUID;
  v_chat_subject_id UUID;
  v_existing_attempts INT;
BEGIN
  SELECT subject_id, class_section_id, max_attempts
  INTO v_quiz_subject_id, v_quiz_class_section_id, v_max_attempts
  FROM quizzes
  WHERE id = NEW.quiz_id;

  IF v_quiz_subject_id IS NULL THEN
    RAISE EXCEPTION 'quiz_id % does not exist', NEW.quiz_id;
  END IF;

  SELECT user_id
  INTO v_student_user_id
  FROM student_profiles
  WHERE id = NEW.student_id;

  IF v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'student_id % does not exist', NEW.student_id;
  END IF;

  IF TG_OP = 'INSERT' AND v_max_attempts IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_existing_attempts
    FROM quiz_attempts
    WHERE quiz_id = NEW.quiz_id
      AND student_id = NEW.student_id;

    IF v_existing_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Student % exceeded max_attempts % for quiz %', NEW.student_id, v_max_attempts, NEW.quiz_id;
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
      RAISE EXCEPTION 'Student % is not eligible for class-bound quiz %', NEW.student_id, NEW.quiz_id;
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
      RAISE EXCEPTION 'Student % is not enrolled in subject of quiz %', NEW.student_id, NEW.quiz_id;
    END IF;
  END IF;

  IF NEW.chat_session_id IS NOT NULL THEN
    SELECT user_id, subject_id
    INTO v_chat_user_id, v_chat_subject_id
    FROM chat_sessions
    WHERE id = NEW.chat_session_id;

    IF v_chat_user_id IS NULL THEN
      RAISE EXCEPTION 'chat_session_id % does not exist', NEW.chat_session_id;
    END IF;

    IF v_chat_user_id <> v_student_user_id THEN
      RAISE EXCEPTION 'quiz_attempt.chat_session_id % belongs to another user', NEW.chat_session_id;
    END IF;

    IF v_chat_subject_id <> v_quiz_subject_id THEN
      RAISE EXCEPTION 'quiz_attempt.chat_session.subject_id % must match quiz.subject_id %', v_chat_subject_id, v_quiz_subject_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 5: question trong quiz_answers phải thuộc đúng quiz_attempt.quiz_id
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_answer_question_matches_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_attempt_quiz_id UUID;
  v_question_quiz_id UUID;
BEGIN
  SELECT quiz_id
  INTO v_attempt_quiz_id
  FROM quiz_attempts
  WHERE id = NEW.quiz_attempt_id;

  IF v_attempt_quiz_id IS NULL THEN
    RAISE EXCEPTION 'quiz_attempt_id % does not exist', NEW.quiz_attempt_id;
  END IF;

  SELECT quiz_id
  INTO v_question_quiz_id
  FROM quiz_questions
  WHERE id = NEW.question_id;

  IF v_question_quiz_id IS NULL THEN
    RAISE EXCEPTION 'question_id % does not exist', NEW.question_id;
  END IF;

  IF v_attempt_quiz_id <> v_question_quiz_id THEN
    RAISE EXCEPTION 'quiz_answers.question_id % does not belong to quiz_attempt.quiz_id %', NEW.question_id, v_attempt_quiz_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 6: choice trong quiz_answer_choices phải thuộc đúng question của quiz_answer
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_answer_choice_matches_question()
RETURNS TRIGGER AS $$
DECLARE
  v_answer_question_id UUID;
  v_choice_question_id UUID;
BEGIN
  SELECT question_id
  INTO v_answer_question_id
  FROM quiz_answers
  WHERE id = NEW.quiz_answer_id;

  IF v_answer_question_id IS NULL THEN
    RAISE EXCEPTION 'quiz_answer_id % does not exist', NEW.quiz_answer_id;
  END IF;

  SELECT question_id
  INTO v_choice_question_id
  FROM quiz_choices
  WHERE id = NEW.choice_id;

  IF v_choice_question_id IS NULL THEN
    RAISE EXCEPTION 'choice_id % does not exist', NEW.choice_id;
  END IF;

  IF v_answer_question_id <> v_choice_question_id THEN
    RAISE EXCEPTION 'choice_id % does not belong to the same question as quiz_answer_id %', NEW.choice_id, NEW.quiz_answer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- Helper 7: validate rule số đáp án đúng theo question_type
-- single_choice   -> đúng 1 đáp án đúng
-- multiple_choice -> ít nhất 1 đáp án đúng
-- Dùng deferred trigger để không phá seed insert nhiều rows trong 1 transaction
-- =========================================================
CREATE OR REPLACE FUNCTION validate_quiz_question_choice_rules(p_question_id UUID)
RETURNS VOID AS $$
DECLARE
  v_question_type VARCHAR(30);
  v_correct_count INT;
BEGIN
  SELECT question_type
  INTO v_question_type
  FROM quiz_questions
  WHERE id = p_question_id;

  IF v_question_type IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_correct_count
  FROM quiz_choices
  WHERE question_id = p_question_id
    AND is_correct = TRUE;

  IF v_question_type = 'single_choice' AND v_correct_count <> 1 THEN
    RAISE EXCEPTION 'Question % is single_choice and must have exactly 1 correct choice, found %', p_question_id, v_correct_count;
  ELSIF v_question_type = 'multiple_choice' AND v_correct_count < 1 THEN
    RAISE EXCEPTION 'Question % is multiple_choice and must have at least 1 correct choice', p_question_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_quiz_question_choice_rules_from_choices()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM validate_quiz_question_choice_rules(COALESCE(NEW.question_id, OLD.question_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_quiz_question_choice_rules_from_questions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM validate_quiz_question_choice_rules(NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Helper 8: quiz_questions.source_chunk_id phải thuộc cùng subject với quizzes.subject_id
-- =========================================================
CREATE OR REPLACE FUNCTION ensure_quiz_question_source_chunk_subject_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_quiz_subject_id UUID;
  v_chunk_subject_id UUID;
BEGIN
  IF NEW.source_chunk_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subject_id
  INTO v_quiz_subject_id
  FROM quizzes
  WHERE id = NEW.quiz_id;

  IF v_quiz_subject_id IS NULL THEN
    RAISE EXCEPTION 'quiz_id % does not exist', NEW.quiz_id;
  END IF;

  SELECT subject_id
  INTO v_chunk_subject_id
  FROM document_chunks
  WHERE id = NEW.source_chunk_id;

  IF v_chunk_subject_id IS NULL THEN
    RAISE EXCEPTION 'source_chunk_id % does not exist', NEW.source_chunk_id;
  END IF;

  IF v_quiz_subject_id <> v_chunk_subject_id THEN
    RAISE EXCEPTION 'quiz_questions.source_chunk_id % belongs to subject % but quiz belongs to subject %',
      NEW.source_chunk_id, v_chunk_subject_id, v_quiz_subject_id;
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
  CONSTRAINT fk_chat_messages_chat_session
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id),
  CONSTRAINT uq_chat_messages_session_index
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

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_session_created_at
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
  CONSTRAINT uq_message_citations_message_rank
    UNIQUE (chat_message_id, rank_no),
  CONSTRAINT uq_message_citations_message_chunk
    UNIQUE (chat_message_id, document_chunk_id),
  CONSTRAINT ck_message_citations_rank_no
    CHECK (rank_no > 0),
  CONSTRAINT ck_message_citations_relevance_score
    CHECK (relevance_score IS NULL OR relevance_score >= 0)
);

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

CREATE INDEX IF NOT EXISTS idx_quizzes_subject_published
ON quizzes(subject_id, is_published);

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
  CONSTRAINT uq_quiz_questions_quiz_order
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
  CONSTRAINT uq_quiz_choices_question_key
    UNIQUE (question_id, choice_key),
  CONSTRAINT uq_quiz_choices_question_order
    UNIQUE (question_id, choice_order),
  CONSTRAINT ck_quiz_choices_order
    CHECK (choice_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_choices_question_id
ON quiz_choices(question_id);

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
  CONSTRAINT uq_quiz_attempts_quiz_student_attempt_no
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
  CONSTRAINT fk_quiz_answers_quiz_attempt
    FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id),
  CONSTRAINT fk_quiz_answers_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id),
  CONSTRAINT uq_quiz_answers_attempt_question
    UNIQUE (quiz_attempt_id, question_id),
  CONSTRAINT ck_quiz_answers_awarded_score
    CHECK (awarded_score IS NULL OR awarded_score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_attempt_id
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
  CONSTRAINT fk_quiz_answer_choices_quiz_answer
    FOREIGN KEY (quiz_answer_id) REFERENCES quiz_answers(id),
  CONSTRAINT fk_quiz_answer_choices_choice
    FOREIGN KEY (choice_id) REFERENCES quiz_choices(id),
  CONSTRAINT uq_quiz_answer_choices_answer_choice
    UNIQUE (quiz_answer_id, choice_id)
);

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
FOR EACH ROW EXECUTE FUNCTION ensure_chat_session_subject_consistency();

DROP TRIGGER IF EXISTS trg_message_citations_check_validity ON message_citations;
CREATE TRIGGER trg_message_citations_check_validity
BEFORE INSERT OR UPDATE OF chat_message_id, document_chunk_id, page_number_snapshot,
  file_name_snapshot, source_label_snapshot, section_label_snapshot,
  document_version_id_snapshot, citation_label
ON message_citations
FOR EACH ROW EXECUTE FUNCTION ensure_message_citation_validity();

DROP TRIGGER IF EXISTS trg_quizzes_check_subject_consistency ON quizzes;
CREATE TRIGGER trg_quizzes_check_subject_consistency
BEFORE INSERT OR UPDATE OF subject_id, class_section_id
ON quizzes
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_subject_consistency();

DROP TRIGGER IF EXISTS trg_quiz_questions_check_source_chunk_subject ON quiz_questions;
CREATE TRIGGER trg_quiz_questions_check_source_chunk_subject
BEFORE INSERT OR UPDATE OF quiz_id, source_chunk_id
ON quiz_questions
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_question_source_chunk_subject_consistency();

DROP TRIGGER IF EXISTS trg_quiz_attempts_check_validity ON quiz_attempts;
CREATE TRIGGER trg_quiz_attempts_check_validity
BEFORE INSERT OR UPDATE OF quiz_id, student_id, chat_session_id
ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_attempt_validity();

DROP TRIGGER IF EXISTS trg_quiz_answers_check_question_matches_attempt ON quiz_answers;
CREATE TRIGGER trg_quiz_answers_check_question_matches_attempt
BEFORE INSERT OR UPDATE OF quiz_attempt_id, question_id
ON quiz_answers
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_answer_question_matches_attempt();

DROP TRIGGER IF EXISTS trg_quiz_answer_choices_check_question_match ON quiz_answer_choices;
CREATE TRIGGER trg_quiz_answer_choices_check_question_match
BEFORE INSERT OR UPDATE OF quiz_answer_id, choice_id
ON quiz_answer_choices
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_answer_choice_matches_question();

DROP TRIGGER IF EXISTS trg_quiz_choices_validate_correctness ON quiz_choices;
CREATE CONSTRAINT TRIGGER trg_quiz_choices_validate_correctness
AFTER INSERT OR UPDATE OF is_correct, question_id OR DELETE
ON quiz_choices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_question_choice_rules_from_choices();

DROP TRIGGER IF EXISTS trg_quiz_questions_validate_correctness ON quiz_questions;
CREATE CONSTRAINT TRIGGER trg_quiz_questions_validate_correctness
AFTER INSERT OR UPDATE OF question_type
ON quiz_questions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_quiz_question_choice_rules_from_questions();

COMMIT;
