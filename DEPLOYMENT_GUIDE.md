# 🚀 CareerPath360 Deployment Guide

## 📋 Current Status

Your project has **3 services** that need deployment:
1. **Frontend** (React + Vite)
2. **Backend** (Node.js + Express + MongoDB)
3. **ML Service** (Python FastAPI)

---

## ⚠️ CRITICAL: Code Changes Required Before Deployment

### Problem: Hardcoded localhost URLs
We found **50+ hardcoded URLs** in your frontend code that need to be replaced with environment variables.

### Files That Need Updating:

#### Files with `http://localhost:5000`:
- ✅ `frontend/src/utils/api.js` (CREATED - use this!)
- ❌ `frontend/src/context/AuthContext.jsx`
- ❌ `frontend/src/pages/Dashboard.jsx`
- ❌ `frontend/src/pages/Upload.jsx`
- ❌ `frontend/src/pages/History.jsx`
- ❌ `frontend/src/pages/ResumeBuilder.jsx`
- ❌ `frontend/src/pages/Analysis.jsx`
- ❌ `frontend/src/pages/Courses.jsx`
- ❌ `frontend/src/components/chatbot/ChatWidget.jsx`
- ❌ `frontend/src/components/common/NotificationDropdown.jsx`
- ❌ `frontend/src/components/dashboard/RecentAnalyses.jsx`
- ❌ `frontend/src/components/analysis/CourseRecommendations.jsx`

---

## 🔧 OPTION 1: Quick Fix (Manual)

### Step 1: Replace URLs in Each File

**Old Pattern:**
\`\`\`javascript
const response = await axios.get('http://localhost:5000/api/dashboard/stats', {
  headers: { Authorization: \`Bearer \${token}\` }
});
\`\`\`

**New Pattern:**
\`\`\`javascript
import api from '../utils/api';

const response = await api.get('/dashboard/stats');
// The token is added automatically!
\`\`\`

### Step 2: For Files Without Auth Token

**Old:**
\`\`\`javascript
const response = await axios.get('http://localhost:5000/api/job-roles');
\`\`\`

**New:**
\`\`\`javascript
import { API_BASE_URL } from '../utils/api';

const response = await axios.get(\`\${API_BASE_URL}/job-roles\`);
\`\`\`

---

## 🔧 OPTION 2: Automated Fix (Recommended)

Would you like me to:
1. ✅ Automatically update ALL files to use the centralized API utility?
2. ✅ Create `.env` files for local testing
3. ✅ Add deployment scripts to package.json
4. ✅ Create deployment configuration files for Render.com

**This will take about 2-3 minutes and update ~12 files.**

---

## 📦 Files Already Created

✅ **backend/.env.example** - Environment variable template for backend
✅ **frontend/.env.example** - Environment variable template for frontend  
✅ **frontend/src/config/env.js** - Environment configuration utility
✅ **frontend/src/utils/api.js** - Centralized API client with auto-auth

---

## 🎯 Next Steps

### Option A: Let Me Auto-Fix Everything (RECOMMENDED)
Say **"yes, auto-fix all the URLs"** and I'll:
- Update all 12 files to use the API utility
- Create local .env files for testing
- Add deployment scripts
- Prepare everything for Render.com deployment

### Option B: Manual Deployment Prep
Say **"I'll fix them manually"** and I'll:
- Give you the step-by-step deployment guide
- Help you when you're ready to deploy

### Option C: Learn More First
Say **"explain deployment platforms"** and I'll:
- Compare Render vs Vercel vs Railway vs AWS
- Show pricing and performance differences
- Help you choose the best platform

---

## 💡 Quick Deployment Checklist

Before deploying, you need:
- [ ] Fix all localhost URLs (automated or manual)
- [ ] Create MongoDB Atlas account (free tier)
- [ ] Get Google Gemini API key
- [ ] Push code to GitHub
- [ ] Create Render.com account
- [ ] Deploy ML Service first
- [ ] Deploy Backend second (with ML URL)
- [ ] Deploy Frontend last (with Backend URL)

---

## ⏱️ Estimated Time

- **Code preparation:** 5-10 minutes (if I auto-fix)
- **MongoDB Atlas setup:** 5 minutes
- **Render.com deployment:** 15-20 minutes
- **Testing and debugging:** 10-15 minutes

**Total:** ~45 minutes to 1 hour for first deployment

---

## 🤔 Your Choice?

What would you like to do?

**A)** Auto-fix all URLs and prepare for deployment (FASTEST)  
**B)** Show me step-by-step manual instructions  
**C)** Explain deployment options first  
**D)** Just push current code to GitHub first  

Type A, B, C, or D to continue!
