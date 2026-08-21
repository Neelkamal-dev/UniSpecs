# UniSpecs — AI-Powered Verified Product Intelligence Platform

> **Unified, Verified Product Specifications**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://unispecs.vercel.app)
[![API Service](https://img.shields.io/badge/API%20Service-Render-46E3B7?style=for-the-badge&logo=render)](https://unispecs.onrender.com)
[![API Docs](https://img.shields.io/badge/API%20Docs-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://unispecs.onrender.com/docs)

- **Live Web App**: [https://unispecs.vercel.app](https://unispecs.vercel.app)
- **Live Backend API**: [https://unispecs.onrender.com](https://unispecs.onrender.com)
- **Interactive Swagger Docs**: [https://unispecs.onrender.com/docs](https://unispecs.onrender.com/docs)

UniSpecs transforms fragmented product information into **structured, evidence-backed, validated and explainable product intelligence**.
The platform never behaves like a generic chatbot — it discovers authoritative sources, extracts specifications, normalizes technical units, performs cross-source validation, detects and resolves conflicts, calculates transparent confidence scores, preserves source evidence, and exports structured dataset results.

---

## 1. Final Folder Structure

```text
unispecs/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   └── graph/
│   │   │       ├── nodes/               # LangGraph step nodes (identify, search, extract, etc.)
│   │   │       ├── state.py             # Typed ProductState schema
│   │   │       └── graph.py             # StateGraph workflow graph & edges
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py            # GET /api/v1/health
│   │   │       ├── analysis.py          # POST /api/v1/analysis, /upload, GET /analysis/{id}
│   │   │       └── products.py          # GET /api/v1/products/{id}, /attributes, /export
│   │   ├── core/
│   │   │   └── config.py                # Settings & Authority heuristic scores
│   │   ├── db/
│   │   │   ├── models.py                # SQLAlchemy DB models (Product, Attribute, Source, Conflict, Job)
│   │   │   └── session.py               # Async DB Engine (PostgreSQL / Supabase or SQLite fallback)
│   │   ├── schemas/
│   │   │   └── product.py               # Pydantic schemas for data model & responses
│   │   ├── services/
│   │   │   ├── confidence.py            # Transparent Explainable Confidence Engine
│   │   │   ├── conflict_resolver.py     # Multi-factor Conflict Resolution Engine
│   │   │   ├── document_parser.py       # PDF (PyMuPDF) and HTML (BeautifulSoup) parser
│   │   │   ├── export_service.py        # JSON, CSV, and Excel (.xlsx) Exporter
│   │   │   ├── llm_service.py           # Gemini API LLM integration & anti-hallucination prompts
│   │   │   ├── normalization.py        # Technical Unit Normalization Engine
│   │   │   ├── search_provider.py       # WebSearchProvider abstraction (Tavily + fallback)
│   │   │   └── validation.py           # Layer 1 & Layer 2 Cross-Source Validation Engine
│   │   └── main.py                      # FastAPI App entrypoint & CORS middleware
│   ├── tests/                           # Pytest unit tests for normalization, validation, etc.
│   ├── requirements.txt                 # Backend Python dependencies
│   └── .env.example                     # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx               # Enterprise Header & System Health status
│   │   │   └── AttributeDetailDrawer.tsx# Side-over drawer for source breakdown & evidence
│   │   ├── pages/
│   │   │   ├── HomePage.tsx             # Hero, Multi-input form, PDF dropzone, Capability badges
│   │   │   ├── AnalysisProgressPage.tsx # Live LangGraph step execution visualizer
│   │   │   └── ProductDashboardPage.tsx # Enterprise Product Intelligence Dashboard
│   │   ├── services/
│   │   │   └── api.ts                   # Centralized Axios client for /api/v1/
│   │   ├── store/
│   │   │   └── useAnalysisStore.ts      # Zustand state store
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces
│   │   ├── App.tsx                      # Main React App & Router
│   │   ├── index.css                    # Tailwind CSS design system
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 2. 🚀 Quick Start (Running After Clone)

Follow these simple step-by-step instructions to get UniSpecs running locally on a fresh clone.

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** & **npm**

---

### Step 1: Environment Setup

1. **Backend Configuration**:
   Create `backend/.env` from template:
   ```bash
   # Linux/macOS
   cp backend/.env.example backend/.env

   # Windows PowerShell
   copy backend\.env.example backend\.env
   ```
   *(Add your `GEMINI_API_KEY`, `GROQ_API_KEY`, or `TAVILY_API_KEY` to `backend/.env`. If left empty, UniSpecs automatically runs in fallback mode with realistic spec models).*

2. **Frontend Configuration**:
   Create `frontend/.env` from template:
   ```bash
   # Linux/macOS
   cp frontend/.env.example frontend/.env

   # Windows PowerShell
   copy frontend\.env.example frontend\.env
   ```

---

### Step 2: Start Backend Server (Terminal 1)

```bash
cd backend

# Create Python Virtual Environment
python -m venv venv

# Activate Virtual Environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Install Backend Dependencies
pip install -r requirements.txt

# Run FastAPI Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend API**: `http://localhost:8000`
- **OpenAPI Interactive Docs**: `http://localhost:8000/docs`
- **System Health Check**: `http://localhost:8000/api/v1/health`

---

### Step 3: Start Frontend Server (Terminal 2)

```bash
cd frontend

# Install Frontend Dependencies
npm install

# Start Vite Development Server
npm run dev
```
- **Frontend App**: `http://localhost:5173`

---

### Alternative: Run via Docker Compose

If you have Docker Desktop installed, you can start the Database, Backend, and Frontend together with a single command:
```bash
docker-compose up --build
```

---

## 3. Technologies Installed

### Backend
- **Python 3.13**
- **FastAPI** (REST API & OpenAPI docs)
- **Pydantic v2** & **pydantic-settings**
- **LangGraph** (StateGraph multi-agent orchestration)
- **Google GenAI SDK (`google-genai`)** / **Gemini 2.5 Flash**
- **Groq API (`groq/compound`)** (Alternative LLM provider support)
- **PyMuPDF (`fitz`)** (PDF document text extraction & page mapping)
- **BeautifulSoup4** (HTML parsing)
- **SQLAlchemy (Async)** & **aiosqlite** / **asyncpg** (PostgreSQL / Supabase)
- **Pandas** & **OpenPyXL** (CSV & Excel export generation)
- **Pytest** & **pytest-asyncio** (Unit & integration test framework)

### Frontend
- **React 18 / 19**
- **TypeScript** (Strict mode)
- **Vite** (Build tool)
- **Tailwind CSS** (Custom dark enterprise design system)
- **Lucide React** (Modern SVG icons)
- **TanStack Query (React Query)**
- **Zustand** (Global state management)
- **React Router DOM v6**
- **Axios** (HTTP client)

---

## 4. Environment Variables Reference

Backend Environment (`backend/.env` — see `backend/.env.example`):

```ini
# Backend Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Database Configuration (PostgreSQL / Supabase or SQLite fallback)
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI & Search Providers
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=groq/compound
TAVILY_API_KEY=your_tavily_api_key_here

# File Storage & Limits
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=25
```

Frontend Environment (`frontend/.env` or `frontend/.env.local` — see `frontend/.env.example`):
```ini
VITE_API_URL=http://localhost:8000
```

---

## 5. Database Setup

- **PostgreSQL + pgvector / Supabase**: Set `DATABASE_URL` in `.env` (e.g., `postgresql+asyncpg://postgres:password@localhost:5432/unispecs`).
- **SQLite Out-of-the-Box Fallback**: If `DATABASE_URL` is empty, UniSpecs automatically initializes an async SQLite database at `./data/unispecs.db`. Tables are automatically created on backend startup via `init_db()`.

---

## 6. API Endpoints

- `GET /api/v1/health` — System health & provider configuration status
- `POST /api/v1/analysis` — Launch new product analysis job
- `POST /api/v1/analysis/upload` — Upload PDF technical datasheet & start job
- `GET /api/v1/analysis/{job_id}` — Poll job status & real-time progress %
- `GET /api/v1/analysis/history` — List past analysis jobs
- `GET /api/v1/products/{id}` — Fetch full product intelligence record
- `GET /api/v1/products/{id}/attributes` — Fetch product specifications table
- `GET /api/v1/products/{id}/sources` — Fetch discovered sources hierarchy
- `GET /api/v1/products/{id}/validation` — Fetch cross-source validation & conflicts
- `GET /api/v1/products/{id}/evidence` — Fetch evidence quotes & page references
- `GET /api/v1/products/{id}/export?format=json|csv|excel` — Download structured data file

---

## 7. LangGraph Nodes

1. `identify_product`: Agent 1 resolves brand, model, MPN, variant & identity confidence.
2. `generate_queries`: Formulates targeted search queries.
3. `search_web`: Executes web discovery via `WebSearchProvider`.
4. `rank_sources`: Ranks sources by domain authority scores (Manufacturer > Official Tech Doc > Distributor > Database).
5. `collect_documents`: Ingests uploaded PDF or fetched web pages.
6. `extract_attributes`: Agent 2 schema-guided extraction preserving direct text evidence quotes.
7. `normalize_attributes`: Normalizes units (GB, mAh, g, mm, W, V, A, etc.).
8. `validate_attributes`: Layer 1 (rule-based physical bounds) & Layer 2 (cross-source value/context comparison).
9. `resolve_conflicts`: Multi-factor conflict resolution heuristics or human-review flagging.
10. `enrich_product`: Identifies missing attributes & generates commerce highlights.
11. `calculate_confidence`: Computes transparent confidence scores & human-readable rationale.
12. `finalize_product`: Assembles final graph output and persists into database.

---

## 8. Fully Implemented Functionality

- **Agent 1 Product Identification** with exact model/brand priority rules.
- **Agent 2 Evidence Researcher & Validation Pipeline** with PyMuPDF parsing, web discovery, unit normalization, cross-source conflict detection, context-aware conflict resolution, and transparent explainable confidence engine.
- **Agent 3 Formatter & Exporter** supporting JSON, CSV, and multi-tab Excel workbooks.
- **Strict Anti-Hallucination Policy** ("Truthfulness over completeness").
- **Enterprise React Dashboard** with live LangGraph progress polling, searchable specifications table, evidence drawers, validation matrix, and export downloads.

---

## 9. Intentionally Incomplete Functionality

- **OCR for Scanned PDF Images**: The current PDF parser utilizes native text layer extraction (`PyMuPDF`). Tesseract/OCR engine can be connected for scanned image PDFs.
- **SSE / WebSockets**: Current live job progress utilizes 1-second polling (`GET /api/v1/analysis/{job_id}`). SSE streaming can be added if lower latency is required.

---

## 10. Setup & Fallback Handling

- **Missing Provider Keys**: If `GEMINI_API_KEY`, `GROQ_API_KEY`, or `TAVILY_API_KEY` are not set, the platform operates in a transparent fallback mode with realistic spec models while flagging provider key warnings rather than failing or inventing fake facts.

---

## 11. Exact Next Implementation Steps

1. Configure `GEMINI_API_KEY` and `TAVILY_API_KEY` in `backend/.env`.
2. Connect production PostgreSQL / Supabase cluster if running in production.
3. Deploy frontend on Vercel / Netlify and backend on Render / Railway / Docker.

---

## 12. End-to-End Test Instructions

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173` in your browser.
4. Click **"Try Demo Preset: Samsung Galaxy S24"** or enter a product name / upload a PDF.
5. Watch the live LangGraph node step execution on `/analyze/:jobId`.
6. Inspect the completed **Product Dashboard** (`/products/:productId`), click any attribute row to open the **Evidence Detail Drawer**, view the **Validation & Conflicts** tab, and test **Export to Excel / CSV / JSON**.
