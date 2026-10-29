"""
Master Python Test Runner for HETEROHMS AI Microservice (Prompt 18)

Runs all microservice unit and API suites:
1. FastAPI API & Schema Suite (8 tests)
2. Semantic Search, Vector Store & Chunking Suite (12 tests)
"""

import subprocess
import sys
import os

suites = [
    ("1. FastAPI API, Validation & Cleaning Suite", "test_api_suite.py"),
    ("2. Semantic Search & Vector Embeddings Suite", "test_semantic_search.py"),
]

def run_all():
    print("\n=============================================================")
    print("[AI-SERVICE] HETEROHMS AI MICROSERVICE MASTER TEST RUNNER")
    print("=============================================================\n")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    all_passed = True

    for name, script_file in suites:
        script_path = os.path.join(current_dir, script_file)
        ret = subprocess.call([sys.executable, script_path])
        if ret != 0:
            all_passed = False

    print("\n=============================================================")
    print("AI SERVICE MASTER SCORECARD")
    print("=============================================================")
    for name, _ in suites:
        status = "[PASS]" if all_passed else "[INFO]"
        print(f"  {status} {name}")
    print("=============================================================")

    if all_passed:
        print("[SUCCESS] ALL AI MICROSERVICE TEST SUITES PASSED!")
        print("=============================================================\n")
        sys.exit(0)
    else:
        print("[FAILURE] SOME TEST SUITES ENCOUNTERED ERRORS.")
        print("=============================================================\n")
        sys.exit(1)

if __name__ == "__main__":
    run_all()
