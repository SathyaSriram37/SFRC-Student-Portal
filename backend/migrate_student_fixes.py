import sqlite3
import uuid
from datetime import datetime, timezone

def run_migration():
    conn = sqlite3.connect("college.db")
    c = conn.cursor()

    # 1. assignments
    c.execute("""
    CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(100) PRIMARY KEY,
        course_id VARCHAR(100) NOT NULL,
        faculty_id VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date VARCHAR(100),
        max_marks REAL DEFAULT 20.0,
        created_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP,
        updated_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. student_fees
    c.execute("""
    CREATE TABLE IF NOT EXISTS student_fees (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        category VARCHAR(255) NOT NULL,
        semester VARCHAR(100) NOT NULL,
        amount REAL NOT NULL,
        due_date VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'paid',
        receipt_number VARCHAR(100),
        paid_date VARCHAR(100),
        transaction_ref VARCHAR(100),
        created_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP,
        updated_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. policies
    c.execute("""
    CREATE TABLE IF NOT EXISTS policies (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        version VARCHAR(50) DEFAULT '1.0',
        audience VARCHAR(50) DEFAULT 'all',
        requires_acknowledgement BOOLEAN DEFAULT 0,
        effective_date VARCHAR(100) DEFAULT '2026-06-01',
        description TEXT NOT NULL,
        content TEXT NOT NULL,
        document_url TEXT,
        status VARCHAR(50) DEFAULT 'published',
        created_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP,
        updated_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. policy_acknowledgements
    c.execute("""
    CREATE TABLE IF NOT EXISTS policy_acknowledgements (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        policy_id VARCHAR(100) NOT NULL,
        version VARCHAR(50) DEFAULT '1.0',
        acknowledged_at VARCHAR(100) DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, policy_id, version)
    );
    """)

    # Seed assignments for Harishma's courses if empty
    c.execute("SELECT count(*) FROM assignments")
    if c.fetchone()[0] == 0:
        assignments_data = [
            (
                "asgn-ds-01",
                "c-cs-22pcsc21", # Advanced Machine Learning
                "fac-4bce02",
                "Convolutional Neural Network Case Study on Agricultural Pest Classification",
                "Submit full PyTorch model implementation with confusion matrix analysis and ROC-AUC curve comparisons.",
                "2026-10-28T23:59:59Z",
                25.0
            ),
            (
                "asgn-ds-02",
                "c-cs-22ucsc41", # Database Management Systems & SQL
                "fac-031aab",
                "Enterprise Relational Schema Normalization & Complex SQL Query Optimization",
                "Formulate 3NF/BCNF schemas and benchmark indexing strategies using EXPLAIN QUERY PLAN.",
                "2026-11-05T23:59:59Z",
                20.0
            ),
            (
                "asgn-ds-03",
                "c-cs-22ucsc61", # Cloud Architecture & DevOps
                "fac-c205a4",
                "Dockerized Microservices Deployment & Kubernetes Pod Autoscaling Manifest",
                "Deploy a multi-tier containerized architecture with Helm charts and Prometheus monitoring.",
                "2026-11-15T23:59:59Z",
                20.0
            )
        ]
        c.executemany("""
            INSERT INTO assignments (id, course_id, faculty_id, title, description, due_date, max_marks)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, assignments_data)
        print("Seeded assignments:", len(assignments_data))

    # Seed student_fees for Harishma ('st-43f4a04f')
    c.execute("SELECT count(*) FROM student_fees WHERE student_id = 'st-43f4a04f'")
    if c.fetchone()[0] == 0:
        fees_data = [
            (
                "fee-harishma-01",
                "st-43f4a04f",
                "43f4a04f-cc25-4163-823a-44009ef620fc",
                "Semester IV Tuition & Data Science Laboratory Fee",
                "Semester 4 (2025-2026)",
                18500.0,
                "2026-01-15",
                "paid",
                "SFRC-RCP-2026-4418",
                "2026-01-10",
                "HDFC-UPI-9928172648"
            ),
            (
                "fee-harishma-02",
                "st-43f4a04f",
                "43f4a04f-cc25-4163-823a-44009ef620fc",
                "Autonomous End-Semester Examination Fee (Nov 2026)",
                "Semester 4 (Autonomous ESE)",
                2400.0,
                "2026-10-25",
                "paid",
                "SFRC-RCP-2026-9043",
                "2026-10-02",
                "SBI-EPAY-8837192019"
            ),
            (
                "fee-harishma-03",
                "st-43f4a04f",
                "43f4a04f-cc25-4163-823a-44009ef620fc",
                "College Bus Transport Annual Fee (Route 4 - Sattur)",
                "Annual Transport Pass 2025-2026",
                6000.0,
                "2025-08-01",
                "paid",
                "SFRC-RCP-2025-7734",
                "2025-07-28",
                "GPay-UPI-4491029381"
            )
        ]
        c.executemany("""
            INSERT INTO student_fees (id, student_id, user_id, category, semester, amount, due_date, status, receipt_number, paid_date, transaction_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, fees_data)
        print("Seeded student_fees:", len(fees_data))

    # Seed policies if empty
    c.execute("SELECT count(*) FROM policies")
    if c.fetchone()[0] == 0:
        policies_data = [
            (
                "pol-001",
                "Anti-Ragging & Campus Discipline Policy",
                "Anti-Ragging",
                "1.0",
                "all",
                1,
                "2026-06-01",
                "Zero-tolerance statutory policy against ragging in academic premises, hostels, and digital spaces as per UGC Regulations and SFRC directives.",
                "The Standard Fireworks Rajaratnam College for Women enforces strict zero tolerance towards ragging in any form. Under the Tamil Nadu Prohibition of Ragging Act, offenders face immediate suspension, FIR registration, and academic debarment.",
                "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
                "published"
            ),
            (
                "pol-002",
                "IT Usage, Network Security & AI Ethics Policy",
                "IT Policy",
                "2.0",
                "all",
                1,
                "2026-06-01",
                "Guidelines for campus WiFi access, computing laboratories, cloud resources, student portal security, and responsible AI usage.",
                "Governs access to college IT infrastructure, mandatory multi-factor authentication, ethical principles for AI assistance in coursework, and strict prohibitions on credential sharing or unauthorized network monitoring.",
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
                "published"
            ),
            (
                "pol-003",
                "Autonomous End-Semester Examination & CIA Regulations",
                "Examination Rules",
                "1.0",
                "student",
                0,
                "2026-06-01",
                "Examination conduct, continuous internal assessment (CIA) scoring rubrics, minimum 75% attendance threshold, and revaluation procedures.",
                "Specifies autonomous curriculum evaluation rules, compulsory 75% attendance for hall ticket issuance, malpractices protocols, and COE timeline for supplementary and improvement examinations.",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
                "published"
            ),
            (
                "pol-004",
                "Code of Conduct for Student Council & Student Clubs",
                "Student Affairs",
                "1.0",
                "student",
                0,
                "2026-06-01",
                "Leadership guidelines, election protocols, financial transparency, and event organization rules for student union & club office bearers.",
                "Mandates ethical leadership, mutual respect, adherence to college timelines, alcohol and smoke-free campus protocols, and proper accounting for club activities.",
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
                "published"
            )
        ]
        c.executemany("""
            INSERT INTO policies (id, title, category, version, audience, requires_acknowledgement, effective_date, description, content, document_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, policies_data)
        print("Seeded policies:", len(policies_data))

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    run_migration()
