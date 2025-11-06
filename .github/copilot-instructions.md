# CareerPath360 AI Coding Instructions

## Project Overview
CareerPath360 is a full-stack resume analysis platform with React frontend and Express backend. Core features: AI-powered resume parsing, ATS scoring, resume building, and career recommendations.

## Architecture

### Frontend (React + Vite)
- **Location**: `frontend/src/`
- **Key Pages**: Dashboard, ResumeUpload, ResumeAnalysis, ResumeBuilder, ResumeHistory
- **Styling**: Tailwind CSS with dark mode support (`dark:` prefix patterns)
- **State Management**: React hooks (useState, useEffect) with localStorage for auth tokens

### Backend (Express + MongoDB)
- **API Base**: `http://localhost:5000/api/`
- **Auth**: JWT tokens in `Authorization: Bearer <token>` headers
- **Key Endpoints**:
  - `/api/dashboard/stats` - Dashboard statistics
  - `/api/resume/built/all` - Fetch all resumes (uploaded + built)
  - Resume operations under `/api/resume/*`

## Critical Patterns

### API Response Handling
Backend returns dual formats - always handle both:
```javascript
// Format 1: { status: 'success', data: [...] }
// Format 2: { status: 'success', data: { count: N, resumes: [...] } }

// Pattern to use:
let items = [];
if (Array.isArray(response.data.data)) {
  items = response.data.data;
} else if (response.data.data?.resumes) {
  items = response.data.data.resumes;
}
```

### Resume Data Model
Two resume types distinguished by `isBuiltResume` field:
- `isBuiltResume: false` - Uploaded resumes (user PDFs/DOCX)
- `isBuiltResume: true` - Built resumes (created via builder)

**Key Fields**:
- `originalName` - Display name
- `uploadedAt` / `createdAt` - Timestamps
- `fileType` - File extension
- `parsedData.extracted_skills` - AI-extracted skills array
- `atsScore` or `parsedData.final_ats_score` - Scoring (handle both locations)

### Dark Mode Convention
Every UI component must support dark mode using Tailwind's `dark:` variant:
```jsx
className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
```
Primary dark colors: `slate-800`, `slate-900`, `slate-700`

### Authentication Flow
1. Token stored in `localStorage.getItem('token')`
2. Include in ALL API requests: `{ headers: { 'Authorization': \`Bearer \${token}\` } }`
3. No global axios instance configured - add header per request

## Common Component Patterns

### Loading States
```jsx
{loading ? (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
) : content}
```

### Empty States
Include icon, message, and CTA button:
```jsx
<svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4">
<p className="text-gray-600 dark:text-gray-400">No items yet</p>
<a href="/action" className="bg-blue-600 text-white rounded-lg">Get Started</a>
```

### Stat Cards (Dashboard)
4-column grid with icon, value, and delta indicator:
- Use semantic color backgrounds: `blue-100`, `green-100`, `purple-100`, `orange-100`
- Always show trend: `↑ +X this week` format

## Data Filtering Best Practices

When filtering resumes, log extensively for debugging:
```javascript
console.log('📊 API Response:', response.data);
console.log('✅ Filtered results:', filteredData.length);
console.log('📄 Sample items:', items.map(i => ({ name: i.originalName, key: i.value })));
```

Use emoji prefixes for log categorization: ✅ success, ❌ error, ⚠️ warning, 📊 data, 📄 item details

## Navigation Links
Standard page routing (no React Router detected):
- Use `<a href="/path">` for navigation
- Use `window.location.href = '/path'` for programmatic navigation
- Key routes: `/dashboard`, `/resume-upload`, `/resume-analysis`, `/resume-builder`, `/resume-history`

## Styling Conventions
- Shadows: `shadow` and `hover:shadow-lg` for cards
- Transitions: `transition-shadow`, `transition-colors` for smooth interactions
- Rounded corners: `rounded-lg` standard
- Padding: `p-6` for cards, `p-8` for page containers
- Max width: `max-w-7xl mx-auto` for centered layouts

## Error Handling
Always include try-catch with detailed error logging:
```javascript
try {
  const response = await axios.get(url, { headers });
  if (response.data.status === 'success') { /* handle */ }
} catch (error) {
  console.error('❌ Error:', error);
  if (error.response) {
    console.error('Response:', error.response.data);
    console.error('Status:', error.response.status);
  }
}
```

## Auto-Refresh Pattern
Dashboard uses 30-second polling:
```javascript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

## When Adding New Features
1. Check if dark mode classes are included
2. Add loading and empty states
3. Include comprehensive console logging (with emojis)
4. Handle both API response formats
5. Add JWT token to headers
6. Use Tailwind utility classes (no custom CSS)
