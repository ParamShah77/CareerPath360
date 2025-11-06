import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { API_BASE_URL } from '../utils/api';

import './styles.css';

import { 
  Save, Download, Eye, EyeOff, ArrowLeft, Sparkles, 
  User, FileText, Briefcase, GraduationCap, Award, Code, Users, Shield
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getTemplateComponent } from '../components/templates';
import OptimizationModal from '../components/OptimizationModal';

// Import section components
import PersonalInfoSection from '../components/resume/PersonalInfoSection';
import SummarySection from '../components/resume/SummarySection';
import ExperienceSection from '../components/resume/ExperienceSection';
import EducationSection from '../components/resume/EducationSection';
import SkillsSection from '../components/resume/SkillsSection';
import ProjectsSection from '../components/resume/ProjectsSection';
import CertificationsSection from '../components/resume/CertificationsSection';
import PositionsSection from '../components/resume/PositionsSection';

const ResumeBuilder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State Management
  const [selectedTemplate, setSelectedTemplate] = useState(searchParams.get('template') || 'classic');
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizedData, setOptimizedData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [resumeId, setResumeId] = useState(null);
  const [resumeName, setResumeName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [loading, setLoading] = useState(true);
  const [atsScore, setAtsScore] = useState(null);
  
  // Available templates
  const templates = [
    { id: 'classic', name: 'Classic' },
    { id: 'minimal-jake', name: 'Minimal (Jake)' },
    { id: 'techy-modern', name: 'Techy Modern' },
    { id: 'student-fresher', name: 'Student/Fresher' },
    { id: 'project-based', name: 'Project-Based' },
    { id: 'data-science', name: 'Data Science' },
    { id: 'developer', name: 'Developer' },
    { id: 'business-analyst', name: 'Business Analyst' },
    { id: 'designer', name: 'Designer' },
    { id: 'senior-professional', name: 'Senior Professional' }
  ];

  // Resume Data State
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      summary: ''
    },
    experience: [{
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: [''],
      technologies: []
    }],
    education: [{
      institution: '',
      degree: '',
      field: '',
      location: '',
      startDate: '',
      endDate: '',
      gpa: '',
      achievements: ['']
    }],
    skills: {
      technical: [],
      soft: [],
      languages: [],
      tools: []
    },
    projects: [{
      name: '',
      description: '',
      technologies: [],
      github: '',
      demo: '',
      highlights: ['']
    }],
    certifications: [{
      name: '',
      issuer: '',
      date: '',
      url: '',
      expiryDate: ''
    }],
    positionsOfResponsibility: [{
      title: '',
      organization: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ['']
    }]
  });

  // Section Configuration with Components
  const sections = [
    { 
      id: 'personalInfo', 
      name: 'Personal Info', 
      icon: User, 
      required: true,
      component: PersonalInfoSection 
    },
    { 
      id: 'summary', 
      name: 'Summary', 
      icon: FileText, 
      required: true,
      component: SummarySection 
    },
    { 
      id: 'experience', 
      name: 'Experience', 
      icon: Briefcase, 
      required: false,
      component: ExperienceSection 
    },
    { 
      id: 'education', 
      name: 'Education', 
      icon: GraduationCap, 
      required: true,
      component: EducationSection 
    },
    { 
      id: 'skills', 
      name: 'Skills', 
      icon: Award, 
      required: true,
      component: SkillsSection 
    },
    { 
      id: 'projects', 
      name: 'Projects', 
      icon: Code, 
      required: false,
      component: ProjectsSection 
    },
    { 
      id: 'positionsOfResponsibility', 
      name: 'Leadership', 
      icon: Users, 
      required: false,
      component: PositionsSection 
    },
    { 
      id: 'certifications', 
      name: 'Certifications', 
      icon: Shield, 
      required: false,
      component: CertificationsSection 
    }
  ];

  // ===== LOAD RESUME ON MOUNT =====
  useEffect(() => {
    loadResumeData();
  }, []); // ✅ Empty dependency array - only run once on mount

  // ===== DEBUG: Monitor resume data changes =====
  useEffect(() => {
    console.log('🔍 Current resume data:', resumeData);
    console.log('🔍 Active section:', activeSection);
    console.log('🔍 Active section data:', resumeData[activeSection]);
    console.log('🔍 URL params:', {
      edit: searchParams.get('edit'),
      id: searchParams.get('id'),
      template: searchParams.get('template')
    });
    console.log('🔍 Resume ID:', resumeId);
    console.log('🔍 Resume Name:', resumeName);
    console.log('🔍 Selected Template:', selectedTemplate);
  }, [resumeData, activeSection, searchParams, resumeId, resumeName, selectedTemplate]);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      
      // Get resume ID from URL query parameters (supports both 'id' and 'edit')
      const urlParams = new URLSearchParams(window.location.search);
      const resumeId = urlParams.get('edit') || urlParams.get('id');

      console.log('📝 Resume ID from URL:', resumeId);

      if (resumeId) {
        // Load specific resume from history for editing
        await loadResumeFromHistory(resumeId);
      } else {
        // ✅ Start with empty template - no auto-loading
        console.log('✨ Starting with fresh resume template');
      }
    } catch (error) {
      console.error('❌ Error loading resume data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResume = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('📥 Loading most recent resume...');

      const response = await axios.get(
        `${API_BASE_URL}/resume/my-resume`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.data) {
        const loadedData = response.data.data.resumeData || response.data.data;
        setResumeData(ensureDataStructure(loadedData));
        console.log('✅ Resume loaded successfully');
      } else {
        console.log('ℹ️ No resume found - using empty template');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No existing resume found - using empty template');
      } else if (error.response?.status === 401) {
        console.error('🔒 Session expired');
        alert('Session expired. Please login again.');
        navigate('/login');
      } else {
        console.error('❌ Error loading resume:', error);
      }
    }
  };

  const loadResumeFromHistory = async (resumeId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('📥 Loading resume from history:', resumeId);

      // Try built resume endpoint first (new format)
      let response;
      try {
        response = await axios.get(
          `${API_BASE_URL}/resume/built/${resumeId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (response.data.status === 'success') {
          const resume = response.data.data.resume;
          console.log('📦 Loaded built resume:', resume);
          
          // Set all resume data
          setResumeData(ensureDataStructure(resume.builtResumeData));
          setSelectedTemplate(resume.selectedTemplate || 'classic');
          setResumeName(resume.resumeName || '');
          setResumeId(resumeId);
          
          console.log('✅ Built resume loaded successfully');
          return;
        }
      } catch (err) {
        console.log('⚠️ Built resume endpoint failed, trying legacy endpoint...');
      }

      // Fallback to legacy endpoint (old format)
      try {
        response = await axios.get(
          `${API_BASE_URL}/resume/get/${resumeId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data.data) {
          // Extract resume data - handle different response structures
          const resumeData = response.data.data.resumeData || 
                            response.data.data.data ||
                            response.data.data;

          console.log('📦 Loaded legacy resume data:', resumeData);
          
          setResumeData(ensureDataStructure(resumeData));
          setResumeId(resumeId);
          
          console.log('✅ Resume from history loaded successfully');
          return;
        }
      } catch (err) {
        console.error('❌ Both endpoints failed:', err);
        throw new Error('Unable to load resume from any endpoint');
      }

      throw new Error('No data found in response');
      
    } catch (error) {
      console.error('❌ Error loading resume from history:', error);
      
      if (error.response?.status === 401) {
        alert('🔒 Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        alert('❌ Resume not found. It may have been deleted.');
        navigate('/builder');
      } else {
        alert('❌ Failed to load resume: ' + (error.response?.data?.message || error.message));
        navigate('/builder');
      }
    }
  };

  const ensureDataStructure = (data) => {
    // Handle if data is null/undefined/not an object
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Invalid data structure, using defaults');
      data = {};
    }

    return {
      personalInfo: {
        fullName: data.personalInfo?.fullName || '',
        email: data.personalInfo?.email || '',
        phone: data.personalInfo?.phone || '',
        location: data.personalInfo?.location || '',
        linkedin: data.personalInfo?.linkedin || '',
        github: data.personalInfo?.github || '',
        portfolio: data.personalInfo?.portfolio || '',
        summary: data.personalInfo?.summary || ''
      },
      experience: Array.isArray(data.experience) && data.experience.length > 0
        ? data.experience 
        : [{
            company: '',
            position: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: [''],
            technologies: []
          }],
      education: Array.isArray(data.education) && data.education.length > 0
        ? data.education 
        : [{
            institution: '',
            degree: '',
            field: '',
            location: '',
            startDate: '',
            endDate: '',
            gpa: '',
            achievements: ['']
          }],
      skills: {
        technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
        tools: Array.isArray(data.skills?.tools) ? data.skills.tools : [],
        soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
        languages: Array.isArray(data.skills?.languages) ? data.skills.languages : []
      },
      projects: Array.isArray(data.projects) && data.projects.length > 0
        ? data.projects 
        : [{
            name: '',
            description: '',
            technologies: [],
            github: '',
            demo: '',
            highlights: ['']
          }],
      certifications: Array.isArray(data.certifications) && data.certifications.length > 0
        ? data.certifications 
        : [{
            name: '',
            issuer: '',
            date: '',
            url: '',
            expiryDate: ''
          }],
      positionsOfResponsibility: Array.isArray(data.positionsOfResponsibility) && data.positionsOfResponsibility.length > 0
        ? data.positionsOfResponsibility 
        : [{
            title: '',
            organization: '',
            startDate: '',
            endDate: '',
            current: false,
            description: ['']
          }]
    };
  };

  // ===== RENDER ACTIVE SECTION =====
  const renderActiveSection = () => {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;

    const Component = section.component;

    // ✅ Special handling for summary section
    if (section.id === 'summary') {
      return (
        <Component
          data={resumeData.personalInfo?.summary || ''}
          onChange={(summary) => 
            setResumeData({
              ...resumeData,
              personalInfo: { ...resumeData.personalInfo, summary }
            })
          }
        />
      );
    }

    // Regular handling for other sections
    return (
      <Component
        data={resumeData[section.id]}
        onChange={(data) => {
          setResumeData({ ...resumeData, [section.id]: data });
        }}
      />
    );
  };

  // AI Optimization Function
  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to use AI optimization');
        return;
      }

      console.log('🤖 Optimizing resume...');

      const response = await axios.post(
        `${API_BASE_URL}/resume/ai-optimize`, // ✅ Correct endpoint
        { resumeData },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        const optimized = response.data.data.optimizedData;
        const score = response.data.data.atsScore;
        const improvements = response.data.data.improvements || [];
        
        // Store original data for comparison
        setOptimizedData({
          original: resumeData,
          optimized: optimized,
          improvements: improvements
        });
        
        // Update resume data
        setResumeData(optimized);
        setAtsScore(score);
        
        // Show optimization modal
        setShowOptimizationModal(true);
        
        toast.success('Resume optimized with AI! 🎉', {
          description: `ATS Score: ${score}/100 - ${improvements.length} improvements made`
        });
      }
    } catch (error) {
      console.error('❌ Optimization error:', error);
      toast.error('Failed to optimize resume', {
        description: error.response?.data?.message || error.message
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimization = (updatedData) => {
    setResumeData(updatedData);
    setOptimizedData(null);
    setShowOptimizationModal(false);
    alert('✅ Optimization applied successfully!');
  };

  const handleSave = async () => {
    if (!resumeId && !resumeName) {
      setShowNameModal(true);
      return;
    }
    await saveResume();
  };

  const saveResume = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      // Validate required fields
      if (!resumeData.personalInfo.fullName || !resumeData.personalInfo.email || !resumeData.personalInfo.phone) {
        alert('❌ Please fill in all required personal information fields (Name, Email, Phone)');
        setSaving(false);
        return;
      }

      if (!resumeData.education[0]?.institution || !resumeData.education[0]?.degree) {
        alert('❌ Please add at least one education entry with institution and degree');
        setSaving(false);
        return;
      }

      if (!resumeData.skills.technical || resumeData.skills.technical.length === 0) {
        alert('❌ Please add at least one technical skill');
        setSaving(false);
        return;
      }

      if (!resumeData.personalInfo.summary || resumeData.personalInfo.summary.trim().length < 50) {
        alert('❌ Please add a professional summary (at least 50 characters)');
        setSaving(false);
        return;
      }

      let response;
      
      if (resumeId) {
        console.log('📝 Updating resume:', resumeId);
        response = await axios.put(
          `${API_BASE_URL}/resume/built/${resumeId}`,
          {
            resumeName: resumeName || `${resumeData.personalInfo.fullName}'s Resume`,
            builtResumeData: resumeData,
            selectedTemplate: selectedTemplate
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        console.log('🆕 Creating new resume');
        response = await axios.post(
          `${API_BASE_URL}/resume/build`,
          {
            resumeName: resumeName || `${resumeData.personalInfo.fullName}'s Resume`,
            builtResumeData: resumeData,
            selectedTemplate: selectedTemplate
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (response.data.status === 'success') {
          const newResumeId = response.data.data.resume.id;
          setResumeId(newResumeId);
          console.log('✅ Resume created with ID:', newResumeId);
          window.history.replaceState(null, '', `/builder?edit=${newResumeId}&template=${selectedTemplate}`);
        }
      }

      if (response.data.status === 'success') {
        alert('✅ Resume saved successfully!');
        setShowNameModal(false);
        console.log('💾 Save successful:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      
      if (error.response?.status === 401) {
        alert('❌ Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.data?.message) {
        alert(`❌ Error: ${error.response.data.message}`);
      } else {
        alert('❌ Error saving resume. Please check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!resumeData.personalInfo.fullName) {
      alert('Please fill in your name before exporting');
      return;
    }

    try {
      setExporting(true);
      
      const element = document.getElementById('resume-preview');
      
      if (!element) {
        alert('Preview element not found. Please ensure preview is visible.');
        setExporting(false);
        return;
      }

      const fileName = resumeName || `${resumeData.personalInfo.fullName}_Resume`;

      // Wait a moment for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 300));

      const options = {
        margin: [0.5, 0.5, 0.5, 0.5],  // Add proper margins
        filename: `${fileName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: element.scrollWidth,  // Use scroll width to capture full content
          height: element.scrollHeight,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['h1', 'h2', 'h3']
        }
      };

      console.log('📄 Exporting PDF...');
      console.log('📄 Element dimensions:', element.scrollWidth, 'x', element.scrollHeight);

      await html2pdf()
        .set(options)
        .from(element)
        .save();
    
      alert('✅ PDF downloaded successfully!');
    
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportHTML = async () => {
    if (!resumeData.personalInfo.fullName) {
      alert('Please fill in your name before exporting');
      return;
    }

    try {
      setExporting(true);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to export resume');
        navigate('/login');
        return;
      }

      console.log('📄 Exporting HTML...');

      const response = await axios.post(
        `${API_BASE_URL}/resume/export-html`,
        {
          resumeData,
          template: selectedTemplate
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );

      // Create blob and download link
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use resume name or full name for filename
      const fileName = resumeName || `${resumeData.personalInfo.fullName}_Resume`;
      link.setAttribute('download', `${fileName.replace(/[^a-z0-9]/gi, '_')}.html`);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ HTML exported successfully');
      alert('✅ HTML file downloaded successfully!\n\n💡 You can:\n• Open in any browser\n• Print to PDF (Ctrl+P)\n• Host on a website\n• Send via email');

    } catch (error) {
      console.error('❌ HTML export error:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        alert('Export service not found. Please contact support.');
      } else {
        alert('Failed to export HTML: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setExporting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in p-6">
      {/* Resume Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
              Name Your Resume
            </h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
              Give your resume a memorable name so you can easily identify it later.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
                Resume Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                placeholder="e.g., Software Engineer Resume 2025"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && resumeName.trim()) {
                    saveResume();
                  }
                }}
              />
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
                Example: "Tech Job Resume", "Marketing Manager Resume", "Internship Application"
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowNameModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={saveResume}
                disabled={!resumeName.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Resume'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/dashboard')}
            className="mb-2"
          >
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
              Resume Builder
            </h1>
            {resumeId && <Badge variant="success">Editing</Badge>}
          </div>
          {resumeName && (
            <p className="text-text-secondary-light dark:text-text-secondary-dark mt-1">
              <span className="font-semibold">{resumeName}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="ghost"
            icon={showPreview ? EyeOff : Eye}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleOptimize}
            disabled={optimizing || saving || exporting}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0"
          >
            {optimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Optimizing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI Optimize
              </>
            )}
          </Button>
          
          {/* ✅ NEW: HTML Export Button */}
          <Button
            variant="outline"
            onClick={handleExportHTML}
            disabled={exporting || saving || optimizing}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Exporting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export HTML
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            icon={exporting ? undefined : Download}
            onClick={handleExportPDF}
            disabled={exporting || optimizing || saving}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Generating PDF...
              </>
            ) : (
              'Export PDF'
            )}
          </Button>
          
          <Button
            variant="primary"
            icon={saving ? undefined : Save}
            onClick={handleSave}
            disabled={saving || exporting || optimizing}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                {resumeId ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              resumeId ? 'Update Resume' : 'Save Resume'
            )}
          </Button>
        </div>
      </div>

      {/* Template Selector */}
      <Card>
        <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
          Select Template
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedTemplate === template.id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium text-center">
                {template.name}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel with Section Components */}
        <div className="space-y-6">
          {/* Section Navigation */}
          <Card>
            <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
              Resume Sections
            </h3>
            <div className="flex flex-wrap gap-2">
              {sections.map(section => {
                const IconComponent = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSection(section.id)}
                    className="flex items-center gap-2"
                  >
                    <IconComponent className="w-4 h-4" />
                    {section.name}
                    {section.required && <span className="text-error ml-1">*</span>}
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Active Section Content */}
          <Card>
            <h2 className="text-lg font-semibold mb-6 text-text-primary-light dark:text-text-primary-dark">
              {sections.find(s => s.id === activeSection)?.name}
            </h2>
            {renderActiveSection()}
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 lg:h-screen overflow-auto">
            <Card title="Live Preview" subtitle="Real-time preview of your resume">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div
                  id="resume-preview"
                  className="bg-white shadow-xl mx-auto"
                  style={{ width: '8.5in', minHeight: '11in' }}
                >
                  {(() => {
                    try {
                      const TemplateComponent = getTemplateComponent(selectedTemplate);
                      return <TemplateComponent data={resumeData} />;
                    } catch (error) {
                      console.error('Template error:', error);
                      return (
                        <div className="p-8 text-center text-gray-400">
                          <p>Template preview loading...</p>
                          <p className="text-sm mt-2">Selected: {selectedTemplate}</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  Template: <span className="font-semibold">{selectedTemplate}</span>
                  {resumeId && <span className="text-success ml-2">● Saved</span>}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Optimization Modal */}
      <OptimizationModal
        isOpen={showOptimizationModal}
        onClose={() => setShowOptimizationModal(false)}
        optimizationData={optimizedData}
      />
    </div>
  );
};

export default ResumeBuilder;
