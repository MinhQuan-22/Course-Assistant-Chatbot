import pymysql

conn = pymysql.connect(
    user="root",
    password="root",
    host="127.0.0.1",
    port=3307,
    database="course_assistant_db"
)
cursor = conn.cursor()

# 1. Update import_batches enum
cursor.execute("ALTER TABLE import_batches MODIFY COLUMN entity_type ENUM('users', 'students', 'teachers', 'subjects', 'class_sections', 'enrollments', 'teaching_assignments') NOT NULL;")

# 2. Add subject_id, class_section_id to documents
try:
    cursor.execute("ALTER TABLE documents ADD COLUMN subject_id INT NULL;")
    cursor.execute("ALTER TABLE documents ADD CONSTRAINT fk_doc_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;")
except Exception as e:
    print(f"Doc subject_id error: {e}")

try:
    cursor.execute("ALTER TABLE documents ADD COLUMN class_section_id INT NULL;")
    cursor.execute("ALTER TABLE documents ADD CONSTRAINT fk_doc_class FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE;")
except Exception as e:
    print(f"Doc class_section_id error: {e}")

# 3. Quizzes & Attempts columns
# We only add columns that are missing compared to original create table statements, because we changed schema.sql but DB was already created

# quizzes: subject_id, class_section_id, source_type, description, chapter_label, is_published, published_at
try:
    cursor.execute("ALTER TABLE quizzes ADD COLUMN subject_id INT NULL;")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN class_section_id INT NULL;")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN source_type ENUM('teacher_created', 'ai_generated') NOT NULL DEFAULT 'teacher_created';")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN description TEXT NULL;")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN chapter_label VARCHAR(255) NULL;")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;")
    cursor.execute("ALTER TABLE quizzes ADD COLUMN published_at TIMESTAMP NULL;")
    cursor.execute("ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;")
    cursor.execute("ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_class_section FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE SET NULL;")
except Exception as e:
    print(f"Quizzes schema error: {e}")

# attempts: correct_count, status, started_at, duration_seconds
try:
    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN correct_count INT NULL;")
    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN status ENUM('in_progress', 'submitted', 'graded') NOT NULL DEFAULT 'submitted';")
    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN started_at TIMESTAMP NULL;")
    cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN duration_seconds INT NULL;")
    cursor.execute("ALTER TABLE quiz_attempts ADD UNIQUE KEY uq_quiz_attempt (user_id, quiz_id);")
except Exception as e:
    print(f"Quiz attempts schema error: {e}")


# 4. Announcements
cursor.execute("""
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
""")

# 5. User notifications
cursor.execute("""
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    announcement_id INT NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_notification (user_id, announcement_id)
);
""")

# 6. Exam schedules
cursor.execute("""
CREATE TABLE IF NOT EXISTS exam_schedules (
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
""")

conn.commit()
conn.close()
print("Success")
