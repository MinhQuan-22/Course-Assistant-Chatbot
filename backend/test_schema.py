import MySQLdb
try:
    conn = MySQLdb.connect(
        host="127.0.0.1", port=3307, user="root", password="root", database="course_assistant_db"
    )
    cursor = conn.cursor()
    
    # Check what tables actually exist
    cursor.execute("SHOW TABLES")
    print("TABLES:", cursor.fetchall())
except Exception as e:
    print("ERROR:", e)
