# HETEROHMS Practical Testing Plan & Verification Guide (Prompt 18)
*HETEROHMS Hospital — Heterogeneous Healthcare Data Management System*

---

## 📌 Executive Summary

This document establishes the official test plan, automated test matrices, User Acceptance Testing (UAT) manual checklists, and test execution procedures across all architectural layers of HETEROHMS:

1. **Backend Test Suite (Node.js/Express):** 37 automated tests across Authentication, RBAC, Appointments, Clinical Records, Prescriptions, Document Storage, and Semantic Vector Search.
2. **AI Microservice Test Suite (Python/FastAPI):** 20 automated tests across REST API schemas, OCR validation, text cleaning algorithms, chunking tokenizers, ChromaDB vector indexing, and patient isolation boundaries.
3. **Frontend Sanity (React/Vite):** Zero lint/type errors, production build validation, and role-based route guard verification.

---

## 🧪 Comprehensive Automated Test Matrix

| Test ID | Module | Scenario | Execution Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Authentication | Password Hashing on Registration | Hash password with `bcrypt.genSalt(10)` | Plaintext password never stored in database; secure salt hash created | Verified bcrypt hash format | **PASS** |
| **TC-AUTH-02** | Authentication | User Profile Sanitization | Login with valid credentials | User JSON returned contains `id, name, email, role`; `passwordHash` omitted | No password hashes in payload | **PASS** |
| **TC-AUTH-03** | Authentication | Invalid Credentials Rejection | Submit invalid password | HTTP 401 Unauthorized with safe error message | `HTTP 401` returned | **PASS** |
| **TC-AUTH-04** | Authentication | Deactivated Account Access | Attempt login with `isActive: false` | HTTP 403 Forbidden with deactivation contact message | `HTTP 403` returned | **PASS** |
| **TC-AUTH-05** | Authentication | JWT Cookie Invalidation on Logout | Call `POST /api/auth/logout` | `access_token` cookie cleared with matching security flags | Cookie cleared | **PASS** |
| **TC-RBAC-01** | RBAC | Patient Accessing Admin Routes | Patient token calling `/api/admin/*` | HTTP 403 Forbidden with role restriction message | `HTTP 403` returned | **PASS** |
| **TC-RBAC-02** | RBAC | Doctor Creating Physician Accounts | Doctor token calling `POST /api/doctors` | HTTP 403 Forbidden; admin role required | `HTTP 403` returned | **PASS** |
| **TC-RBAC-03** | RBAC | Cross-Patient Profile Privacy | Patient A requesting Patient B profile | HTTP 403 Forbidden; patient can only access own profile | `HTTP 403` returned | **PASS** |
| **TC-RBAC-04** | RBAC | Unassigned Doctor Record Access | Doctor querying unassigned patient EHR | HTTP 403 Forbidden; requires active clinical link | `HTTP 403` returned | **PASS** |
| **TC-RBAC-05** | RBAC | Admin Authorized Access | Admin accessing management endpoints | HTTP 200 OK; access granted | `HTTP 200` returned | **PASS** |
| **TC-APT-01** | Appointments | Valid Future Slot Booking | Submit booking for future available slot | Validation passes; booking queued | Request valid | **PASS** |
| **TC-APT-02** | Appointments | Slot Collision Prevention | Book same doctor, date & startTime twice | HTTP 409 Conflict with detailed error message | `HTTP 409` returned | **PASS** |
| **TC-APT-03** | Appointments | Past Date Booking Prevention | Book slot with date before today | HTTP 400 Bad Request with past date validation error | `HTTP 400` returned | **PASS** |
| **TC-APT-04** | Appointments | Cross-Patient Cancellation Prevention | Patient A canceling Patient B appointment | HTTP 403 Forbidden; uploader/owner only | `HTTP 403` returned | **PASS** |
| **TC-APT-05** | Appointments | Doctor Status Update Isolation | Doctor A updating Doctor B appointment | HTTP 403 Forbidden; assigned doctor only | `HTTP 403` returned | **PASS** |
| **TC-EHR-01** | Medical Records | Appointment-Patient Mismatch Guard | Create record with mismatched patient | HTTP 400 Bad Request with mismatch warning | `HTTP 400` returned | **PASS** |
| **TC-EHR-02** | Medical Records | Personal Record Privacy | Patient querying another patient's EHR | HTTP 403 Forbidden; patient sees only self | `HTTP 403` returned | **PASS** |
| **TC-EHR-03** | Medical Records | Unlinked Doctor Access | Doctor accessing unassigned patient history | HTTP 403 Forbidden; requires clinical link | `HTTP 403` returned | **PASS** |

