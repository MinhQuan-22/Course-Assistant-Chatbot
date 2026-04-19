import pymysql

conn = pymysql.connect(
    user="root",
    password="root",
    host="127.0.0.1",
    port=3307,
    database="course_assistant_db"
)
cursor = conn.cursor()

# 1. teaching_assignments
cursor.execute("INSERT IGNORE INTO teaching_assignments (class_section_id, teacher_profile_id) VALUES (1, 1);")

# 2. enrollments (enroll students to class 1)
cursor.execute("INSERT IGNORE INTO enrollments (class_section_id, student_profile_id, status) VALUES (1, 1, 'enrolled'), (1, 2, 'enrolled');")

# 3. import_batches
cursor.execute("INSERT IGNORE INTO import_batches (entity_type, file_name, uploaded_by, status, total_rows, success_rows, failed_rows) VALUES ('students', 'dummy_students.xlsx', 1, 'completed', 10, 10, 0);")

# 4. exam_schedules
cursor.execute("INSERT IGNORE INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note) VALUES (1, 1, 'midterm', '2026-05-15', '08:00:00', '10:00:00', 'Room 302', 'Bring student ID');")
cursor.execute("INSERT IGNORE INTO exam_schedules (subject_id, class_section_id, exam_type, exam_date, start_time, end_time, room, note) VALUES (2, NULL, 'final', '2026-06-20', '13:00:00', '15:30:00', 'Hall A', 'Open book exam');")

# 5. announcements
cursor.execute("INSERT IGNORE INTO announcements (title, content, target_role, subject_id, class_section_id, created_by, is_active, published_at) VALUES ('Welcome to the new semester', 'Wish you a great semester ahead.', 'all', NULL, NULL, 1, TRUE, NOW());")
cursor.execute("INSERT IGNORE INTO announcements (title, content, target_role, subject_id, class_section_id, created_by, is_active, published_at) VALUES ('Reminder: Midterm exam next week', 'Please check the exam schedule for details.', 'student', 1, 1, 2, TRUE, NOW());")


# 6. system_settings
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('ai_model', 'gpt-3.5-turbo', 'Default AI model for the application', 1);")
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('streaming_enabled', 'true', 'Enable streaming responses for the AI model', 1);")
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('memory_enabled', 'true', 'Enable conversational memory', 1);")
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('chunk_size', '500', 'Text chunk size for RAG ingestion', 1);")
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('chunk_overlap', '50', 'Text chunk overlap for RAG ingestion', 1);")
cursor.execute("INSERT IGNORE INTO system_settings (setting_key, setting_value, description, updated_by) VALUES ('top_k_results', '5', 'Number of relevant chunks to retrieve for RAG query', 1);")


conn.commit()
conn.close()
print("Seed success")
