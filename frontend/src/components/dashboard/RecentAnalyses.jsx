import React, { useEffect, useState } from 'react';
import { FileText, Calendar, Eye, TrendingUp } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

const RecentAnalyses = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, [refreshTrigger]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      console.log('🔄 Fetching analyses...'); // Debug log
      
      const response = await axios.get(`${API_BASE_URL}/analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Response:', response.data); // Debug log

      if (response.data.status === 'success') {
        setAnalyses(response.data.data.analyses);
        console.log('✅ Analyses loaded:', response.data.data.analyses.length);
      }
    } catch (error) {
      console.error('❌ Error fetching analyses:', error);
      setError(error.response?.data?.message || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getMatchBadgeVariant = (percentage) => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card title="Recent Analyses" subtitle="Your latest resume analysis results">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mt-4">
            Loading analyses...
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Recent Analyses" subtitle="Your latest resume analysis results">
        <div className="text-center py-8">
          <p className="text-error mb-4">Error: {error}</p>
          <Button onClick={fetchAnalyses}>Retry</Button>
        </div>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card title="Recent Analyses" subtitle="Your latest resume analysis results">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
            No analyses yet
          </h3>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
            Upload your first resume to get AI-powered career insights
          </p>
          <Button onClick={() => navigate('/upload')}>
            Analyze Resume
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recent Analyses" subtitle="Your latest resume analysis results">
      <div className="space-y-4">
        {analyses.slice(0, 3).map((analysis) => {
          const resume = analysis.resumeId;
          const jobRole = analysis.targetJobRoleId;
          
          return (
            <div
              key={analysis._id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => navigate('/analysis', { state: { analysisId: analysis._id } })}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-md">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary-light dark:text-white truncate">
                    {resume?.originalName || 'Resume'}
                  </p>
                  <p className="text-sm text-text-secondary-light dark:text-gray-400">
                    {jobRole?.title || 'Job Role'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-text-secondary-light dark:text-gray-500" />
                    <span className="text-xs text-text-secondary-light dark:text-gray-400">
                      {formatDate(analysis.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getMatchBadgeVariant(analysis.matchPercentage)}>
                  <TrendingUp className="w-3 h-3" />
                  {analysis.matchPercentage}% Match
                </Badge>
                <Button variant="ghost" size="sm" icon={Eye}>
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      
      {analyses.length > 3 && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate('/history')}>
            View All Analyses ({analyses.length})
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RecentAnalyses;
