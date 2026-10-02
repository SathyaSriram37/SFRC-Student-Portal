from flask import Flask, render_template, request, jsonify, redirect, session, flash, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
from difflib import get_close_matches
import re

app = Flask(__name__)
app.secret_key = "SFRC-secret_key"

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "college.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def admin_required():
    if "admin" not in session:
        flash("Please login first", "error")
        return False
    return True


def init_fees_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_name TEXT NOT NULL,
            tuition_fee TEXT NOT NULL,
            other_fee TEXT
        )
    """)
    conn.commit()
    conn.close()


def init_guides_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS guides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guide_name TEXT NOT NULL,
            department TEXT NOT NULL,
            specialization TEXT,
            qualification TEXT,
            email TEXT,
            phone TEXT,
            description TEXT
        )
    """)
    conn.commit()
    conn.close()


def init_transport_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transport (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_number TEXT NOT NULL,
            driver_name TEXT NOT NULL,
            bus_route TEXT NOT NULL,
            bus_stoppings TEXT NOT NULL,
            bus_stop_timings TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    conn = get_db()
    cursor = conn.cursor()

    main_buttons = ["Admissions", "Departments", "Fees", "Faculty", "PhD Guides", "Transport", "Contact"]

    def reply_json(reply, buttons=None):
        conn.close()
        return jsonify({
            "reply": reply,
            "buttons": buttons or []
        })

    def normalize(text):
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    def contains_any(text, words):
        return any(word in text for word in words)

    def best_match(user_text, options, cutoff=0.55):
        if not options:
            return None

        normalized_map = {normalize(option): option for option in options if option}
        matches = get_close_matches(normalize(user_text), list(normalized_map.keys()), n=1, cutoff=cutoff)
        if matches:
            return normalized_map[matches[0]]

        for option in options:
            if normalize(option) in normalize(user_text) or normalize(user_text) in normalize(option):
                return option

        return None

    if not user_message:
        return reply_json("Please type your question.", main_buttons)

    msg = normalize(user_message)

    if msg == "departments":
        return reply_json(
            "Please choose department category.",
            ["Aided", "Self", "Menu"]
        )

    if msg == "aided":
        dept_rows = cursor.execute("""
            SELECT department_name
            FROM departments
            WHERE lower(category) = 'aided'
            ORDER BY department_name
        """).fetchall()

        dept_names = [row["department_name"] for row in dept_rows]
        return reply_json(
            "Available Aided departments:<br>" + "<br>".join(dept_names) if dept_names else "No aided departments found.",
            dept_names[:8] + ["Menu"] if dept_names else ["Menu"]
        )

    if msg == "self":
        dept_rows = cursor.execute("""
            SELECT department_name
            FROM departments
            WHERE lower(category) = 'self'
            ORDER BY department_name
        """).fetchall()

        dept_names = [row["department_name"] for row in dept_rows]
        return reply_json(
            "Available Self departments:<br>" + "<br>".join(dept_names) if dept_names else "No self departments found.",
            dept_names[:8] + ["Menu"] if dept_names else ["Menu"]
        )

    if contains_any(msg, ["hi", "hello", "hey", "hii", "start", "menu", "home"]):
        welcome = (
            "Hello 👋 <b>Welcome to The Standard Fireworks Rajaratnam College for Women!</b><br>"
            "I'm <b>Pragya</b>, your AI guide.<br>"
            "I can help you with:<br>"
            "🎓 <a href='#' onclick=\"sendSuggestion('admissions'); return false;\">Admissions</a><br>"
            "🏛 <a href='#' onclick=\"sendSuggestion('departments'); return false;\">Departments</a><br>"
            "💰 <a href='#' onclick=\"sendSuggestion('fees'); return false;\">Fees</a><br>"
            "👩🏻‍🏫 <a href='#' onclick=\"sendSuggestion('faculty'); return false;\">Faculty</a><br>"
            "👨🏻‍🎓 <a href='#' onclick=\"sendSuggestion('phd guides'); return false;\">Ph.D Guides</a><br>"
            "🚌 <a href='#' onclick=\"sendSuggestion('transport'); return false;\">Transport</a><br>"
            "📞 <a href='#' onclick=\"sendSuggestion('contact'); return false;\">Contact</a>"
        )
        return reply_json(welcome, main_buttons)

    faq_rows = cursor.execute("SELECT question, answer FROM faq").fetchall()
    faq_questions = [row["question"] for row in faq_rows if row["question"]]
    matched_question = best_match(user_message, faq_questions, cutoff=0.75)
    if matched_question:
        faq_row = next((row for row in faq_rows if row["question"] == matched_question), None)
        if faq_row:
            return reply_json(faq_row["answer"], main_buttons)

    if contains_any(msg, ["contact", "phone", "email", "address", "office"]):
        rows = cursor.execute("SELECT * FROM contact ORDER BY id DESC").fetchall()

        if not rows:
            return reply_json("No contact details found.", main_buttons)

        contact_text = []
        for row in rows:
            office = row["office"] if "office" in row.keys() else ""
            phone = row["phone"] if "phone" in row.keys() else ""
            email = row["email"] if "email" in row.keys() else ""
            address = row["address"] if "address" in row.keys() else ""

            block = []
            if office:
                block.append(f"🏢 {office}")
            if phone:
                block.append(f"📞 {phone}")
            if email:
                block.append(f"✉ {email}")
            if address:
                block.append(f"📍 {address}")

            if block:
                contact_text.append("<br>".join(block))

        return reply_json("<br><br>".join(contact_text), ["Admissions", "Transport", "Menu"])

    if contains_any(msg, ["fee", "fees", "tuition"]):
        fee_rows = cursor.execute("SELECT * FROM fees ORDER BY department_name").fetchall()
        dept_names = [row["department_name"] for row in fee_rows if row["department_name"]]

        matched_dept = None
        for dept in dept_names:
            if normalize(dept) in msg:
                matched_dept = dept
                break

        if not matched_dept:
            matched_dept = best_match(user_message, dept_names, cutoff=0.55)

        if matched_dept:
            row = cursor.execute("""
                SELECT *
                FROM fees
                WHERE lower(department_name) = lower(?)
            """, (matched_dept,)).fetchone()

            if row:
                reply = (
                    f"Department: {row['department_name']}<br>"
                    f"Tuition Fee: {row['tuition_fee']}<br>"
                    f"Other Fee: {row['other_fee'] or 'N/A'}"
                )
                return reply_json(reply, ["Admissions", "Departments", "Contact", "Menu"])

        return reply_json(
            "Please mention the department name to get fee details.<br>Example: <i>What is the fee for Physics?</i>",
            dept_names[:8] + ["Menu"] if dept_names else ["Menu"]
        )

    if contains_any(msg, ["department", "departments", "hod", "admission", "admissions", "ug", "pg", "ph.d", "phd", "aided", "self"]):
        dept_rows = cursor.execute("""
            SELECT level, category, department_name, hod, description
            FROM departments
            ORDER BY department_name
        """).fetchall()

        if not dept_rows:
            return reply_json("No department details found.", main_buttons)

        dept_names = [row["department_name"] for row in dept_rows if row["department_name"]]

        matched_dept = None
        for dept in dept_names:
            if normalize(dept) in msg:
                matched_dept = dept
                break

        if not matched_dept:
            matched_dept = best_match(user_message, dept_names, cutoff=0.55)

        if matched_dept:
            row = cursor.execute("""
                SELECT level, category, department_name, hod, description
                FROM departments
                WHERE lower(department_name) = lower(?)
            """, (matched_dept,)).fetchone()

            if row:
                reply = (
                    f"Department: {row['department_name']}<br>"
                    f"Level: {row['level']}<br>"
                    f"Category: {row['category']}<br>"
                    f"HOD: {row['hod']}<br>"
                    f"Description: {row['description'] or 'N/A'}"
                )
                return reply_json(reply, ["Faculty", "PhD Guides", "Fees", "Menu"])

        filtered = dept_rows
        if "ug" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) == "ug"]
        elif "pg" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) == "pg"]
        elif "ph.d" in msg or "phd" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) in ["ph.d", "phd"]]

        if "aided" in msg:
            filtered = [row for row in filtered if normalize(row["category"]) == "aided"]
        elif "self" in msg:
            filtered = [row for row in filtered if normalize(row["category"]) == "self"]

        names = [row["department_name"] for row in filtered]
        if names:
            return reply_json(
                "Available departments:<br>" + "<br>".join(names),
                names[:8] + ["Menu"]
            )

    if contains_any(msg, ["faculty", "staff", "teacher", "professor", "lecturer"]):
        faculty_rows = cursor.execute("""
            SELECT *
            FROM faculty
            ORDER BY department, faculty_name
        """).fetchall()

        if not faculty_rows:
            return reply_json("No faculty details found.", main_buttons)

        faculty_names = [row["faculty_name"] for row in faculty_rows if row["faculty_name"]]
        departments = sorted(list(set(row["department"] for row in faculty_rows if row["department"])))

        for row in faculty_rows:
            if normalize(row["faculty_name"]) in msg:
                reply = (
                    f"Faculty Name: {row['faculty_name']}<br>"
                    f"Department: {row['department']}<br>"
                    f"Designation: {row['designation']}<br>"
                    f"Qualification: {row['qualification'] or 'N/A'}<br>"
                    f"Email: {row['email'] or 'N/A'}<br>"
                    f"Phone: {row['phone'] or 'N/A'}<br>"
                    f"Description: {row['description'] or 'N/A'}"
                )
                return reply_json(reply, ["Faculty", "Departments", "Contact", "Menu"])

        matched_faculty = best_match(user_message, faculty_names, cutoff=0.70)
        if matched_faculty:
            row = cursor.execute("""
                SELECT *
                FROM faculty
                WHERE lower(faculty_name) = lower(?)
            """, (matched_faculty,)).fetchone()

            if row:
                reply = (
                    f"Faculty Name: {row['faculty_name']}<br>"
                    f"Department: {row['department']}<br>"
                    f"Designation: {row['designation']}<br>"
                    f"Qualification: {row['qualification'] or 'N/A'}<br>"
                    f"Email: {row['email'] or 'N/A'}<br>"
                    f"Phone: {row['phone'] or 'N/A'}<br>"
                    f"Description: {row['description'] or 'N/A'}"
                )
                return reply_json(reply, ["Faculty", "Departments", "Contact", "Menu"])

        for dept in departments:
            if normalize(dept) in msg:
                dept_faculty = [row["faculty_name"] for row in faculty_rows if normalize(row["department"]) == normalize(dept)]
                return reply_json(
                    f"Faculty members in {dept}:<br>" + "<br>".join(dept_faculty),
                    dept_faculty[:8] + ["Menu"]
                )

        matched_dept = best_match(user_message, departments, cutoff=0.60)
        if matched_dept:
            dept_faculty = [row["faculty_name"] for row in faculty_rows if normalize(row["department"]) == normalize(matched_dept)]
            return reply_json(
                f"Faculty members in {matched_dept}:<br>" + "<br>".join(dept_faculty),
                dept_faculty[:8] + ["Menu"]
            )

        return reply_json(
            "Please mention a faculty name or department.<br>Example: <i>Show faculty in Chemistry</i>",
            departments[:8] + ["Menu"]
        )

    if contains_any(msg, ["guide", "guides", "phd guide", "ph.d guide", "research guide", "supervisor"]):
        guide_rows = cursor.execute("""
            SELECT *
            FROM guides
            ORDER BY department, guide_name
        """).fetchall()

        if not guide_rows:
            return reply_json("No Ph.D guide details found.", main_buttons)

        guide_names = [row["guide_name"] for row in guide_rows if row["guide_name"]]
        departments = sorted(list(set(row["department"] for row in guide_rows if row["department"])))

        for row in guide_rows:
            if normalize(row["guide_name"]) in msg:
                reply = (
                    f"Guide Name: {row['guide_name']}<br>"
                    f"Department: {row['department']}<br>"
                    f"Specialization: {row['specialization'] or 'N/A'}<br>"
                    f"Qualification: {row['qualification'] or 'N/A'}<br>"
                    f"Email: {row['email'] or 'N/A'}<br>"
                    f"Phone: {row['phone'] or 'N/A'}<br>"
                    f"Description: {row['description'] or 'N/A'}"
                )
                return reply_json(reply, ["PhD Guides", "Departments", "Contact", "Menu"])

        matched_guide = best_match(user_message, guide_names, cutoff=0.70)
        if matched_guide:
            row = cursor.execute("""
                SELECT *
                FROM guides
                WHERE lower(guide_name) = lower(?)
            """, (matched_guide,)).fetchone()

            if row:
                reply = (
                    f"Guide Name: {row['guide_name']}<br>"
                    f"Department: {row['department']}<br>"
                    f"Specialization: {row['specialization'] or 'N/A'}<br>"
                    f"Qualification: {row['qualification'] or 'N/A'}<br>"
                    f"Email: {row['email'] or 'N/A'}<br>"
                    f"Phone: {row['phone'] or 'N/A'}<br>"
                    f"Description: {row['description'] or 'N/A'}"
                )
                return reply_json(reply, ["PhD Guides", "Departments", "Contact", "Menu"])

        for dept in departments:
            if normalize(dept) in msg:
                dept_guides = [row["guide_name"] for row in guide_rows if normalize(row["department"]) == normalize(dept)]
                return reply_json(
                    f"Ph.D guides in {dept}:<br>" + "<br>".join(dept_guides),
                    dept_guides[:8] + ["Menu"]
                )

        matched_dept = best_match(user_message, departments, cutoff=0.60)
        if matched_dept:
            dept_guides = [row["guide_name"] for row in guide_rows if normalize(row["department"]) == normalize(matched_dept)]
            return reply_json(
                f"Ph.D guides in {matched_dept}:<br>" + "<br>".join(dept_guides),
                dept_guides[:8] + ["Menu"]
            )

        return reply_json(
            "Please mention a guide name or department.<br>Example: <i>Show Ph.D guides in Mathematics</i>",
            departments[:8] + ["Menu"]
        )

    if contains_any(msg, ["transport", "bus", "route", "timing", "stop", "stopping"]):
        transport_rows = cursor.execute("""
            SELECT *
            FROM transport
            ORDER BY bus_route, bus_number
        """).fetchall()

        if not transport_rows:
            return reply_json("No transport details found.", main_buttons)

        routes = [row["bus_route"] for row in transport_rows if row["bus_route"]]
        bus_numbers = [row["bus_number"] for row in transport_rows if row["bus_number"]]

        for row in transport_rows:
            if normalize(row["bus_route"]) in msg or normalize(row["bus_number"]) in msg:
                reply = (
                    f"Bus Number: {row['bus_number']}<br>"
                    f"Driver Name: {row['driver_name']}<br>"
                    f"Route: {row['bus_route']}<br>"
                    f"Bus Stoppings:<br>{(row['bus_stoppings'] or '').replace(chr(10), '<br>')}<br>"
                    f"Bus Stop Timings:<br>{(row['bus_stop_timings'] or '').replace(chr(10), '<br>')}"
                )
                return reply_json(reply, ["Transport", "Contact", "Menu"])

        matched_route = best_match(user_message, routes, cutoff=0.55)
        if matched_route:
            row = cursor.execute("""
                SELECT *
                FROM transport
                WHERE lower(bus_route) = lower(?)
            """, (matched_route,)).fetchone()

            if row:
                reply = (
                    f"Bus Number: {row['bus_number']}<br>"
                    f"Driver Name: {row['driver_name']}<br>"
                    f"Route: {row['bus_route']}<br>"
                    f"Bus Stoppings:<br>{(row['bus_stoppings'] or '').replace(chr(10), '<br>')}<br>"
                    f"Bus Stop Timings:<br>{(row['bus_stop_timings'] or '').replace(chr(10), '<br>')}"
                )
                return reply_json(reply, ["Transport", "Contact", "Menu"])

        matched_bus = best_match(user_message, bus_numbers, cutoff=0.75)
        if matched_bus:
            row = cursor.execute("""
                SELECT *
                FROM transport
                WHERE lower(bus_number) = lower(?)
            """, (matched_bus,)).fetchone()

            if row:
                reply = (
                    f"Bus Number: {row['bus_number']}<br>"
                    f"Driver Name: {row['driver_name']}<br>"
                    f"Route: {row['bus_route']}<br>"
                    f"Bus Stoppings:<br>{(row['bus_stoppings'] or '').replace(chr(10), '<br>')}<br>"
                    f"Bus Stop Timings:<br>{(row['bus_stop_timings'] or '').replace(chr(10), '<br>')}"
                )
                return reply_json(reply, ["Transport", "Contact", "Menu"])

        return reply_json(
            "Please mention a bus route or bus number.<br>Example: <i>Show transport details for Route 1</i>",
            routes[:8] + ["Menu"]
        )

    if contains_any(msg, ["admission", "admissions", "apply", "application", "join", "eligibility"]):
        dept_rows = cursor.execute("""
            SELECT level, category, department_name
            FROM departments
            ORDER BY level, category, department_name
        """).fetchall()

        if not dept_rows:
            return reply_json("Admissions information is currently unavailable.", main_buttons)

        filtered = dept_rows
        if "ug" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) == "ug"]
        elif "pg" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) == "pg"]
        elif "ph.d" in msg or "phd" in msg:
            filtered = [row for row in filtered if normalize(row["level"]) in ["ph.d", "phd"]]

        if "aided" in msg:
            filtered = [row for row in filtered if normalize(row["category"]) == "aided"]
        elif "self" in msg:
            filtered = [row for row in filtered if normalize(row["category"]) == "self"]

        names = [row["department_name"] for row in filtered]
        if names:
            return reply_json(
                "Admissions-related departments:<br>" + "<br>".join(names),
                names[:8] + ["Fees", "Contact", "Menu"]
            )

        return reply_json(
            "You can ask about UG, PG, Ph.D, aided, or self-finance admissions.",
            ["UG Admissions", "PG Admissions", "PhD Admissions", "Contact", "Menu"]
        )

    return reply_json(
        "Sorry, I could not fully understand your question.<br>"
        "You can ask things like:<br>"
        "• What is the fee for Physics?<br>"
        "• Who is the HOD of Chemistry?<br>"
        "• Show faculty in Mathematics<br>"
        "• Bus route details<br>"
        "• College contact details",
        main_buttons
    )


