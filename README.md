# CareerPath360.AI

CareerPath360.AI is an end-to-end, AI-powered career development platform that helps job seekers create, analyze, and continuously improve ATS-ready resumes while matching their profiles against live job openings. The system combines a modern React frontend, a Node/Express API layer, and a dedicated Python ML service to deliver resume parsing, ATS scoring, skill-gap insights, job matching, and always-on career coaching.

---

## Executive Summary

- **Complete career workflow**: Resume creation → AI analysis → Job matching → Skill-gap recommendations → Career coaching.
- **Production-ready stack**: React 18 + Vite, Express + MongoDB, FastAPI + Python ML microservice.
- **Real ATS methodology**: 6-component, 100-point score that mirrors enterprise ATS expectations (Greenhouse, Workday, etc.).
- **Advanced ML/AI**: 500+ skill ontology, contextual extraction, Gemini 2.5 Flash–powered analysis, multi-template resume builder with pixel-perfect PDF export.
- **User-centric UX**: Dark mode, responsive layouts, analytics dashboards, notifications, and course recommendations.

---

## Feature Highlights

### 1. Authentication & User Management
- Secure registration/login with JWT, refresh handling, and session management.
- Email verification + password reset flows via Nodemailer.
- Profile editing, avatar uploads, and account analytics.

### 2. Resume Management
- Upload PDF/DOCX resumes with multi-parser fallback (PyMuPDF → pdfplumber → PyPDF2).
- Automatic experience + skill extraction backed by 500+ canonical skills.
- ATS scoring with breakdown across contact info, format, skills, experience, education, and keyword density.
- Resume builder with 17 premium templates (10 technical, 7 non-technical), live preview, and hi-res PDF export.

### 3. AI-Powered Insights
- Gemini-powered resume optimization, tailored suggestions, and chatbot guidance.
- Skill-gap detection plus curated course recommendations (54+ high-signal courses).
- Actionable insights categorized by severity (High / Medium / Low).

### 4. Job Matching & Analysis
- Job scrape pipeline (Axios → Puppeteer → Selenium) with LinkedIn/Indeed/Naukri compatibility.
- Resume-job matching score (Required skills, Preferred skills, Experience alignment, Skill depth, Industry fit).
- Missing skill detection, job-fit summaries, and ATS score blending for realistic readiness checks.

### 5. Analytics & Notifications
- Dashboard metrics (resume trends, ATS deltas, skill trends) with history tracking.
- Email + in-app notifications for analysis completion, recommended courses, and system alerts.

### 6. AI Chatbot & Guidance
- 24/7 Gemini-based assistant for resume tweaks, interview prep tips, and career guidance.
- Context-aware responses leveraging resume/job analysis history.

---

## Architecture Overview

| Layer        | Stack / Responsibility                                                                 |
|--------------|-----------------------------------------------------------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS, React Router, html2pdf.js, Lucide Icons                   |
| Backend API  | Node.js, Express, MongoDB (Mongoose), JWT Auth, Multer, Nodemailer, Gemini SDK          |
| ML Service   | FastAPI, PyMuPDF/pdfplumber/PyPDF2, Sentence Transformers, XGBoost, NLTK, skill DB     |
| Infrastructure| RESTful microservices, optional AWS S3 integration, ready for Render / Vercel deploys |

Microservices communicate via RESTful endpoints. The backend orchestrates authentication, resume/job CRUD, analytics, notifications, and AI prompts, delegating heavy parsing + scoring to the Python ML service.

---

## Repository Structure

```
.
├── backend/              # Express API, auth, resume/job logic, emails, notifications
├── frontend/             # React + Vite SPA, templates, dashboards, chatbot UI
├── ml-service/           # FastAPI microservice for parsing, ATS scoring, skill extraction
├── Photos/               # Template thumbnails / marketing assets
└── docs/*.md             # Deployment guides, feature specs, testing notes
```

---

