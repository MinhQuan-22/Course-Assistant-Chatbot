import MySQLdb
try:
    conn = MySQLdb.connect(
        host="127.0.0.1", port=3307, user="root", password="root", database="course_assistant_db"
    )
    cursor = conn.cursor()
    with open('db/seed.sql', 'r') as f:
        content = f.read()
    
    statements = [s.strip() for s in content.split(';') if s.strip()]
    for s in statements:
        if s.upper().startswith('USE'):
            continue
        print("Executing:", s[:50], "...")
        cursor.execute(s)
    conn.commit()
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
