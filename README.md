# Vortex IT Service Portal (Migrated)

A decoupled IT Service Portal built with a high-performance Python FastAPI backend and a premium React (Vite) frontend.

## Architecture
- **Backend:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, JWT, cryptography (AES-256).
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Axios.

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### 1. Database Setup
```bash
docker-compose up -d postgres
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Features
- **Multi-stage Approval:** Employee -> Team Lead -> IT Team.
- **Automated Provisioning:** Background tasks for Proxmox VM creation.
- **Secure Credentials:** AES-256 encrypted VM passwords.
- **Audit Logging:** Full history of all requests and actions.
- **Real-time Notifications:** In-portal notifications for status changes.

## Default Credentials (Seed)
- **Admin:** `admin@company.com` / `Password123!`
- **Employee:** `emp1@company.com` / `Password123!`
