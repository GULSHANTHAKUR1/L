# HETEROHMS Project Structure & Architecture Guide
*HETEROHMS Hospital — Heterogeneous Healthcare Data Management System*

This guide explains exactly how the codebase is categorized, how to distinguish **Frontend**, **Backend**, and **AI Service** code, and where every file is located.

---

## 🗺️ High-Level Monorepo Overview

Your project is structured as a professional full-stack monorepo with 3 dedicated application folders:

```text
MINI1/ (Project Root)
│
├── 📁 client/         👉 FRONTEND (User Interface & Browser Views)
├── 📁 server/         👉 BACKEND (Node.js REST API & Database Logic)
├── 📁 ai-service/     👉 AI / OCR SERVICE (Python FastAPI Microservice)
├── 📁 docs/           👉 PROJECT DOCUMENTATION & BLUEPRINTS
└── 📄 README.md       👉 Setup & Installation Guide
```

---

## 1. 🖥️ Frontend Folder (`client/`)

> **What it does:** Everything the user sees, clicks, and interacts with in Google Chrome / web browser.
> **Tech Stack:** React 18, Vite, Tailwind CSS, React Router v6, Axios.
> **Port:** `http://localhost:5175/`

### Directory Breakdown (`client/src/`):

```text
client/src/
│
├── 📁 pages/                      # All Web Pages & Screens
│   ├── 📁 public/                 # Publicly accessible pages
│   │   ├── LandingPage.jsx        # HETEROHMS Hospital Landing Page
│   │   ├── LoginPage.jsx          # Login form with 1-click demo access
│   │   ├── RegisterPage.jsx       # Patient registration form
│   │   ├── UnauthorizedPage.jsx   # 403 Access Denied screen
│   │   └── NotFoundPage.jsx       # 404 Page Not Found screen
│   │
│   ├── 📁 patient/                # Prompt 12: Patient Portal (12 Pages)
│   │   ├── PatientDashboard.jsx   # Next visit, active Rx, bills alert, quick actions
│   │   ├── PatientProfile.jsx     # Demographics, emergency contact, allergy tags
│   │   ├── DoctorDirectory.jsx    # Specialist search & specialty filter chips
│   │   ├── DoctorProfileView.jsx  # Doctor credentials, biography & schedule
│   │   ├── BookAppointment.jsx    # Atomic conflict-free slot picker
│   │   ├── PatientAppointments.jsx # Booking history, filters & cancellation modal
│   │   ├── PatientAppointmentDetail.jsx # Detailed appointment receipt card
│   │   ├── PatientMedicalRecords.jsx # Personal EHR timeline, vitals & diagnosis
│   │   ├── PatientPrescriptions.jsx  # Medication charts, dosage & printable Rx
│   │   ├── PatientDocuments.jsx   # 10MB medical file upload & OCR status
│   │   └── PatientSearch.jsx      # Natural language record search + medical disclaimer
│   │
│   ├── 📁 doctor/                 # Prompt 11: Doctor Clinical Portal (12 Pages)
│   │   ├── DoctorDashboard.jsx    # Today's appointments, clinical metrics & quick links
│   │   ├── DoctorAppointments.jsx # Filterable appointment consultations list
│   │   ├── DoctorAppointmentDetail.jsx # Clinical notes, status updates & actions
│   │   ├── DoctorPatientList.jsx  # Assigned patient directory & medical quick glance
│   │   ├── DoctorPatientDetail.jsx# Complete patient EHR, past Rx & visit history
│   │   ├── CreateMedicalRecord.jsx# Diagnosis, vitals, symptoms & treatment form
│   │   ├── MedicalRecordDetail.jsx# Clinical record viewer
│   │   ├── CreatePrescription.jsx # Dynamic prescription builder (dosage, food timing)
│   │   ├── PrescriptionDetail.jsx # Official printable doctor prescription
│   │   ├── DoctorSchedule.jsx     # Weekly shift hours & slot generator
│   │   ├── DoctorDocuments.jsx    # Clinical scan review & OCR text inspector
│   │   └── DoctorSearch.jsx       # Semantic EHR search across assigned patients
│   │
│   └── 📁 admin/                  # Prompt 10: Admin Management Portal (10 Pages)
│       ├── AdminDashboard.jsx     # High-level hospital statistics & recent records
│       ├── DoctorList.jsx         # Doctor directory with department filtering & status toggles
│       ├── CreateDoctor.jsx       # Onboarding form for new physicians
│       ├── EditDoctor.jsx         # Update doctor specialization & consultation fees
│       ├── PatientList.jsx        # Master patient registry with search
│       ├── PatientDetail.jsx      # Full patient medical file & administrative summary
│       ├── AppointmentList.jsx    # Hospital-wide appointment schedule ledger
│       ├── DocumentList.jsx       # Master repository of all medical uploads
│       └── AdminAnalytics.jsx     # Revenue, department load & patient demographic charts
│
├── 📁 search/                     # Prompt 17: Role-Adaptive Semantic Search
│   └── SearchPage.jsx             # /admin/search, /doctor/search, /patient/search
│
├── 📁 timeline/                   # Prompt 17: Chronological Medical Timeline
│   └── PatientTimelinePage.jsx    # /admin/patients/:id/timeline, /doctor/patients/:id/timeline, /patient/timeline
│
├── 📁 components/                 # Reusable UI Building Blocks
│   ├── 📁 search/                 # Prompt 17: Semantic Search Engine
│   │   └── SemanticSearch.jsx     # Debounced input, role filters, skeletons, safe result cards
│   │
│   ├── 📁 timeline/               # Prompt 17: Chronological Timeline
│   │   └── Timeline.jsx           # Vertical responsive cards with event-type badges & summary chips
│   │
│   ├── 📁 common/                 # Shared components (Header, Sidebar, Modals, Spinners, Badges)
│   └── 📁 routing/                # ProtectedRoute.jsx, RoleRoute.jsx (Access Control)
│
├── 📁 context/                    # Global State Providers
│   ├── AuthContext.jsx            # User login state, role-based access, demo sessions
│   └── ToastContext.jsx           # Global popup notifications (Success/Error toasts)
│
├── 📁 layouts/                    # Layout Shells
│   ├── DashboardLayout.jsx        # Top Header + Left Sidebar + Main Content shell
│   ├── PublicLayout.jsx           # Public navbar + footer shell
│   ├── AdminLayout.jsx            # Admin-restricted layout wrapper
│   ├── DoctorLayout.jsx           # Doctor-restricted layout wrapper
│   └── PatientLayout.jsx          # Patient-restricted layout wrapper
│
├── 📁 api/                        # HTTP Client
│   └── axios.js                   # Base Axios instance with credentials & error handling
│
├── App.jsx                        # Master Route Switchboard & Navigation Tree
├── main.jsx                       # React DOM entry point
└── index.css                      # Global Tailwind CSS directives & custom styling
```

