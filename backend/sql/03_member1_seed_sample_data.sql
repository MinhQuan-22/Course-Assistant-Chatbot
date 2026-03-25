BEGIN;

-- =========================================================
-- 1) roles
-- =========================================================
INSERT INTO roles (code, name, description) VALUES
('admin',   'Administrator', 'System administrator'),
('teacher', 'Teacher',       'Lecturer/teacher role'),
('student', 'Student',       'Student role');

-- =========================================================
-- 2) users
-- =========================================================
INSERT INTO users (google_sub, email, full_name, avatar_url, status) VALUES
('google-admin-001',   'admin@course.local',    'System Admin',        NULL, 'active'),
('google-teacher-001', 'teacher1@course.local', 'Nguyen Van Teacher',  NULL, 'active'),
('google-teacher-002', 'teacher2@course.local', 'Le Thi Teacher',      NULL, 'active'),
('google-student-001', 'student1@course.local', 'Tran Thi Student',    NULL, 'active'),
('google-student-002', 'student2@course.local', 'Pham Van Student',    NULL, 'active'),
('google-student-003', 'student3@course.local', 'Vo Thi Student',      NULL, 'active');

-- =========================================================
-- 3) user_roles
-- =========================================================
INSERT INTO user_roles (user_id, role_id, is_primary)
SELECT u.id, r.id, TRUE
FROM users u
JOIN roles r
  ON (u.email = 'admin@course.local'    AND r.code = 'admin')
  OR (u.email = 'teacher1@course.local' AND r.code = 'teacher')
  OR (u.email = 'teacher2@course.local' AND r.code = 'teacher')
  OR (u.email = 'student1@course.local' AND r.code = 'student')
  OR (u.email = 'student2@course.local' AND r.code = 'student')
  OR (u.email = 'student3@course.local' AND r.code = 'student');

-- =========================================================
-- 4) teacher_profiles
-- Trigger sẽ kiểm tra user phải có role teacher
-- =========================================================
INSERT INTO teacher_profiles (user_id, teacher_code, department, title, bio)
SELECT u.id, x.teacher_code, x.department, x.title, x.bio
FROM users u
JOIN (
  VALUES
    ('teacher1@course.local', 'GV001', 'Computer Science', 'Lecturer', 'Main lecturer of SE101'),
    ('teacher2@course.local', 'GV002', 'Information Systems', 'Lecturer', 'Main lecturer of DB201')
) AS x(email, teacher_code, department, title, bio)
  ON u.email = x.email;

-- =========================================================
-- 5) student_profiles
-- Trigger sẽ kiểm tra user phải có role student
-- =========================================================
INSERT INTO student_profiles (user_id, student_code, major, cohort_year, class_name)
SELECT u.id, x.student_code, x.major, x.cohort_year, x.class_name
FROM users u
JOIN (
  VALUES
    ('student1@course.local', 'SV001', 'Software Engineering', 2023, 'SE23A'),
    ('student2@course.local', 'SV002', 'Software Engineering', 2023, 'SE23A'),
    ('student3@course.local', 'SV003', 'Information Systems',  2022, 'IS22B')
) AS x(email, student_code, major, cohort_year, class_name)
  ON u.email = x.email;

-- =========================================================
-- 6) subjects
-- =========================================================
INSERT INTO subjects (code, name, description, credits, is_active) VALUES
('SE101', 'Software Engineering', 'Introduction to software engineering', 3, TRUE),
('DB201', 'Database Systems',     'Relational database fundamentals',    3, TRUE);

-- =========================================================
-- 7) class_sections
-- Mỗi subject có 1 class section mẫu
-- =========================================================
INSERT INTO class_sections (
  subject_id,
  section_code,
  semester,
  academic_year,
  section_name,
  starts_at,
  ends_at,
  status
)
SELECT
  s.id,
  x.section_code,
  x.semester,
  x.academic_year,
  x.section_name,
  x.starts_at,
  x.ends_at,
  x.status
FROM subjects s
JOIN (
  VALUES
    ('SE101', '01', 'HK2', '2025-2026', 'SE101 - Lop 01', DATE '2026-02-01', DATE '2026-05-30', 'active'),
    ('DB201', '01', 'HK2', '2025-2026', 'DB201 - Lop 01', DATE '2026-02-10', DATE '2026-05-28', 'active')
) AS x(subject_code, section_code, semester, academic_year, section_name, starts_at, ends_at, status)
  ON s.code = x.subject_code;

-- =========================================================
-- 8) teaching_assignments
-- Rule: 1 lớp chỉ có 1 giáo viên chính
-- =========================================================
INSERT INTO teaching_assignments (class_section_id, teacher_id)
SELECT cs.id, tp.id
FROM class_sections cs
JOIN subjects s ON s.id = cs.subject_id
JOIN teacher_profiles tp
  ON (s.code = 'SE101' AND tp.teacher_code = 'GV001')
  OR (s.code = 'DB201' AND tp.teacher_code = 'GV002');

-- =========================================================
-- 9) enrollments
-- 2 sinh viên học SE101, 2 sinh viên học DB201
-- student2 học cả 2 lớp để test mở rộng
-- =========================================================
INSERT INTO enrollments (class_section_id, student_id, status)
SELECT cs.id, sp.id, 'enrolled'
FROM class_sections cs
JOIN subjects s ON s.id = cs.subject_id
JOIN student_profiles sp
  ON (s.code = 'SE101' AND sp.student_code IN ('SV001', 'SV002'))
  OR (s.code = 'DB201' AND sp.student_code IN ('SV002', 'SV003'));

-- =========================================================
-- 10) import_batches
-- Seed mẫu log import
-- =========================================================
INSERT INTO import_batches (
  entity_type,
  file_name,
  uploaded_by_user_id,
  status,
  total_rows,
  success_rows,
  failed_rows,
  started_at,
  finished_at
)
SELECT
  x.entity_type,
  x.file_name,
  u.id,
  x.status,
  x.total_rows,
  x.success_rows,
  x.failed_rows,
  x.started_at,
  x.finished_at
FROM users u
JOIN (
  VALUES
    ('students', 'students_import.xlsx', 'admin@course.local', 'completed', 3, 3, 0, now() - interval '10 minutes', now() - interval '9 minutes'),
    ('subjects', 'subjects_import.xlsx', 'admin@course.local', 'completed', 2, 2, 0, now() - interval '8 minutes',  now() - interval '7 minutes')
) AS x(entity_type, file_name, uploader_email, status, total_rows, success_rows, failed_rows, started_at, finished_at)
  ON u.email = x.uploader_email;

-- =========================================================
-- 11) import_batch_errors
-- Seed 1 log lỗi mẫu để test màn import errors
-- =========================================================
INSERT INTO import_batch_errors (batch_id, row_number, raw_payload, error_message)
SELECT
  ib.id,
  4,
  '{"student_code":"SV999","email":"invalid@course.local"}'::jsonb,
  'Student code does not exist in uploaded user list'
FROM import_batches ib
WHERE ib.entity_type = 'students'
LIMIT 1;

COMMIT;
