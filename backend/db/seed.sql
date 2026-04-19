USE course_assistant_db;

-- =====================================
-- USERS (password = bcrypt hash of '123456')
-- =====================================
INSERT INTO users (name, username, email, password, role, is_active) VALUES
('System Admin',  'admin.3n',   'admin.3n@tdtu.edu.vn',            '$2b$12$kh512QQkIFkim7WudX8hzurPoMiT17LvIUH.s0veshEKC0a07PY/e', 'admin',   TRUE),
('Tran Minh Tuan','tuan.tran',  'tuan.tran@tdtu.edu.vn',            '$2b$12$IK8hYzwilCV0n6wuvXJRjOiKka/YVKQQ5NGvZIFuqWFLgKGseL2E6', 'teacher', TRUE),
('Le Thi Hoa',    'hoa.le',     'hoa.le@tdtu.edu.vn',               '$2b$12$IK8hYzwilCV0n6wuvXJRjOiKka/YVKQQ5NGvZIFuqWFLgKGseL2E6', 'teacher', TRUE),
('Nguyen Van An', 'an.nguyen',  'an.nguyen@student.tdtu.edu.vn',    '$2b$12$LTtnqaiwMRV2hsbUmItVcu7xz1Wdcz6Xp.qsxW3ERy5tQneCH/hQS', 'student', TRUE),
('Tran Thi Bich', 'bich.tran',  'bich.tran@student.tdtu.edu.vn',   '$2b$12$4qBxCOiFexqEDflMHfz93u.2FkTAU/WD7FuLNWBrbuRS0qUxwa5B6', 'student', TRUE),
('Pham Van Cuong','cuong.pham', 'cuong.pham@student.tdtu.edu.vn',  '$2b$12$4qBxCOiFexqEDflMHfz93u.2FkTAU/WD7FuLNWBrbuRS0qUxwa5B6', 'student', TRUE),
-- Inactive user (test case: Google login should reject with "Account is inactive")
('Da Xoa User',  'deleted.user','deleted@student.tdtu.edu.vn',      '$2b$12$4qBxCOiFexqEDflMHfz93u.2FkTAU/WD7FuLNWBrbuRS0qUxwa5B6', 'student', FALSE);


-- =====================================
-- TEACHER PROFILES
-- =====================================
INSERT INTO teacher_profiles (user_id, teacher_code, department, title)
SELECT id, CONCAT('GV', LPAD(id, 3, '0')), 'Computer Science', 'Lecturer'
FROM users WHERE role = 'teacher';

-- =====================================
-- STUDENT PROFILES
-- =====================================
INSERT INTO student_profiles (user_id, student_code, major, cohort_year, class_name)
SELECT id, CONCAT('SV', LPAD(id, 5, '0')), 'Software Engineering', 2023, 'SE23A'
FROM users WHERE role = 'student';

-- =====================================
-- SUBJECTS
-- =====================================
INSERT INTO subjects (code, name, description, credits) VALUES
('SE101', 'Software Engineering',   'Introduction to software engineering principles',    3),
('DP201', 'Design Patterns',        'Design patterns and software architecture',          3),
('CS301', 'Data Structures',        'Fundamental data structures and algorithms',         3),
('WEB401','Web Development',        'Full-stack web development with modern frameworks',  3);

-- =====================================
-- CLASS SECTIONS
-- =====================================
INSERT INTO class_sections (subject_id, section_code, semester, academic_year, section_name, starts_at, ends_at, status)
SELECT id, '01', 'HK2', '2025-2026', CONCAT(code, ' - Lop 01'), '2026-02-01', '2026-06-30', 'active'
FROM subjects WHERE code IN ('SE101','DP201');

INSERT INTO class_sections (subject_id, section_code, semester, academic_year, section_name, starts_at, ends_at, status)
SELECT id, '02', 'HK2', '2025-2026', CONCAT(code, ' - Lop 02'), '2026-02-01', '2026-06-30', 'active'
FROM subjects WHERE code IN ('CS301','WEB401');

-- =====================================
-- TEACHING ASSIGNMENTS
-- Phân công GV dạy lớp
-- =====================================
INSERT INTO teaching_assignments (class_section_id, teacher_profile_id)
SELECT cs.id, tp.id
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'teacher'
JOIN teacher_profiles tp ON tp.user_id = u.id
WHERE s.code = 'SE101' AND u.username = 'tuan.tran'
LIMIT 1;

INSERT INTO teaching_assignments (class_section_id, teacher_profile_id)
SELECT cs.id, tp.id
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'teacher'
JOIN teacher_profiles tp ON tp.user_id = u.id
WHERE s.code = 'DP201' AND u.username = 'tuan.tran'
LIMIT 1;

