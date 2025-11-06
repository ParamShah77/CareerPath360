// Environment configuration
const config = {
  // API URLs
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  mlApiUrl: import.meta.env.VITE_ML_API_URL || 'http://localhost:8000',
  
  // Environment
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
};

export default config;
