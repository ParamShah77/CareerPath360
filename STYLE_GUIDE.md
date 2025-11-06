# 🎨 CareerPath360 - Quick Style Guide

## 🎯 Brand Colors

### Primary Palette
```css
/* Teal Gradient (Primary Brand) */
background: linear-gradient(135deg, #13A8A8 0%, #18B3B3 100%)

/* Text Colors */
--heading: #0f172a (slate-900)
--body: #475569 (slate-600)
--muted: #94a3b8 (slate-400)

/* Background */
--bg-light: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa)
--bg-dark: #0f172a (slate-900)
```

### Secondary Palette (Stat Cards)
```css
--blue: from-blue-50 to-blue-100/50, accent: #2563eb
--green: from-green-50 to-green-100/50, accent: #16a34a
--purple: from-purple-50 to-purple-100/50, accent: #9333ea
--orange: from-orange-50 to-orange-100/50, accent: #ea580c
```

---

## 📐 Component Patterns

### Buttons

#### Primary CTA
```jsx
<button className="px-10 py-5 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-bold text-lg shadow-2xl hover:shadow-teal-200 transform hover:-translate-y-1 transition-all">
  Start Optimizing Now
</button>
```

#### Secondary Button
```jsx
<button className="px-8 py-4 rounded-full border-2 border-teal-600 text-teal-700 font-semibold bg-white hover:bg-teal-50 transition-all">
  See How It Works
</button>
```

### Cards

#### Stat Card
```jsx
<div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-2xl shadow-lg hover:shadow-xl p-6 transition-all transform hover:-translate-y-1 border border-blue-200 dark:border-blue-800">
  {/* Content */}
</div>
```

#### Feature Card
```jsx
<div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-teal-200 transform hover:-translate-y-2">
  {/* Content */}
</div>
```

#### Quick Action Card
```jsx
<a href="/path" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
  <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
    {/* Icon */}
  </div>
  {/* Content */}
</a>
```

---

## 📝 Typography Scale

### Headings
```jsx
// Hero H1
<h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 leading-tight">

// Section H2
<h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">

// Subsection H3
<h3 className="text-2xl font-bold text-slate-900 mb-4">

// Card Title
<h4 className="text-xl font-bold text-slate-900">
```

### Body Text
```jsx
// Large body (hero subtext)
<p className="text-xl lg:text-2xl text-slate-600 leading-relaxed">

// Regular body
<p className="text-lg text-slate-600 leading-relaxed">

// Small text
<p className="text-sm text-slate-600">
```

---

## 🎯 Logo Usage

### Import
```jsx
import Logo from '../components/common/Logo';
```

### Sizes
```jsx
// Small (32px) - Footer, compact areas
<Logo size="sm" />

// Medium (40px) - Default, general use
<Logo size="md" />

// Large (48px) - Navbar, prominent areas
<Logo size="lg" />

// Extra Large (56px) - Hero, modals
<Logo size="xl" />
```

### Variations
```jsx
// With text (default)
<Logo size="lg" />

// Icon only (modals, mobile)
<Logo size="xl" showText={false} />

// With custom classes
<Logo size="md" className="mb-4" />
```

---

## 📏 Spacing System

```css
/* Padding */
p-2:  8px
p-4:  16px
p-6:  24px
p-8:  32px
p-10: 40px
p-12: 48px

/* Gap */
gap-4:  16px
gap-6:  24px
gap-8:  32px
gap-10: 40px
gap-12: 48px

/* Section Spacing */
py-12: 48px (small sections)
py-20: 80px (medium sections)
py-24: 96px (large sections)
py-32: 128px (hero sections)
```

---

## 🎨 Border Radius

```css
rounded-lg:   8px  (inputs, small cards)
rounded-xl:   12px (buttons, icons)
rounded-2xl:  16px (cards, containers)
rounded-3xl:  24px (large sections)
rounded-full: 9999px (pills, badges, avatar)
```

---

## ✨ Shadows

```css
/* Default States */
shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1)
shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.1)
shadow-2xl:  0 25px 50px -12px rgb(0 0 0 / 0.25)

/* Hover States */
hover:shadow-xl
hover:shadow-2xl
hover:shadow-teal-200 (colored glow)
```

