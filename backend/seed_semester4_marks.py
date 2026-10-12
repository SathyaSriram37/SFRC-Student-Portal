import sqlite3
import uuid

con = sqlite3.connect(r'd:\SFRC Student Portal\college.db')
cur = con.cursor()

student_id = 'st-43f4a04f'

courses_data = [
    {
        'course_id': 'c-cs-22ucsc41', # DBMS
        'semester': 4,
        'academic_year': '2025-2026',
        'marks': [
            ('CIA1', 23.5, 25.0),
            ('CIA2', 24.0, 25.0),
            ('CIA3', 22.0, 25.0),
            ('Assignment', 9.5, 10.0),
            ('Model', 68.0, 75.0),
        ]
    },
    {
        'course_id': 'c-cs-22pcsc21', # Machine Learning
        'semester': 4,
        'academic_year': '2025-2026',
        'marks': [
            ('CIA1', 22.0, 25.0),
            ('CIA2', 23.0, 25.0),
            ('CIA3', 21.5, 25.0),
            ('Assignment', 9.0, 10.0),
            ('Model', 65.0, 75.0),
        ]
    },
    {
        'course_id': 'c-cs-22ucsc61', # Cloud Architecture
        'semester': 4,
        'academic_year': '2025-2026',
        'marks': [
            ('CIA1', 24.0, 25.0),
            ('CIA2', 24.5, 25.0),
            ('CIA3', 23.0, 25.0),
            ('Assignment', 10.0, 10.0),
            ('Model', 71.0, 75.0),
        ]
    }
]

for cd in courses_data:
    cid = cd['course_id']
    sem = cd['semester']
    ay = cd['academic_year']
    for atype, scored, max_m in cd['marks']:
        # Check if exists
        cur.execute('''
            SELECT id FROM marks 
            WHERE student_id = ? AND course_id = ? AND assessment_type = ? AND semester = ?
        ''', (student_id, cid, atype, sem))
        row = cur.fetchone()
        if not row:
            cur.execute('''
                INSERT INTO marks (id, student_id, course_id, assessment_type, marks_obtained, max_marks, academic_year, semester, entered_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (str(uuid.uuid4()), student_id, cid, atype, scored, max_m, ay, sem, 'faculty-dept-head'))
        else:
            cur.execute('''
                UPDATE marks SET marks_obtained = ?, max_marks = ? WHERE id = ?
            ''', (scored, max_m, row[0]))

con.commit()
print('Marks seeded successfully.')
