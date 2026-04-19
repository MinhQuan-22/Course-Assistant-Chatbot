import MySQLdb
try:
    conn = MySQLdb.connect(
        host="127.0.0.1", port=3307, user="root", password="root", database="course_assistant_db"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username FROM users")
    rows = cursor.fetchall()
    print("USERS:", rows)
except Exception as e:
    print("ERROR:", e)