INSERT INTO teaching_assignments (class_section_id, teacher_profile_id)
SELECT cs.id, tp.id
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'teacher'
JOIN teacher_profiles tp ON tp.user_id = u.id
WHERE s.code = 'CS301' AND u.username = 'hoa.le'
LIMIT 1;

INSERT INTO teaching_assignments (class_section_id, teacher_profile_id)
SELECT cs.id, tp.id
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'teacher'
JOIN teacher_profiles tp ON tp.user_id = u.id
WHERE s.code = 'WEB401' AND u.username = 'hoa.le'
LIMIT 1;

-- =====================================
-- ENROLLMENTS – Ghi danh sinh viên
-- =====================================
INSERT INTO enrollments (class_section_id, student_profile_id, status)
SELECT cs.id, sp.id, 'enrolled'
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'student'
JOIN student_profiles sp ON sp.user_id = u.id
WHERE s.code IN ('SE101','DP201') AND u.username IN ('an.nguyen','bich.tran');

INSERT INTO enrollments (class_section_id, student_profile_id, status)
SELECT cs.id, sp.id, 'enrolled'
FROM class_sections cs
JOIN subjects s ON cs.subject_id = s.id
JOIN users u ON u.role = 'student'
JOIN student_profiles sp ON sp.user_id = u.id
WHERE s.code IN ('CS301','WEB401') AND u.username = 'cuong.pham';

-- =====================================
-- DOCUMENTS – test mọi trạng thái (processing/ready/error/archived)
-- =====================================
-- ready: tài liệu đã xử lý xong, có trong vector DB
INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'Slide_Chuong1_SE101.pdf', '/uploads/slide1.pdf', 'PDF', 2500000, s.id, u.id, 'ready'
FROM subjects s, users u WHERE s.code='SE101' AND u.username='tuan.tran' LIMIT 1;

INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'Slide_Chuong2_DP201.pdf', '/uploads/slide2.pdf', 'PDF', 3000000, s.id, u.id, 'ready'
FROM subjects s, users u WHERE s.code='DP201' AND u.username='tuan.tran' LIMIT 1;

INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'Giao_Trinh_CS301.pdf', '/uploads/giaotrinh_cs301.pdf', 'PDF', 5200000, s.id, u.id, 'ready'
FROM subjects s, users u WHERE s.code='CS301' AND u.username='hoa.le' LIMIT 1;

-- processing: đang được ingestion vào ChromaDB
INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'Lab_WEB401_Week4.pdf', '/uploads/lab_web4.pdf', 'PDF', 1200000, s.id, u.id, 'processing'
FROM subjects s, users u WHERE s.code='WEB401' AND u.username='hoa.le' LIMIT 1;

-- error: ingestion thất bại (file corrupt, format không hỗ trợ)
INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'De_Cuong_SE101_Corrupt.docx', '/uploads/corrupt.docx', 'DOCX', 85000, s.id, u.id, 'error'
FROM subjects s, users u WHERE s.code='SE101' AND u.username='tuan.tran' LIMIT 1;

-- archived: đã bị admin archive (soft-remove khỏi knowledge-base)
INSERT INTO documents (name, file_path, file_type, file_size, subject_id, uploaded_by, status)
SELECT 'Slide_DP201_Cu_2024.pdf', '/uploads/slide_old.pdf', 'PDF', 1800000, s.id, u.id, 'archived'
FROM subjects s, users u WHERE s.code='DP201' AND u.username='tuan.tran' LIMIT 1;



-- =====================================
-- CONVERSATIONS
-- =====================================
INSERT INTO conversations (user_id, title)
SELECT id, 'Design Patterns là gì?' FROM users WHERE username='an.nguyen' LIMIT 1;

INSERT INTO conversations (user_id, title)
SELECT id, 'Giải thích SOLID' FROM users WHERE username='bich.tran' LIMIT 1;

-- =====================================
-- MESSAGES
-- =====================================
INSERT INTO messages (conversation_id, role, content, sources_json)
VALUES (1, 'user',      'Design Patterns là gì?', NULL),
       (1, 'assistant', 'Design Patterns là các giải pháp tái sử dụng cho các vấn đề thường gặp trong thiết kế phần mềm...',
        JSON_ARRAY(JSON_OBJECT('document','Slide_Chuong1.pdf','page',8))),
       (2, 'user',      'SOLID là gì?', NULL),
       (2, 'assistant', 'SOLID là 5 nguyên tắc thiết kế phần mềm...',
        JSON_ARRAY(JSON_OBJECT('document','Slide_Chuong2.pdf','page',15)));

