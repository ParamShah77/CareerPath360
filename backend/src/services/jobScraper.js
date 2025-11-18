const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

let seleniumDriverAvailable = false;
let buildSeleniumDriver;

try {
  // Lazy-load selenium only when dependency is installed and enabled
  require('chromedriver');
  const { Builder } = require('selenium-webdriver');
  const chrome = require('selenium-webdriver/chrome');

  buildSeleniumDriver = () => {
    const options = new chrome.Options()
      .headless()
      .addArguments(
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      );

    return new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  };

  seleniumDriverAvailable = true;
} catch (error) {
  // Selenium is optional – log once for debugging but don't crash
  console.warn('⚠️ Selenium fallback unavailable:', error.message);
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache'
};

const MIN_DESCRIPTION_LENGTH = 250;
const MAX_DESCRIPTION_LENGTH = 6000;

const BOARD_SELECTORS = {
  LinkedIn: {
    title: [
      'h1.top-card-layout__title',
      '.job-details-jobs-unified-top-card__job-title',
      'h1'
    ],
    company: [
      'a.topcard__org-name-link',
      '.topcard__flavor',
      'a.jobs-unified-top-card__company-name',
      'a.top-card-layout__company-url'
    ],
    location: [
      '.topcard__flavor--bullet',
      '.jobs-unified-top-card__bullet',
      'span.jobs-unified-top-card__subtitle-primaries'
    ],
    description: [
      '.jobs-description__container',
      'section.show-more-less-html__markup',
      '.description__text',
      'article'
    ],
    salary: [
      '.salary-compensation__text',
      '.compensation__amount'
    ]
  },
  Indeed: {
    title: [
      'h1.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title-container h1',
      'h1'
    ],
    company: [
      '.jobsearch-CompanyInfoContainer a',
      '.jobsearch-InlineCompanyRating div:nth-child(1)',
      '.jobsearch-CompanyInfoWithReview'
    ],
    location: [
      '.jobsearch-InlineCompanyRating div:nth-child(3)',
      '.jobsearch-JobInfoHeader-subtitle div',
      '.jobsearch-CompanyInfoWithoutHeaderImage'
    ],
    description: [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      'article'
    ],
    salary: [
      '.jobsearch-JobMetadataHeader-itemWithIcon',
      '.jobsearch-JobMetadataHeader-item'
    ]
  },
  Naukri: {
    title: [
      'h1.styles_JobsPremiumHeader__title__380zN',
      '.styles_JD-header-title__AhzMP',
      'h1'
    ],
    company: [
      '.styles_JD-header-company__vizZo',
      '.styles_JD-company-info__OU0T_ a',
      '.styles_company-name__9k5Ir'
    ],
    location: [
      '.styles_JD-header-info__kDPCX a',
      '.styles_JD-header-info__kDPCX span',
      '.styles_JD-header-info__kDPCX'
    ],
    description: [
      '.styles_description__bJxRs',
      '.styles_JD-section__aJ4OD',
      '#jobDescriptionTxt',
      'article'
    ],
    salary: [
      '.styles_JD-header-compensation__ZQAe7',
      '.styles_JD-header-info__kDPCX span'
    ]
  },
  Generic: {
    title: ['h1', '[class*="job-title"]', '[class*="title"]'],
    company: ['[class*="company"]', '[class*="employer"]', '[itemprop="hiringOrganization"]'],
    location: ['[class*="location"]', '[itemprop="jobLocation"]', '[data-test="location"]'],
    description: ['article', '[class*="description"]', 'main', '[itemprop="description"]'],
    salary: ['[class*="salary"]', '[itemprop="baseSalary"]']
  }
};

/**
 * Main entry – tries Axios -> Puppeteer -> Selenium (optional) scraping.
 */
async function scrapeJobPosting(url) {
  const attempts = [];

  const methods = [
    { name: 'axios', fn: scrapeWithAxios },
    {
      name: 'puppeteer',
      fn: scrapeWithPuppeteer,
      enabled: process.env.ENABLE_PUPPETEER_FALLBACK !== 'false'
    },
    {
      name: 'selenium',
      fn: scrapeWithSelenium,
      enabled: process.env.ENABLE_SELENIUM_FALLBACK === 'true'
    }
  ].filter(method => method.enabled !== false);

  for (const method of methods) {
    try {
      const data = await method.fn(url);
      if (isComplete(data)) {
        return data;
      }
      attempts.push(`${method.name}: insufficient details`);
    } catch (error) {
      attempts.push(`${method.name}: ${error.message}`);
    }
  }

  const hint = attempts.join(' | ');
  throw new Error(`Multi-method scraping failed. Attempts => ${hint}`);
}

