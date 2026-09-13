Go and have a look at our live website and try to give a demo test too:- sandhiai.vercel.app


# Sandhi-NER + OA-Care

**AI-Assisted Early Osteoarthritis Detection Platform**  
Ministry of Development of North Eastern Region (MDoNER) | Problem Statement 26004

---

## Project Structure

```
sandhi-ner-oa-care/
├── api/                   # Vercel Python serverless entry point
│   └── index.py
├── app/                   # FastAPI backend
│   ├── api/v1/            # Routes: auth, patients, screening, cv, reports, sync, analytics, guidance
│   ├── core/              # DB engine, security utilities
│   ├── models/            # SQLAlchemy ORM models
│   ├── schemas/           # Pydantic request/response schemas
│   ├── services/          # Business logic
│   ├── ai_engine/         # Risk scoring, clinical rules
│   ├── cv_engine/         # ROM, gait, X-ray CV analysis
│   ├── data/              # Seed data
│   ├── config.py          # Settings (reads env vars)
│   └── main.py            # FastAPI app factory
├── frontend/              # React + Vite + Tailwind frontend (OA-care)
│   ├── src/pages/         # Login, Dashboard, Registration, Assessment, MovementAnalysis, Analysis, Results
│   └── vite.config.js
├── requirements.txt        # Core Python deps (Vercel-safe)
├── requirements-ml.txt     # Heavy ML/CV deps (local only)
├── vercel.json             # Unified Vercel routing
├── package.json            # Root build scripts
└── .env.example            # Environment variable template
```

---

## Deployment to Vercel

### Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **Settings → Database → Connection String**
3. Select **Transaction Pooler** tab (port **6543**)
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. **Add the `+asyncpg` driver prefix**:
   ```
   postgresql+asyncpg://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

### Step 2: Push to GitHub

```bash
cd /path/to/sandhi-ner-oa-care
git init
git add .
git commit -m "Initial commit: Sandhi-NER + OA-Care monorepo"
git remote add origin https://github.com/YOUR_USERNAME/sandhi-ner-oa-care.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `/` (monorepo root)
4. Add **Environment Variables**:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `postgresql+asyncpg://postgres.xxxx:...@...pooler.supabase.com:6543/postgres` |
   | `SECRET_KEY` | A strong random string (e.g. `openssl rand -hex 32`) |
5. Click **Deploy**

Vercel automatically runs `npm run vercel-build` (builds the React frontend) and deploys `api/index.py` as a Python serverless function.

---

## Local Development

### Backend

```bash
# Install Python deps (with ML support)
pip install -r requirements-ml.txt

# Create a .env file
cp .env.example .env
# Edit .env and fill in your Supabase DATABASE_URL and SECRET_KEY

# Run FastAPI server
cd sandhi-ner-oa-care
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173  
(Proxies `/api/*` to FastAPI at `:8000` automatically)

---

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /health` | Health check |
| `GET /docs` | Swagger UI |
| `POST /api/v1/auth/register` | Register ASHA worker |
| `POST /api/v1/auth/login` | Login & get JWT token |
| `GET /api/v1/auth/me` | Get current user |
| `POST /api/v1/patients/` | Register patient |
| `GET /api/v1/patients/` | List patients |
| `POST /api/v1/screening/` | Submit OA screening |
| `POST /api/v1/cv/analyze-joint-rom` | ROM analysis |
| `POST /api/v1/cv/analyze-gait` | Gait kinematics |
| `POST /api/v1/cv/analyze-xray` | X-ray KL grading |
| `GET /api/v1/reports/{id}` | PDF report |
| `GET /api/v1/analytics/dashboard` | Analytics dashboard |

> **Note**: CV endpoints (ROM, gait, X-ray) require `requirements-ml.txt` deps and are best run on a dedicated ML server in production.

---

## Supported NER States & Languages

**States**: Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura  
**Languages**: English, Assamese, Bengali, Manipuri, Mizo, Khasi, Garo, Hindi
