BEGIN;

-- =========================================================
-- 1) chat_sessions
-- =========================================================
INSERT INTO chat_sessions (
  user_id,
  subject_id,
  class_section_id,
  title,
  selected_model,
  status,
  last_message_at
)
SELECT
  u.id,
  s.id,
  cs.id,
  x.title,
  x.selected_model,
  x.status,
  x.last_message_at
FROM (
  VALUES
    ('student1@course.local', 'SE101', '01', 'What is programming?',           'gpt-4o-mini', 'active',   now() - interval '4 minutes'),
    ('student2@course.local', 'DB201', '01', 'Generate a quiz related to DB',  'gemini-1.5-flash', 'active', now() - interval '12 minutes')
) AS x(user_email, subject_code, section_code, title, selected_model, status, last_message_at)
JOIN users u ON u.email = x.user_email
JOIN subjects s ON s.code = x.subject_code
JOIN class_sections cs
  ON cs.subject_id = s.id
 AND cs.section_code = x.section_code
 AND cs.semester = 'HK2'
 AND cs.academic_year = '2025-2026';

-- =========================================================
-- 2) chat_messages
-- =========================================================
INSERT INTO chat_messages (
  chat_session_id,
  message_index,
  role,
  content_text,
  content_markdown,
  model_name,
  stream_status,
  prompt_tokens,
  completion_tokens,
  latency_ms,
  error_message
)
SELECT
  cs.id,
  x.message_index,
  x.role,
  x.content_text,
  x.content_markdown,
  x.model_name,
  x.stream_status,
  x.prompt_tokens,
  x.completion_tokens,
  x.latency_ms,
  x.error_message
FROM (
  VALUES
    ('What is programming?', 0, 'user',      'What is programming?',
     'What is programming?', NULL,               'completed', NULL, NULL, NULL, NULL),

    ('What is programming?', 1, 'assistant', 'Programming is the process of creating a set of instructions that tells a computer how to perform a specific task.',
     'Programming is the process of creating a set of instructions that tells a computer how to perform a specific task.\n\n(from Page 8, Introduction to programming, Slide 2)',
     'gpt-4o-mini', 'completed', 320, 96, 1450, NULL),

    ('Generate a quiz related to DB', 0, 'user', 'Generate one quiz related to database fundamentals.',
     'Generate one quiz related to database fundamentals.', NULL, 'completed', NULL, NULL, NULL, NULL),

    ('Generate a quiz related to DB', 1, 'assistant', 'Okay. Here is your 3-question quiz related to database fundamentals.',
     'Okay. Here is your **3-question quiz** related to database fundamentals.',
     'gemini-1.5-flash', 'completed', 410, 120, 1790, NULL)
) AS x(session_title, message_index, role, content_text, content_markdown, model_name, stream_status, prompt_tokens, completion_tokens, latency_ms, error_message)
JOIN chat_sessions cs ON cs.title = x.session_title;

-- =========================================================
-- 3) message_citations
-- Gắn citation cho assistant message của session SE101
-- =========================================================
INSERT INTO message_citations (
  chat_message_id,
  document_chunk_id,
  rank_no,
  relevance_score
)
SELECT
  cm.id,
  dc.id,
  x.rank_no,
  x.relevance_score
FROM (
  VALUES
    ('What is programming?', 1, 'DOC003', 5, 0, 1, 0.9632),
    ('What is programming?', 1, 'DOC001', 1, 0, 2, 0.9110)
) AS x(session_title, message_index, document_code, page_number, chunk_index, rank_no, relevance_score)
JOIN chat_sessions cs ON cs.title = x.session_title
JOIN chat_messages cm
  ON cm.chat_session_id = cs.id
 AND cm.message_index = x.message_index
JOIN documents d ON d.document_code = x.document_code
JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1
JOIN document_chunks dc
  ON dc.document_version_id = dv.id
 AND COALESCE(dc.page_number, 0) = COALESCE(x.page_number, 0)
 AND dc.chunk_index = x.chunk_index;

-- =========================================================
-- 4) quizzes
-- Quiz 1: teacher created, gắn lớp SE101-01
-- Quiz 2: AI generated, mức subject DB201
-- =========================================================
INSERT INTO quizzes (
  subject_id,
  class_section_id,
  created_by_user_id,
  source_type,
  title,
  description,
  chapter_label,
  difficulty_level,
  time_limit_seconds,
  max_attempts,
  is_published,
  published_at,
  created_at,
  updated_at
)
SELECT
  s.id,
  cs.id,
  u.id,
  x.source_type,
  x.title,
  x.description,
  x.chapter_label,
  x.difficulty_level,
  x.time_limit_seconds,
  x.max_attempts,
  x.is_published,
  x.published_at,
  x.created_at,
  x.updated_at
