# HETEROHMS AI & Semantic Search Microservice

*Standalone Python FastAPI Microservice for Heterogeneous Clinical Documents OCR & Semantic Vector Search*

---

## 🎯 Purpose & Scope

The **HETEROHMS AI Microservice** provides two core capabilities:
1. **Clinical Document OCR Extraction:** Extracts raw text from authorized uploaded medical files (prescriptions, clinical discharge summaries, laboratory reports, and digital scans).
2. **Clinical Semantic Search:** Performs meaning-based retrieval across OCR-extracted medical documents, medical-record text, diagnosis, treatment notes, prescription notes, and follow-up information using sentence-transformers (`all-MiniLM-L6-v2`) and ChromaDB vector indexing.

> ⚠️ **Important Clinical Notice:**  
> This service **does not diagnose medical conditions**, recommend medications, or make clinical decisions. It is strictly an **information retrieval and indexing engine** designed to help authorized clinicians and patients locate relevant health records.

---

## 📁 Folder Structure

```text
ai-service/
├── app/
│   ├── main.py                  # FastAPI app assembly, CORS, lifespan model loader & handlers
│   ├── config.py                # Environment settings, Tesseract PATH, & ChromaDB config
│   ├── schemas.py               # Pydantic request and response schemas (OCR & Vector Search)
│   ├── routers/
│   │   ├── health.py            # GET /health diagnostic check (OCR, Model, Vector Store)
│   │   ├── ocr.py               # POST /api/ocr/process endpoint
│   │   └── semantic_search.py   # Indexing, Semantic Query, Purge & Status endpoints
│   ├── services/
│   │   ├── file_processor.py    # 10MB streaming file downloader with safe timeouts
│   │   ├── ocr_service.py       # Tesseract image/PDF OCR engine & callback hook
│   │   ├── text_cleaner.py      # Noise removal, whitespace & line-break normalization
│   │   ├── chunking_service.py  # Sentence-aware overlapping chunking (~500 chars, ~100 overlap)
│   │   ├── embedding_service.py # all-MiniLM-L6-v2 384-dimensional dense vector embeddings
│   │   ├── vector_store.py      # ChromaDB persistent store with VectorStoreBase abstraction
│   │   └── semantic_search_service.py # Query orchestration, RBAC filters, & clinical disclaimer
│   └── utils/
│       └── security.py          # Shared X-Internal-API-Key guard & SSRF URL validator
├── tests/
│   └── test_semantic_search.py  # Comprehensive unit test suite (12 tests, 0 failures)
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment configuration template
├── Dockerfile                   # Production Docker image with Tesseract system dependencies
└── README.md                    # Setup and operational documentation
```

---

