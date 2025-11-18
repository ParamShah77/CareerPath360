require('dotenv').config();
const mongoose = require('mongoose');
const JobRole = require('../models/JobRole');
const getMongoUri = require('../config/getMongoUri');

const jobRoles = [
  {
    title: 'Full Stack Developer',
    category: 'Software Development',
    description: 'Develops both client and server software. Proficient in front-end and back-end technologies.',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express', 'HTML', 'CSS', 'REST API', 'Git'],
    preferredSkills: ['TypeScript', 'Docker', 'AWS', 'Redis', 'GraphQL', 'Next.js'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 80000, max: 120000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: 15,
    isActive: true
  },
  {
    title: 'Frontend Developer',
    category: 'Software Development',
    description: 'Creates user-facing features using modern web technologies.',
    requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'Responsive Design', 'Git', 'REST API'],
    preferredSkills: ['TypeScript', 'Next.js', 'Tailwind CSS', 'Redux', 'Webpack', 'Jest'],
    experienceLevel: 'Entry Level',
    salaryRange: { min: 60000, max: 90000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 12,
    isActive: true
  },
  {
    title: 'Backend Developer',
    category: 'Software Development',
    description: 'Builds and maintains server-side logic and databases.',
    requiredSkills: ['Node.js', 'Express', 'MongoDB', 'SQL', 'REST API', 'Authentication', 'Git'],
    preferredSkills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Microservices', 'Docker'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 75000, max: 110000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 13,
    isActive: true
  },
  {
    title: 'Data Scientist',
    category: 'Data Science',
    description: 'Analyzes complex data to help companies make decisions.',
    requiredSkills: ['Python', 'Machine Learning', 'Statistics', 'Pandas', 'NumPy', 'SQL', 'Data Visualization'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'R', 'Big Data', 'Spark', 'Deep Learning'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 90000, max: 140000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: 20,
    isActive: true
  },
  {
    title: 'Machine Learning Engineer',
    category: 'Data Science',
    description: 'Designs and implements machine learning systems and algorithms.',
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Deep Learning', 'Statistics', 'Git'],
    preferredSkills: ['NLP', 'Computer Vision', 'MLOps', 'Docker', 'Kubernetes', 'AWS'],
    experienceLevel: 'Senior Level',
    salaryRange: { min: 110000, max: 170000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: 25,
    isActive: true
  },
  {
    title: 'DevOps Engineer',
    category: 'DevOps',
    description: 'Manages infrastructure, CI/CD pipelines, and deployment processes.',
    requiredSkills: ['Linux', 'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Git', 'Terraform'],
    preferredSkills: ['Jenkins', 'Ansible', 'Monitoring', 'Python', 'Shell Scripting', 'GCP'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 85000, max: 130000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 18,
    isActive: true
  },
  {
    title: 'UI/UX Designer',
    category: 'Design',
    description: 'Creates intuitive and visually appealing user interfaces.',
    requiredSkills: ['Figma', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    preferredSkills: ['Sketch', 'Adobe Photoshop', 'HTML/CSS', 'Motion Design', 'Usability Testing'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 70000, max: 100000, currency: 'USD' },
    demandLevel: 'Medium',
    growthRate: 10,
    isActive: true
  },
  {
    title: 'Product Manager',
    category: 'Product Management',
    description: 'Defines product strategy and roadmap based on market needs.',
    requiredSkills: ['Product Strategy', 'Agile', 'Stakeholder Management', 'User Stories', 'Market Research'],
    preferredSkills: ['SQL', 'Data Analytics', 'A/B Testing', 'Wireframing', 'Technical Background'],
    experienceLevel: 'Senior Level',
    salaryRange: { min: 100000, max: 150000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 14,
    isActive: true
  },
  {
    title: 'Cloud Architect',
    category: 'DevOps',
    description: 'Designs and oversees cloud computing strategies.',
    requiredSkills: ['AWS', 'Azure', 'GCP', 'Cloud Architecture', 'Networking', 'Security', 'Terraform'],
    preferredSkills: ['Kubernetes', 'Serverless', 'Microservices', 'Cost Optimization', 'Multi-cloud'],
    experienceLevel: 'Senior Level',
    salaryRange: { min: 120000, max: 180000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 22,
    isActive: true
  },
  {
    title: 'Mobile App Developer',
    category: 'Software Development',
    description: 'Develops applications for iOS and Android platforms.',
    requiredSkills: ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile UI', 'REST API', 'Git'],
    preferredSkills: ['Swift', 'Kotlin', 'Firebase', 'Push Notifications', 'App Store Deployment'],
    experienceLevel: 'Mid Level',
    salaryRange: { min: 75000, max: 115000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: 16,
    isActive: true
  }
];

const seedJobRoles = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = getMongoUri();
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing job roles
    await JobRole.deleteMany({});
    console.log('🗑️  Cleared existing job roles');

    // Insert new job roles
    const inserted = await JobRole.insertMany(jobRoles);
    console.log(`✅ Inserted ${inserted.length} job roles`);

    // Display inserted roles
    console.log('\n📋 Job Roles Added:');
    inserted.forEach((role, index) => {
      console.log(`${index + 1}. ${role.title} (${role.category})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding job roles:', error);
    process.exit(1);
  }
};

seedJobRoles();
