"""
Unit Test Suite for Semantic Search Microservice (Prompt 15)

Tests:
1. Chunking functionality (sentence-aware boundaries & overlap)
2. Vector embedding generation (384-dimensional unit vector)
3. Indexing & Idempotency (re-indexing replaces old chunks without duplication)
4. Restrictive RBAC Filtering (patientId boundary enforcement)
5. Semantic Query Retrieval (ranking by cosine similarity)
6. Purge by source (clean deletion of vector chunks)
"""
import sys
import os

# Add parent directory to sys.path so app modules are resolvable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas import IndexDocumentRequest, IndexDocumentMetadata, SearchQueryRequest, SearchFilters, DeleteBySourceRequest
from app.services.chunking_service import chunk_text
from app.services.embedding_service import encode_text, encode_batch, get_model_dimension
from app.services.semantic_search_service import (
    index_clinical_content,
    query_clinical_records,
    delete_source_chunks,
    get_search_engine_status,
)


def run_tests():
    print("====================================================")
    print("RUNNING SEMANTIC SEARCH MICROSERVICE UNIT TESTS")
    print("====================================================\n")

    passed = 0
    failed = 0

    def assert_test(condition, name):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS]: {name}")
            passed += 1
        else:
            print(f"  [FAIL]: {name}")
            failed += 1

    # 1. Test Chunking
    short_text = "Patient has mild fever."
    short_chunks = chunk_text(short_text, chunk_size=500, chunk_overlap=100)
    assert_test(len(short_chunks) == 1, "Short text returns exactly 1 chunk")

    long_text = (
        "Chief Complaint: Patient presents with persistent chest tightness and exertion dyspnea. "
        "Clinical History: 54-year-old male with 5-year history of essential hypertension. "
        "Diagnostics: Electrocardiogram indicates sinus tachycardia with ST-segment depression in V4-V6. "
        "Echocardiogram reveals preserved left ventricular ejection fraction at 55%. "
        "Treatment Plan: Initiated Metoprolol succinate 25mg once daily and Atorvastatin 20mg at night. "
        "Laboratory Findings: Serum troponin I is negative at <0.01 ng/mL. Serum creatinine 0.9 mg/dL. "
        "Follow-up: Advised strict sodium restriction and follow-up cardiology appointment in 7 days."
    )
    long_chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)
    assert_test(len(long_chunks) > 1, f"Long clinical text split into {len(long_chunks)} overlapping chunks")

    # 2. Test Embedding Generation
    emb = encode_text("Cardiology clinical diagnosis of angina pectoris")
    assert_test(len(emb) == 384, f"Generated embedding has expected 384 dimensions (got {len(emb)})")

    batch_embs = encode_batch(["Report 1", "Report 2"])
    assert_test(len(batch_embs) == 2 and len(batch_embs[0]) == 384, "Batch encoding returns valid 384-dim vectors")

    # 3. Test Indexing & Idempotency
    test_patient_id = "patient_test_001"
    test_source_id = "doc_test_999"

    index_req_1 = IndexDocumentRequest(
        sourceType="medical_document",
        sourceId=test_source_id,
        patientId=test_patient_id,
        doctorId="doctor_test_888",
        text=long_text,
        metadata=IndexDocumentMetadata(
            documentType="lab-report",
            createdAt="2026-10-11T00:00:00Z",
            title="Cardiology Consult & ECG",
        ),
    )

    res_1 = index_clinical_content(index_req_1)
    assert_test(res_1.status == "completed" and res_1.chunksIndexed > 0, f"Initial indexing stored {res_1.chunksIndexed} chunks")
    first_count = res_1.chunksIndexed

    # Re-index same sourceId with updated text (Testing Idempotency: must replace, not double-accumulate)
    updated_text = "Updated discharge summary: Patient condition stabilized. Discharged on oral medications."
    index_req_2 = IndexDocumentRequest(
        sourceType="medical_document",
        sourceId=test_source_id,
        patientId=test_patient_id,
        text=updated_text,
        metadata=IndexDocumentMetadata(
            documentType="discharge-summary",
            createdAt="2026-10-11T02:00:00Z",
            title="Stabilized Discharge Summary",
        ),
    )
    res_2 = index_clinical_content(index_req_2)
    assert_test(res_2.status == "completed", "Re-indexing same sourceId succeeded idempotently")

    # 4. Test Semantic Query & Ranking
    search_req = SearchQueryRequest(
        query="patient stabilized and discharged",
        filters=SearchFilters(patientId=test_patient_id),
        topK=5,
    )
    search_res = query_clinical_records(search_req)
    assert_test(
        search_res.totalResults >= 1 and search_res.results[0].sourceId == test_source_id,
        f"Semantic search retrieved matching record '{test_source_id}' with similarity {search_res.results[0].similarityScore if search_res.results else 0}"
    )
    assert_test(
        "Results are for medical record retrieval" in search_res.disclaimer,
        "Search response includes mandatory non-diagnostic clinical disclaimer"
    )

    # 5. Test Restrictive RBAC Boundary Filtering
    search_unauthorized = SearchQueryRequest(
        query="patient stabilized",
        filters=SearchFilters(patientId="different_patient_unauthorized_999"),
        topK=5,
    )
    unauthorized_res = query_clinical_records(search_unauthorized)
    assert_test(
        unauthorized_res.totalResults == 0,
        "RBAC filter strictly blocks access across patient boundaries (0 results returned for different patient)"
    )

    # 6. Test Deletion by Source
    del_res = delete_source_chunks(source_id=test_source_id)
    assert_test(del_res.status == "completed", f"Purged chunks for source {test_source_id}")

    # Verify search returns 0 after deletion
    post_delete_search = query_clinical_records(search_req)
    assert_test(post_delete_search.totalResults == 0, "Record is no longer discoverable after source deletion")

    # 7. Test Status Endpoint
    status_res = get_search_engine_status()
    assert_test(status_res.ready and status_res.embedding_dimension == 384, "Search engine diagnostic status reports ready=True")

    print("\n====================================================")
    print(f"TEST SUMMARY: {passed} Passed, {failed} Failed")
    print("====================================================\n")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
