"""Seed / Sync all official institutional knowledge into college.db pragya_knowledge_base table."""
import sqlite3
import json
import os
import sys

# Ensure backend directory is in sys.path for runtime execution
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.ai.pragya_knowledge_seeds import SEED_PRAGYA_KNOWLEDGE  # type: ignore[import-not-found]  # noqa: E402
except (ImportError, ModuleNotFoundError):
    import importlib.util
    seeds_file = os.path.join(backend_dir, "app", "ai", "pragya_knowledge_seeds.py")
    spec = importlib.util.spec_from_file_location("pragya_knowledge_seeds", seeds_file)
    if spec and spec.loader:
        seeds_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(seeds_mod)
        SEED_PRAGYA_KNOWLEDGE = seeds_mod.SEED_PRAGYA_KNOWLEDGE  # type: ignore
    else:
        raise

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "college.db"))

def sync_knowledge_base():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Create table if not exists
    c.execute("""
        CREATE TABLE IF NOT EXISTS pragya_knowledge_base (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            topic TEXT NOT NULL,
            question_patterns TEXT,
            answer TEXT NOT NULL,
            quick_buttons TEXT,
            sources TEXT,
            keywords TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    upserted = 0
    for item in SEED_PRAGYA_KNOWLEDGE:
        item_id = item["id"]
        cat = item["category"]
        topic = item["topic"]
        q_patterns = json.dumps(item.get("question_patterns", []))
        answer = item["answer"]
        quick_buttons = json.dumps(item.get("quick_buttons", []))
        sources = json.dumps(item.get("sources", []))
        keywords = item.get("keywords", "")

        c.execute("""
            INSERT INTO pragya_knowledge_base (id, category, topic, question_patterns, answer, quick_buttons, sources, keywords, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                category=excluded.category,
                topic=excluded.topic,
                question_patterns=excluded.question_patterns,
                answer=excluded.answer,
                quick_buttons=excluded.quick_buttons,
                sources=excluded.sources,
                keywords=excluded.keywords,
                updated_at=CURRENT_TIMESTAMP
        """, (item_id, cat, topic, q_patterns, answer, quick_buttons, sources, keywords))
        upserted += 1

    conn.commit()
    count = c.execute("SELECT COUNT(*) FROM pragya_knowledge_base").fetchone()[0]
    conn.close()
    print(f"Successfully upserted {upserted} seed items. Total in pragya_knowledge_base: {count}")

if __name__ == "__main__":
    sync_knowledge_base()
