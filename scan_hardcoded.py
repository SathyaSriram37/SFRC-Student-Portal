import os
import re

search_dir = "myzone-sfrc360/app"
patterns = [
    (r"82\.5", "Hardcoded 82.5 mark/attendance"),
    (r"EMP-DS-00[0-9]", "Hardcoded employee ID"),
    (r"24UDS00[0-9]", "Hardcoded register number"),
    (r"Subbulakshmi", "Hardcoded Subbulakshmi"),
    (r"Pushpavalli", "Hardcoded Pushpavalli"),
    (r"Dr\. K\. Anitha", "Hardcoded Dr. K. Anitha"),
    (r"Department of Data Science", "Hardcoded Data Science department fallback"),
    (r"\|\|\s*\[\s*\{", "Fallback mock array"),
]

findings = []
for root, dirs, files in os.walk(search_dir):
    for f in files:
        if f.endswith((".tsx", ".ts")):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                lines = file.readlines()
                for i, line in enumerate(lines, 1):
                    for pat, desc in patterns:
                        if re.search(pat, line, re.IGNORECASE):
                            findings.append((p, i, desc, line.strip()))

print(f"Total potential hardcoded instances found: {len(findings)}")
for f in findings:
    print(f"{f[0]}:{f[1]} [{f[2]}] -> {f[3][:100]}")
