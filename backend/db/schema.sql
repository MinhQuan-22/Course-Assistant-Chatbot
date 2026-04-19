CREATE DATABASE IF NOT EXISTS course_assistant_db;
USE course_assistant_db;

-- =====================================
-- 1. USERS
-- =====================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    google_id VARCHAR(100) UNIQUE NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- =====================================
-- 2. TEACHER PROFILES
-- =====================================
CREATE TABLE teacher_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    teacher_code VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(150) NULL,
    title VARCHAR(100) NULL,
    bio TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================
-- 3. STUDENT PROFILES
-- =====================================
CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    major VARCHAR(150) NULL,
    cohort_year INT NULL,
    class_name VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (cohort_year IS NULL OR cohort_year > 0)
);

-- =====================================
-- 4. SUBJECTS
-- =====================================
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    credits INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (credits IS NULL OR credits >= 0)
);

-- =====================================
-- 5. CLASS SECTIONS
-- =====================================
CREATE TABLE class_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    section_code VARCHAR(50) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    section_name VARCHAR(255) NULL,
    starts_at DATE NULL,
    ends_at DATE NULL,
    status ENUM('active', 'closed', 'archived') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class_section (subject_id, semester, academic_year, section_code),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

-- =====================================
-- 6. TEACHING ASSIGNMENTS
-- =====================================
CREATE TABLE teaching_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_section_id INT NOT NULL UNIQUE,
    teacher_profile_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_profile_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

-- =====================================
-- 7. ENROLLMENTS
-- =====================================
CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_section_id INT NOT NULL,
    student_profile_id INT NOT NULL,
    status ENUM('enrolled', 'dropped', 'completed') NOT NULL DEFAULT 'enrolled',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dropped_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enrollment (class_section_id, student_profile_id),
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    CHECK (dropped_at IS NULL OR status = 'dropped')
);

-- =====================================
-- 8. IMPORT BATCHES
-- entity_type 'users' = import file gồm nhiều role (student/teacher/admin)
-- =====================================
CREATE TABLE import_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('users','students', 'teachers', 'subjects', 'class_sections', 'enrollments', 'teaching_assignments') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (total_rows >= 0),
    CHECK (success_rows >= 0),
    CHECK (failed_rows >= 0),
    CHECK (success_rows + failed_rows <= total_rows)
);

-- =====================================
-- 9. IMPORT BATCH ERRORS
-- =====================================
CREATE TABLE import_batch_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    `row_number` INT NOT NULL,
    raw_payload JSON NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    CHECK (`row_number` > 0)
);

-- =====================================
-- 10. DOCUMENTS
-- Lưu metadata file; subject_id/class_section_id để RAG có ngữ cảnh môn học
-- Embeddings lưu ở ChromaDB (vector store)
-- =====================================
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_size BIGINT,
    subject_id INT NULL,
    class_section_id INT NULL,
    uploaded_by INT NOT NULL,
    -- archived: soft-removed from knowledge base but file preserved
    status ENUM('processing', 'ready', 'error', 'archived') NOT NULL DEFAULT 'processing',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE SET NULL
);

-- =====================================
-- 11. CONVERSATIONS
-- =====================================
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================
-- 12. MESSAGES
-- role: user / assistant
-- sources_json stores source citation info as JSON text
-- =====================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    sources_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- =====================================
-- 13. QUIZZES
-- =====================================
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject_id INT NULL,
    class_section_id INT NULL,
    created_by INT NOT NULL,
    source_type ENUM('teacher_created', 'ai_generated') NOT NULL DEFAULT 'teacher_created',
    description TEXT NULL,
    chapter_label VARCHAR(255) NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_quizzes_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    CONSTRAINT fk_quizzes_class_section FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE SET NULL
);

-- =====================================
-- 14. QUIZ QUESTIONS
-- =====================================
CREATE TABLE quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- =====================================
-- 15. QUIZ ATTEMPTS
-- Each student attempt for a quiz
-- =====================================
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    status ENUM('in_progress', 'submitted', 'graded') NOT NULL DEFAULT 'submitted',
    score INT NOT NULL DEFAULT 0,
    correct_count INT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT NULL,
    UNIQUE KEY uq_quiz_attempt (user_id, quiz_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- =========================================
-- 16. QUIZ ANSWERS
-- Stores each selected answer in an attempt
-- =========================================
CREATE TABLE quiz_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer CHAR(1),
    is_correct BOOLEAN,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- =========================================
-- 17. EXAM SCHEDULES
-- =========================================
CREATE TABLE exam_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    class_section_id INT NULL,
    exam_type ENUM('midterm', 'final', 'makeup', 'other') NOT NULL DEFAULT 'final',
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100) NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE SET NULL,
    CHECK (start_time < end_time)
);