---

## 🎭 Animations

### Transforms
```jsx
// Lift on hover
transform hover:-translate-y-1

// Lift more on hover
transform hover:-translate-y-2

// Scale on hover
group-hover:scale-110
hover:scale-105
```

### Transitions
```jsx
// Fast transitions
transition-all duration-200

// Medium transitions
transition-all duration-300

// Specific properties
transition-colors
transition-shadow
transition-transform
```

### Loading Spinners
```jsx
// Teal spinner
<div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent"></div>

// Gradient spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
```

---

## 🎪 Icon Containers

### Stat Card Icons
```jsx
<div className="p-3 bg-blue-600 rounded-xl shadow-md">
  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
    {/* Path */}
  </svg>
</div>
```

### Quick Action Icons
```jsx
<div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
    {/* Path */}
  </svg>
</div>
```

### Feature Icons
```jsx
<div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
  <img src="/icon.svg" alt="Feature" className="w-14 h-14" />
</div>
```

---

## 🏷️ Badges

### Success Badge
```jsx
<span className="inline-block px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-semibold">
  90%+ Pass Rate
</span>
```

### Info Badge
```jsx
<span className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
  AI-Powered Insights
</span>
```

### Header Badge
```jsx
<div className="inline-block px-4 py-2 bg-teal-50 rounded-full text-teal-700 font-semibold text-sm">
  ✨ AI-Powered Resume Intelligence
</div>
```

---

## 📱 Responsive Grid Layouts

### 2-Column (Stats, Features)
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
```

### 3-Column (Features)
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
```

### 4-Column (Quick Actions, Stats)
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

### 2-Column Asymmetric (Hero)
```jsx
<div className="grid lg:grid-cols-2 gap-16 items-center">
```

---

## 🌗 Dark Mode Patterns

### Backgrounds
```jsx
className="bg-white dark:bg-slate-800"
className="bg-slate-50 dark:bg-slate-900"
className="bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:bg-slate-900"
```

### Text
```jsx
className="text-slate-900 dark:text-white"  // Headings
className="text-slate-600 dark:text-gray-300"  // Body
className="text-slate-400 dark:text-gray-500"  // Muted
```

### Borders
```jsx
className="border border-slate-200 dark:border-slate-700"
className="border-b border-slate-200 dark:border-slate-700"
```

### Card Gradients (Dark Mode)
```jsx
className="from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10"
```

---

## ✅ Checklist for New Components

When creating new components, ensure:

- [ ] Uses unified Logo component (not custom logo code)
- [ ] Includes hover states with transforms
- [ ] Has dark mode support (dark: classes)
- [ ] Uses consistent spacing (p-6, p-8, gap-6, etc.)
- [ ] Applies proper border radius (rounded-2xl for cards)
- [ ] Includes shadow effects (shadow-lg, hover:shadow-xl)
- [ ] Uses brand colors (teal gradient, slate text)
- [ ] Has smooth transitions (transition-all)
- [ ] Responsive breakpoints (sm:, md:, lg:)
- [ ] Accessible (proper semantic HTML, ARIA labels)

---

## 🎯 Common Patterns Quick Reference

### Empty State
```jsx
<div className="text-center py-16">
  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl flex items-center justify-center">
    <svg className="w-10 h-10 text-teal-600" />
  </div>
  <h3 className="text-xl font-bold text-slate-900 mb-2">No items yet</h3>
  <p className="text-slate-600 mb-6">Get started by creating your first item</p>
  <a href="/action" className="px-8 py-4 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-semibold">
    Get Started
  </a>
</div>
```

### Loading State
```jsx
<div className="text-center py-16">
  <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto"></div>
  <p className="text-slate-600 mt-6 font-medium">Loading...</p>
</div>
```

### Section Header
```jsx
<div className="text-center mb-16">
  <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
    Section Title <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]">Gradient</span>
  </h2>
  <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
    Section description goes here
  </p>
</div>
```

---

**Quick Tip**: Copy these patterns directly into your code for consistent styling across the app!
