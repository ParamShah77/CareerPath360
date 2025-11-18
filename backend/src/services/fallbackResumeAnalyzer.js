const { extractResumeText, extractSkillsFromText } = require('./skillExtractor');

const ACTION_VERBS = [
  'led', 'built', 'created', 'implemented', 'optimized', 'designed',
  'developed', 'managed', 'improved', 'reduced', 'increased', 'launched',
  'architected', 'executed', 'delivered', 'automated', 'deployed'
];

const KEYWORDS = [
  'javascript', 'typescript', 'python', 'node', 'react', 'angular', 'java',
  'aws', 'azure', 'gcp', 'cloud', 'api', 'microservices', 'docker',
  'kubernetes', 'sql', 'nosql', 'ai', 'ml', 'data'
];

const CONTACT_REGEX = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  phone: /\+?\d[\d\s().-]{8,}\d/g,
  links: /(linkedin\.com|github\.com|portfolio|behance\.net|dribbble\.com)/i
};

const SECTION_KEYWORDS = [
  'summary', 'profile', 'experience', 'work history', 'education',
  'skills', 'projects', 'certifications', 'achievements'
];

async function buildFallbackParsedDataFromFile(filePath) {
  const { text, wordCount, pages } = await extractResumeText(filePath);
  return buildFallbackParsedDataFromText(text, { pages, wordCount });
}

async function buildFallbackParsedDataFromText(text, meta = {}) {
  const cleanText = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    throw new Error('No textual content available for fallback parsing');
  }

  let skills = [];
  try {
    skills = await extractSkillsFromText(cleanText);
  } catch (error) {
    console.warn('⚠️ Fallback skill extraction failed:', error.message);
  }

  const breakdown = computeFallbackAts(cleanText, skills);

  return {
    extracted_skills: skills,
    summary: buildSummary(cleanText),
    total_words: meta.wordCount || cleanText.split(/\s+/).length,
    total_pages: meta.pages || 1,
    final_ats_score: breakdown.totalScore,
    score_breakdown: breakdown.components,
    sections_detected: breakdown.sectionsDetected,
    fallback_generated: true,
    raw_text_preview: cleanText.substring(0, 2500)
  };
}

function buildSummary(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 3);
  return sentences.join(' ').substring(0, 400);
}

function computeFallbackAts(text, skills = []) {
  const sectionsDetected = detectSections(text);
  const contactScore = computeContactScore(text);
  const formattingScore = computeFormattingScore(text, sectionsDetected);
  const skillScore = computeSkillScore(skills);
  const experienceScore = computeExperienceScore(text);
  const educationScore = computeEducationScore(text);
  const keywordScore = computeKeywordScore(text);

  const components = {
    contact: Math.round(contactScore),
    formatting: Math.round(formattingScore),
    skills: Math.round(skillScore),
    experience: Math.round(experienceScore),
    education: Math.round(educationScore),
    keywords: Math.round(keywordScore)
  };

  const totalScore = Math.max(
    35,
    Math.min(
      100,
      components.contact +
        components.formatting +
        components.skills +
        components.experience +
        components.education +
        components.keywords
    )
  );

  return { components, totalScore, sectionsDetected };
}

function detectSections(text) {
  const lower = text.toLowerCase();
  return SECTION_KEYWORDS.filter(section => lower.includes(section));
}

function computeContactScore(text) {
  let score = 0;
  if (CONTACT_REGEX.email.test(text)) score += 7;
  if (CONTACT_REGEX.phone.test(text)) score += 5;
  if (CONTACT_REGEX.links.test(text)) score += 3;
  return Math.min(score, 15);
}

function computeFormattingScore(text, sectionsDetected) {
  const sectionCoverage =
    (sectionsDetected.length / SECTION_KEYWORDS.length) * 20;
  const bulletCount = (text.match(/(?:•|-|\*)\s+[A-Za-z]/g) || []).length;
  const bulletScore = Math.min(bulletCount * 1.2, 6);
  return Math.min(sectionCoverage + bulletScore, 20);
}