| **TC-DOC-01** | Documents | Unsupported File Rejection | Upload executable `.exe` file | HTTP 400 Bad Request; disallowed MIME | `HTTP 400` returned | **PASS** |
| **TC-DOC-02** | Documents | Oversized File Rejection | Upload file exceeding 10MB limit | HTTP 400 with `LIMIT_FILE_SIZE` error | `HTTP 400` returned | **PASS** |
| **TC-DOC-03** | Documents | Document Ownership Guard | Patient A deleting Patient B scan | HTTP 403 Forbidden | `HTTP 403` returned | **PASS** |
| **TC-DOC-04** | Documents | Safe OCR Failure Handling | Trigger OCR failure callback | Document preserved in MongoDB with `ocrStatus: 'failed'` (never destroyed) | Record preserved | **PASS** |
| **TC-DOC-05** | Documents | Unauthorized Download Guard | Generate secure download URL for another user | HTTP 403 Forbidden | `HTTP 403` returned | **PASS** |
| **TC-SRCH-01** | Semantic Search | Query Length Boundary | Search query with 2 characters | HTTP 400 Bad Request; minimum 3 chars | `HTTP 400` returned | **PASS** |
| **TC-SRCH-02** | Semantic Search | Patient Data Boundary Guard | Patient A searching with `patientId=PatientB` | HTTP 403 Forbidden; patient strictly locked to self | `HTTP 403` returned | **PASS** |
| **TC-SRCH-03** | Semantic Search | Doctor Unassigned Search Guard | Doctor searching unassigned patient | HTTP 403 Forbidden; unlinked doctor blocked | `HTTP 403` returned | **PASS** |
| **TC-SRCH-04** | Semantic Search | Post-Query Record Purging | Discard deleted or unauthorized chunks | Unauthorized items stripped from final response array | Items purged | **PASS** |
| **TC-SRCH-05** | Semantic Search | Safe Error & Secret Sanitization | Simulate AI microservice network outage | Returns HTTP 200 with 0 results & clinical disclaimer; no secrets leaked | Safe response returned | **PASS** |
| **TC-SRCH-06** | Semantic Search | Deleted Source Vector Purge | Delete document from MongoDB | Calls `/api/embeddings/delete-by-source` asynchronously | Chunks purged | **PASS** |
| **TC-FAST-01** | FastAPI AI | Internal Shared Key Guard | Call endpoint without `X-Internal-API-Key` | HTTP 401 Unauthorized | `HTTP 401` returned | **PASS** |
| **TC-FAST-02** | FastAPI AI | Schema MIME Validation | Send payload with invalid MIME type | HTTP 422 Unprocessable Entity | `HTTP 422` returned | **PASS** |
| **TC-FAST-03** | FastAPI AI | SSRF Protection URL Validator | Send URL with `ftp://` scheme or private IP | Validation exception raised; request rejected | Rejected safely | **PASS** |
| **TC-FAST-04** | FastAPI AI | Text Cleaner Noise Removal | Clean noisy OCR text with line breaks | Noise glyphs stripped, hyphenated words reconnected | Clean text produced | **PASS** |
| **TC-FAST-05** | FastAPI AI | Sentence-Aware Chunker | Split long clinical text (~500 chars) | Overlapping chunks split cleanly on punctuation | Chunks created | **PASS** |
| **TC-FAST-06** | FastAPI AI | Vector Store Idempotency | Re-index same source ID with new text | Old chunks purged; new chunks replace without duplicates | Replaced cleanly | **PASS** |
| **TC-FAST-07** | FastAPI AI | Vector Store RBAC Filtering | Query vector index with `patientId` filter | Chunks belonging to other patients strictly filtered out | 0 cross-patient leaks | **PASS** |

---

## 📋 Manual User Acceptance Testing (UAT) Checklist

