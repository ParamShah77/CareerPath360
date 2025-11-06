import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Eye, Trash2, TrendingUp } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showSuccess, showError } from '../utils/toast';
import { API_BASE_URL } from '../utils/api';

const History = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        setAnalyses(response.data.data.analyses);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/analysis/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setAnalyses(analyses.filter(a => a._id !== id));
        showSuccess('Analysis deleted successfully');
      } catch (error) {
        console.error('Error deleting analysis:', error);
        showError('Failed to delete analysis');
      }
    }
  };

  const handleView = (analysisId) => {
    navigate('/analysis', { state: { analysisId } });
  };

  const getMatchColor = (percentage) => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const calculateStats = () => {
    if (analyses.length === 0) return { total: 0, average: 0, best: 0 };
    
    const percentages = analyses.map(a => a.matchPercentage);
    return {
      total: analyses.length,
      average: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
      best: Math.max(...percentages)
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mt-4">
            Loading your analyses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
            Analysis History
          </h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
            View and manage your past resume analyses
          </p>
        </div>
        <Button onClick={() => navigate('/upload')}>
          New Analysis
        </Button>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
              No analyses yet
            </h3>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
              Upload your first resume to get started with AI-powered career analysis
            </p>
            <Button onClick={() => navigate('/upload')}>
              Analyze Resume
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hover={false}>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">{stats.total}</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                  Total Analyses
                </p>
              </div>
            </Card>
            <Card hover={false}>
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{stats.average}%</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                  Average Match
                </p>
              </div>
            </Card>
            <Card hover={false}>
              <div className="text-center">
                <p className="text-3xl font-bold text-warning">{stats.best}%</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                  Best Match
                </p>
              </div>
            </Card>
          </div>

          {/* Analysis List */}
          <Card>
            <div className="space-y-4">
              {analyses.map((analysis) => {
                const resume = analysis.resumeId;
                const jobRole = analysis.targetJobRoleId;
                
                return (
                  <div
                    key={analysis._id}
                    className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border border-transparent dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                          <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary-light dark:text-white truncate">
                            {resume?.originalName || 'Resume'}
                          </h3>
                          <p className="text-sm text-text-secondary-light dark:text-gray-400 mt-1">
                            Target Role: {jobRole?.title || 'Unknown Role'}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-sm text-text-secondary-light dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {formatDate(analysis.createdAt)}
                            </div>
                            <Badge variant={getMatchColor(analysis.matchPercentage)}>
                              <TrendingUp className="w-3 h-3" />
                              {analysis.matchPercentage}% Match
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleView(analysis._id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDelete(analysis._id)}
                          className="text-error hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default History;
