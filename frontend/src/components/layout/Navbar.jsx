import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../common/NotificationDropdown';
import Logo from '../common/Logo';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/upload" className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Analyze Resume
            </Link>
            <Link to="/history" className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              History
            </Link>
            <Link to="/courses" className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Courses
            </Link>
            <Link to="/resume-builder" className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Resume Builder
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm0 16.97a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM6.464 6.464a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Notifications - Hidden on mobile */}
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>

            {/* User Dropdown - Hidden on mobile */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-colors font-semibold"
              >
                {user?.name?.charAt(0).toUpperCase() || 'P'}
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b dark:border-slate-700">
                    <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                  </div>

                  {/* Only Settings option (no Profile Settings) */}
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    🔒 Settings
                  </Link>

                  <button
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border-t dark:border-slate-700"
                  >
                    ↩️ Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 py-4">
            <div className="flex flex-col space-y-3">
              {/* User Info */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>

              {/* Navigation Links */}
              <Link 
                to="/dashboard" 
                onClick={closeMobileMenu}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                📊 Dashboard
              </Link>
              <Link 
                to="/upload" 
                onClick={closeMobileMenu}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                📤 Analyze Resume
              </Link>
              <Link 
                to="/history" 
                onClick={closeMobileMenu}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                📋 History
              </Link>
              <Link 
                to="/courses" 
                onClick={closeMobileMenu}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                📚 Courses
              </Link>
              <Link 
                to="/resume-builder" 
                onClick={closeMobileMenu}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ✏️ Resume Builder
              </Link>

              {/* Notifications - Mobile only */}
              <div className="sm:hidden px-4 py-2">
                <NotificationDropdown />
              </div>

              {/* Settings & Logout */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <Link 
                  to="/settings" 
                  onClick={closeMobileMenu}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  🔒 Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  ↩️ Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
