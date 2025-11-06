import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Star } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

const CourseRecommendations = ({ missingSkills }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (missingSkills && missingSkills.length > 0) {
      fetchRecommendations();
    }
  }, [missingSkills]);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/courses/recommendations`,
        { skills: missingSkills },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        setCourses(response.data.data.allCourses.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching course recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-text-secondary-light dark:text-text-secondary-dark">
          No course recommendations available
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {courses.map((course) => (
        <div
          key={course._id}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 transition-colors"
        >
          <h4 className="font-semibold text-text-primary-light dark:text-white mb-2 line-clamp-2">
            {course.title}
          </h4>
          <p className="text-sm text-text-secondary-light dark:text-gray-400 mb-3">
            {course.platform} • {course.instructor}
          </p>
          
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="text-sm">{course.rating}</span>
            <Badge variant="success" className="text-xs">
              {course.difficulty}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={ExternalLink}
            onClick={() => window.open(course.url, '_blank')}
            className="w-full"
          >
            View Course
          </Button>
        </div>
      ))}
    </div>
  );
};

export default CourseRecommendations;
