import MySQLdb
try:
    conn = MySQLdb.connect(
        host="127.0.0.1", port=3307, user="root", password="root", database="course_assistant_db"
    )
    cursor = conn.cursor()
    cursor.execute("""
INSERT INTO users (name, username, email, password, role, is_active) VALUES
('Admin 3N',    'admin.3n',   'admin.3n@tdtu.edu.vn',   '$2b$12$kh512QQkIFkim7WudX8hzurPoMiT17LvIUH.s0veshEKC0a07PY/e', 'admin',   TRUE),
('Teacher 3N',  'teacher.3n', 'teacher.3n@tdtu.edu.vn', '$2b$12$IK8hYzwilCV0n6wuvXJRjOiKka/YVKQQ5NGvZIFuqWFLgKGseL2E6', 'teacher', TRUE),
('Student One', 'student1',   'student1@tdtu.edu.vn',   '$2b$12$LTtnqaiwMRV2hsbUmItVcu7xz1Wdcz6Xp.qsxW3ERy5tQneCH/hQS', 'student', TRUE),
('Student Two', 'student2',   'student2@tdtu.edu.vn',   '$2b$12$4qBxCOiFexqEDflMHfz93u.2FkTAU/WD7FuLNWBrbuRS0qUxwa5B6', 'student', TRUE);
""")
    conn.commit()
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