-- =====================================
-- QUIZZES
-- =====================================
INSERT INTO quizzes (title, subject_id, created_by, source_type, is_published, published_at)
SELECT 'Quiz Chương 1 – SE101', s.id, u.id, 'teacher_created', TRUE, NOW()
FROM subjects s, users u WHERE s.code='SE101' AND u.username='tuan.tran' LIMIT 1;

-- =====================================
-- QUIZ QUESTIONS
-- =====================================
INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1, 'Nguyên tắc nào nói mỗi class chỉ có một trách nhiệm?',
 'Open/Closed','Single Responsibility','Liskov','Dependency Inversion','B','Single Responsibility Principle (SRP)'),
(1, 'Design Pattern nào đảm bảo một instance duy nhất?',
 'Factory','Observer','Singleton','Strategy','C','Singleton pattern');

-- =====================================
-- QUIZ ATTEMPTS
-- =====================================
INSERT INTO quiz_attempts (user_id, quiz_id, status, score, correct_count, total_questions, submitted_at)
SELECT u.id, 1, 'submitted', 1, 1, 2, NOW()
FROM users u WHERE u.username='an.nguyen' LIMIT 1;

INSERT INTO quiz_attempts (user_id, quiz_id, status, score, correct_count, total_questions, submitted_at)
SELECT u.id, 1, 'submitted', 2, 2, 2, NOW()
FROM users u WHERE u.username='bich.tran' LIMIT 1;

-- =====================================
-- QUIZ ANSWERS
-- =====================================
INSERT INTO quiz_answers (attempt_id, question_id, selected_answer, is_correct) VALUES
(1, 1, 'B', TRUE),(1, 2, 'A', FALSE),
(2, 1, 'B', TRUE),(2, 2, 'C', TRUE);

-- =====================================
-- EXAM SCHEDULES – past + future để test edit/delete guards
-- Quá khứ: KHÔNG được sửa/xóa (backend guard)
-- Tương lai: Có thể sửa/xóa
-- =====================================

-- Kỳ thi đã qua (2026-03-15 – giữa kỳ SE101, past, locked)
INSERT INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note)
SELECT s.id, cs.id, 'midterm', '2026-03-15', '07:30:00', '09:30:00', 'A2.01',
       '[Đã qua] Thi giữa kỳ Kỹ thuật Phần mềm – không thể sửa/xóa'
FROM subjects s JOIN class_sections cs ON cs.subject_id=s.id
WHERE s.code='SE101' LIMIT 1;

-- Kỳ thi sắp tới (2026-06-15 – cuối kỳ SE101, future, editable)
INSERT INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note)
SELECT s.id, cs.id, 'final', '2026-06-15', '07:30:00', '09:30:00', 'A2.01',
       'Thi cuối kỳ môn Kỹ thuật Phần mềm'
FROM subjects s JOIN class_sections cs ON cs.subject_id=s.id
WHERE s.code='SE101' LIMIT 1;

-- Kỳ thi đã qua (2026-04-10 – giữa kỳ DP201, past, locked)
INSERT INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note)
SELECT s.id, cs.id, 'midterm', '2026-04-10', '13:00:00', '15:00:00', 'B3.02',
       '[Đã qua] Thi giữa kỳ Design Patterns'
FROM subjects s JOIN class_sections cs ON cs.subject_id=s.id
WHERE s.code='DP201' LIMIT 1;

-- Kỳ thi sắp tới (2026-06-20 – cuối kỳ DP201, future, editable)
INSERT INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note)
SELECT s.id, cs.id, 'final', '2026-06-20', '13:00:00', '15:00:00', 'B3.02',
       'Thi cuối kỳ Design Patterns'
FROM subjects s JOIN class_sections cs ON cs.subject_id=s.id
WHERE s.code='DP201' LIMIT 1;

-- Kỳ thi hoc lai (makeup, 2026-07-05, future)
INSERT INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note)
SELECT s.id, cs.id, 'makeup', '2026-07-05', '07:30:00', '09:30:00', 'C1.01',
       'Thi học lại dành cho sinh viên chưa đạt CS301'
FROM subjects s JOIN class_sections cs ON cs.subject_id=s.id
WHERE s.code='CS301' LIMIT 1;

-- =====================================
-- ANNOUNCEMENTS – test nhiều ngày (để test group-by-day trên UI)
-- =====================================
INSERT INTO announcements (title, content, target_role, created_by, is_active, published_at)
SELECT 'Thông báo lịch thi cuối kỳ HK2 2025-2026',
       'Lịch thi cuối kỳ HK2 2025-2026 đã được cập nhật. Sinh viên vui lòng kiểm tra lịch thi chi tiết trong mục Lịch thi.',
       'student', id, TRUE, NOW()
