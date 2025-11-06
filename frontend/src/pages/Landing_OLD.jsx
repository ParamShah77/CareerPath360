import React, { useState } from 'react';
import AuthModal from '../components/auth/AuthModal';
import Logo from '../components/common/Logo';

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  // Image paths served from frontend/public/assets/why/
  const featureImages = [
    '/assets/why/ats.svg',
    '/assets/why/skills.svg',
    '/assets/why/rewrite.svg'
  ];

  // Change these numbers (px) to resize the logos quickly
  const imageSize = { width: 96, height: 96 };

  const handleSignUpClick = (e) => {
    e.preventDefault();
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 text-slate-800">
      {/* Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between backdrop-blur-sm bg-white/70 sticky top-0 z-40 rounded-b-2xl shadow-sm">
        <Logo size="lg" />

        <nav className="flex items-center gap-8 text-slate-700">
          <a className="hover:text-teal-600 hidden md:inline font-medium transition-colors" href="#features">Features</a>
          <a className="hover:text-teal-600 hidden md:inline font-medium transition-colors" href="#solutions">Solutions</a>
          <button 
            onClick={handleSignInClick}
            className="hover:text-teal-600 font-semibold transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={handleSignUpClick}
            className="inline-flex items-center px-7 py-3.5 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Get Started Free
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-block px-4 py-2 bg-teal-50 rounded-full text-teal-700 font-semibold text-sm">
            ✨ AI-Powered Resume Intelligence
          </div>
          <h1 className="text-5xl lg:text-6xl xl:text-7xl leading-tight font-extrabold text-slate-900">
            Land Your Dream Job with 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]"> AI-Optimized</span> Resumes
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 max-w-2xl leading-relaxed">
            Beat Applicant Tracking Systems, discover skill gaps, and get personalized AI recommendations to triple your interview callbacks.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <button 
              onClick={handleSignUpClick}
              className="inline-flex items-center px-10 py-5 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-bold text-lg shadow-2xl hover:shadow-teal-200 transform hover:-translate-y-1 transition-all duration-200"
            >
              Start Optimizing Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button 
              onClick={handleSignInClick}
              className="inline-flex items-center px-8 py-4 rounded-full border-2 border-teal-600 text-teal-700 font-semibold bg-white hover:bg-teal-50 transition-all duration-200"
            >
              See How It Works
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-700 font-medium">90%+ ATS Pass Rate</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-700 font-medium">AI-Powered Analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-700 font-medium">Instant Feedback</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-slate-700 font-medium">100% Private & Secure</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-2xl">
            <div className="absolute -top-4 -left-4 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="relative rounded-3xl shadow-2xl border border-slate-200 overflow-hidden bg-white p-2">
              <img src="/assets/why/hero_pic1.png" alt="AI Resume Analysis Dashboard" className="w-full h-auto rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] rounded-3xl shadow-xl p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-teal-100 font-medium">Resumes Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="text-teal-100 font-medium">Interview Rate Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">3x</div>
              <div className="text-teal-100 font-medium">Faster Job Offers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9★</div>
              <div className="text-teal-100 font-medium">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose CareerPath360 */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
            Why Choose <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]">CareerPath360</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Our AI-powered platform gives you the competitive edge with instant ATS scoring, personalized recommendations, and industry-leading resume optimization tools.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {title: 'ATS Score Insights', desc: 'Understand how hiring systems interpret your resume.'},
            {title: 'Skill Gap Detection', desc: 'Identify missing skills based on your target job roles.'},
            {title: 'Smart Rewrite Suggestions', desc: 'Improve resume sections automatically with AI recommendations.'}
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_6px_18px_rgba(12,39,39,0.03)] transform transition-all duration-300 hover:scale-105">
              <div
                className="flex items-center justify-center mb-4 rounded-md"
                style={{
                  border: '1px solid rgba(19,168,168,0.12)',
                  padding: '6px',
                  width: `${imageSize.width}px`,
                  height: `${imageSize.height}px`
                }}
              >
                <img
                  src={featureImages[i]}
                  alt={f.title}
                  className="object-contain"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="text-lg font-medium text-slate-900">{f.title}</div>
              <p className="mt-2 text-slate-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Solutions */}
      <section id="solutions" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">Our Solutions</h3>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">Comprehensive tools to transform your resume into an interview magnet — scoring, matching, and AI-powered rewriting in one place.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl p-6 transform transition-all duration-300 hover:scale-105" style={{background: 'rgba(224,255,249,0.8)', border: '1px solid rgba(19,168,168,0.08)'}}>
            <div className="text-lg font-semibold">Resume Scoring Dashboard</div>
            <p className="mt-3 text-slate-600 text-sm">View ATS score, formatting compliance, keyword relevance, and improvement insights in a clean intuitive interface.</p>
            <div className="mt-4">
              <button onClick={handleSignUpClick} className="text-teal-700 font-medium hover:underline">
                Learn More →
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6 transform transition-all duration-300 hover:scale-105" style={{background: 'rgba(250,245,240,0.9)', border: '1px solid rgba(120,110,100,0.04)'}}>
            <div className="text-lg font-semibold">Job Role Matching</div>
            <p className="mt-3 text-slate-600 text-sm">Discover where your resume has the highest match potential based on skills, experience, and industry demand.</p>
            <div className="mt-4">
              <button onClick={handleSignUpClick} className="text-teal-700 font-medium hover:underline">
                Learn More →
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6 transform transition-all duration-300 hover:scale-105" style={{background: 'rgba(235,249,255,0.9)', border: '1px solid rgba(50,160,200,0.04)'}}>
            <div className="text-lg font-semibold">Resume Rewrite Assistant</div>
            <p className="mt-3 text-slate-600 text-sm">Generate polished and professional rewrite suggestions instantly with AI smart phrasing.</p>
            <div className="mt-4">
              <button onClick={handleSignUpClick} className="text-teal-700 font-medium hover:underline">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} Career360.ai — About · Privacy Policy · Contact</div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-teal-600 hover:underline">LinkedIn</a>
            <a href="#" className="text-teal-600 hover:underline">Twitter</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />
    </div>
  );
}
