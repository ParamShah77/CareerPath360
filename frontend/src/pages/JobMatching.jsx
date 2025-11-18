import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, ExternalLink, TrendingUp, TrendingDown, BookOpen, CheckCircle, XCircle, Lightbulb, Award, ArrowLeft, Trash2, Upload, FileText, Target, PieChart } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';

const BREAKDOWN_CONFIG = [
  { key: 'requiredSkills', label: 'Required Skills', max: 40 },
  { key: 'preferredSkills', label: 'Preferred Skills', max: 20 },
  { key: 'experience', label: 'Experience Alignment', max: 20 },
  { key: 'skillDepth', label: 'Skill Depth & Context', max: 10 },
  { key: 'industryRelevance', label: 'Industry Relevance', max: 10 }
];

const GRADE_DESCRIPTIONS = {
  Excellent: 'Excellent – top-tier alignment. Apply immediately.',
  Good: 'Good – minor tweaks will make this irresistible.',
  Fair: 'Fair – strengthen highlighted gaps before applying.',
  Weak: 'Weak – notable gaps detected. Upskill recommended.',
  Poor: 'Poor – not the best use of time right now.'
};

const gradeBadgeStyles = {
  Excellent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Weak: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
};

const getGradeBadgeClasses = (grade) =>
  `px-3 py-1 rounded-full text-xs font-semibold ${
    gradeBadgeStyles[grade] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  }`;

