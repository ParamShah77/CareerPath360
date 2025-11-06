import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';
import { API_BASE_URL } from '../utils/api';

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    fetchJobRoles();
  }, []);

  const fetchJobRoles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/job-roles`);
      if (response.data.status === 'success') {
        setJobRoles(response.data.data.jobRoles);
      }
    } catch (error) {
      console.error('Error fetching job roles:', error);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        showWarning('Please upload a PDF or DOCX file');
        return;
      }

      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        showWarning('File size must be less than 5MB');
        return;
      }

      setFile(selectedFile);
      setUploadStatus(null);
      showInfo(`File "${selectedFile.name}" selected successfully`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      showWarning('Please upload a resume file');
      return;
    }

    if (!selectedRole) {
      showWarning('Please select a target job role');
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    showInfo('Uploading resume...');

    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Upload resume
      const formData = new FormData();
      formData.append('resume', file);

      const uploadResponse = await axios.post(
        `${API_BASE_URL}/resume/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (uploadResponse.data.status === 'success') {
        const resumeId = uploadResponse.data.data.resume.id;
        
        setUploadStatus('analyzing');
        showInfo('Analyzing resume with AI...');

        // Step 2: Create analysis
        const analysisResponse = await axios.post(
          `${API_BASE_URL}/analysis`,
          {
            resumeId: resumeId,
            targetJobRoleId: selectedRole
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (analysisResponse.data.status === 'success') {
          setUploadStatus('success');
          setAnalysisResult(analysisResponse.data.data.analysis);
          
          // Show ATS score in toast
          const atsScore = analysisResponse.data.data.analysis.feedback?.atsScore || 'N/A';
          const matchPercentage = analysisResponse.data.data.analysis.matchPercentage;
          
          showSuccess(`Analysis complete! ATS Score: ${atsScore}% | Job Match: ${matchPercentage}%`);
          
          // Navigate to analysis page
          navigate('/analysis', { 
            state: { 
              analysisId: analysisResponse.data.data.analysis._id 
            } 
          });
        }
      }

    } catch (error) {
      setUploadStatus('error');
      console.error('Upload/Analysis error:', error);
      showError(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
          Analyze Your Resume
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Upload your resume and select a target job role to get AI-powered insights
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <Card title="Upload Resume" subtitle="PDF or DOCX format, max 5MB">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              file
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500'
            }`}
          >
            {!file ? (
              <>
                <UploadIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                  Drop your resume here
                </h3>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload">
                  <Button type="button" onClick={() => document.getElementById('resume-upload').click()}>
                    Choose File
                  </Button>
                </label>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-4">
                  Supported formats: PDF, DOCX • Max size: 5MB
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <FileText className="w-16 h-16 text-primary-500 mx-auto" />
                <div>
                  <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    {file.name}
                  </p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFile(null)}
                >
                  Change File
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Job Role Selection */}
        <Card title="Select Target Job Role" subtitle="Choose the position you're applying for">
          <div className="space-y-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              required
            >
              <option value="">Select a job role...</option>
              {jobRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title} - {role.category} ({role.experienceLevel})
                </option>
              ))}
            </select>

            {selectedRole && (
              <div className="p-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
                <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
                  <strong>Selected:</strong>{' '}
                  {jobRoles.find(r => r.id === selectedRole)?.title}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Status Messages */}
        {uploadStatus && (
          <Card>
            <div className="text-center py-6">
              {uploadStatus === 'uploading' && (
                <>
                  <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Uploading resume...
                  </p>
                </>
              )}

              {uploadStatus === 'analyzing' && (
                <>
                  <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Analyzing your resume...
                  </p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                    This may take a few seconds
                  </p>
                </>
              )}

              {uploadStatus === 'success' && analysisResult && (
                <>
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <p className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                    Analysis Complete!
                  </p>
                  <div className="space-y-1">
                    <p className="text-lg text-primary-500 font-semibold">
                      ATS Score: {analysisResult.feedback?.atsScore || 'N/A'}%
                    </p>
                    <p className="text-lg text-primary-500 font-semibold">
                      Job Match: {analysisResult.matchPercentage}%
                    </p>
                  </div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-3">
                    Redirecting to results...
                  </p>
                </>
              )}

              {uploadStatus === 'error' && (
                <>
                  <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
                  <p className="text-lg font-semibold text-error mb-2">
                    Upload Failed
                  </p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Please try again
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Submit Button */}
        {!uploadStatus && (
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={!file || !selectedRole || uploading}
              className="flex-1"
            >
              {uploading ? 'Processing...' : 'Analyze Resume'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Upload;
