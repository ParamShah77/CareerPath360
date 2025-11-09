import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showInfo } from '../utils/toast';
import { StatCardSkeleton, ListItemSkeleton } from '../components/common/SkeletonLoader';
import { API_BASE_URL } from '../utils/api';
import EmailVerificationBanner from '../components/common/EmailVerificationBanner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    resumesAnalyzed: 0,
    resumesThisWeek: 0,
    averageMatchScore: 0,
    scoreImprovement: 0,
    totalBuiltResumes: 0,
    totalUploadedResumes: 0,
    coursesRecommended: 0,
    coursesCompleted: 0
  });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Force refresh on first load to avoid stale cache
    fetchDashboardStats(true);
    fetchRecentAnalyses();
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchRecentAnalyses();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem('token');
      const url = forceRefresh 
        ? `${API_BASE_URL}/dashboard/stats?refresh=true`
        : `${API_BASE_URL}/dashboard/stats`;
      
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        console.log('✅ Stats loaded:', response.data.data);
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/dashboard/stats/refresh`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchDashboardStats(true);
      console.log('✅ Stats refreshed successfully');
      showSuccess('Dashboard stats refreshed successfully!');
    } catch (error) {
      console.error('❌ Error refreshing stats:', error);
      showError('Failed to refresh stats. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCleanupOldResumes = async () => {
    const confirmMessage = `This will delete ALL resumes uploaded before November 1, 2025.\n\nThis includes:\n- All test resumes from October\n- Duplicate uploads\n- Old analysis results\n\nRecent resumes (November 1st onwards) will be kept.\n\nAre you sure you want to continue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE_URL}/resume/cleanup`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        showSuccess(`Successfully deleted ${response.data.data.deleted} old resumes! Your dashboard now shows accurate numbers.`);
        // Refresh stats and recent analyses
        await handleRefreshStats();
        await fetchRecentAnalyses();
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      showError('Error cleaning up old resumes. Please try again.');
    }
  };

  // ✅ DELETE uploaded resume
  const handleDeleteResume = async (resumeId, resumeName, event) => {
    event.preventDefault(); // Prevent navigation
    event.stopPropagation();
    
    if (!window.confirm(`Delete "${resumeName}"?\n\nThis will permanently delete this resume and all its analysis data.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE_URL}/resume/${resumeId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        showSuccess('Resume deleted successfully!');
        // Refresh both stats and recent analyses
        await fetchDashboardStats(true);
        await fetchRecentAnalyses();
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      showError('Failed to delete resume. Please try again.');
    }
  };

  // ✅ Fetch recent UPLOADED resumes (analyzed resumes)
  const fetchRecentAnalyses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/resume`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      console.log('📊 Recent Analyses API Response:', response.data);

      if (response.data.status === 'success') {
        // Get uploaded resumes (analyzed ones)
        let uploadedResumes = [];
        
        if (Array.isArray(response.data.data)) {
          uploadedResumes = response.data.data;
        } else if (response.data.data && Array.isArray(response.data.data.resumes)) {
          uploadedResumes = response.data.data.resumes;
        }

        // Sort by date (most recent first) and take top 3
        const recentThree = uploadedResumes
          .filter(resume => resume.parseStatus === 'completed' && resume.atsScore) // Only show completed analyses
          .sort((a, b) => {
            const dateA = new Date(a.uploadedAt || a.createdAt);
            const dateB = new Date(b.uploadedAt || b.createdAt);
            return dateB - dateA;
          })
          .slice(0, 3);

        console.log('✅ Recent 3 analyses:', recentThree.map(r => ({
          name: r.originalName,
          score: r.atsScore,
          date: r.uploadedAt || r.createdAt
        })));

        setRecentAnalyses(recentThree);
      }
    } catch (error) {
      console.error('❌ Error fetching recent analyses:', error);
      setRecentAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (!score || score === 'N/A') return 'text-gray-500 dark:text-gray-400';
    const numScore = parseInt(score);
    if (numScore >= 70) return 'text-green-600 dark:text-green-400';
    if (numScore >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Email Verification Banner */}
        <EmailVerificationBanner />
        
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-3 flex items-center gap-3 flex-wrap">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}! 
              <span className="text-3xl sm:text-4xl">👋</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-700 dark:text-slate-300">
              Track your career progress and optimize your job applications
            </p>
          </div>
          <div className="flex gap-3 flex-wrap items-start">
            <button
              onClick={handleCleanupOldResumes}
              className="px-4 sm:px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Cleanup Old Data</span>
              <span className="sm:hidden">Cleanup</span>
            </button>
            <button
              onClick={handleRefreshStats}
              disabled={refreshing}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] hover:shadow-lg disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 text-sm sm:text-base"
            >
              <svg 
                className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Card 1: Resumes Analyzed (Uploaded Only) */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-2xl shadow-lg hover:shadow-xl p-6 transition-all transform hover:-translate-y-1 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Resumes Analyzed</p>
                <p className="text-4xl font-bold text-blue-900 dark:text-white mb-1">{stats.totalUploadedResumes}</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">↑ +{stats.resumesThisWeek} this week</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl shadow-md">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Average Match Score */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-2xl shadow-lg hover:shadow-xl p-6 transition-all transform hover:-translate-y-1 border border-green-200 dark:border-green-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Average ATS Score</p>
                <p className="text-4xl font-bold text-green-900 dark:text-white mb-1">{stats.averageMatchScore}%</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">↑ +{stats.scoreImprovement}% improvement</p>
              </div>
              <div className="p-3 bg-green-600 rounded-xl shadow-md">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: Resumes Created */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-2xl shadow-lg hover:shadow-xl p-6 transition-all transform hover:-translate-y-1 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">Total Resumes</p>
                <p className="text-4xl font-bold text-purple-900 dark:text-white mb-1">{stats.totalBuiltResumes + stats.totalUploadedResumes}</p>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{stats.totalBuiltResumes} built • {stats.totalUploadedResumes} uploaded</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl shadow-md">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 4: Courses Recommended */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-2xl shadow-lg hover:shadow-xl p-6 transition-all transform hover:-translate-y-1 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">Learning Paths</p>
                <p className="text-4xl font-bold text-orange-900 dark:text-white mb-1">{stats.coursesRecommended}</p>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">✓ {stats.coursesCompleted} completed</p>
              </div>
              <div className="p-3 bg-orange-600 rounded-xl shadow-md">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Quick Actions</h2>
          <p className="text-gray-700 dark:text-slate-300 mb-6 sm:mb-8">Power up your job search in one click</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Link to="/upload" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">Analyze Resume</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Upload for instant AI-powered ATS scoring</p>
              </div>
            </Link>

            <Link to="/resume-builder" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">Build Resume</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Create professional ATS-optimized resumes</p>
              </div>
            </Link>

            <Link to="/job-matching" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">Job Matching</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Analyze job postings and match your skills</p>
              </div>
            </Link>

            <Link to="/analytics" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">Analytics</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Track your career progress with insights</p>
              </div>
            </Link>

            <Link to="/resume-history" className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 transition-all transform hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">Resume History</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Access all your created and analyzed resumes</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ✅ Recent Analyses Section - Shows ONLY Uploaded Resumes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Recent Analyses</h2>
              <p className="text-gray-700 dark:text-slate-400 mt-2 text-sm sm:text-base">
                Track your latest resume optimizations
              </p>
            </div>
            {recentAnalyses.length > 0 && (
              <Link
                to="/history"
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-[#13A8A8] to-[#18B3B3] text-white rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
          </div>

          <div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <ListItemSkeleton key={idx} />
                ))}
              </div>
            ) : recentAnalyses.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/20 dark:to-teal-800/10 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                  </svg>
                </div>
                <p className="text-gray-800 dark:text-slate-300 text-base sm:text-lg font-semibold mb-2">
                  No recent analyses yet
                </p>
                <p className="text-gray-600 dark:text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6 px-4">
                  Upload your first resume to get started with AI-powered analysis
                </p>
                <Link
                  to="/upload"
                  className="inline-block px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                >
                  Upload Resume
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.map((analysis, index) => {
                  const score = analysis.atsScore || analysis.parsedData?.final_ats_score || 0;
                  return (
                    <div
                      key={analysis._id || `analysis-${index}`}
                      className="group relative border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <Link
                        to="/analysis"
                        state={{ analysisId: analysis._id }}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-base sm:text-lg">📄</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" title={analysis.originalName || analysis.fileName || 'Resume Analysis'}>
                              {analysis.originalName || analysis.fileName || 'Resume Analysis'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                              {formatDate(analysis.uploadedAt || analysis.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(score)}`}>
                            {score}%
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 whitespace-nowrap">ATS Score</p>
                        </div>
                      </Link>
                      
                      {/* Delete Button - appears on hover */}
                      <button
                        onClick={(e) => handleDeleteResume(analysis._id, analysis.originalName || analysis.fileName, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        title="Delete Resume"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
