import sqlite3
import os


# =========================
# DATABASE CONNECTION
# =========================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(BASE_DIR, "college.db")


conn = sqlite3.connect(DB_PATH)

cursor = conn.cursor()

cursor.execute("""
INSERT INTO admin (username, password)
VALUES (?, ?)
""", ("admin", "1234"))

print("Admin inserted successfully")


# =========================
# DEPARTMENTS
# =========================

departments = [


# ---------- UG AIDED ----------

(
"UG",
"Aided",
"Tamil",
"Dr.B.Ponni",
"Department of Tamil"
),


(
"UG",
"Aided",
"English",
"Head of Department",
"Department of English"
),


(
"UG",
"Aided",
"Mathematics",
"Head of Department",
"Department of Mathematics"
),


(
"UG",
"Aided",
"Physics",
"Head of Department",
"Department of Physics"
),


(
"UG",
"Aided",
"Chemistry",
"Head of Department",
"Department of Chemistry"
),


(
"UG",
"Aided",
"Botany",
"Dr.(Mrs.)B.Deepa",
"Department of Botany"
),



# ---------- UG SELF ----------


(
"UG",
"Self",
"Computer Science",
"Head of Department",
"Department of Computer Science"
),


(
"UG",
"Self",
"Data Science",
"Head of Department",
"Department of Data Science"
),


(
"UG",
"Self",
"Computer Applications",
"Head of Department",
"Department of Computer Applications"
),


(
"UG",
"Self",
"Commerce",
"Head of Department",
"Department of Commerce"
),


(
"UG",
"Self",
"Commerce Computer Applications",
"Head of Department",
"Department of Commerce CA"
),




# ---------- PG ----------


(
"PG",
"Self",
"M.Sc Computer Science",
"Head of Department",
"Post Graduate Computer Science"
),


(
"PG",
"Self",
"M.Sc Data Science",
"Head of Department",
"Post Graduate Data Science"
),


(
"PG",
"Self",
"M.Com",
"Head of Department",
"Post Graduate Commerce"
),




# ---------- PhD ----------


(
"Ph.D",
"Research",
"Tamil",
"Research Coordinator",
"Ph.D Research Programme"
),


(
"Ph.D",
"Research",
"Commerce",
"Research Coordinator",
"Ph.D Research Programme"
),


(
"Ph.D",
"Research",
"Computer Science",
"Research Coordinator",
"Ph.D Research Programme"
)

]




cursor.executemany(
"""
INSERT INTO departments
(
level,
category,
department_name,
hod,
description
)

VALUES (?,?,?,?,?)

""",
departments
)







# =========================
# FACULTY
# =========================


faculty = [



(
"Tamil",
"Dr.B.Ponni",
"Associate Professor & Head",
"M.A.,M.Phil.,Ph.D",
"ponni-tam@sfrcollege.edu.in"
),



(
"Botany",
"Dr.(Mrs.)B.Deepa",
"Associate Professor & Head",
"M.Sc.,M.Phil.,Ph.D",
"deepa-bot@sfrcollege.edu.in"
),



(
"Commerce",
"Dr.V.Meenakshi",
"Assistant Professor & Head",
"M.Com.,M.Phil.",
"meenakshi-com@sfrcollege.edu.in"
)

]



cursor.executemany(
"""
INSERT INTO faculty
(
department_name,
faculty_name,
designation,
qualification,
email
)

VALUES (?,?,?,?,?)

""",
faculty
)








# =========================
# CONTACT
# =========================


contact = [


(
"Admission Office",
"+91 4562 220389",
"sfrc@sfrcollege.edu.in",
"Thiruthangal Road, Sivakasi - 626123"
)

]



cursor.executemany(

"""
INSERT INTO contact
(
office_name,
phone,
email,
address
)

VALUES(?,?,?,?)

""",

contact

)






# =========================
# EMPTY FUTURE TABLES
# =========================

# Fees
# Transport
# PhD Guides

# Will be added after verification





conn.commit()

conn.close()


print("✅ SFRC Pragya database filled successfully")