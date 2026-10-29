# HETEROHMS — Monorepo

*Heterogeneous Healthcare Data Management and Intelligent Hospital Management System*

HETEROHMS is a scalable, full-stack healthcare platform designed to unify heterogeneous clinical data (EHRs, prescriptions, X-rays, lab reports) with atomic appointment conflict prevention and decoupled AI/OCR microservices.

---

## Architecture Overview

For a detailed file-by-file breakdown, see the [Project Structure Guide](PROJECT_STRUCTURE_GUIDE.md).

```text
MINI1/
├── client/        👉 FRONTEND (React 18 + Vite + Tailwind CSS, Port: 5175)
├── server/        👉 BACKEND (Node.js + Express + MongoDB, Port: 5000)
├── ai-service/    👉 AI / OCR SERVICE (Python FastAPI Microservice, Port: 8000)
├── docs/          👉 ARCHITECTURE & BLUEPRINTS
└── PROJECT_STRUCTURE_GUIDE.md  👉 Complete file-by-file explanation
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.10 or higher
- **MongoDB**: MongoDB Atlas connection string or local MongoDB instance

---

## Getting Started (Local Development)

### 1. Server Setup (`server`)

1. Open a terminal and navigate to `server`:
   ```bash
   cd server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   *(Update `MONGO_URI`, `PORT`, and secrets as required).*
4. (Optional) Seed demo database:
   ```bash
   npm run seed
   ```
5. Run in development mode (with hot-reload via `nodemon`):
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`. Health route: `http://localhost:5000/health`.

---

### 2. Client Setup (`client`)

1. Open a second terminal and navigate to `client`:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be accessible at `http://localhost:5173`.

---

### 3. AI Microservice Setup (`ai-service`)

1. Open a third terminal and navigate to `ai-service`:
   ```bash
   cd ai-service
   ```
2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The AI microservice will run on `http://localhost:8000`. Health route: `http://localhost:8000/health`.
   Interactive Swagger docs: `http://localhost:8000/docs`.

---

## Service Endpoints & Health Checks

| Service | Port | Health Check Route | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` | `http://localhost:5000/health` | Node.js, Express, Mongoose |
| **Frontend Web App** | `5173` | `http://localhost:5173` | React 18, Vite, Tailwind CSS |
| **AI Microservice** | `8000` | `http://localhost:8000/health` | Python FastAPI, Uvicorn |

---

## Demo User Credentials (Local Development Only)

> [!WARNING]
> These credentials are strictly for local development and testing purposes. Never use default passwords in staging or production.

**Default Password for all demo accounts**: `Demo@12345`

| Role | Name | Email | Specialization / Profile |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@heterohms.com` | Hospital Master Administrator |
| **Doctor** | Dr. Rajesh Sharma | `dr.sharma@heterohms.com` | Cardiology (Fee: ₹800) |
| **Doctor** | Dr. Anita Patel | `dr.patel@heterohms.com` | General Medicine (Fee: ₹500) |
| **Patient** | Rahul Verma | `rahul.verma@example.com` | Blood Group: O+, Hypertension |
| **Patient** | Priya Singh | `priya.singh@example.com` | Blood Group: B+, Diabetes |
| **Patient** | Amit Kumar | `amit.kumar@example.com` | Blood Group: A+ |

---

## Architectural Implementation Roadmap

- **Phase 1 (MVP)**:
  - Role-Based Access Control (Admin, Doctor, Patient)
  - Doctor Availability Engine & Conflict-Proof Appointment Scheduling
  - Electronic Medical Records (EHR) & Structured Prescriptions
  - Cloudinary Heterogeneous Medical Document Storage
  - Multi-Role Real-Time In-App Notifications
- **Phase 2 (AI/NLP Intelligence)**:
  - Tesseract OCR for text extraction on medical documents and lab scans
  - `sentence-transformers` embeddings (`all-MiniLM-L6-v2`)
  - Scoped clinical semantic search via MongoDB Atlas Vector Search / ChromaDB
