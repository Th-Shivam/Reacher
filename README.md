<div align="center">

```
██████╗ ███████╗ █████╗  ██████╗██╗  ██╗███████╗██████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗
██████╔╝█████╗  ███████║██║     ███████║█████╗  ██████╔╝
██╔══██╗██╔══╝  ██╔══██║██║     ██╔══██║██╔══╝  ██╔══██╗
██║  ██║███████╗██║  ██║╚██████╗██║  ██║███████╗██║  ██║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

**Automated cold email outreach — built for job seekers who mean business.**

![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI-blue?style=flat-square)
![Auth](https://img.shields.io/badge/auth-Clerk-purple?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

---

## what is reacher?

Reacher is an automated outreach tool that helps job seekers send personalized cold emails at scale — without the manual grind. You paste your resume, pick your target roles, and Reacher handles the rest: finding contacts, crafting emails, and tracking replies.

No more copy-pasting the same email 50 times. No more wondering if anyone even opened it.

---

## tech stack

| layer | tech |
|---|---|
| frontend | React 19 + TypeScript + Vite |
| backend | FastAPI (Python) |
| auth | Clerk |
| routing | React Router v8 |

---

## project structure

```
reacher/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── App.tsx    # root component with Clerk auth
│   │   └── main.tsx   # app entry with ClerkProvider
│   └── package.json
│
├── backend/           # FastAPI server
│   ├── app/
│   │   └── main.py    # API entry point + health check
│   └── .venv/
│
└── .gitignore
```

---

## getting started

### prerequisites

- Node.js 18+
- Python 3.13+
- A [Clerk](https://clerk.com) account

### frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # add your VITE_CLERK_PUBLISHABLE_KEY
npm run dev
```

### backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` — health check at `/health`.

---

## environment variables

**frontend** (`frontend/.env.local`)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

**backend** (`backend/.env`)
```
CLERK_SECRET_KEY=sk_...
```

---

## roadmap

- [x] project scaffold (React + FastAPI)
- [x] Clerk authentication
- [ ] resume parser
- [ ] contact finder
- [ ] email template engine
- [ ] outreach scheduler
- [ ] reply tracker dashboard

---

<div align="center">
  built with intent · reacher © 2025
</div>