## 🚀 Local Installation & Setup

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Tesseract OCR Engine** (for OCR features):
  - **Windows**: Install from [UB-Mannheim Tesseract installer](https://github.com/UB-Mannheim/tesseract/wiki) to `C:\Program Files\Tesseract-OCR\tesseract.exe`.
  - **macOS**: `brew install tesseract`
  - **Linux**: `sudo apt-get install tesseract-ocr tesseract-ocr-eng`

---

### 2. Python Environment Setup

Navigate to the `ai-service` directory:
```bash
cd ai-service
```

Create and activate a virtual environment:
- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

---

### 3. Environment Configuration

Copy the template configuration file:
```bash
cp .env.example .env
```

Review variables in `.env`:
```env
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
INTERNAL_API_KEY=heterohms_internal_secret_key_2026
NODE_BACKEND_CALLBACK_URL=http://localhost:5000/api/v1/internal/ocr-callback
MAX_FILE_SIZE_MB=10
DOWNLOAD_TIMEOUT_SECONDS=30
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
CHROMA_PERSIST_DIRECTORY=data/chromadb
```

---

### 4. Running the Microservice

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(Or simply run: `python main.py`)*

- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Endpoint:** `http://localhost:8000/health`
- **Search Engine Status:** `http://localhost:8000/api/semantic-search/status`

---

## 📡 API Endpoints Reference

All endpoints (except `/health` and `/docs`) require the `X-Internal-API-Key` header.

### 1. `GET /health`
Returns health vitality of OCR, Embedding Model, and ChromaDB vector store.
```json
{
  "status": "ok",
  "service": "heterohms-ai-microservice",
  "tesseract_available": true,
  "embedding_model_ready": true,
  "vector_store_ready": true,
  "version": "1.1.0",
  "timestamp": "2026-10-11T03:40:00Z"
}
```

---

### 2. `POST /api/embeddings/index`
Chunks, embeds, and indexes medical text into ChromaDB. Re-indexing the same `sourceId` automatically purges old chunks to guarantee idempotency.

**Request Headers:**
`X-Internal-API-Key: heterohms_internal_secret_key_2026`

**Request Body:**
```json
{
  "sourceType": "medical_document",
  "sourceId": "652431289abcdef012345678",
  "patientId": "652430000patient12345678",
  "doctorId": "652430000doctor12345678",
  "text": "Echocardiogram reveals preserved left ventricular ejection fraction at 55%. Normal valves.",
  "metadata": {
    "documentType": "lab-report",
    "createdAt": "2026-10-11T00:00:00Z",
    "title": "Echocardiogram Diagnostic Report"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "completed",
  "sourceId": "652431289abcdef012345678",
  "sourceType": "medical_document",
  "chunksIndexed": 1,
  "message": "Indexed 1 clinical chunks successfully."
}
```

---

### 3. `POST /api/semantic-search/query`
Performs cosine similarity retrieval matching the natural language query against indexed chunks, scoped strictly by patient/doctor filters.

**Request Headers:**
`X-Internal-API-Key: heterohms_internal_secret_key_2026`

**Request Body:**
```json
{
  "query": "heart ventricular function",
  "filters": {
    "patientId": "652430000patient12345678",
    "documentType": "lab-report"
  },
  "topK": 5
}
```

**Response (200 OK):**
```json
{
  "query": "heart ventricular function",
  "totalResults": 1,
  "results": [
    {
      "sourceType": "medical_document",
      "sourceId": "652431289abcdef012345678",
      "patientId": "652430000patient12345678",
      "doctorId": "652430000doctor12345678",
      "documentType": "lab-report",
      "date": "2026-10-11T00:00:00Z",
      "title": "Echocardiogram Diagnostic Report",
      "snippet": "Echocardiogram reveals preserved left ventricular ejection fraction at 55%. Normal valves.",
      "similarityScore": 0.8142
    }
  ],
  "disclaimer": "Results are for medical record retrieval and information index access only. This service does not diagnose medical conditions or recommend treatments."
}
```

---

### 4. `POST /api/embeddings/delete-by-source`
Purges all indexed chunks belonging to a deleted or modified record.

**Request Body:**
```json
{
  "sourceId": "652431289abcdef012345678",
  "sourceType": "medical_document"
}
```

---

### 5. `GET /api/semantic-search/status`
Returns model dimension, storage type, and total indexed chunks.

---

## 🧪 Unit Testing

Run the included standalone unit test suite:
```bash
python tests/test_semantic_search.py
```
**Test Results:**
```text
====================================================
RUNNING SEMANTIC SEARCH MICROSERVICE UNIT TESTS
====================================================

  [PASS]: Short text returns exactly 1 chunk
  [PASS]: Long clinical text split into 6 overlapping chunks
  [PASS]: Generated embedding has expected 384 dimensions (got 384)
  [PASS]: Batch encoding returns valid 384-dim vectors
  [PASS]: Initial indexing stored 2 chunks
  [PASS]: Re-indexing same sourceId succeeded idempotently
  [PASS]: Semantic search retrieved matching record with similarity
  [PASS]: Search response includes mandatory non-diagnostic clinical disclaimer
  [PASS]: RBAC filter strictly blocks access across patient boundaries
  [PASS]: Purged chunks for source
  [PASS]: Record is no longer discoverable after source deletion
  [PASS]: Search engine diagnostic status reports ready=True

====================================================
TEST SUMMARY: 12 Passed, 0 Failed
====================================================
```
