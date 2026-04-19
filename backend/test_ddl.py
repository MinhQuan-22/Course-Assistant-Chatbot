import MySQLdb
try:
    conn = MySQLdb.connect(
        host="127.0.0.1", port=3307, user="root", password="root", database="course_assistant_db"
    )
    cursor = conn.cursor()
    cursor.execute("""
CREATE TABLE import_batch_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    row_number INT NOT NULL,
    raw_payload JSON NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    CHECK (row_number > 0)
)
""")
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