@app.route("/admin", methods=["GET", "POST"])
def admin_login():
    if "admin" in session:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin WHERE username = ?", (username,))
        admin = cursor.fetchone()
        conn.close()

        if admin and check_password_hash(admin["password"], password):
            session["admin"] = admin["username"]
            flash("Login successful", "success")
            return redirect(url_for("dashboard"))

        flash("Invalid username or password", "error")
        return redirect(url_for("admin_login"))

    return render_template("admin_login.html")


@app.route("/dashboard")
def dashboard():
    if not admin_required():
        return redirect(url_for("admin_login"))
    return render_template("dashboard.html", admin_name=session["admin"])


@app.route("/change-password", methods=["GET", "POST"])
def change_password():
    if not admin_required():
        return redirect(url_for("admin_login"))

    if request.method == "POST":
        current_password = request.form.get("current_password", "").strip()
        new_password = request.form.get("new_password", "").strip()
        confirm_password = request.form.get("confirm_password", "").strip()

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin WHERE username = ?", (session["admin"],))
        admin = cursor.fetchone()

        if not admin or not check_password_hash(admin["password"], current_password):
            conn.close()
            flash("Current password is incorrect", "error")
            return redirect(url_for("change_password"))

        if len(new_password) < 8:
            conn.close()
            flash("New password must be at least 8 characters long", "error")
            return redirect(url_for("change_password"))

        if new_password != confirm_password:
            conn.close()
            flash("New password and confirm password do not match", "error")
            return redirect(url_for("change_password"))

        hashed_password = generate_password_hash(new_password)
        cursor.execute(
            "UPDATE admin SET password = ? WHERE username = ?",
            (hashed_password, session["admin"])
        )
        conn.commit()
        conn.close()

        flash("Password updated successfully", "success")
        return redirect(url_for("change_password"))

    return render_template("change_password.html", admin_name=session["admin"])