FROM users WHERE username='admin.3n' LIMIT 1;

INSERT INTO announcements (title, content, target_role, created_by, is_active, published_at)
SELECT 'Hướng dẫn sử dụng hệ thống Course Assistant',
       'Hệ thống Course Assistant 3N đã được nâng cấp. Giáo viên có thể upload tài liệu môn học để hỗ trợ sinh viên học tập hiệu quả hơn.',
       'all', id, TRUE, NOW() - INTERVAL 1 DAY
FROM users WHERE username='admin.3n' LIMIT 1;

INSERT INTO announcements (title, content, target_role, created_by, is_active, published_at)
SELECT 'Bảo trì hệ thống ngày 20/04/2026',
       'Hệ thống sẽ bảo trì từ 22:00 ngày 20/04 đến 02:00 ngày 21/04. Trong thời gian này hệ thống tạm ngưng hoạt động.',
       'all', id, TRUE, NOW() - INTERVAL 2 DAY
FROM users WHERE username='admin.3n' LIMIT 1;

-- Thông báo đã hết hạn (ẩn)
INSERT INTO announcements (title, content, target_role, created_by, is_active, published_at, expires_at)
SELECT 'Đăng ký học phần HK2 (Hết hạn)',
       'Sinh viên đăng ký học phần HK2 2025-2026 trước ngày 15/01/2026.',
       'student', id, FALSE, NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 1 DAY
FROM users WHERE username='admin.3n' LIMIT 1;

-- =====================================
-- ANNOUNCEMENT READS – Admin đã đọc 2 thông báo đầu
-- (thông báo 3, 4 sẽ là "chưa đọc" để test unread badge)
-- =====================================
INSERT INTO announcement_reads (announcement_id, user_id)
SELECT ann.id, u.id
FROM announcements ann, users u
WHERE u.username='admin.3n'
  AND ann.title IN (
    'Thông báo lịch thi cuối kỳ HK2 2025-2026',
    'Hướng dẫn sử dụng hệ thống Course Assistant'
  );

-- =====================================
-- IMPORT BATCHES – test cases đầy đủ
-- =====================================

-- Batch 1: completed với 1 lỗi (normal case)
INSERT INTO import_batches (entity_type, file_name, uploaded_by, status, total_rows, success_rows, failed_rows, started_at, finished_at)
SELECT 'users', 'import_users_batch1.xlsx', id, 'completed', 5, 4, 1, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY + INTERVAL 5 SECOND
FROM users WHERE username='admin.3n' LIMIT 1;

-- Batch 2: subjects import, hoàn toàn thành công
INSERT INTO import_batches (entity_type, file_name, uploaded_by, status, total_rows, success_rows, failed_rows, started_at, finished_at)
SELECT 'subjects', 'import_subjects.xlsx', id, 'completed', 4, 4, 0, NOW() - INTERVAL 14 DAY, NOW() - INTERVAL 14 DAY + INTERVAL 2 SECOND
FROM users WHERE username='admin.3n' LIMIT 1;

-- Batch 3: failed – file lỗi format
INSERT INTO import_batches (entity_type, file_name, uploaded_by, status, total_rows, success_rows, failed_rows, started_at, finished_at)
SELECT 'enrollments', 'import_bad_format.xlsx', id, 'failed', 0, 0, 0, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 1 SECOND
FROM users WHERE username='admin.3n' LIMIT 1;

-- =====================================
-- IMPORT BATCH ERRORS – lỗi chi tiết từ batch 1
-- =====================================
INSERT INTO import_batch_errors (batch_id, row_number, raw_payload, error_message)
VALUES (
    1, 3,
    JSON_OBJECT('name', 'Vu Thi D', 'email', 'an.nguyen@student.tdtu.edu.vn', 'role', 'student', 'password', '12345'),
    'Email an.nguyen@student.tdtu.edu.vn already exists'
);

-- =====================================
-- SYSTEM SETTINGS – Cấu hình AI mặc định
-- =====================================
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('ai_model',           'gpt-3.5-turbo', 'Default AI model for chat responses'),
('streaming_enabled',  'true',          'Enable streaming response (SSE)'),
('memory_enabled',     'true',          'Enable conversation memory'),
('chunk_size',         '500',           'Vector DB chunk size (tokens)'),
('chunk_overlap',      '50',            'Vector DB chunk overlap'),
('top_k_results',      '5',             'Number of chunks to retrieve from vector DB');