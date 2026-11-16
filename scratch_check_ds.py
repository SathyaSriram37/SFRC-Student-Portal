import sqlite3

conn = sqlite3.connect('college.db')
c = conn.cursor()

c.execute("SELECT p.id, p.name, p.code, p.department_id, d.name as dept_name, d.code as dept_code FROM programmes p LEFT JOIN departments d ON p.department_id = d.id WHERE p.name LIKE '%Data%' OR p.code LIKE '%DS%'")
print("Programmes:", c.fetchall())

c.execute("SELECT id, name, code FROM departments WHERE name LIKE '%Data%' OR name LIKE '%Computer%'")
print("Departments:", c.fetchall())

c.execute("SELECT id, code, title, semester, credits, faculty_id FROM courses WHERE department_id = '8600e9b3-0e6a-4492-b6ec-d8a56abf677d' OR programme_id = 'ac7ed91d-d438-4f06-8177-a8cabbd67986'")
print("Courses:", c.fetchall())

c.execute("SELECT s.id, s.register_number, up.full_name FROM students s JOIN user_profiles up ON s.user_id = up.id WHERE s.department_id = '8600e9b3-0e6a-4492-b6ec-d8a56abf677d' OR s.programme_id = 'ac7ed91d-d438-4f06-8177-a8cabbd67986'")
print("Students:", c.fetchall())

c.execute("SELECT f.id, f.employee_id, up.full_name, f.designation FROM faculty f JOIN user_profiles up ON f.user_id = up.id WHERE f.department_id = '8600e9b3-0e6a-4492-b6ec-d8a56abf677d'")
print("Faculty:", c.fetchall())