## Environment Configuration

### Backend (`backend/env.example`)
```
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/careerpath360
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/careerpath360
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRE=7d
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=app-specific-password
GEMINI_API_KEY=your-gemini-api-key
ML_SERVICE_URL=http://localhost:8000
ENABLE_PUPPETEER_FALLBACK=true
ENABLE_SELENIUM_FALLBACK=false
SELENIUM_WAIT_MS=2500
```

### Frontend (`frontend/env.example`)
```
VITE_API_URL=http://localhost:5000/api
VITE_ML_API_URL=http://localhost:8000
```

> Copy each example file to `.env` (or `.env.local`) and fill in real secrets before running the stack.
>
> **Job scraping fallbacks:** keep Puppeteer enabled for dynamic listings. Turn on `ENABLE_SELENIUM_FALLBACK` only if a local Chrome/Chromedriver install is available—useful for boards that aggressively block headless requests.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas (or local instance)
- Git + npm

### 1. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../ml-service && pip install -r requirements.txt
```

### 2. Configure Environment
- Duplicate `backend/env.example` → `backend/.env` (or keep `.env` outside repo per security policy) and set required values.
- Duplicate `frontend/env.example` → `frontend/.env`.
- (Optional) Configure virtualenv for `ml-service` (see `ml-service/INSTALL_ENHANCED_PARSER.md`).

### 3. Run Services
```bash
# Terminal 1 – ML service
cd ml-service
uvicorn app:app --reload --port 8000

# Terminal 2 – Backend API
cd backend
npm run dev

# Terminal 3 – Frontend
cd frontend
npm run dev
```

The app defaults to:
- Frontend: http://localhost:5173
- API: http://localhost:5000/api
- ML service: http://localhost:8000

---

## Key Workflows

- **Resume Upload** → `/api/resume` handles file parsing → ML service extracts text/skills → ATS scoring stored in MongoDB → dashboard updates.
- **Resume Builder** → React templates + Tailwind components → html2pdf.js for high-fidelity export (scale 3, quality 1.0).
- **Job Match** → `/api/job-matching` fetches job description (scrape or paste), runs ML comparison, computes match scores, skills gap, and recommendations.
- **Course Recommendations** → `/api/courses` serves curated catalogue filtered by missing skills.
- **AI Chatbot / Optimization** → `/api/chatbot` & `/api/ai/optimize` leverage Gemini for contextual guidance.

---

## Testing & Utilities

- `backend/test-login.js`, `clear-stats-cache.js`, `delete-old-resumes.js` help debug user data—ensure env vars are set before running them.
- `backend/src/utils/seedCourses.js` & `seedJobRoles.js` populate Mongo collections (run `node` scripts after connecting to Atlas).
- Lint/format configs: ESLint (frontend), default Node best practices (backend). Run `npm run lint` where available.

---

## Roadmap (2025–2026)

- **Phase 1**: Resume versioning, AI cover letters, interview prep, portfolio builder, LinkedIn optimization.
- **Phase 2**: Social layer (public profiles, forums, mentorship, resume sharing).
- **Phase 3**: Advanced AI (career roadmaps, salary predictions, job recommendations, interview question generator, resume A/B tests).
- **Phase 4**: Enterprise tooling (recruiter dashboards, bulk analysis, matching API, white-label solutions, org analytics).
- **Phase 5**: Mobile apps, localization, global job boards, currency conversion, regional templates.
- **Phase 6**: Predictive analytics, skill trend insights, market intelligence, personalized learning paths, continuous optimization engine.

---

## Support & Contributions

- Review `PRE_DEPLOYMENT_CHECKLIST.md`, `RENDER_DEPLOYMENT_STEPS.md`, and other `/docs` files before pushing to production.
- Keep secrets out of version control (Git ignores `.env` by default).
- For issues or enhancements, open a GitHub issue referencing the relevant feature doc.

Built with ❤️ for Career Success.