---

## 2. ⚙️ Backend Folder (`server/`)

> **What it does:** The backend server running behind the scenes. It receives requests from the frontend, enforces authentication, queries MongoDB, checks appointment conflicts, and returns JSON data.
> **Tech Stack:** Node.js, Express, MongoDB (Mongoose), JWT, Cloudinary SDK.
> **Port:** `http://localhost:5000/`

### Directory Breakdown (`server/src/`):

```text
server/src/
│
├── 📁 models/                     # Database Schemas (Mongoose / MongoDB Collections)
│   ├── User.js                    # Base user credentials & roles (admin, doctor, patient)
│   ├── DoctorProfile.js           # Specialization, qualifications, consultation fee, shifts
│   ├── PatientProfile.js          # Demographics, blood group, emergency contacts, allergies
│   ├── Appointment.js             # Date, slot, doctor, patient, status (booked, confirmed, cancelled)
│   ├── MedicalRecord.js           # Diagnosis, symptoms, vitals, clinical observations
│   ├── Prescription.js            # Structured medicines, dosage, frequency, instructions
│   ├── Bill.js                    # Line items (consultation, lab, pharmacy), discounts, payment status
│   ├── Document.js                # Cloudinary URL, file type, OCR extracted text, category
│   └── Notification.js            # In-app alerts, reminders & updates
│
├── 📁 controllers/                # Business Logic Functions
│   ├── authController.js          # Register, Login, Logout, Refresh, GetCurrentUser
│   ├── doctorController.js        # Doctor CRUD, schedule shifts, availability query
│   ├── patientController.js       # Patient profile updates, assigned doctors
│   ├── appointmentController.js   # Atomic conflict check, booking, cancellations
│   ├── medicalRecordController.js # EHR creation, update & index triggers, deletion purge
│   ├── prescriptionController.js  # Prescription issuance, index triggers, deletion purge
│   ├── documentController.js      # Cloudinary upload streaming, OCR dispatch, vector purge
│   ├── searchController.js        # Prompt 16: Role-authorized semantic search & patient timeline
│   ├── notificationController.js  # Read/unread status, alert polling
│   └── analyticsController.js     # Admin revenue & patient volume aggregation
│
├── 📁 routes/                     # API Endpoints (URL Routes)
│   ├── authRoutes.js              # /api/auth
│   ├── doctorRoutes.js            # /api/doctors
│   ├── patientRoutes.js           # /api/patients
│   ├── appointmentRoutes.js       # /api/appointments
│   ├── medicalRecordRoutes.js     # /api/medical-records (CRUD & purge)
│   ├── prescriptionRoutes.js      # /api/prescriptions (CRUD & purge)
│   ├── documentRoutes.js          # /api/documents
│   ├── searchRoutes.js            # Prompt 16: /api/search/semantic & /api/search/timeline
│   ├── internalRoutes.js          # Prompt 14: /api/internal/ocr-result (Webhook)
│   └── notificationRoutes.js      # /api/notifications
│
├── 📁 middleware/                 # Interceptors & Security Guards
│   ├── authMiddleware.js          # JWT verification & HTTP-only cookie validation
│   ├── authorizeRoles.js          # RBAC verification (admin, doctor, patient)
│   ├── errorMiddleware.js         # Centralized JSON error response handler
│   └── uploadMiddleware.js        # Multer in-memory streaming validator
│
├── 📁 services/                   # Heavyweight Business Engines
│   ├── semanticSearchIntegrationService.js # Prompt 16: Microservice client & non-blocking indexing
│   ├── ocrIntegrationService.js   # Prompt 14: Non-blocking OCR dispatch & callback handler
│   └── appointmentConflictEngine.js # Atomic slot collision prevention
│
├── 📁 tests/                      # Automated Unit & Security Test Suites (npm test)
│   ├── run_all_tests.js           # Prompt 18: Master test runner across all 5 test suites
│   ├── auth_rbac.test.js          # Prompt 18: 11 Authentication & RBAC security test cases
│   ├── appointment_records.test.js# Prompt 18: 8 Appointment & clinical records tests
│   ├── document_security.test.js  # Prompt 18: 5 Document storage & ownership test cases
│   ├── search_security.test.js    # Prompt 16: 8 Semantic search & patient boundary tests
│   ├── ocr_integration_test.js    # Prompt 14: 5 Webhook callback & idempotency tests
│   └── 📁 fixtures/               # Sample JSON test data fixtures
│       └── sample_test_data.json  # Mock users, appointments, records, Rx, bills, docs
│
├── 📁 config/                     # Environment & Service Credentials
│   ├── db.js                      # MongoDB connection pool & error handling
│   └── cloudinary.js              # Cloudinary API configuration
│
└── server.js                      # Master Express App entry point (Starts server on port 5000)
```