function computeSkillScore(skills = []) {
  if (!Array.isArray(skills) || skills.length === 0) return 5;
  const uniqueCount = new Set(skills.map(s => s.toLowerCase())).size;
  return Math.min(uniqueCount, 15) / 15 * 25;
}

function computeExperienceScore(text) {
  const lower = text.toLowerCase();
  const verbMatches = ACTION_VERBS.filter(verb => lower.includes(verb)).length;
  const quantMatches = (text.match(/\b\d+%|\b\d+\s+(?:years|clients|users|projects)/gi) || []).length;
  const bulletCount = (text.match(/(?:•|-|\*)\s+[A-Za-z]/g) || []).length;

  const score = Math.min(verbMatches * 1.5 + quantMatches * 1.5 + bulletCount, 20);
  return Math.max(8, score);
}

function computeEducationScore(text) {
  const hasDegree = /\b(bachelor|master|ph\.?d|b\.tech|m\.tech|mba|university|college)\b/i.test(text);
  return hasDegree ? 10 : 6;
}

function computeKeywordScore(text) {
  const lower = text.toLowerCase();
  const hits = KEYWORDS.filter(keyword => lower.includes(keyword)).length;
  return Math.min((hits / KEYWORDS.length) * 12, 10);
}

async function applyFallbackParsing(resumeDoc) {
  if (!resumeDoc) {
    throw new Error('Resume document required for fallback parsing');
  }

  let fallbackData;
  if (resumeDoc.filePath) {
    fallbackData = await buildFallbackParsedDataFromFile(resumeDoc.filePath);
  } else if (resumeDoc.isBuiltResume && resumeDoc.builtResumeData) {
    const textFromBuilder = builtResumeDataToText(resumeDoc.builtResumeData);
    fallbackData = await buildFallbackParsedDataFromText(textFromBuilder);
  } else {
    throw new Error('Resume document missing file path or builder data for fallback parsing');
  }

  resumeDoc.parsedData = {
    ...(resumeDoc.parsedData || {}),
    ...fallbackData
  };
  resumeDoc.parseStatus = 'completed';
  resumeDoc.atsScore = fallbackData.final_ats_score;

  await resumeDoc.save();

  return fallbackData;
}

function builtResumeDataToText(data = {}) {
  const sections = [];
  const personal = data.personalInfo || {};
  sections.push(
    [personal.fullName, personal.headline, personal.summary].filter(Boolean).join(' - ')
  );

  (data.experience || []).forEach(exp => {
    sections.push([
      exp.title,
      exp.company,
      exp.location,
      formatDateRange(exp.startDate, exp.endDate, exp.current)
    ].filter(Boolean).join(' | '));
    if (exp.highlights) {
      sections.push(exp.highlights.join(' '));
    }
  });

  (data.education || []).forEach(edu => {
    sections.push([edu.degree, edu.school, edu.location, edu.grade].filter(Boolean).join(' | '));
  });

  const skillsSection = [
    ...(data.skills?.technical || []),
    ...(data.skills?.tools || []),
    ...(data.skills?.soft || [])
  ].join(', ');
  if (skillsSection) sections.push(`Skills: ${skillsSection}`);

  (data.projects || []).forEach(project => {
    sections.push([project.name, project.description, (project.technologies || []).join(', ')].filter(Boolean).join(' - '));
  });

  (data.certifications || []).forEach(cert => {
    sections.push([cert.name, cert.organization].filter(Boolean).join(' - '));
  });

  return sections.filter(Boolean).join('\n');
}

function formatDateRange(start, end, isCurrent) {
  if (!start) return null;
  if (isCurrent) return `${start} - Present`;
  return end ? `${start} - ${end}` : start;
}

module.exports = {
  buildFallbackParsedDataFromFile,
  applyFallbackParsing
};