@app.route("/departments")
def departments():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM departments ORDER BY id DESC")
    data = cursor.fetchall()
    conn.close()

    return render_template("departments.html", admin_name=session["admin"], data=data)


@app.route("/add-department", methods=["POST"])
def add_department():
    if not admin_required():
        return redirect(url_for("admin_login"))

    level = request.form.get("level", "").strip()
    category = request.form.get("category", "").strip()
    department_name = request.form.get("department_name", "").strip()
    hod = request.form.get("hod", "").strip()
    description = request.form.get("description", "").strip()

    if not level or not category or not department_name or not hod:
        flash("Level, category, department name, and HOD are required", "error")
        return redirect(url_for("departments"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO departments (level, category, department_name, hod, description)
        VALUES (?, ?, ?, ?, ?)
    """, (level, category, department_name, hod, description))
    conn.commit()
    conn.close()

    flash("Department added successfully", "success")
    return redirect(url_for("departments"))


@app.route("/edit-department/<int:id>", methods=["POST"])
def edit_department(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    level = request.form.get("level", "").strip()
    category = request.form.get("category", "").strip()
    department_name = request.form.get("department_name", "").strip()
    hod = request.form.get("hod", "").strip()
    description = request.form.get("description", "").strip()

    if not level or not category or not department_name or not hod:
        flash("Level, category, department name, and HOD are required", "error")
        return redirect(url_for("departments"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE departments
        SET level = ?, category = ?, department_name = ?, hod = ?, description = ?
        WHERE id = ?
    """, (level, category, department_name, hod, description, id))
    conn.commit()
    conn.close()

    flash("Department updated successfully", "success")
    return redirect(url_for("departments"))


@app.route("/delete-department/<int:id>")
def delete_department(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM departments WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Department deleted successfully", "success")
    return redirect(url_for("departments"))


@app.route("/faculty")
def faculty():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty ORDER BY id DESC")
    data = cursor.fetchall()
    conn.close()

    return render_template("faculty.html", admin_name=session["admin"], data=data)


@app.route("/add-faculty", methods=["POST"])
def add_faculty():
    if not admin_required():
        return redirect(url_for("admin_login"))

    faculty_name = request.form.get("faculty_name", "").strip()
    designation = request.form.get("designation", "").strip()
    department = request.form.get("department", "").strip()
    qualification = request.form.get("qualification", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    description = request.form.get("description", "").strip()

    if not faculty_name or not designation or not department:
        flash("Faculty name, designation, and department are required", "error")
        return redirect(url_for("faculty"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO faculty (faculty_name, designation, department, qualification, email, phone, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (faculty_name, designation, department, qualification, email, phone, description))
    conn.commit()
    conn.close()

    flash("Faculty added successfully", "success")
    return redirect(url_for("faculty"))


@app.route("/edit-faculty/<int:id>", methods=["POST"])
def edit_faculty(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    faculty_name = request.form.get("faculty_name", "").strip()
    designation = request.form.get("designation", "").strip()
    department = request.form.get("department", "").strip()
    qualification = request.form.get("qualification", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    description = request.form.get("description", "").strip()

    if not faculty_name or not designation or not department:
        flash("Faculty name, designation, and department are required", "error")
        return redirect(url_for("faculty"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE faculty
        SET faculty_name = ?, designation = ?, department = ?, qualification = ?, email = ?, phone = ?, description = ?
        WHERE id = ?
    """, (faculty_name, designation, department, qualification, email, phone, description, id))
    conn.commit()
    conn.close()

    flash("Faculty updated successfully", "success")
    return redirect(url_for("faculty"))


@app.route("/delete-faculty/<int:id>")
def delete_faculty(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM faculty WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Faculty deleted successfully", "success")
    return redirect(url_for("faculty"))


@app.route("/fees")
def fees():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fees ORDER BY id DESC")
    data = cursor.fetchall()
    conn.close()

    return render_template("fees.html", admin_name=session["admin"], data=data)


@app.route("/add-fee", methods=["POST"])
def add_fee():
    if not admin_required():
        return redirect(url_for("admin_login"))

    department_name = request.form.get("department_name", "").strip()
    tuition_fee = request.form.get("tuition_fee", "").strip()
    other_fee = request.form.get("other_fee", "").strip()

    if not department_name or not tuition_fee:
        flash("Department name and tuition fee are required", "error")
        return redirect(url_for("fees"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO fees (department_name, tuition_fee, other_fee)
        VALUES (?, ?, ?)
    """, (department_name, tuition_fee, other_fee))
    conn.commit()
    conn.close()

    flash("Fee record added successfully", "success")
    return redirect(url_for("fees"))


@app.route("/edit-fee/<int:id>", methods=["POST"])
def edit_fee(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    department_name = request.form.get("department_name", "").strip()
    tuition_fee = request.form.get("tuition_fee", "").strip()
    other_fee = request.form.get("other_fee", "").strip()

    if not department_name or not tuition_fee:
        flash("Department name and tuition fee are required", "error")
        return redirect(url_for("fees"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE fees
        SET department_name = ?, tuition_fee = ?, other_fee = ?
        WHERE id = ?
    """, (department_name, tuition_fee, other_fee, id))
    conn.commit()
    conn.close()

    flash("Fee record updated successfully", "success")
    return redirect(url_for("fees"))


@app.route("/delete-fee/<int:id>")
def delete_fee(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fees WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Fee record deleted successfully", "success")
    return redirect(url_for("fees"))


@app.route("/guides")
def guides():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM guides ORDER BY id DESC")
    data = cursor.fetchall()
    conn.close()

    return render_template("guides.html", admin_name=session["admin"], data=data)


@app.route("/add-guide", methods=["POST"])
def add_guide():
    if not admin_required():
        return redirect(url_for("admin_login"))

    guide_name = request.form.get("guide_name", "").strip()
    department = request.form.get("department", "").strip()
    specialization = request.form.get("specialization", "").strip()
    qualification = request.form.get("qualification", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    description = request.form.get("description", "").strip()

    if not guide_name or not department:
        flash("Guide name and department are required", "error")
        return redirect(url_for("guides"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO guides (guide_name, department, specialization, qualification, email, phone, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (guide_name, department, specialization, qualification, email, phone, description))
    conn.commit()
    conn.close()

    flash("Ph.D guide added successfully", "success")
    return redirect(url_for("guides"))


@app.route("/edit-guide/<int:id>", methods=["POST"])
def edit_guide(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    guide_name = request.form.get("guide_name", "").strip()
    department = request.form.get("department", "").strip()
    specialization = request.form.get("specialization", "").strip()
    qualification = request.form.get("qualification", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    description = request.form.get("description", "").strip()

    if not guide_name or not department:
        flash("Guide name and department are required", "error")
        return redirect(url_for("guides"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE guides
        SET guide_name = ?, department = ?, specialization = ?, qualification = ?, email = ?, phone = ?, description = ?
        WHERE id = ?
    """, (guide_name, department, specialization, qualification, email, phone, description, id))
    conn.commit()
    conn.close()

    flash("Ph.D guide updated successfully", "success")
    return redirect(url_for("guides"))


@app.route("/delete-guide/<int:id>")
def delete_guide(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM guides WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Ph.D guide deleted successfully", "success")
    return redirect(url_for("guides"))


@app.route("/transport")
def transport():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transport ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    data = []

    for row in rows:
        stoppings = row["bus_stoppings"].splitlines() if row["bus_stoppings"] else []
        timings = row["bus_stop_timings"].splitlines() if row["bus_stop_timings"] else []

        paired_stops = []
        max_len = max(len(stoppings), len(timings))

        for i in range(max_len):
            stop = stoppings[i].strip() if i < len(stoppings) else "N/A"
            time = timings[i].strip() if i < len(timings) else "N/A"
            if stop or time:
                paired_stops.append(f"{stop} - {time}")

        item = dict(row)
        item["paired_stops"] = paired_stops
        data.append(item)

    return render_template("transport.html", admin_name=session["admin"], data=data)


@app.route("/add-transport", methods=["POST"])
def add_transport():
    if not admin_required():
        return redirect(url_for("admin_login"))

    bus_number = request.form.get("bus_number", "").strip()
    driver_name = request.form.get("driver_name", "").strip()
    bus_route = request.form.get("bus_route", "").strip()
    bus_stoppings = request.form.get("bus_stoppings", "").strip()
    bus_stop_timings = request.form.get("bus_stop_timings", "").strip()

    if not bus_number or not driver_name or not bus_route or not bus_stoppings or not bus_stop_timings:
        flash("All bus details are required", "error")
        return redirect(url_for("transport"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO transport (bus_number, driver_name, bus_route, bus_stoppings, bus_stop_timings)
        VALUES (?, ?, ?, ?, ?)
    """, (bus_number, driver_name, bus_route, bus_stoppings, bus_stop_timings))
    conn.commit()
    conn.close()

    flash("Bus record added successfully", "success")
    return redirect(url_for("transport"))


@app.route("/edit-transport/<int:id>", methods=["POST"])
def edit_transport(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    bus_number = request.form.get("bus_number", "").strip()
    driver_name = request.form.get("driver_name", "").strip()
    bus_route = request.form.get("bus_route", "").strip()
    bus_stoppings = request.form.get("bus_stoppings", "").strip()
    bus_stop_timings = request.form.get("bus_stop_timings", "").strip()

    if not bus_number or not driver_name or not bus_route or not bus_stoppings or not bus_stop_timings:
        flash("All bus details are required", "error")
        return redirect(url_for("transport"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE transport
        SET bus_number = ?, driver_name = ?, bus_route = ?, bus_stoppings = ?, bus_stop_timings = ?
        WHERE id = ?
    """, (bus_number, driver_name, bus_route, bus_stoppings, bus_stop_timings, id))
    conn.commit()
    conn.close()

    flash("Bus record updated successfully", "success")
    return redirect(url_for("transport"))


@app.route("/delete-transport/<int:id>")
def delete_transport(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transport WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Bus record deleted successfully", "success")
    return redirect(url_for("transport"))


@app.route("/contact")
def contact():
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contact ORDER BY id DESC")
    data = cursor.fetchall()
    conn.close()

    return render_template("contact.html", admin_name=session["admin"], data=data)


@app.route("/add-contact", methods=["POST"])
def add_contact():
    if not admin_required():
        return redirect(url_for("admin_login"))

    office = request.form.get("office", "").strip()
    phone = request.form.get("phone", "").strip()
    email = request.form.get("email", "").strip()
    address = request.form.get("address", "").strip()

    if not office or not phone or not email or not address:
        flash("All contact details are required", "error")
        return redirect(url_for("contact"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO contact (office, phone, email, address)
        VALUES (?, ?, ?, ?)
    """, (office, phone, email, address))
    conn.commit()
    conn.close()

    flash("Contact added successfully", "success")
    return redirect(url_for("contact"))


@app.route("/edit-contact/<int:id>", methods=["POST"])
def edit_contact(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    office = request.form.get("office", "").strip()
    phone = request.form.get("phone", "").strip()
    email = request.form.get("email", "").strip()
    address = request.form.get("address", "").strip()

    if not office or not phone or not email or not address:
        flash("All contact details are required", "error")
        return redirect(url_for("contact"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE contact
        SET office = ?, phone = ?, email = ?, address = ?
        WHERE id = ?
    """, (office, phone, email, address, id))
    conn.commit()
    conn.close()

    flash("Contact updated successfully", "success")
    return redirect(url_for("contact"))


@app.route("/delete-contact/<int:id>")
def delete_contact(id):
    if not admin_required():
        return redirect(url_for("admin_login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contact WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Contact deleted successfully", "success")
    return redirect(url_for("contact"))


@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out successfully", "success")
    return redirect(url_for("admin_login"))


if __name__ == "__main__":
    init_fees_table()
    init_guides_table()
    init_transport_table()
    app.run(debug=True)