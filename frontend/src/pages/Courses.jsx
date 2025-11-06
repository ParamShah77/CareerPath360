import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Star, Clock, Award, Filter } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    platform: 'all',
    free: false
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, courses]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/courses`);
      
      if (response.data.status === 'success') {
        setCourses(response.data.data.courses);
        setFilteredCourses(response.data.data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...courses];

    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(c => c.difficulty === filters.difficulty);
    }

    if (filters.platform !== 'all') {
      filtered = filtered.filter(c => c.platform === filters.platform);
    }

    if (filters.free) {
      filtered = filtered.filter(c => c.price.isFree);
    }

    setFilteredCourses(filtered);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'Udemy': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'Coursera': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'edX': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mt-4">
            Loading courses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark">
          Course Recommendations
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Curated learning paths to boost your career
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
            Filters
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              Difficulty
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark"
            >
              <option value="all">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              Platform
            </label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark"
            >
              <option value="all">All Platforms</option>
              <option value="Udemy">Udemy</option>
              <option value="Coursera">Coursera</option>
              <option value="edX">edX</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Free Courses Toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.free}
                onChange={(e) => setFilters({ ...filters, free: e.target.checked })}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-400"
              />
              <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
                Free courses only
              </span>
            </label>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {filteredCourses.length} courses found
            </p>
          </div>
        </div>
      </Card>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-text-secondary-light dark:text-text-secondary-dark">
              No courses found matching your filters
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course._id} hover={true}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-text-primary-light dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-text-secondary-light dark:text-gray-400 mb-3 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                  {course.price.isFree && (
                    <Badge variant="success">FREE</Badge>
                  )}
                </div>

                {/* Instructor & Platform */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPlatformColor(course.platform)}`}>
                    {course.platform}
                  </span>
                  <span className="text-text-secondary-light dark:text-gray-400">
                    by {course.instructor}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-text-secondary-light dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span>{course.rating}</span>
                    <span>({course.reviewCount.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  {course.certificate && (
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-primary-500" />
                      <span>Certificate</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2">
                  {course.relatedSkills.slice(0, 4).map((skill, index) => (
                    <Badge key={index} variant="default">
                      {skill}
                    </Badge>
                  ))}
                  {course.relatedSkills.length > 4 && (
                    <Badge variant="default">
                      +{course.relatedSkills.length - 4} more
                    </Badge>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Badge variant={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    {!course.price.isFree && (
                      <span className="text-lg font-bold text-primary-500">
                        ${course.price.amount}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => window.open(course.url, '_blank')}
                  >
                    Enroll Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
