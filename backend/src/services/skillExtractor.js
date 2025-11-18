const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const JSON5 = require('json5');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Handle pdf-parse import (can be default export or named)
let pdfParseModule = require('pdf-parse');
let pdfParse = pdfParseModule;
if (pdfParseModule && typeof pdfParseModule !== 'function') {
  if (typeof pdfParseModule.default === 'function') {
    pdfParse = pdfParseModule.default;
  } else if (typeof pdfParseModule.pdfParse === 'function') {
    pdfParse = pdfParseModule.pdfParse;
  }
}

let genAI;

function getGenerativeModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for skill extraction');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

async function extractResumeText(filePath) {
  if (!filePath) {
    throw new Error('No file path provided for text extraction');
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!ext || ext === '.pdf') {
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module is not properly loaded');
    }
    const buffer = await fs.promises.readFile(filePath);
    const pdfData = await pdfParse(buffer);
    return normalizeExtractedText(pdfData.text, pdfData.numpages || 1);
  }

  if (ext === '.docx') {
    const buffer = await fs.promises.readFile(filePath);
    const docxData = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(docxData.value, 1);
  }

  throw new Error(`Fallback parser currently supports only PDF/DOCX files (received ${ext || 'unknown'})`);
}

async function extractSkillsFromText(text) {
  if (!text) {
    return [];
  }

  try {
    const model = getGenerativeModel();
    const prompt = `Extract every technical skill, tool, framework, cloud/platform, programming language, database, methodology, and relevant soft skill mentioned in the following resume text. 
Return ONLY a JSON array of unique skill names (strings). Do not include explanations or duplicates.

Resume Text:
${text.substring(0, 3500)}

Return format: ["skill1", "skill2", ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text()
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('Gemini response missing JSON array');
    }

    try {
      const arr = JSON.parse(match[0]);
      return normalizeSkills(arr);
    } catch (err) {
      const arr = JSON5.parse(match[0]);
      return normalizeSkills(arr);
    }
  } catch (error) {
    console.error('⚠️ Skill extraction via AI failed:', error.message);
    return [];
  }
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const normalized = new Set();

  skills.forEach(skill => {
    if (typeof skill === 'string') {
      const trimmed = skill.trim();
      if (trimmed.length > 1) {
        normalized.add(trimmed);
      }
    }
  });

  return Array.from(normalized);
}

async function extractSkillsFromFile(filePath) {
  const { text, pages, wordCount } = await extractResumeText(filePath);
  const skills = await extractSkillsFromText(text);

  return {
    skills,
    text,
    pages,
    wordCount
  };
}

function normalizeExtractedText(rawText = '', pages = 1) {
  const text = (rawText || '').replace(/\s+/g, ' ').trim();

  if (!text || text.length < 50) {
    throw new Error('Unable to extract sufficient text from resume');
  }

  return {
    text,
    pages,
    wordCount: text.split(/\s+/).length
  };
}

module.exports = {
  extractResumeText,
  extractSkillsFromText,
  extractSkillsFromFile
};

