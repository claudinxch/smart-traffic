# Smart Traffic Control System

A modern web application that simulates an intelligent traffic light control system for urban intersections, demonstrating adaptive traffic management, distributed systems concepts, real-time communication, and high availability.

---

## Stack

**Backend** — Python, FastAPI, SQLAlchemy, SQLite, WebSockets  
**Frontend** — React, Vite, TypeScript, Tailwind CSS

---

## Setup

### Backend

Requires [uv](https://github.com/astral-sh/uv).

```bash
cd backend
uv pip install -r requirements.txt
```

### Frontend

Requires [pnpm](https://pnpm.io).

```bash
cd frontend
pnpm install
```

---

## Running

You need three terminals.

**Terminal 1 — Primary server**
```bash
cd backend
uv run python run.py --role primary
# http://localhost:8000
```

**Terminal 2 — Backup server**
```bash
cd backend
uv run python run.py --role backup
# http://localhost:8001
```

**Terminal 3 — Frontend**
```bash
cd frontend
pnpm dev
# http://localhost:5173
```