---

## 3. 🧠 AI / OCR Microservice Folder (`ai-service/`)

> **What it does:** Independent Python microservice for intensive AI tasks, completely decoupled from Node.js so it never slows down the main backend.
> **Tech Stack:** Python 3.10+, FastAPI, Uvicorn, Tesseract OCR, Sentence-Transformers (`all-MiniLM-L6-v2`).
> **Port:** `http://localhost:8000/`

```text
ai-service/
├── app/
│   ├── main.py                        # FastAPI application entry point
│   ├── config.py                      # Pydantic v2 application settings
│   ├── schemas.py                     # Strict request/response Pydantic models
│   ├── routers/
│   │   ├── health.py                  # GET /api/health
│   │   ├── ocr.py                     # POST /api/ocr/process & /api/ocr/callback
│   │   └── semantic_search.py         # POST /api/embeddings/index, /query, /delete-by-source
│   ├── services/
│   │   ├── ocr_service.py             # Tesseract wrapper & pipeline
│   │   ├── chunking_service.py        # Sentence-aware chunker (~500 chars, ~100 overlap)
│   │   ├── embedding_service.py       # all-MiniLM-L6-v2 384-dim dense vectors
│   │   ├── vector_store.py            # ChromaDB persistent store + Memory fallback
│   │   └── semantic_search_service.py # Natural language search orchestrator
│   └── utils/
│       └── security.py                # X-Internal-API-Key validator
├── tests/
│   ├── run_all_tests.py               # Prompt 18: Master AI test runner across all test suites
│   ├── test_api_suite.py              # Prompt 18: 8 FastAPI configuration, schema, cleaner & security tests
│   └── test_semantic_search.py        # Prompt 15/18: 12 chunking, vector store, and search isolation tests
├── requirements.txt                   # FastAPI, ChromaDB, Sentence-Transformers
└── .env.example                       # AI microservice environment variables
```

