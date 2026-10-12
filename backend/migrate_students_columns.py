import sqlite3

con = sqlite3.connect(r'd:\SFRC Student Portal\college.db')
cur = con.cursor()
cols = [col[1] for col in cur.execute('PRAGMA table_info(students)').fetchall()]

missing = [
    ('roll_number', "TEXT DEFAULT '24UDS012'"),
    ('batch_year', "TEXT DEFAULT '2023 - 2026'"),
    ('shift', "TEXT DEFAULT 'Regular (Shift I)'"),
    ('admission_date', "TEXT DEFAULT '2023-06-20'"),
    ('dob', "TEXT DEFAULT '2005-08-14'"),
    ('is_hosteller', "INTEGER DEFAULT 0"),
    ('hostel_block', "TEXT"),
    ('room_number', "TEXT")
]

for col_name, col_type in missing:
    if col_name not in cols:
        print(f'Adding {col_name}...')
        cur.execute(f'ALTER TABLE students ADD COLUMN {col_name} {col_type}')

con.commit()
print('Migration complete. Current columns:', [c[1] for c in cur.execute('PRAGMA table_info(students)').fetchall()])
