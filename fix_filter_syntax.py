import os

fixes = [
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\complaints.py",
        "COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved', 'closed')) as open_count",
        "SUM(CASE WHEN c.status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as open_count"
    ),
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\hod.py",
        "COUNT(*) FILTER (WHERE status IN ('present', 'od')) as attended",
        "SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as attended"
    ),
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\placement.py",
        "att_q = text(\"SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('present', 'od')) as attended FROM attendance_records WHERE student_id = :sid\")",
        "att_q = text(\"SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as attended FROM attendance_records WHERE student_id = :sid\")"
    ),
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\students.py",
        "att_q = text(\"SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('present', 'od')) as attended FROM attendance_records WHERE student_id = :sid\")",
        "att_q = text(\"SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as attended FROM attendance_records WHERE student_id = :sid\")"
    ),
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\students.py",
        "COUNT(*) FILTER (WHERE status IN ('present', 'od')) as attended",
        "SUM(CASE WHEN status IN ('present', 'od') THEN 1 ELSE 0 END) as attended"
    ),
    (
        r"d:\SFRC Student Portal\backend\app\api\v1\endpoints\students.py",
        "COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'od')) as classes_attended",
        "SUM(CASE WHEN ar.status IN ('present', 'od') THEN 1 ELSE 0 END) as classes_attended"
    ),
]

for filepath, old_str, new_str in fixes:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        if old_str in content:
            content = content.replace(old_str, new_str)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Fixed {filepath}: replaced '{old_str[:30]}...'")
        else:
            print(f"Warning: pattern not found in {filepath}")
    else:
        print(f"File not found: {filepath}")

print("Replacement complete.")