// ──────────────────────────── Scraping Methods ────────────────────────────────

async function scrapeWithAxios(url) {
  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 15000
  });

  const finalUrl = response.request?.res?.responseUrl || url;
  return parseJobHtml(response.data, {
    url: finalUrl,
    method: 'axios'
  });
}

async function scrapeWithPuppeteer(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS['User-Agent']);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Use Promise-based delay instead of deprecated waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    const html = await page.content();

    return parseJobHtml(html, {
      url: page.url(),
      method: 'puppeteer'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeWithSelenium(url) {
  if (!seleniumDriverAvailable) {
    throw new Error('Selenium driver not available');
  }

  const driver = await buildSeleniumDriver();
  try {
    await driver.get(url);
    const waitMs = parseInt(process.env.SELENIUM_WAIT_MS || '2500', 10);
    await driver.sleep(waitMs);
    const html = await driver.getPageSource();

    return parseJobHtml(html, {
      url,
      method: 'selenium'
    });
  } finally {
    await driver.quit();
  }
}

// ──────────────────────────── Parsing Helpers ────────────────────────────────

function parseJobHtml(html, context = {}) {
  const $ = cheerio.load(html);
  const jobBoard = detectJobBoard(context.url || '');
  const selectors = BOARD_SELECTORS[jobBoard] || BOARD_SELECTORS.Generic;

  const bodyText = cleanText($('body').text(), MAX_DESCRIPTION_LENGTH);
  const jobTitle = pickFirst($, selectors.title) || $('title').text();
  const companyName = pickFirst($, selectors.company);
  const location = pickFirst($, selectors.location);
  const description = cleanText(
    pickFirst($, selectors.description, { allowLong: true }) || bodyText,
    MAX_DESCRIPTION_LENGTH
  );
  const salary = pickFirst($, selectors.salary) || extractSalary(bodyText);

  const experience = extractExperience(bodyText);

  return {
    jobTitle: jobTitle || 'Position',
    companyName: companyName || null,
    jobDescription: description,
    location: location || null,
    experience: experience,
    salary: salary,
    jobBoard: jobBoard === 'Generic' ? null : jobBoard,
    scrapeStrategy: context.method || 'axios'
  };
}

function pickFirst($, selectors = [], options = {}) {
  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      const text = element.text();
      const cleaned = cleanText(text, options.allowLong ? MAX_DESCRIPTION_LENGTH : 500);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

function cleanText(value, maxLength = 500) {
  if (!value) return null;
  const text = value
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();

  if (!text) return null;
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

function extractExperience(text) {
  if (!text) return null;
  const match = text.match(/(\d+)(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
  return match ? match[0] : null;
}

function extractSalary(text) {
  if (!text) return null;
  const match = text.match(/(?:₹|Rs\.?|INR|USD|\$)\s*[\d,]+(?:\s*-\s*[\d,]+)?(?:\s*(?:LPA|per\s*annum|annually|\/year|\/yr))?/i);
  return match ? match[0] : null;
}

function detectJobBoard(url = '') {
  if (/linkedin\.com/i.test(url)) return 'LinkedIn';
  if (/indeed\./i.test(url)) return 'Indeed';
  if (/naukri\.com/i.test(url)) return 'Naukri';
  if (/glassdoor\.com/i.test(url)) return 'Glassdoor';
  if (/monster\./i.test(url)) return 'Monster';
  return 'Generic';
}

function isComplete(jobData) {
  if (!jobData) return false;
  const hasTitle = Boolean(jobData.jobTitle && jobData.jobTitle.length >= 3);
  const hasDescription = Boolean(jobData.jobDescription && jobData.jobDescription.length >= MIN_DESCRIPTION_LENGTH);
  return hasTitle && hasDescription;
}

module.exports = {
  scrapeJobPosting
};

