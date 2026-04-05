-- =========================================================
-- 1) Tổng số bản ghi member 2
-- =========================================================
SELECT 'chat_sessions' AS table_name, COUNT(*) AS total FROM chat_sessions
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'message_citations', COUNT(*) FROM message_citations
UNION ALL
SELECT 'quizzes', COUNT(*) FROM quizzes
UNION ALL
SELECT 'quiz_questions', COUNT(*) FROM quiz_questions
UNION ALL
SELECT 'quiz_choices', COUNT(*) FROM quiz_choices
UNION ALL
SELECT 'quiz_attempts', COUNT(*) FROM quiz_attempts
UNION ALL
SELECT 'quiz_answers', COUNT(*) FROM quiz_answers
UNION ALL
SELECT 'quiz_answer_choices', COUNT(*) FROM quiz_answer_choices;

-- =========================================================
-- 2) Kiểm tra chat history + citation chain
-- =========================================================
SELECT
  cs.title AS session_title,
  cm.message_index,
  cm.role,
  LEFT(cm.content_text, 80) AS message_preview,
  mc.rank_no,
  mc.citation_label,
  d.document_code,
  dv.original_file_name,
  dc.page_number,
  dc.section_label
FROM chat_sessions cs
JOIN chat_messages cm ON cm.chat_session_id = cs.id
LEFT JOIN message_citations mc ON mc.chat_message_id = cm.id
LEFT JOIN document_chunks dc ON dc.id = mc.document_chunk_id
LEFT JOIN document_versions dv ON dv.id = dc.document_version_id
LEFT JOIN documents d ON d.id = dc.document_id
ORDER BY cs.title, cm.message_index, mc.rank_no;

-- =========================================================
-- 3) Kiểm tra quiz summary
-- =========================================================
SELECT
  q.title AS quiz_title,
  s.code AS subject_code,
  q.source_type,
  q.is_published,
  COUNT(DISTINCT qq.id) AS total_questions,
  COUNT(DISTINCT qa.id) AS total_attempts
FROM quizzes q
JOIN subjects s ON s.id = q.subject_id
LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
GROUP BY q.title, s.code, q.source_type, q.is_published
ORDER BY q.title;

-- =========================================================
-- 4) Kiểm tra track progress theo sinh viên
-- =========================================================
SELECT
  sp.student_code,
  u.full_name,
  COUNT(DISTINCT qa.id) AS total_attempts,
  COALESCE(MAX(qa.total_score), 0) AS highest_score,
  COALESCE(AVG(qa.total_score), 0) AS avg_score
FROM student_profiles sp
JOIN users u ON u.id = sp.user_id
LEFT JOIN quiz_attempts qa ON qa.student_id = sp.id AND qa.status IN ('submitted', 'graded')
GROUP BY sp.student_code, u.full_name
ORDER BY sp.student_code;

-- =========================================================
-- 5) Kiểm tra từng câu trả lời và đáp án student đã chọn
-- =========================================================
SELECT
  q.title AS quiz_title,
  sp.student_code,
  qq.question_order,
  qq.question_text,
  qans.is_correct,
  qans.awarded_score,
  STRING_AGG(qc.choice_key || ': ' || qc.choice_text, ', ' ORDER BY qc.choice_order) AS selected_choices
FROM quiz_answers qans
JOIN quiz_attempts qa ON qa.id = qans.quiz_attempt_id
JOIN student_profiles sp ON sp.id = qa.student_id
JOIN quiz_questions qq ON qq.id = qans.question_id
JOIN quizzes q ON q.id = qa.quiz_id
LEFT JOIN quiz_answer_choices qac ON qac.quiz_answer_id = qans.id
LEFT JOIN quiz_choices qc ON qc.id = qac.choice_id
GROUP BY q.title, sp.student_code, qq.question_order, qq.question_text, qans.is_correct, qans.awarded_score
ORDER BY q.title, sp.student_code, qq.question_order;


-- =========================================================
-- 6) Negative tests: các trigger/ràng buộc nghiệp vụ phải fail đúng khi dữ liệu sai
-- =========================================================
CREATE TEMP TABLE IF NOT EXISTS negative_test_results (
  test_name TEXT NOT NULL,
  expected_error TEXT NOT NULL,
  actual_result TEXT NOT NULL
);

-- 6.1 chat_sessions: subject_id phải khớp class_section.subject_id
DO $$
BEGIN
  BEGIN
    INSERT INTO chat_sessions (user_id, subject_id, class_section_id, title)
    SELECT u.id, s_db.id, cs_se.id, 'NEG - invalid session subject mismatch'
    FROM users u
    JOIN subjects s_db ON s_db.code = 'DB201'
    JOIN subjects s_se ON s_se.code = 'SE101'
    JOIN class_sections cs_se
      ON cs_se.subject_id = s_se.id
     AND cs_se.section_code = '01'
     AND cs_se.semester = 'HK2'
     AND cs_se.academic_year = '2025-2026'
    WHERE u.email = 'student1@course.local'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'chat_sessions subject consistency',
      'subject mismatch error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'chat_sessions subject consistency',
      'subject mismatch error',
      SQLERRM
    );
  END;
