import axios from 'axios';
import { parse } from 'node-html-parser';
import { extractIndustryFromCompany } from './industryDetector.js';
import { extractSocialMediaLinks, searchSocialMediaProfiles } from './socialMediaExtractor.js';
import fs from 'fs';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

// Configure axios for better HTTP requests
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
  },
});

// Generate possible URLs and check their validity
const findCompanyWebsite = async (companyName, location = "") => {
  const cleanName = companyName
    .toLowerCase()
    .replace(/\s*limited\s*|\s*ltd\.?\s*|\s*inc\.?\s*|\s*llc\.?\s*|\s*corp\.?\s*|\s*corporation\s*/gi, '') // Remove common business suffixes
    .replace(/\s*&\s*/g, 'and') // Replace & with 'and'
    .replace(/\s+/g, '') // Remove spaces for one pattern
    .replace(/[^\w-]/g, ''); // Remove special chars for URL

  const nameWithDashes = companyName
    .toLowerCase()
    .replace(/\s*limited\s*|\s*ltd\.?\s*|\s*inc\.?\s*|\s*llc\.?\s*|\s*corp\.?\s*|\s*corporation\s*/gi, '')
    .replace(/\s*&\s*/g, 'and')
    .replace(/\s+/g, '-') // Replace spaces with dashes for another pattern
    .replace(/[^\w-]/g, '');

  // A more comprehensive list of TLDs to try
  const domains = ['.com', '.ca', '.io', '.co', '.net', '.org', '.us', '.biz', '.dev', '.ai'];
  const urlAttempts = [];

  // Pattern 1: companyname.tld
  for (const domain of domains) {
    urlAttempts.push(`https://www.${cleanName}${domain}`);
  }
  // Pattern 2: company-name.tld
  for (const domain of domains) {
    urlAttempts.push(`https://www.${nameWithDashes}${domain}`);
  }
  // Pattern 3: If location is provided, try a subdomain pattern
  if (location && location.includes("Halifax")) {
    for (const domain of domains) {
      urlAttempts.push(`https://halifax.${cleanName}${domain}`);
      // Try a .ca domain specifically for Canadian companies
      if (domain === '.ca') {
        urlAttempts.push(`https://www.${cleanName}.ns.ca`);
        urlAttempts.push(`https://www.${nameWithDashes}.ns.ca`);
      }
    }
  }

  console.log(`Generated ${urlAttempts.length} URL attempts for "${companyName}".`);

  // Test each URL pattern
  for (const url of urlAttempts) {
    try {
      console.log(`Trying: ${url}`);
      // Use HEAD request first - faster, just checks if the resource exists
      const response = await axiosInstance.head(url);

      if (response.status >= 200 && response.status < 400) {
        console.log(`✅ Found valid website via HEAD: ${url} (Status: ${response.status})`);
        return url;
      }
    } catch (error) {
      // HEAD failed, try a GET request for the root path only
      if (error.response && error.response.status === 405) { // Method Not Allowed
        try {
          console.log(`HEAD not allowed, trying GET: ${url}`);
          const getResponse = await axiosInstance.get(url, { timeout: 5000 });
          if (getResponse.status >= 200 && getResponse.status < 400) {
            console.log(`✅ Found valid website via GET: ${url} (Status: ${getResponse.status})`);
            return url;
          }
        } catch (getError) {
          // GET failed too, continue to next URL
          continue;
        }
      }
      // For other errors (404, no connection, etc.), just continue to the next URL
      continue;
    }
  }
  console.log(`❌ Could not find a valid website for "${companyName}" after ${urlAttempts.length} attempts.`);
  return null;
};

