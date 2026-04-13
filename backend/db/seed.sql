USE course_assistant_db;

-- =====================================
-- USERS
-- =====================================
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@test.com', '123456', 'admin'),
('Teacher User', 'teacher@test.com', '123456', 'teacher'),
('Student One', 'student1@test.com', '123456', 'student'),
('Student Two', 'student2@test.com', '123456', 'student');

-- =====================================
-- DOCUMENTS
-- =====================================
INSERT INTO documents (name, file_path, file_type, file_size, uploaded_by, status) VALUES
('Slide_Chuong1.pdf', '/uploads/slide1.pdf', 'PDF', 2500000, 2, 'ready'),
('Slide_Chuong2.pdf', '/uploads/slide2.pdf', 'PDF', 3000000, 2, 'ready');

-- =====================================
-- CONVERSATIONS
-- =====================================
INSERT INTO conversations (user_id, title) VALUES
(3, 'Design Patterns là gì?'),
(4, 'Giải thích SOLID');

-- =====================================
-- MESSAGES
-- =====================================
INSERT INTO messages (conversation_id, role, content, sources_json) VALUES
(1, 'user', 'Design Patterns là gì?', NULL),
(1, 'assistant', 'Design Patterns là các giải pháp tái sử dụng...', 
 JSON_ARRAY(
   JSON_OBJECT('document', 'Slide_Chuong1.pdf', 'page', 8)
 )),

(2, 'user', 'SOLID là gì?', NULL),
(2, 'assistant', 'SOLID là 5 nguyên tắc thiết kế phần mềm...', 
 JSON_ARRAY(
   JSON_OBJECT('document', 'Slide_Chuong2.pdf', 'page', 15)
 ));

-- =====================================
-- QUIZZES
-- =====================================
INSERT INTO quizzes (title, created_by) VALUES
('Quiz Chương 1', 2);

-- =====================================
-- QUIZ QUESTIONS
-- =====================================
INSERT INTO quiz_questions 
(quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1, 
'Nguyên tắc nào nói mỗi class chỉ có một trách nhiệm?', 
'Open/Closed', 
'Single Responsibility', 
'Liskov', 
'Dependency Inversion', 
'B',
'Single Responsibility Principle (SRP)'),

(1,
'Design Pattern nào đảm bảo một instance duy nhất?',
'Factory',
'Observer',
'Singleton',
'Strategy',
'C',
'Singleton pattern');

-- =====================================
-- QUIZ ATTEMPTS
-- =====================================
INSERT INTO quiz_attempts (user_id, quiz_id, score, total_questions) VALUES
(3, 1, 1, 2),
(4, 1, 2, 2);

-- =====================================
-- QUIZ ANSWERS
-- =====================================
INSERT INTO quiz_answers (attempt_id, question_id, selected_answer, is_correct) VALUES
(1, 1, 'B', TRUE),
(1, 2, 'A', FALSE),

(2, 1, 'B', TRUE),
(2, 2, 'C', TRUE);

UPDATE users SET username = 'admin' WHERE email = 'admin@test.com';
UPDATE users SET username = 'teacher' WHERE email = 'teacher@test.com';
UPDATE users SET username = 'student1' WHERE email = 'student1@test.com';
UPDATE users SET username = 'student2' WHERE email = 'student2@test.com';