BEGIN;

-- Full reset for the Course Assistant Chatbot database.
-- Safe rerun order:
-- 1) member 2 dependent tables
-- 2) member 3 knowledge-base tables
-- 3) member 1 academic-core tables
-- Uses TRUNCATE ... CASCADE so seed scripts can be re-run cleanly.

TRUNCATE TABLE
  -- Member 2: chat / citation / quiz / progress
  quiz_answer_choices,
  quiz_answers,
  quiz_attempts,
  quiz_choices,
  quiz_questions,
  quizzes,
  message_citations,
  chat_messages,
  chat_sessions,

  -- Member 3: knowledge base
  document_chunks,
  ingestion_jobs,
  document_versions,
  documents,

  -- Member 1: import / academic core
  import_batch_errors,
  import_batches,
  enrollments,
  teaching_assignments,
  class_sections,
  subjects,
  student_profiles,
  teacher_profiles,
  user_roles,
  users,
  roles
RESTART IDENTITY
CASCADE;

COMMIT;
