import sqlite3


conn = sqlite3.connect("college.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(faculty)")
print(cursor.fetchall())
conn.commit()
conn.close()