FROM (
  VALUES
    ('SE101', '01', 'teacher1@course.local', 'teacher_created', 'Quiz 1 - Intro to Programming', 'Weekly quiz for SE101 class 01', 'Week 1', 'easy',   600, 2, TRUE,  now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'),
    ('DB201', NULL, 'teacher2@course.local', 'ai_generated',    'Quiz 2 - Database Fundamentals', 'Auto-generated quiz from uploaded materials', 'Chapter 1', 'medium', 900, 3, TRUE, now() - interval '1 day', now() - interval '1 day', now() - interval '1 day')
) AS x(subject_code, section_code, creator_email, source_type, title, description, chapter_label, difficulty_level, time_limit_seconds, max_attempts, is_published, published_at, created_at, updated_at)
JOIN subjects s ON s.code = x.subject_code
JOIN users u ON u.email = x.creator_email
LEFT JOIN class_sections cs
  ON x.section_code IS NOT NULL
 AND cs.subject_id = s.id
 AND cs.section_code = x.section_code
 AND cs.semester = 'HK2'
 AND cs.academic_year = '2025-2026';

-- =========================================================
-- 5) quiz_questions
-- =========================================================
INSERT INTO quiz_questions (
  quiz_id,
  question_order,
  question_text,
  question_type,
  points,
  explanation_text,
  source_chunk_id
)
SELECT
  q.id,
  x.question_order,
  x.question_text,
  x.question_type,
  x.points,
  x.explanation_text,
  dc.id
FROM (
  VALUES
    ('Quiz 1 - Intro to Programming', 1, 'Which language uses OOP method?', 'single_choice',   1.00, 'Java is a classic OOP language.',                         'DOC003', 6, 0),
    ('Quiz 1 - Intro to Programming', 2, 'What does programming mean?',      'single_choice',   1.00, 'Programming means creating instructions for a computer.', 'DOC003', 5, 0),
    ('Quiz 2 - Database Fundamentals', 1, 'Which item is used to uniquely identify a row?', 'single_choice', 1.00, 'A primary key uniquely identifies each row.', 'DOC002', 0, 0),
    ('Quiz 2 - Database Fundamentals', 2, 'Select SQL join types.',          'multiple_choice', 2.00, 'JOIN types include INNER JOIN and LEFT JOIN.',           'DOC002', 0, 1)
) AS x(quiz_title, question_order, question_text, question_type, points, explanation_text, document_code, page_number, chunk_index)
JOIN quizzes q ON q.title = x.quiz_title
JOIN documents d ON d.document_code = x.document_code
JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1
JOIN document_chunks dc
  ON dc.document_version_id = dv.id
 AND COALESCE(dc.page_number, 0) = COALESCE(x.page_number, 0)
 AND dc.chunk_index = x.chunk_index;

-- =========================================================
-- 6) quiz_choices
-- =========================================================
INSERT INTO quiz_choices (
  question_id,
  choice_key,
  choice_text,
  is_correct,
  choice_order
)
SELECT
  qq.id,
  x.choice_key,
  x.choice_text,
  x.is_correct,
  x.choice_order
FROM (
  VALUES
    ('Quiz 1 - Intro to Programming', 1, 'A', 'Java',        TRUE,  1),
    ('Quiz 1 - Intro to Programming', 1, 'B', 'HTML',        FALSE, 2),
    ('Quiz 1 - Intro to Programming', 1, 'C', 'CSS',         FALSE, 3),

    ('Quiz 1 - Intro to Programming', 2, 'A', 'Creating instructions for a computer', TRUE,  1),
    ('Quiz 1 - Intro to Programming', 2, 'B', 'Only fixing network hardware',         FALSE, 2),
    ('Quiz 1 - Intro to Programming', 2, 'C', 'Drawing UI mockups only',              FALSE, 3),

    ('Quiz 2 - Database Fundamentals', 1, 'A', 'Primary key', TRUE,  1),
    ('Quiz 2 - Database Fundamentals', 1, 'B', 'Color code',  FALSE, 2),
    ('Quiz 2 - Database Fundamentals', 1, 'C', 'Folder name', FALSE, 3),

    ('Quiz 2 - Database Fundamentals', 2, 'A', 'INNER JOIN', TRUE,  1),
    ('Quiz 2 - Database Fundamentals', 2, 'B', 'LEFT JOIN',  TRUE,  2),
    ('Quiz 2 - Database Fundamentals', 2, 'C', 'COLOR JOIN', FALSE, 3)
) AS x(quiz_title, question_order, choice_key, choice_text, is_correct, choice_order)
JOIN quizzes q ON q.title = x.quiz_title
JOIN quiz_questions qq
  ON qq.quiz_id = q.id
 AND qq.question_order = x.question_order;

