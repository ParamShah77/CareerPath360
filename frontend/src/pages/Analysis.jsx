import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, TrendingUp, Award, Target, BookOpen, Download, ArrowLeft } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.analysisId) {
      fetchAnalysis(location.state.analysisId);
    } else {
      navigate('/history');
    }
  }, [location, navigate]);

  const fetchAnalysis = async (analysisId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/analysis/${analysisId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        setAnalysis(response.data.data.analysis);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      alert('Failed to load analysis');
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  };

  const getScoreBgColor = (score) => {
    if (score >= 75) return 'bg-success/10';
    if (score >= 50) return 'bg-warning/10';
    return 'bg-error/10';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-4">Loading analysis...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <p className="text-text-secondary-light dark:text-text-secondary-dark">Analysis not found</p>
      </div>
    );
  }

  const atsScore = analysis.feedback?.atsScore || 0;
  const scoreBreakdown = analysis.feedback?.scoreBreakdown || {};

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">
      {/* Back Button */}
      <Button
        variant="ghost"
        icon={ArrowLeft}
        onClick={() => navigate('/history')}
      >
        Back to History
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
          Resume Analysis Results
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Target Role: <span className="font-semibold text-primary-500">
            {analysis.targetJobRoleId?.title || 'Unknown Role'}
          </span>
        </p>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Analyzed on {new Date(analysis.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* ATS Score - Main Highlight */}
      <Card>
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-primary-500" />
            <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
              ATS Compatibility Score
            </h2>
          </div>
          
          <div className={`text-7xl font-bold mb-4 ${getScoreColor(atsScore)}`}>
            {atsScore}%
          </div>
          
          <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark mb-6">
            {atsScore >= 75 ? 'Excellent! Your resume is highly optimized for ATS systems' :
             atsScore >= 50 ? 'Good, but there\'s room for improvement' :
             'Needs improvement to pass ATS filters'}
          </p>

          <div className={`inline-block px-6 py-3 rounded-full ${getScoreBgColor(atsScore)}`}>
            <span className={`font-semibold ${getScoreColor(atsScore)}`}>
              {atsScore >= 75 ? '✓ ATS Optimized' :
               atsScore >= 50 ? '⚠ Moderately Optimized' :
               '✗ Needs Optimization'}
            </span>
          </div>
        </div>
      </Card>

      {/* Score Breakdown */}
      {Object.keys(scoreBreakdown).length > 0 && (
        <Card title="Detailed Score Breakdown" subtitle="How your resume performs in each category">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contact Information */}
            {scoreBreakdown.contact_information && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Contact Info
                  </h3>
                  <Badge variant={scoreBreakdown.contact_information.score >= 75 ? 'success' : 'warning'}>
                    {scoreBreakdown.contact_information.score}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      scoreBreakdown.contact_information.score >= 75 ? 'bg-success' : 'bg-warning'
                    }`}
                    style={{ width: `${scoreBreakdown.contact_information.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {scoreBreakdown.contact_information.status === 'complete' ? 
                    'All contact details present' : 
                    'Missing some contact information'}
                </p>
              </div>
            )}

            {/* Skills */}
            {scoreBreakdown.skills && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Skills
                  </h3>
                  <Badge variant={scoreBreakdown.skills.score >= 75 ? 'success' : 'warning'}>
                    {Math.round(scoreBreakdown.skills.score)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      scoreBreakdown.skills.score >= 75 ? 'bg-success' : 'bg-warning'
                    }`}
                    style={{ width: `${scoreBreakdown.skills.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {scoreBreakdown.skills.total_skills} technical skills found
                </p>
              </div>
            )}

            {/* Content Quality */}
            {scoreBreakdown.content_quality && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Content Quality
                  </h3>
                  <Badge variant={scoreBreakdown.content_quality.score >= 75 ? 'success' : 'warning'}>
                    {Math.round(scoreBreakdown.content_quality.score)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      scoreBreakdown.content_quality.score >= 75 ? 'bg-success' : 'bg-warning'
                    }`}
                    style={{ width: `${scoreBreakdown.content_quality.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {scoreBreakdown.content_quality.word_count} words
                  {scoreBreakdown.content_quality.action_verbs && 
                    ` • ${scoreBreakdown.content_quality.action_verbs} action verbs`}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Job Role Match Score */}
      <Card>
        <div className="text-center py-6">
          <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center justify-center gap-2">
            <Target className="w-6 h-6 text-primary-500" />
            Job Role Match Score
          </h2>
          <div className={`text-5xl font-bold mb-2 ${getScoreColor(analysis.matchPercentage)}`}>
            {analysis.matchPercentage}%
          </div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
            Match with {analysis.targetJobRoleId?.title}
          </p>
        </div>
      </Card>

      {/* Skills Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matching Skills */}
        <Card title="Matching Skills" subtitle={`${analysis.matchingSkills?.length || 0} skills found`}>
          {analysis.matchingSkills && analysis.matchingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.matchingSkills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                    {skill}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary-light dark:text-text-secondary-dark">
              No matching skills found
            </p>
          )}
        </Card>

        {/* Missing Skills */}
        <Card title="Skills to Develop" subtitle={`${analysis.missingSkills?.length || 0} skills needed`}>
          {analysis.missingSkills && analysis.missingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-error/10 rounded-lg"
                >
                  <XCircle className="w-4 h-4 text-error" />
                  <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                    {skill}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-success">
              Great! You have all required skills for this role.
            </p>
          )}
        </Card>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card title="Recommendations" subtitle="Actions to improve your profile">
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
              >
                <TrendingUp className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-text-primary-light dark:text-text-primary-dark">
                    {rec.title}
                  </p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                    {rec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feedback */}
      {analysis.feedback?.overallAssessment && (
        <Card title="Overall Assessment">
          <p className="text-text-primary-light dark:text-text-primary-dark leading-relaxed">
            {analysis.feedback.overallAssessment}
          </p>

          {analysis.feedback.strengths && analysis.feedback.strengths.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                Strengths:
              </h4>
              <ul className="space-y-2">
                {analysis.feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      {strength}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.feedback.improvements && analysis.feedback.improvements.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                Areas for Improvement:
              </h4>
              <ul className="space-y-2">
                {analysis.feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      {improvement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Course Recommendations */}
      {/* Course Recommendations */}
{analysis.recommendedCourses && analysis.recommendedCourses.length > 0 && (
  <Card>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary-500" />
          Recommended Courses
        </h3>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {analysis.recommendedCourses.length} courses to develop missing skills
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => navigate('/courses')}
      >
        Browse All Courses
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {analysis.recommendedCourses.slice(0, 4).map((course) => (
        <div
          key={course._id}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-400 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
              {course.title}
            </h4>
            <Badge variant={course.price?.isFree ? 'success' : 'primary'}>
              {course.price?.isFree ? 'Free' : `$${course.price?.amount}`}
            </Badge>
          </div>
          
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
            {course.platform} • {course.instructor}
          </p>
          
          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <span className="text-warning">★</span>
              <span>{course.rating}</span>
            </div>
            <span className="text-text-secondary-light dark:text-text-secondary-dark">
              {course.duration}
            </span>
            <Badge variant={
              course.difficulty === 'Beginner' ? 'success' :
              course.difficulty === 'Intermediate' ? 'warning' : 'error'
            }>
              {course.difficulty}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {course.relatedSkills?.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded"
              >
                {skill}
              </span>
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(course.url, '_blank')}
            className="w-full"
          >
            View Course
          </Button>
        </div>
      ))}
    </div>
  </Card>
)}


      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="primary"
          icon={Download}
          onClick={() => alert('Export feature coming soon!')}
          className="flex-1"
        >
          Export Report
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/upload')}
          className="flex-1"
        >
          Analyze Another Resume
        </Button>
      </div>
    </div>
  );
};

export default Analysis;
