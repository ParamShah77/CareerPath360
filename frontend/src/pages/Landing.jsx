import React, { useState } from 'react';
import AuthModal from '../components/auth/AuthModal';
import Logo from '../components/common/Logo';

export default function Landing() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignUpClick = (e) => {
    e.preventDefault();
    setAuthMode('signup');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    setAuthMode('signin');
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo size="lg" />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-slate-700 hover:text-teal-600 font-medium transition-colors" href="#features">Features</a>
              <a className="text-slate-700 hover:text-teal-600 font-medium transition-colors" href="#how-it-works">How It Works</a>
              <button onClick={handleSignInClick} className="text-slate-700 hover:text-teal-600 font-semibold transition-colors">Sign In</button>
              <button onClick={handleSignUpClick} className="px-7 py-3 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                Get Started Free
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-200 pt-4">
              <div className="flex flex-col space-y-3">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  How It Works
                </a>
                <button 
                  onClick={handleSignInClick}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-semibold text-left"
                >
                  Sign In
                </button>
                <button 
                  onClick={handleSignUpClick}
                  className="px-7 py-3 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-semibold shadow-lg"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-block px-4 py-2 bg-teal-50 rounded-full text-teal-700 font-semibold text-sm">
              ✨ AI-Powered Resume Intelligence
            </div>
            
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 leading-tight">
              Land Your Dream Job with{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]">
                AI-Optimized
              </span>{' '}
              Resumes
            </h1>
            
            <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed">
              Beat Applicant Tracking Systems, discover skill gaps, and get personalized AI recommendations to triple your interview callbacks.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={handleSignUpClick} className="px-10 py-5 rounded-full bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white font-bold text-lg shadow-2xl hover:shadow-teal-200 transform hover:-translate-y-1 transition-all inline-flex items-center gap-2">
                Start Optimizing Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button onClick={handleSignInClick} className="px-8 py-4 rounded-full border-2 border-teal-600 text-teal-700 font-semibold bg-white hover:bg-teal-50 transition-all">
                See How It Works
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              {['90%+ ATS Pass Rate', 'AI-Powered Analysis', 'Instant Feedback', '100% Private & Secure'].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
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
            {[
              { value: '50K+', label: 'Resumes Analyzed' },
              { value: '85%', label: 'Interview Rate Increase' },
              { value: '3x', label: 'Faster Job Offers' },
              { value: '4.9★', label: 'User Rating' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-teal-100 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
            Why Choose <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]">CareerPath360</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Our AI-powered platform gives you the competitive edge with instant ATS scoring, personalized recommendations, and industry-leading resume optimization tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              icon: '/assets/why/ats.svg',
              title: 'Instant ATS Score',
              desc: "Get your resume's Applicant Tracking System compatibility score in seconds. Know exactly how recruiters' software will rank your application.",
              badge: '90%+ Pass Rate',
              badgeColor: 'teal'
            },
            {
              icon: '/assets/why/skills.svg',
              title: 'Skills Gap Analysis',
              desc: 'Discover missing skills and certifications for your target role. Get personalized learning recommendations to bridge the gap and stand out.',
              badge: 'AI-Powered Insights',
              badgeColor: 'blue'
            },
            {
              icon: '/assets/why/rewrite.svg',
              title: 'Smart Resume Rewrite',
              desc: 'Transform weak bullet points into achievement-driven statements. Our AI suggests powerful action verbs and quantifiable results.',
              badge: 'Professional Quality',
              badgeColor: 'purple'
            }
          ].map((feature, i) => (
            <div key={i} className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-teal-200 transform hover:-translate-y-2">
              <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-${feature.badgeColor}-100 to-${feature.badgeColor}-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <img src={feature.icon} alt={feature.title} className="w-14 h-14" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">{feature.title}</h3>
              <p className="text-slate-600 text-center leading-relaxed mb-6">{feature.desc}</p>
              <div className="text-center">
                <span className={`inline-block px-4 py-2 bg-${feature.badgeColor}-50 text-${feature.badgeColor}-700 rounded-full text-sm font-semibold`}>
                  {feature.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24 bg-gradient-to-br from-slate-50 to-teal-50 rounded-3xl my-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">How It Works</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Simple, fast, and effective. Get your optimized resume in 3 easy steps.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {[
            { step: '1', title: 'Upload Your Resume', desc: 'Drag and drop your PDF or DOCX file. We support all major formats and keep your data 100% secure and private.' },
            { step: '2', title: 'Get AI Analysis', desc: 'Our advanced AI scans your resume, calculates your ATS score, and identifies improvement opportunities in real-time.' },
            { step: '3', title: 'Download & Apply', desc: 'Implement our suggestions, download your optimized resume, and start landing more interviews immediately.' }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] rounded-3xl shadow-2xl p-12 md:p-16 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Ready to Land Your Dream Job?</h2>
          <p className="text-xl text-teal-50 mb-10 max-w-2xl mx-auto">
            Join thousands of job seekers who've boosted their interview rates by 85% with CareerPath360.
          </p>
          <button onClick={handleSignUpClick} className="inline-flex items-center px-12 py-5 rounded-full bg-white text-teal-700 font-bold text-lg shadow-2xl hover:shadow-white/20 transform hover:-translate-y-1 transition-all">
            Start Free Analysis Now
            <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-6 text-teal-50 text-sm">✨ No credit card required • Get results in 60 seconds</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="mb-6">
                <Logo size="lg" />
              </div>
              <p className="text-slate-400 leading-relaxed max-w-md">
                AI-powered resume optimization platform helping job seekers land their dream careers faster with intelligent ATS scoring and personalized recommendations.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Solutions', 'Pricing', 'Templates'].map((item, i) => (
                  <li key={i}><a href={`#${item.toLowerCase()}`} className="hover:text-teal-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Privacy Policy', 'Terms of Service', 'Contact'].map((item, i) => (
                  <li key={i}><a href="#" className="hover:text-teal-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} CareerPath360. All rights reserved.</p>
            <div className="flex gap-6">
              {['M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z', 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z', 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'].map((path, i) => (
                <a key={i} href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d={path} />
                    {i === 1 && <circle cx="4" cy="4" r="2" />}
                  </svg>
                </a>
              ))}
            </div>
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