END $$;

-- 6.2 message_citations: chỉ assistant mới được gắn citation
DO $$
BEGIN
  BEGIN
    INSERT INTO message_citations (chat_message_id, document_chunk_id, rank_no, relevance_score)
    SELECT cm.id, dc.id, 99, 0.9000
    FROM chat_messages cm
    JOIN chat_sessions cs ON cs.id = cm.chat_session_id
    JOIN documents d ON d.document_code = 'DOC001'
    JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1
    JOIN document_chunks dc ON dc.document_version_id = dv.id
    WHERE cs.title = 'What is programming?'
      AND cm.role = 'user'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'message_citations assistant only',
      'assistant-only error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'message_citations assistant only',
      'assistant-only error',
      SQLERRM
    );
  END;
END $$;

-- 6.3 message_citations: không được cite chunk lệch subject với chat session
DO $$
BEGIN
  BEGIN
    INSERT INTO message_citations (chat_message_id, document_chunk_id, rank_no, relevance_score)
    SELECT cm.id, dc.id, 98, 0.8800
    FROM chat_messages cm
    JOIN chat_sessions cs ON cs.id = cm.chat_session_id
    JOIN documents d ON d.document_code = 'DOC002'
    JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1
    JOIN document_chunks dc ON dc.document_version_id = dv.id
    WHERE cs.title = 'What is programming?'
      AND cm.role = 'assistant'
      AND COALESCE(dc.page_number, 0) = 0
      AND dc.chunk_index = 0
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'message_citations subject consistency',
      'cross-subject citation error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'message_citations subject consistency',
      'cross-subject citation error',
      SQLERRM
    );
  END;
END $$;

-- 6.4 quizzes: subject_id phải khớp class_section.subject_id
DO $$
BEGIN
  BEGIN
    INSERT INTO quizzes (subject_id, class_section_id, created_by_user_id, source_type, title)
    SELECT s_db.id, cs_se.id, u.id, 'teacher_created', 'NEG - invalid quiz subject mismatch'
    FROM subjects s_db
    JOIN subjects s_se ON s_se.code = 'SE101'
    JOIN class_sections cs_se
      ON cs_se.subject_id = s_se.id
     AND cs_se.section_code = '01'
     AND cs_se.semester = 'HK2'
     AND cs_se.academic_year = '2025-2026'
    JOIN users u ON u.email = 'teacher1@course.local'
    WHERE s_db.code = 'DB201'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quizzes subject consistency',
      'subject mismatch error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quizzes subject consistency',
      'subject mismatch error',
      SQLERRM
    );
  END;
END $$;

-- 6.5 quiz_questions.source_chunk_id phải cùng subject với quiz
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, points, source_chunk_id)
    SELECT q.id, 99, 'NEG - invalid source chunk subject mismatch', 'single_choice', 1.00, dc.id
    FROM quizzes q
    JOIN documents d ON d.document_code = 'DOC003'
    JOIN document_versions dv ON dv.document_id = d.id AND dv.version_no = 1
    JOIN document_chunks dc
      ON dc.document_version_id = dv.id
     AND dc.page_number = 5
     AND dc.chunk_index = 0
    WHERE q.title = 'Quiz 2 - Database Fundamentals'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_questions source_chunk subject consistency',
      'source_chunk subject mismatch error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_questions source_chunk subject consistency',
      'source_chunk subject mismatch error',
      SQLERRM
    );
  END;
END $$;

-- 6.6 quiz_attempts: quiz gắn lớp thì student ngoài lớp không được làm
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_no, status)
    SELECT q.id, sp.id, 99, 'in_progress'
    FROM quizzes q
    JOIN student_profiles sp ON sp.student_code = 'SV003'
    WHERE q.title = 'Quiz 1 - Intro to Programming'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_attempts class-bound eligibility',
      'class eligibility error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_attempts class-bound eligibility',
      'class eligibility error',
      SQLERRM
    );
  END;
END $$;

-- 6.7 quiz_attempts: quiz mức subject thì student không học subject không được làm
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_no, status)
    SELECT q.id, sp.id, 99, 'in_progress'
    FROM quizzes q
    JOIN student_profiles sp ON sp.student_code = 'SV001'
    WHERE q.title = 'Quiz 2 - Database Fundamentals'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_attempts subject-level eligibility',
      'subject eligibility error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_attempts subject-level eligibility',
      'subject eligibility error',
      SQLERRM
    );
  END;
END $$;

-- 6.8 quiz_attempts: chat_session_id không được thuộc user khác
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_no, chat_session_id, status)
    SELECT q.id, sp.id, 99, cs.id, 'in_progress'
    FROM quizzes q
    JOIN student_profiles sp ON sp.student_code = 'SV003'
    JOIN chat_sessions cs ON cs.title = 'Generate a quiz related to DB'
    WHERE q.title = 'Quiz 2 - Database Fundamentals'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_attempts chat session owner consistency',
      'chat session belongs to another user error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_attempts chat session owner consistency',
      'chat session belongs to another user error',
      SQLERRM
    );
  END;