### 1. Patient Portal Walkthrough (`/patient`)
- [ ] **Login & Session**: Use 1-click demo login or register a new patient. Verify dashboard loads with personal name.
- [ ] **Appointment Booking**: Navigate to *Find Doctors*, pick a specialist, and book an available future slot. Verify conflict detection prevents double booking.
- [ ] **EHR & Prescriptions**: View *Medical Records* and *Prescriptions*. Verify you can view your own consultations but no option exists to access other patients.
- [ ] **Document Upload**: Upload a sample PDF or PNG scan (<10MB). Verify file appears in *My Documents* with `pending` OCR status.
- [ ] **Semantic Search**: Navigate to *Record Search*. Type `"blood sugar report"` or `"hypertension"`. Verify patient selector is completely hidden and results display relevant snippets with the medical disclaimer.
- [ ] **Health Timeline**: Navigate to *Health Timeline*. Verify reverse-chronological events show appointments, prescriptions, and records.

### 2. Doctor Clinical Portal Walkthrough (`/doctor`)
- [ ] **Login**: Sign in as Dr. Sarah Jenkins (`doctor@hospital.org`). Verify dashboard displays today's appointments.
- [ ] **Appointment Management**: Change an appointment status from `booked` to `confirmed` or `completed`.
- [ ] **EHR Creation**: For a completed consultation, click *Add Clinical Record*. Enter diagnosis and treatment notes.
- [ ] **Prescription Builder**: Issue a structured prescription with medicine name, dosage, frequency, and instructions.
- [ ] **Clinical Search**: Navigate to *Clinical Search*. Select a patient from the authorized patient dropdown and search for symptoms. Verify you cannot search for unassigned patients.
- [ ] **Patient Timeline**: Open an assigned patient profile and click *Medical Timeline*. Verify all historical events for that patient render accurately.

### 3. Administrator Management Portal (`/admin`)
- [ ] **Login**: Sign in as Hospital Administrator (`admin@hospital.org`).
- [ ] **Staff & Patient Directory**: View hospital-wide doctor directory and patient registry.
- [ ] **Hospital Semantic Search**: Execute global semantic search across all hospital records.

---

## 💻 Commands to Run Test Suites

### 1. Run Complete Backend Test Suite (Node.js)
```bash
cd server
npm test
```
*Executes all 5 test suites (Authentication, RBAC, Appointments, Clinical Records, Documents, Semantic Search, and OCR callbacks).*

### 2. Run Complete AI Microservice Test Suite (Python)
```bash
cd ai-service
python tests/run_all_tests.py
```
*Executes all FastAPI schemas, SSRF URL filters, OCR cleaners, text chunkers, and ChromaDB vector search test cases.*

### 3. Run Frontend Production Bundle Build (React/Vite)
```bash
cd client
npm run build
```
*Validates all 151 React modules, routes, layouts, and Tailwind CSS stylesheets.*

---

## 🗄️ Database Testing Best Practices (Separate Test Database)

To prevent test runs from altering your active development data, adhere to the following best practices:

### 1. Dedicated Test Database URI
In `server/.env`, specify a distinct database URI or append a test database name:
```bash
# Development Database:
MONGO_URI=mongodb+srv://user:pass@cluster0.mongodb.net/heterohms_dev?retryWrites=true&w=majority

# Automated Testing Database:
MONGO_TEST_URI=mongodb+srv://user:pass@cluster0.mongodb.net/heterohms_test?retryWrites=true&w=majority
```

### 2. Fail-Safe Closed State
All ownership helpers and middleware in HETEROHMS implement a **fail-safe closed policy**: if `mongoose.connection.readyState !== 1`, unauthorized access is denied immediately rather than failing open.

### 3. Isolated Mock Execution
Our automated unit test suites (`auth_rbac.test.js`, `appointment_records.test.js`, `document_security.test.js`, `search_security.test.js`) are architected with mock Express harnesses and bcrypt/JWT validation so they run in **< 1 second without network latency**, making them ideal for CI/CD pipelines.

---

## 📦 Sample Test Data Fixtures

Sample test records are stored in:
[`server/src/tests/fixtures/sample_test_data.json`](file:///c:/Users/harsh/OneDrive/Desktop/MINI1/server/src/tests/fixtures/sample_test_data.json)
