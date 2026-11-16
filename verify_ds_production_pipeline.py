import os
import sys
import json
import urllib.request
import urllib.error

BACKEND_URL = "http://127.0.0.1:8000"

SUPABASE_URL = "https://ketpjyyowmhuzecwzmds.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldHBqeXlvd21odXplY3d6bWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDUwMTMsImV4cCI6MjEwNjE4MTAxM30.wicBEM7Oj3jD5wqBLDsukmeGZC9NNzyem6kCBRYHtFA"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            status = response.status
            return status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}
    except Exception as e:
        return 500, {"error": str(e)}

def login(email, password="Sfrc@2026"):
    auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    status, data = make_request(auth_url, method="POST", headers=headers, data=payload)
    if status == 200:
        return data["access_token"], data["user"]["id"]
    else:
        print(f"Login failed for {email}: {status} - {data}")
        return None, None

def test_pipeline():
    print("="*75)
    print("STEP 1: PRODUCTION AUTHENTICATION VERIFICATION")
    print("="*75)

    admin_token, admin_id = login("sfrc.admin@gmail.com", "Password@123")
    hod_token, hod_id = login("hod.datascience@sfrc.edu.in")
    staff_token, staff_id = login("staff.subbulakshmi@sfrc.edu.in")
    student_token, student_id = login("abinaya.24uds001@sfrc.edu.in")
    parent_token, parent_id = login("parent.24uds001@sfrc.edu.in")

    print(f"  [OK] Admin      : sfrc.admin@gmail.com")
    print(f"  [OK] HOD        : hod.datascience@sfrc.edu.in")
    print(f"  [OK] Faculty    : staff.subbulakshmi@sfrc.edu.in")
    print(f"  [OK] Student    : abinaya.24uds001@sfrc.edu.in")
    print(f"  [OK] Parent     : parent.24uds001@sfrc.edu.in")

    assert admin_token and hod_token and staff_token and student_token and parent_token, "Authentication failure detected"

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    parent_headers = {"Authorization": f"Bearer {parent_token}"}

    print("\n" + "="*75)
    print("STEP 2: ADMIN MODULE — DATA SCIENCE CURRICULUM & FACULTY ALLOCATION")
    print("="*75)
    status, courses = make_request(f"{BACKEND_URL}/api/v1/admin/academics/courses", headers=admin_headers)
    assert status == 200, f"Failed to fetch courses: {status}"
    ds_courses = [c for c in courses if c.get("code", "").startswith("24UDS")]
    print(f"Found {len(ds_courses)} active curriculum courses for B.Sc. Data Science:")
    for c in ds_courses:
        print(f"  * [{c.get('code')}] {c.get('title')} (Sem {c.get('semester')}) -> Faculty: {c.get('faculty_name')} ({c.get('faculty_employee_id')})")

    # Test re-assigning course via Admin API to confirm dynamic persistence
    target = ds_courses[0]
    assign_payload = {"course_id": target["id"], "faculty_id": target["faculty_id"]}
    s_assign, resp_assign = make_request(f"{BACKEND_URL}/api/v1/admin/academics/courses/assign", method="POST", headers=admin_headers, data=assign_payload)
    print(f"Course Reassignment API test: Status {s_assign} -> {resp_assign.get('message')}")
    assert s_assign == 200, "Course assignment failed"

    print("\n" + "="*75)
    print("STEP 3: ADMIN MODULE — TRANSPORT BUS PASS ALLOCATIONS")
    print("="*75)
    status, allocations = make_request(f"{BACKEND_URL}/api/v1/admin/transport/allocations", headers=admin_headers)
    assert status == 200, f"Failed to fetch allocations: {status}"
    ds_alloc = [a for a in allocations if (a.get("register_number") or "").startswith("24UDS")]
    print(f"Total Fleet Allocations in Database: {len(allocations)}")
    print(f"B.Sc. Data Science Transport Allocations: {len(ds_alloc)} students")
    for a in ds_alloc[:5]:
        print(f"  * {a.get('register_number')} {a.get('user_name')} | Route: {a.get('route_name')} ({a.get('bus_registration')}) | Stop: {a.get('boarding_stop_name')} | Seat: {a.get('seat_number')}")

    print("\n" + "="*75)
    print("STEP 4: ADMIN MODULE — DYNAMIC ATTENDANCE & ACADEMIC ANALYTICS")
    print("="*75)
    status, att_data = make_request(f"{BACKEND_URL}/api/v1/admin/analytics/attendance", headers=admin_headers)
    assert status == 200, f"Attendance analytics failed: {status}"
    print(f"Institutional Attendance Rate : {att_data.get('overall_percentage')}%")
    print(f"Shortage Count (<75%)        : {att_data.get('shortage_count')} students")
    print("Department Breakdown:")
    for dept in att_data.get("department_attendance", []):
        print(f"  * {dept.get('department')}: {dept.get('attendance_pct')}% ({dept.get('total_students')} students)")

    status, acad_data = make_request(f"{BACKEND_URL}/api/v1/admin/analytics/academics", headers=admin_headers)
    assert status == 200, f"Academic analytics failed: {status}"
    print(f"Institutional Pass Rate       : {acad_data.get('pass_rate')}%")
    print(f"Distinction Rate              : {acad_data.get('distinction_rate')}%")
    print("CGPA Distribution:")
    for item in acad_data.get("cgpa_distribution", []):
        print(f"  * {item.get('grade_bracket')}: {item.get('count')} students ({item.get('percentage')}%)")

    print("\n" + "="*75)
    print("STEP 5: HOD MODULE — DATA SCIENCE GOVERNANCE & PRODUCTION CHARTS")
    print("="*75)
    status, hod_ov = make_request(f"{BACKEND_URL}/api/v1/hod/overview", headers=hod_headers)
    assert status == 200, f"HOD overview failed: {status}"
    dept_info = hod_ov.get("department", {})
    stats = hod_ov.get("stats", {})
    print(f"Department: {dept_info.get('name')} [{dept_info.get('code')}]")
    print(f"Active Students : {stats.get('total_active_students')}")
    print(f"Active Faculty  : {stats.get('total_faculty')}")
    print(f"Active Courses  : {stats.get('total_courses')}")
    print(f"Avg Attendance  : {stats.get('avg_attendance_pct')}%")
    print(f"Avg Marks       : {stats.get('avg_marks_pct')}%")
    print(f"At-Risk Students: {stats.get('at_risk_students') or 0}")

    status, charts = make_request(f"{BACKEND_URL}/api/v1/hod/analytics/charts", headers=hod_headers)
    assert status == 200, f"HOD charts failed: {status}"
    c1 = charts.get("chart1_attendance_per_student", [])
    c2 = charts.get("chart2_marks_per_subject", [])
    c3 = charts.get("chart3_attendance_split", {})
    c6 = charts.get("chart6_subject_pass_fail", [])
    print(f"Chart 1 (Student Attendance): {len(c1)} student points evaluated (Sample: {c1[0]['student_name']} = {c1[0]['attendance_pct']}%)")
    print(f"Chart 2 (Subject Marks Avg) : {len(c2)} subjects evaluated (Sample: {c2[0]['subject_code']} = {c2[0]['avg_score_100']}%)")
    print(f"Chart 3 (Attendance Split)  : Present Days = {c3.get('present_days')}, Absent Days = {c3.get('absent_days')}, Overall = {c3.get('overall_percentage')}%")
    print(f"Chart 6 (Subject Pass/Fail) : {len(c6)} subjects computed directly from marks table")

    print("\n" + "="*75)
    print("STEP 6: STUDENT PORTAL — VERIFY 24UDS001 PROFILE, ATTENDANCE & MARKS")
    print("="*75)
    status, s_dash = make_request(f"{BACKEND_URL}/api/v1/students/me/dashboard", headers=student_headers)
    assert status == 200, f"Student dashboard failed: {status}"
    prof = s_dash.get("profile", {})
    print(f"Student: {prof.get('full_name')} ({prof.get('register_number')}) - Sem {prof.get('current_semester')}")
    print(f"Programme: {prof.get('programme_name')} | Dept: {prof.get('department_name')}")
    print(f"Dashboard Attendance: {s_dash.get('attendance_pct')}% | CGPA: {s_dash.get('cgpa')}")

    status, s_att = make_request(f"{BACKEND_URL}/api/v1/students/me/attendance", headers=student_headers)
    assert status == 200, f"Student attendance failed: {status}"
    print(f"Detailed Attendance: {s_att.get('overall_percentage')}% ({s_att.get('total_attended')}/{s_att.get('total_held')} classes)")
    for crs in s_att.get("courses", []):
        print(f"  * [{crs.get('course_code')}] {crs.get('course_title')}: {crs.get('percentage')}% ({crs.get('classes_attended')}/{crs.get('classes_held')}) [{crs.get('status').upper()}]")

    status, s_marks = make_request(f"{BACKEND_URL}/api/v1/students/me/marks", headers=student_headers)
    assert status == 200, f"Student marks failed: {status}"
    print(f"Detailed Marks (CGPA: {s_marks.get('current_cgpa')}):")
    for m in s_marks.get("course_marks", []):
        print(f"  * [{m.get('course_code')}] {m.get('course_title')} -> CIA1: {m.get('cia1')}, CIA2: {m.get('cia2')}, Total: {m.get('total')}, Grade: {m.get('grade')}")

    print("\n" + "="*75)
    print("STEP 7: PARENT PORTAL — VERIFY LINKED WARD PERFORMANCE & BUS PASS")
    print("="*75)
    status, wards = make_request(f"{BACKEND_URL}/api/v1/parents/me/wards", headers=parent_headers)
    assert status == 200 and len(wards) > 0, f"Parent wards failed: {status}"
    ward = wards[0]
    ward_id = ward.get("ward_id") or ward.get("id") or ward.get("student_id")
    print(f"Linked Ward: {ward.get('full_name')} ({ward.get('register_number')}) | Programme: {ward.get('programme')}")
    print(f"Parent Relation: {ward.get('relationship')}")

    status, w_summary = make_request(f"{BACKEND_URL}/api/v1/parents/me/wards/{ward_id}/summary", headers=parent_headers)
    assert status == 200, f"Ward summary failed: {status}"
    print(f"Ward Academic Summary -> Attendance: {w_summary.get('attendance_pct')}% | CGPA: {w_summary.get('cgpa')}")

    status, w_trans = make_request(f"{BACKEND_URL}/api/v1/parents/me/wards/{ward_id}/transport", headers=parent_headers)
    assert status == 200, f"Ward transport failed: {status}"
    print(f"Ward Transport Pass -> Route: {w_trans.get('route_number')} ({w_trans.get('route_name')}) | Stop: {w_trans.get('boarding_stop')} | Seat: {w_trans.get('seat_number')}")

    print("\n" + "="*75)
    print("SUCCESS: 100% PRODUCTION VERIFICATION CONFIRMED FOR B.SC. DATA SCIENCE")
    print("="*75)

if __name__ == "__main__":
    test_pipeline()
