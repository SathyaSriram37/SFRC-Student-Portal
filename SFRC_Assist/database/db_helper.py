# database/db_helper.py

import sqlite3
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "college.db")



def get_connection():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    return conn



# ==========================
# LEVELS
# ==========================

def get_levels():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT DISTINCT level
        FROM departments
        """
    )

    data = [row["level"] for row in cursor.fetchall()]

    conn.close()

    return data



# ==========================
# CATEGORY
# ==========================

def get_categories(level):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT DISTINCT category
        FROM departments
        WHERE level=?
        """,
        (level,)
    )


    data = [row["category"] for row in cursor.fetchall()]

    conn.close()

    return data



# ==========================
# DEPARTMENTS
# ==========================

def get_departments(level, category):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT department_name
        FROM departments
        WHERE level=? AND category=?
        """,
        (level, category)
    )


    data = [
        row["department_name"]
        for row in cursor.fetchall()
    ]


    conn.close()

    return data



# ==========================
# COURSE DETAILS
# ==========================

def get_course_details(department):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT *
        FROM courses
        WHERE department_name=?
        """,
        (department,)
    )


    row = cursor.fetchone()

    conn.close()


    if row:

        return dict(row)

    return None




# ==========================
# FACULTY
# ==========================

def get_faculty(department):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT faculty_name,
               designation,
               qualification,
               email
        FROM faculty
        WHERE department_name=?
        """,
        (department,)
    )


    data=[]


    for row in cursor.fetchall():

        data.append({

            "name": row["faculty_name"],

            "designation": row["designation"],

            "qualification": row["qualification"],

            "email": row["email"]

        })


    conn.close()


    return data




# ==========================
# FEES
# ==========================

def get_fee(department):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT *
        FROM fees
        WHERE department_name=?
        """,
        (department,)
    )


    row = cursor.fetchone()


    conn.close()


    if row:

        return dict(row)


    return None




# ==========================
# PhD GUIDES
# ==========================

def get_guides():

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT guide_name,
               department_name,
               specialization
        FROM phd_guides
        """
    )


    data=[]


    for row in cursor.fetchall():

        data.append({

            "name":row["guide_name"],

            "department":row["department_name"],

            "specialization":row["specialization"]

        })


    conn.close()


    return data




# ==========================
# TRANSPORT
# ==========================

def get_transport():

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute(
        """
        SELECT route,timing
        FROM transport
        """
    )


    data=[]


    for row in cursor.fetchall():

        data.append({

            "route":row["route"],

            "timing":row["timing"]

        })


    conn.close()


    return data