const JobMatching = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [selectedResume, setSelectedResume] = useState('');
  const [uploadMode, setUploadMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchResumes();
    fetchHistory();
  }, []);

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/resume/built/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        let resumeList = [];
        if (Array.isArray(response.data.data)) {
          resumeList = response.data.data;
        } else if (response.data.data?.resumes) {
          resumeList = response.data.data.resumes;
        }
        setResumes(resumeList);
      }
    } catch (error) {
      console.error('❌ Error fetching resumes:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/job-matching/history?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setHistory(response.data.data.analyses || []);
      }
    } catch (error) {
      console.error('❌ Error fetching history:', error);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!jobUrl.trim()) {
      alert('Please enter a job posting URL');
      return;
    }

    if (uploadMode && !selectedFile) {
      alert('Please select a resume file to upload');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const token = localStorage.getItem('token');
      
      if (uploadMode) {
        // Upload resume and analyze
        const formData = new FormData();
        formData.append('resume', selectedFile);
        formData.append('jobUrl', jobUrl.trim());

        console.log('📤 Uploading:', {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          jobUrl: jobUrl.trim()
        });

        const response = await axios.post(
          `${API_BASE_URL}/job-matching/analyze-with-upload`,
          formData,
          { 
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            } 
          }
        );

        if (response.data.status === 'success') {
          setAnalysis(response.data.data.analysis);
          setShowHistory(false);
          await fetchHistory();
          await fetchResumes(); // Refresh resume list with newly uploaded resume
          // Reset upload mode
          setSelectedFile(null);
        }
      } else {
        // Use existing resume
        const response = await axios.post(
          `${API_BASE_URL}/job-matching/analyze`,
          {
            jobUrl: jobUrl.trim(),
            resumeId: selectedResume || undefined
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data.status === 'success') {
          setAnalysis(response.data.data.analysis);
          setShowHistory(false);
          await fetchHistory();
        }
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Show detailed error message
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || 'Failed to analyze job posting. Please check the URL and try again.';
      
      if (errorData?.hint) {
        errorMessage += '\n\n💡 ' + errorData.hint;
      }
      
      alert(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF or Word document');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleViewAnalysis = (analysisData) => {
    setAnalysis(analysisData);
    setShowHistory(false);
  };

  const handleDeleteAnalysis = async (id) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/job-matching/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      await fetchHistory();
      if (analysis?._id === id) {
        setAnalysis(null);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Failed to delete analysis');
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMatchBg = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Job Matching & Analysis
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analyze job postings and see how well you match with AI-powered insights
          </p>
        </div>

        {/* Analysis Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Analyze a Job Posting
          </h2>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Posting URL
              </label>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/3234567890"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                💡 Use valid job posting URLs from LinkedIn, Indeed, Naukri, or other major job boards
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Note: Some websites may block automated access. If scraping fails, try a different job board.
              </p>
            </div>

            {/* Resume Selection Mode Toggle */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Choose Resume Option
              </label>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode(false);
                    setSelectedFile(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    !uploadMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Use Existing Resume
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode(true);
                    setSelectedResume('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    uploadMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload New Resume
                </button>
              </div>

              {/* Existing Resume Selection */}
              {!uploadMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Resume
                  </label>
                  <select
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option key="empty" value="">Use most recent resume</option>
                    {resumes.map((resume) => (
                      <option key={resume._id} value={resume._id}>
                        {resume.originalName || resume.resumeName || 'Untitled Resume'} 
                        {resume.isBuiltResume ? ' (Built)' : ' (Uploaded)'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {resumes.length === 0 
                      ? 'No resumes found. Please upload or build a resume first.' 
                      : 'Select from your uploaded or built resumes'}
                  </p>
                </div>
              )}

              {/* New Resume Upload */}
              {uploadMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Resume File
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        selectedFile 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                      }`}>
                        <Upload className={`w-8 h-8 mx-auto mb-2 ${
                          selectedFile ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                        }`} />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedFile ? selectedFile.name : 'Click to upload resume'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          PDF or Word (Max 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    ✨ Upload a new resume and analyze it against the job posting instantly
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={analyzing || (uploadMode && !selectedFile)}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Briefcase className="w-5 h-5" />
                    {uploadMode ? 'Upload & Analyze' : 'Analyze Job Posting'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-6 py-3 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                {showHistory ? 'Hide History' : 'View History'}
              </button>
            </div>
          </form>
        </div>

        {/* History Section */}
        {showHistory && history.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Analyses</h2>
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => handleViewAnalysis(item)}>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.jobTitle}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.companyName} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getMatchColor(item.matchScore)}`}>
                        {item.matchScore}%
                      </span>
                      {item.matchGrade && (
                        <p className="text-sm mt-1">
                          <span className={getGradeBadgeClasses(item.matchGrade)}>{item.matchGrade}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnalysis(item._id);
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Match Score Card */}
            <div className={`${getMatchBg(analysis.matchScore)} rounded-lg shadow p-8 text-center`}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Overall Match Score</h2>
              <div className={`text-6xl font-bold ${getMatchColor(analysis.matchScore)} mb-4`}>
                {analysis.matchScore}%
              </div>
              {analysis.matchGrade && (
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Match Grade: <span className="uppercase tracking-wide">{analysis.matchGrade}</span>
                </p>
              )}
              {typeof analysis.atsScoreSnapshot === 'number' && (
                <p className="text-gray-700 dark:text-gray-300">
                  ATS Score: <span className="font-semibold">{analysis.atsScoreSnapshot}%</span>
                  {analysis.atsScoreSource && (
                    <span className="text-sm text-gray-500 dark:text-gray-400"> ({analysis.atsScoreSource})</span>
                  )}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300 text-lg mt-3">
                {GRADE_DESCRIPTIONS[analysis.matchGrade] ||
                  (analysis.matchScore >= 60
                    ? 'Solid match! Tailor your story to stand out.'
                    : 'Moderate match. Focus on building missing skills.')}
              </p>
            </div>

            {/* Breakdown + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.matchBreakdown && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="w-6 h-6 text-blue-600" />
                    Score Breakdown
                  </h2>
                  <div className="space-y-4">
                    {BREAKDOWN_CONFIG.map((section) => {
                      const value = analysis.matchBreakdown?.[section.key] || 0;
                      const percent = Math.min(100, Math.round((value / section.max) * 100));
                      return (
                        <div key={section.key}>
                          <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <span>{section.label}</span>
                            <span>{value}/{section.max}</span>
                          </div>
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div
                              className="h-3 rounded-full bg-blue-500 dark:bg-blue-400"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analysis.matchInsights?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-indigo-600" />
                    Match Insights
                  </h2>
                  <ul className="space-y-3">
                    {analysis.matchInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Job Details */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Job Details</h2>
              <div className="space-y-2">
                <p><span className="font-semibold dark:text-gray-300">Title:</span> <span className="dark:text-gray-400">{analysis.jobTitle}</span></p>
                {analysis.companyName && <p><span className="font-semibold dark:text-gray-300">Company:</span> <span className="dark:text-gray-400">{analysis.companyName}</span></p>}
                {analysis.location && <p><span className="font-semibold dark:text-gray-300">Location:</span> <span className="dark:text-gray-400">{analysis.location}</span></p>}
                {analysis.experience && <p><span className="font-semibold dark:text-gray-300">Experience:</span> <span className="dark:text-gray-400">{analysis.experience}</span></p>}
                {analysis.salary && <p><span className="font-semibold dark:text-gray-300">Salary:</span> <span className="dark:text-gray-400">{analysis.salary}</span></p>}
                {analysis.jobBoard && (
                  <p><span className="font-semibold dark:text-gray-300">Job Board:</span> <span className="dark:text-gray-400">{analysis.jobBoard}</span></p>
                )}
                {analysis.scrapeStrategy && (
                  <p><span className="font-semibold dark:text-gray-300">Scrape Method:</span> <span className="dark:text-gray-400 capitalize">{analysis.scrapeStrategy}</span></p>
                )}
                <a
                  href={analysis.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  View Original Posting <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Skills Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matching Skills */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Matching Skills ({analysis.matchingSkills?.length || 0})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {analysis.matchingSkills?.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!analysis.matchingSkills || analysis.matchingSkills.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400">No matching skills found</p>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                  <XCircle className="w-6 h-6" />
                  Missing Skills ({analysis.missingSkills?.length || 0})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills?.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!analysis.missingSkills || analysis.missingSkills.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400">You have all required skills!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Your Strengths
                </h2>
                <ul className="space-y-2">
                  {analysis.strengths?.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-6 h-6" />
                  Areas to Improve
                </h2>
                <ul className="space-y-2">
                  {analysis.areasToImprove?.map((area, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6" />
                Recommendations
              </h2>
              <ul className="space-y-3">
                {analysis.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{index + 1}.</span>
                    <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Courses */}
            {analysis.recommendedCourses && analysis.recommendedCourses.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Recommended Courses
                </h2>
                <div className="space-y-3">
                  {analysis.recommendedCourses.map((course, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{course.platform}</p>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{course.relevance}</p>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-2 text-sm"
                      >
                        View Course <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {analysis.aiAnalysis && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI Analysis Summary</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {analysis.aiAnalysis}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobMatching;
