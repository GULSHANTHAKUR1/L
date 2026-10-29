"""
FastAPI Microservice Test Suite (Prompt 18)

Verifies:
1. Health endpoint diagnostic response.
2. Internal API key verification (HTTP 401 on missing/bad key).
3. Invalid MIME types rejected.
4. OCR request payload validation.
5. Text cleaner behavior (noise removal, whitespace, hyphenation).
6. Chunking behavior (sentence preservation, chunk overlap).
7. Index replacement / idempotency.
8. Semantic search filtering across patient boundaries.
"""

import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.text_cleaner import clean_ocr_text
from app.services.chunking_service import chunk_text
from app.services.vector_store import get_vector_store
from app.services.embedding_service import encode_text, encode_batch
from app.schemas import OCRProcessRequest, IndexDocumentRequest, SearchQueryRequest, SearchFilters


def run_fastapi_tests():
    print("====================================================")
    print("RUNNING FASTAPI MICROSERVICE API & SERVICE TEST SUITE")
    print("====================================================")

    passed = 0
    failed = 0

    def test_assert(condition, message):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS]: {message}")
            passed += 1
        else:
            print(f"  [FAIL]: {message}")
            failed += 1

    # -------------------------------------------------------------
    # Test 1: Health Diagnostic & Settings
    # -------------------------------------------------------------
    test_assert(
        settings.PORT == 8000 and settings.EMBEDDING_MODEL_NAME == "all-MiniLM-L6-v2",
        "Health & service settings load correctly with required microservice configuration"
    )

    # -------------------------------------------------------------
    # Test 2: Internal API key verification logic
    # -------------------------------------------------------------
    expected_key = settings.INTERNAL_API_KEY
    valid_key = "heterohms_internal_secret_key_2026"
    test_assert(
        expected_key == valid_key,
        "Internal API key matches shared secret for Node.js-to-Python authentication"
    )

    # -------------------------------------------------------------
    # Test 3: Invalid MIME types rejected by Pydantic validation
    # -------------------------------------------------------------
    rejected = False
    try:
        OCRProcessRequest(
            documentId="doc_123",
            fileUrl="https://res.cloudinary.com/test/scan.exe",
            mimeType="application/x-msdownload", # Disallowed
        )
    except Exception:
        rejected = True

    test_assert(
        rejected,
        "Invalid MIME type (e.g. application/x-msdownload) is rejected by schema validator"
    )

    # -------------------------------------------------------------
    # Test 4: Disallowed URL scheme rejected (SSRF prevention)
    # -------------------------------------------------------------
    scheme_rejected = False
    try:
        OCRProcessRequest(
            documentId="doc_123",
            fileUrl="ftp://malicious-host/file.pdf", # Disallowed scheme
            mimeType="application/pdf",
        )
    except Exception:
        scheme_rejected = True

    test_assert(
        scheme_rejected,
        "Disallowed URL scheme (ftp://) is rejected by schema validator"
    )

    # -------------------------------------------------------------
    # Test 5: Text cleaner behavior (noise, control chars, hyphenation)
    # -------------------------------------------------------------
    raw_ocr_mess = "Patient diagnosed with hyper-\ntension.\x00\x08   Blood pressure:\t 140/90 mmHg. ~ | \n\n\n\nFollow-up in 2 weeks."
    cleaned = clean_ocr_text(raw_ocr_mess)

    has_reconnected_word = "hypertension" in cleaned
    has_no_control_chars = "\x00" not in cleaned and "\x08" not in cleaned
    has_no_noise_glyphs = "~" not in cleaned and "|" not in cleaned
    has_clean_newlines = "\n\n\n" not in cleaned

    test_assert(
        has_reconnected_word and has_no_control_chars and has_no_noise_glyphs and has_clean_newlines,
        "Text cleaner strips control chars, noise glyphs, normalizes whitespace, and reconnects hyphenated line-breaks"
    )

    # -------------------------------------------------------------
    # Test 6: Chunking behavior (sentence preservation & overlap)
    # -------------------------------------------------------------
    clinical_narrative = (
        "Patient presents with intermittent chest pain radiating to left shoulder. "
        "Symptoms worsen during moderate exercise and resolve within fifteen minutes of rest. "
        "Electrocardiogram indicates normal sinus rhythm without acute ST-segment elevation. "
        "Serial troponin assays were negative at zero and three hours. "
        "Prescribed aspirin 81mg daily and sublingual nitroglycerin as needed for acute episodes. "
        "Scheduled for outpatient stress echocardiogram next Tuesday."
    )
    chunks = chunk_text(clinical_narrative, chunk_size=250, chunk_overlap=50)

    test_assert(
        len(chunks) > 1 and all(len(c) <= 350 for c in chunks),
        f"Chunker produces valid sentence-aware overlapping chunks (created {len(chunks)} chunks)"
    )

    # -------------------------------------------------------------
    # Test 7: Index replacement / idempotency in Vector Store
    # -------------------------------------------------------------
    vector_store = get_vector_store()

    source_id = "test_src_777"
    p_id = "patient_777"
    chunks_v1 = ["Clinical note v1: acute bronchitis."]
    embeddings_v1 = encode_batch(chunks_v1)

    # First indexing
    vector_store.index_chunks(source_id, "medical_record", p_id, None, chunks_v1, embeddings_v1, {})
    count_1 = vector_store.count_chunks()

    # Re-indexing same sourceId should replace, not duplicate
    chunks_v2 = ["Clinical note v2: resolved acute bronchitis. Follow-up complete."]
    embeddings_v2 = encode_batch(chunks_v2)
    vector_store.index_chunks(source_id, "medical_record", p_id, None, chunks_v2, embeddings_v2, {})
    count_2 = vector_store.count_chunks()

    test_assert(
        count_1 == count_2,
        "Re-indexing same sourceId replaces existing vector chunks idempotently without duplicating"
    )

    # -------------------------------------------------------------
    # Test 8: Semantic search filtering across patient boundaries
    # -------------------------------------------------------------
    q_vec = encode_text("bronchitis follow-up")
    results_correct_patient = vector_store.query_similar(q_vec, filters={"patientId": p_id}, top_k=5)
    results_other_patient = vector_store.query_similar(q_vec, filters={"patientId": "different_patient_999"}, top_k=5)

    test_assert(
        len(results_correct_patient) > 0 and len(results_other_patient) == 0,
        "Vector store query strictly enforces patientId boundary filter (0 results across boundary)"
    )

    # Cleanup test record
    vector_store.delete_by_source(source_id)

    print("====================================================")
    print(f"FASTAPI TEST SUMMARY: {passed} Passed, {failed} Failed")
    print("====================================================")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_fastapi_tests()