// Enhanced scraping function that extracts more data
const scrapeCompanyData = async (websiteUrl) => {
  try {
    console.log(`🌐 Scraping: ${websiteUrl}`);
    const response = await axiosInstance.get(websiteUrl);
    const websiteHtml = response.data;
    const websiteRoot = parse(websiteHtml);
    
    let description = '';
    let phone = '';
    let email = '';
    
    // Extract meta description
    const metaDescription = websiteRoot.querySelector('meta[name="description"]');
    if (metaDescription) {
      description = metaDescription.getAttribute('content') || '';
    }
    
    // Extract Open Graph description
    if (!description) {
      const ogDescription = websiteRoot.querySelector('meta[property="og:description"]');
      description = ogDescription ? ogDescription.getAttribute('content') || '' : '';
    }
    
    // Extract from first substantial paragraph
    if (!description) {
      const paragraphs = websiteRoot.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.text.trim();
        if (text.length > 100 && text.length < 300) {
          description = text;
          break;
        }
      }
    }
    
    // Use title tag as fallback
    if (!description) {
      const titleTag = websiteRoot.querySelector('title');
      description = titleTag ? titleTag.text : 'Description not available.';
    }
    
    // Try to find phone numbers
    const phoneRegex = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const textContent = websiteRoot.text;
    const phoneMatches = textContent.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      phone = phoneMatches[0];
    }
    
    // Try to find email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = textContent.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      email = emailMatches[0];
    }
    
    return {
      description: description.trim(),
      phone,
      email,
      websiteContent: textContent // Store for industry detection
    };
    
  } catch (error) {
    console.error(`❌ Failed to scrape ${websiteUrl}:`, error.message);
    return {
      description: 'Website could not be scraped.',
      phone: '',
      email: '',
      websiteContent: ''
    };
  }
};

/**
 * Main enrichment function with comprehensive data extraction
 */
const enrichCompany = async (companyId, companyName, location, existingData = {}) => {
  console.log(`\n--- Starting enrichment for ID: ${companyId}, Name: "${companyName}" ---`);
  
  try {
    // 1. Find the Website
    const websiteUrl = await findCompanyWebsite(companyName, location);
    
    if (!websiteUrl) {
      console.log('❌ Website discovery failed. Trying social media search only.');
      
      // Even without website, try to find social media
      const socialMedia = await searchSocialMediaProfiles(companyName);
      
      return {
        website: null,
        description: existingData.description || null,
        phone: existingData.phone || null,
        email: existingData.email || null,
        socials: socialMedia,
        industry: existingData.industry || null,
        status: 'partially_enriched'
      };
    }
    
    // 2. Scrape comprehensive data from the website
    const scrapedData = await scrapeCompanyData(websiteUrl);
    
    // 3. Extract social media links
    const socialMediaFromSite = await extractSocialMediaLinks(websiteUrl);
    
    // 4. Search for additional social media profiles
    const socialMediaFromSearch = await searchSocialMediaProfiles(companyName, websiteUrl);
    
    // Merge social media results (prioritize ones from the actual website)
    const socialMedia = { ...socialMediaFromSearch, ...socialMediaFromSite };
    
    // 5. Detect industry
    const industryData = {
      name: companyName,
      description: scrapedData.description,
      websiteContent: scrapedData.websiteContent
    };
    const industry = extractIndustryFromCompany(industryData);
    
    // 6. Return comprehensive data
    console.log(`✅ Enrichment successful for "${companyName}".`);
    return {
      website: websiteUrl,
      description: scrapedData.description,
      phone: scrapedData.phone || existingData.phone || null,
      email: scrapedData.email || existingData.email || null,
      socials: Object.keys(socialMedia).length > 0 ? socialMedia : null,
      industry: industry || existingData.industry || null,
      status: 'enriched'
    };
    
  } catch (error) {
    console.error(`❌ Critical enrichment error for "${companyName}":`, error.message);
    return {
      website: null,
      description: null,
      phone: null,
      email: null,
      socials: null,
      industry: null,
      status: 'failed'
    };
  }
};

// Function to parse uploaded files (CSV, Excel, PDF) and extract company data

async function parseCompanyFile(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'csv') {
        return await parseCSV(filePath);
    } else if (ext === 'xlsx' || ext === 'xls') {
        return await parseExcel(filePath);
    } else if (ext === 'pdf') {
        return await parsePDF(filePath);
    } else {
        throw new Error('Unsupported file type');
    }
}

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    name: data.name || data.company || '',
                    phone: data.phone || '',
                    address: data.address || ''
                });
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

function parseExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);
    return rows.map(row => ({
        name: row.name || row.company || '',
        phone: row.phone || '',
        address: row.address || ''
    }));
}

async function parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    // Simple line-based extraction (customize as needed)
    const lines = data.text.split('\n');
    const companies = [];
    lines.forEach(line => {
        // Example: "Acme Corp, 555-1234, 123 Main St"
        const parts = line.split(',');
        if (parts.length >= 2) {
            companies.push({
                name: parts[0].trim(),
                phone: parts[1] ? parts[1].trim() : '',
                address: parts[2] ? parts[2].trim() : ''
            });
        }
    });
    return companies;
}

export default enrichCompany;
export { parseCompanyFile };