### What AI microservice handles:
1. **OCR Extraction (Prompt 13):** Reads text from uploaded doctor prescriptions, discharge summaries, and lab reports using Tesseract OCR.
2. **Clinical Semantic Search (Prompt 15):** Generates 384-dimensional vector embeddings so doctors and patients can search their records using natural language queries (e.g., *"chest pain after exertion"*).
3. **Node Authorized Integration (Prompt 16):** Responds to Node's strict RBAC requests with verified candidate chunks and mandatory non-diagnostic disclaimers.

---

## 🔄 How the Parts Communicate (Data Flow)

```mermaid
graph TD
    User["👤 User (Browser)"]
    Frontend["🖥️ FRONTEND (client/)<br/>React 18 + Vite (Port 5175)"]
    Backend["⚙️ BACKEND (server/)<br/>Node.js + Express (Port 5000)"]
    Database[("🗄️ DATABASE<br/>MongoDB")]
    Cloudinary["☁️ Cloud Storage<br/>Cloudinary (Medical Scans)"]
    AiService["🧠 AI MICROSERVICE (ai-service/)<br/>Python FastAPI (Port 8000)"]

    User -->|Interacts with UI| Frontend
    Frontend -->|Sends API Requests (Axios)| Backend
    Backend -->|Reads / Writes Data| Database
    Backend -->|Uploads X-Rays & PDFs| Cloudinary
    Backend -->|Sends documents for OCR & Embeddings| AiService
    AiService -->|Returns extracted text & vectors| Backend
    Backend -->|Returns JSON data| Frontend
    Frontend -->|Renders UI & Dashboards| User
```

---

## ⚡ Quick Reference: How to tell where any file belongs

| File Type / Extension | Where is it? | Role |
| :--- | :--- | :--- |
| `.jsx` files (e.g. `PatientDashboard.jsx`, `Header.jsx`) | `client/src/` | **Frontend** (React visual component) |
| `.css` files (e.g. `index.css`) | `client/src/` | **Frontend** (Styling) |
| `vite.config.js`, `tailwind.config.js` | `client/` | **Frontend** (Build config) |
| `models/*.js` (e.g. `Appointment.js`) | `server/src/` | **Backend** (Database tables/collections) |
| `controllers/*.js` (e.g. `authController.js`) | `server/src/` | **Backend** (Server logic) |
| `routes/*.js` (e.g. `appointmentRoutes.js`) | `server/src/` | **Backend** (API endpoints) |
| `server.js` | `server/src/` | **Backend** (Express server) |
| `main.py`, `requirements.txt` | `ai-service/` | **AI Service** (Python microservice) |