-- =====================================
-- 21. PASSWORD RESETS
-- Store OTP for password reset requests
-- =====================================
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_email (email)
);

-- =====================================
-- 18. SYSTEM SETTINGS (AI model config)
-- =====================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================
-- 19. ANNOUNCEMENTS
-- =====================================
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role ENUM('all', 'student', 'teacher', 'admin') NOT NULL DEFAULT 'all',
    subject_id INT NULL,
    class_section_id INT NULL,
    created_by INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================
-- 20. ANNOUNCEMENT READS
-- Tracking trạng thái đã đọc của từng user
-- =====================================
CREATE TABLE IF NOT EXISTS announcement_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_read (announcement_id, user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================
-- DB-LEVEL PROFILE-ROLE INVARIANT ENFORCEMENT
-- =====================================
-- MySQL cannot express cross-table constraints ("teacher must have teacher_profile")
-- as pure CHECK constraints.  We enforce via TRIGGERs:
--
--   1. AFTER INSERT on users:
--      • role='teacher' → auto-insert a teacher_profile skeleton
--      • role='student' → auto-insert a student_profile skeleton
--
--   2. AFTER UPDATE on users (role changed):
--      • old teacher → delete teacher_profile
--      • old student → delete student_profile
--      • new teacher → insert teacher_profile (if not exists)
--      • new student → insert student_profile (if not exists)
--      • new admin   → delete both profiles (admins need neither)
--
-- These triggers serve as the last line of defence.
-- The Django backend (views_admin.py) performs this same logic
-- before every save(), so triggers rarely fire in practice.
-- =====================================

DROP TRIGGER IF EXISTS trg_users_after_insert;
DROP TRIGGER IF EXISTS trg_users_after_update;

DELIMITER //

CREATE TRIGGER trg_users_after_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.role = 'teacher' THEN
        IF NOT EXISTS (SELECT 1 FROM teacher_profiles WHERE user_id = NEW.id) THEN
            INSERT INTO teacher_profiles (user_id, teacher_code)
            VALUES (NEW.id, CONCAT('GV', LPAD(NEW.id, 3, '0')));
        END IF;
    ELSEIF NEW.role = 'student' THEN
        IF NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = NEW.id) THEN
            INSERT INTO student_profiles (user_id, student_code)
            VALUES (NEW.id, CONCAT('SV', LPAD(NEW.id, 5, '0')));
        END IF;
    END IF;
END //

CREATE TRIGGER trg_users_after_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    -- Only act when role actually changed
    IF OLD.role <> NEW.role THEN

        -- Clean up old profile
        IF OLD.role = 'teacher' THEN
            DELETE FROM teacher_profiles WHERE user_id = NEW.id;
        ELSEIF OLD.role = 'student' THEN
            DELETE FROM student_profiles WHERE user_id = NEW.id;
        END IF;

        -- Create new profile if needed
        IF NEW.role = 'teacher' THEN
            IF NOT EXISTS (SELECT 1 FROM teacher_profiles WHERE user_id = NEW.id) THEN
                INSERT INTO teacher_profiles (user_id, teacher_code)
                VALUES (NEW.id, CONCAT('GV', LPAD(NEW.id, 3, '0')));
            END IF;
        ELSEIF NEW.role = 'student' THEN
            IF NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = NEW.id) THEN
                INSERT INTO student_profiles (user_id, student_code)
                VALUES (NEW.id, CONCAT('SV', LPAD(NEW.id, 5, '0')));
            END IF;
        ELSEIF NEW.role = 'admin' THEN
            -- Admins must not leave orphan profiles
            DELETE FROM teacher_profiles WHERE user_id = NEW.id;
            DELETE FROM student_profiles  WHERE user_id = NEW.id;
        END IF;

    END IF;
END //

DELIMITER ;