-- =========================================================
-- 7) quiz_attempts
-- =========================================================
INSERT INTO quiz_attempts (
  quiz_id,
  student_id,
  attempt_no,
  chat_session_id,
  status,
  started_at,
  submitted_at,
  duration_seconds,
  total_score,
  correct_count
)
SELECT
  q.id,
  sp.id,
  x.attempt_no,
  cs.id,
  x.status,
  x.started_at,
  x.submitted_at,
  x.duration_seconds,
  x.total_score,
  x.correct_count
FROM (
  VALUES
    ('Quiz 1 - Intro to Programming', 'SV001', 1, 'What is programming?',         'graded',     now() - interval '30 minutes', now() - interval '25 minutes', 300, 2.00, 2),
    ('Quiz 1 - Intro to Programming', 'SV002', 1, NULL,                           'submitted',  now() - interval '50 minutes', now() - interval '42 minutes', 480, 1.00, 1),
    ('Quiz 2 - Database Fundamentals', 'SV002', 1, 'Generate a quiz related to DB','in_progress', now() - interval '8 minutes',  NULL,                           NULL, NULL, NULL)
) AS x(quiz_title, student_code, attempt_no, session_title, status, started_at, submitted_at, duration_seconds, total_score, correct_count)
JOIN quizzes q ON q.title = x.quiz_title
JOIN student_profiles sp ON sp.student_code = x.student_code
LEFT JOIN chat_sessions cs ON cs.title = x.session_title;

-- =========================================================
-- 8) quiz_answers
-- =========================================================
INSERT INTO quiz_answers (
  quiz_attempt_id,
  question_id,
  answer_text,
  is_correct,
  awarded_score,
  answered_at
)
SELECT
  qa.id,
  qq.id,
  x.answer_text,
  x.is_correct,
  x.awarded_score,
  x.answered_at
FROM (
  VALUES
    ('Quiz 1 - Intro to Programming', 'SV001', 1, 'Java',                                      TRUE,  1.00, now() - interval '28 minutes'),
    ('Quiz 1 - Intro to Programming', 'SV001', 2, 'Creating instructions for a computer',      TRUE,  1.00, now() - interval '26 minutes'),
    ('Quiz 1 - Intro to Programming', 'SV002', 1, 'Java',                                      TRUE,  1.00, now() - interval '45 minutes'),
    ('Quiz 1 - Intro to Programming', 'SV002', 2, 'Only fixing network hardware',              FALSE, 0.00, now() - interval '43 minutes')
) AS x(quiz_title, student_code, question_order, answer_text, is_correct, awarded_score, answered_at)
JOIN quizzes q ON q.title = x.quiz_title
JOIN quiz_questions qq ON qq.quiz_id = q.id AND qq.question_order = x.question_order
JOIN student_profiles sp ON sp.student_code = x.student_code
JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = sp.id AND qa.attempt_no = 1;

-- =========================================================
-- 9) quiz_answer_choices
-- =========================================================
INSERT INTO quiz_answer_choices (
  quiz_answer_id,
  choice_id
)
SELECT
  qans.id,
  qc.id
FROM (
  VALUES
    ('Quiz 1 - Intro to Programming', 'SV001', 1, 'A'),
    ('Quiz 1 - Intro to Programming', 'SV001', 2, 'A'),
    ('Quiz 1 - Intro to Programming', 'SV002', 1, 'A'),
    ('Quiz 1 - Intro to Programming', 'SV002', 2, 'B')
) AS x(quiz_title, student_code, question_order, choice_key)
JOIN quizzes q ON q.title = x.quiz_title
JOIN student_profiles sp ON sp.student_code = x.student_code
JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = sp.id AND qa.attempt_no = 1
JOIN quiz_questions qq ON qq.quiz_id = q.id AND qq.question_order = x.question_order
JOIN quiz_answers qans ON qans.quiz_attempt_id = qa.id AND qans.question_id = qq.id
JOIN quiz_choices qc ON qc.question_id = qq.id AND qc.choice_key = x.choice_key;

COMMIT;