END $$;

-- 6.9 quiz_attempts: chat_session_id phải cùng subject với quiz
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_no, chat_session_id, status)
    SELECT q.id, sp.id, 99, cs.id, 'in_progress'
    FROM quizzes q
    JOIN student_profiles sp ON sp.student_code = 'SV002'
    JOIN chat_sessions cs ON cs.title = 'Generate a quiz related to DB'
    WHERE q.title = 'Quiz 1 - Intro to Programming'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_attempts chat session subject consistency',
      'chat session subject mismatch error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_attempts chat session subject consistency',
      'chat session subject mismatch error',
      SQLERRM
    );
  END;
END $$;

-- 6.10 quiz_answers: question phải thuộc đúng quiz của attempt
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_answers (quiz_attempt_id, question_id, answer_text)
    SELECT qa.id, qq.id, 'NEG - wrong question for attempt'
    FROM quiz_attempts qa
    JOIN quizzes q1 ON q1.id = qa.quiz_id
    JOIN quizzes q2 ON q2.title = 'Quiz 2 - Database Fundamentals'
    JOIN quiz_questions qq ON qq.quiz_id = q2.id AND qq.question_order = 1
    WHERE q1.title = 'Quiz 1 - Intro to Programming'
      AND qa.attempt_no = 1
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_answers attempt-question consistency',
      'question not in attempt quiz error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_answers attempt-question consistency',
      'question not in attempt quiz error',
      SQLERRM
    );
  END;
END $$;

-- 6.11 quiz_answer_choices: choice phải thuộc đúng question của answer
DO $$
BEGIN
  BEGIN
    INSERT INTO quiz_answer_choices (quiz_answer_id, choice_id)
    SELECT qans.id, qc.id
    FROM quiz_answers qans
    JOIN quiz_questions qq1 ON qq1.id = qans.question_id
    JOIN quizzes q1 ON q1.id = qq1.quiz_id
    JOIN quizzes q2 ON q2.title = 'Quiz 2 - Database Fundamentals'
    JOIN quiz_questions qq2 ON qq2.quiz_id = q2.id AND qq2.question_order = 1
    JOIN quiz_choices qc ON qc.question_id = qq2.id AND qc.choice_key = 'A'
    WHERE q1.title = 'Quiz 1 - Intro to Programming'
    LIMIT 1;

    INSERT INTO negative_test_results VALUES (
      'quiz_answer_choices answer-choice consistency',
      'choice not in answer question error',
      'FAILED - insert unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_answer_choices answer-choice consistency',
      'choice not in answer question error',
      SQLERRM
    );
  END;
END $$;

-- 6.12 rule single_choice: không được có 2 đáp án đúng
DO $$
DECLARE
  v_question_id UUID;
BEGIN
  SELECT qq.id
  INTO v_question_id
  FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  WHERE q.title = 'Quiz 1 - Intro to Programming'
    AND qq.question_order = 1;

  BEGIN
    UPDATE quiz_choices
    SET is_correct = TRUE
    WHERE question_id = v_question_id
      AND choice_key IN ('A', 'B');

    PERFORM validate_quiz_question_choice_rules(v_question_id);

    INSERT INTO negative_test_results VALUES (
      'quiz_choices single_choice correct-count rule',
      'exactly one correct choice error',
      'FAILED - update unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_choices single_choice correct-count rule',
      'exactly one correct choice error',
      SQLERRM
    );
  END;

  UPDATE quiz_choices
  SET is_correct = CASE WHEN choice_key = 'A' THEN TRUE ELSE FALSE END
  WHERE question_id = v_question_id;
END $$;

-- 6.13 rule multiple_choice: phải có ít nhất 1 đáp án đúng
DO $$
DECLARE
  v_question_id UUID;
BEGIN
  SELECT qq.id
  INTO v_question_id
  FROM quiz_questions qq
  JOIN quizzes q ON q.id = qq.quiz_id
  WHERE q.title = 'Quiz 2 - Database Fundamentals'
    AND qq.question_order = 2;

  BEGIN
    UPDATE quiz_choices
    SET is_correct = FALSE
    WHERE question_id = v_question_id;

    PERFORM validate_quiz_question_choice_rules(v_question_id);

    INSERT INTO negative_test_results VALUES (
      'quiz_choices multiple_choice correct-count rule',
      'at least one correct choice error',
      'FAILED - update unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO negative_test_results VALUES (
      'quiz_choices multiple_choice correct-count rule',
      'at least one correct choice error',
      SQLERRM
    );
  END;

  UPDATE quiz_choices
  SET is_correct = CASE WHEN choice_key IN ('A', 'B') THEN TRUE ELSE FALSE END
  WHERE question_id = v_question_id;
END $$;

SELECT
  test_name,
  expected_error,
  actual_result
FROM negative_test_results
ORDER BY test_name;
