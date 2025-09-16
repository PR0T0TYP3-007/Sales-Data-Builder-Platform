import Tesseract from 'tesseract.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
// --- Utilities for robust extraction ---
function normalizeLine(s) {
  if (!s) return '';
  return s.replace(/\u00A0/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/[ \u00A0]{2,}/g, ' ')
          .replace(/\s+$/,'')
          .replace(/^\s+/,'')
          .trim();
}
function stripLeadingIdCandidate(name) {
  if (!name) return name;
  const m = name.match(/^\s*\d{3,10}\s+([A-Za-z].*)$/);
  if (m) return m[1].trim();
  return name;
}
function extractPhoneFromLine(line, defaultRegion = 'CA') {
  if (!line) return null;
  const rx = /(\+?\d[\d()\s.-]{6,}\d)/g;
  const candidates = [];
  let m;
  while ((m = rx.exec(line)) !== null) {
    candidates.push(m[1]);
  }
  for (const cand of candidates) {
    try {
      const pn = parsePhoneNumberFromString(cand, defaultRegion);
      if (pn && pn.isValid && pn.isValid()) {
        return pn.format('E.164');
      }
    } catch (e) {}
  }
  return null;
}
function extractAddressFromLine(line) {
  if (!line) return null;
  const l = line.toLowerCase();
  if (/\bP\.?\s*O\.?\s*Box\b/i.test(line)) return line;
  if (/\b[ABCEGHJ-NPRSTVXY]\d[A-Z][ -]?\d[A-Z]\d\b/i.test(line)) return line;
  if (/\b\d{5}(?:-\d{4})?\b/.test(line)) return line;
  if (/\b\d{1,5}\s+[\w\.\- ]+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|plaza|suite|unit|terrace|terr)\b/i.test(line)) return line;
  if (/(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|plaza|suite|unit|po box)/i.test(line) && /\d/.test(line)) return line;
  if (/, [A-Za-z][A-Za-z ]{1,30}$/i.test(line)) return line;
  return null;
}
function extractWebsiteFromLine(line) {
  if (!line) return null;
  const m = line.match(/https?:\/\/[^\s,;]+/i);
  return m ? m[0] : null;
}
function extractFromBlock(block, defaultRegion = 'CA') {
  if (!block) return null;
  const rawLines = block.split(/\r?\n/).map(l => normalizeLine(l)).filter(Boolean);
  if (rawLines.length === 0) return null;
  let phone = null;
  let address = null;
  let website = null;
  for (const line of rawLines) {
    if (!phone) {
      const p = extractPhoneFromLine(line, defaultRegion);
      if (p) { phone = p; continue; }
    }
    if (!address) {
      const a = extractAddressFromLine(line);
      if (a) { address = a; continue; }
    }
    if (!website) {
      const w = extractWebsiteFromLine(line);
      if (w) { website = w; continue; }
    }
  }
  let name = null;
  for (const line of rawLines) {
    if (line.includes(',') && /po box|street|st\.|ave|avenue|road|rd|drive|dr|suite|unit|postal|zip|[A-Za-z]\d[A-Z]/i.test(line)) {
      const parts = line.split(',');
      const right = parts.slice(-1).join(',').trim();
      const left = parts.slice(0, -1).join(',').trim();
      if (extractAddressFromLine(right) || /P\.?\s*O\.?\s*Box/i.test(right)) {
        name = stripLeadingIdCandidate(left);
        if (!address) address = right;
        continue;
      }
    }
  }
  if (!name) {
    for (const line of rawLines) {
      if (!line) continue;
      if (phone && line.includes(phone.replace(/\s/g,''))) continue;
      if (address && line === address) continue;
      if (website && line === website) continue;
      const candidate = stripLeadingIdCandidate(line);
      if (/^(category|industry|quicklink|directory|contact|phone|address):?/i.test(candidate)) continue;
      name = candidate;
      break;
    }
  }
  if (!name && rawLines.length > 0) {
    name = stripLeadingIdCandidate(rawLines[0]);
  }
  if (name) name = name.replace(/\s{2,}/g, ' ').trim();
  if (address) address = address.replace(/\s{2,}/g, ' ').trim();
  if (website) website = website.trim();
  if (!name || name.length < 1) return null;
  return {
    name,
    phone: phone || null,
    address: address || null,
    website: website || null
  };
}
function extractCompaniesFromPDFText(rawText, defaultRegion = 'CA') {
  if (!rawText || !rawText.trim()) return [];
  const blocks = rawText.split(/\n{2,}|\r\n\r\n/).map(b => b.trim()).filter(Boolean);
  const results = [];
  for (const block of blocks) {
    const entry = extractFromBlock(block, defaultRegion);
    if (entry) results.push(entry);
  }
  const seen = new Set();
  const unique = [];
  for (const r of results) {
    const key = `${(r.name||'').toLowerCase()}|${r.phone||''}|${r.address||''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
}

/**
 * Company Controller
 * Handles company upload, parsing, enrichment, and industry detection.
 * Bulk enrichment uses a job queue for parallel processing.
 */
import pdf from 'pdf-parse';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
// No axios/dotenv needed for local extraction
import { createCompany, getAllCompanies, getCompanyById, updateCompany, removeDuplicateCompaniesByName } from '../models/Company.js';
import { createAuditLog } from '../models/AuditLog.js';
import enrichCompany from '../services/companyFinder.js';
import { extractIndustryFromCompany } from '../services/industryDetector.js';
import { webScrapingQueue } from '../services/queue.js';

// === Utils for Extraction ===
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?[\d\s.-]{5,}/g;
const ADDRESS_KEYWORDS = ["street", "st.", "road", "rd", "avenue", "ave", "boulevard", "blvd", "suite", "block", "estate", "lane", "close", "drive", "way", "crescent", "po box"];
const COMPANY_SUFFIXES = ["ltd", "limited", "inc", "corp", "llc", "plc", "company", "co."];

// === Core Extraction ===
function extractCompaniesLocally(rawText) {
  const lines = rawText
    .split(/\r?\n|,/) // split on newlines or commas
    .map(l => l.trim())
    .filter(l => l.length > 2);

  const results = [];

  for (const line of lines) {
    let name = null, phone = null, address = null, score = 0;

    // Try phone
    const phoneMatch = line.match(PHONE_REGEX);
    if (phoneMatch) {
      phone = phoneMatch[0].trim();
      score += 0.3;
    }

    // Try address
    if (ADDRESS_KEYWORDS.some(k => line.toLowerCase().includes(k))) {
      address = line;
      score += 0.3;
    }

    // Try company name
    if (COMPANY_SUFFIXES.some(s => line.toLowerCase().includes(s))) {
      name = line;
      score += 0.5;
    } else {
      // heuristic: capitalized words
      if (/^[A-Z][A-Za-z&\s]{2,}/.test(line)) {
        name = line;
        score += 0.3;
      }
    }

    // If at least company exists with decent score
    if (name && score >= 0.7) {
      results.push({ name, phone, address });
    }
  }

  return results;
}
function extractCompaniesFromText(text) {
  // Clean up the text first
  const cleanText = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');

  // Split into potential company blocks
  const blocks = cleanText.split('\n\n');
  console.log('UPLOAD: First 5 blocks:', blocks.slice(0, 5));

  const companies = [];
  let currentCompany = { name: null, phone: null, address: null };

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock || trimmedBlock.length < 3) continue; // Lowered min length

    // Extract data from this block
  const phone = extractPhoneNumber(trimmedBlock);
  console.log('extractPhoneNumber result:', phone, 'for block:', trimmedBlock);
  const address = extractAddress(trimmedBlock);
  console.log('extractAddress result:', address, 'for block:', trimmedBlock);
  const name = extractCompanyName(trimmedBlock) || trimmedBlock;
  console.log('extractCompanyName result:', name, 'for block:', trimmedBlock);

    // Accept block as company if it has a name (even if phone/address missing)
    if (name && name.length > 2) {
      // Save previous company if it has data
      if (currentCompany.name) {
        companies.push({ ...currentCompany });
      }
      currentCompany = { name, phone, address };
    } else {
      // Add data to current company
      if (phone) currentCompany.phone = phone;
      if (address) currentCompany.address = address;
      if (!currentCompany.name && trimmedBlock.length > 2 && trimmedBlock.length < 100) {
        currentCompany.name = trimmedBlock;
      }
    }
  }

  // Push the last company
  if (currentCompany.name) {
    companies.push(currentCompany);
  }

  // Fallback: if no companies found, treat each non-empty line as a possible company
  if (companies.length === 0) {
    const lines = cleanText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 100) {
        companies.push({ name: trimmed, phone: null, address: null });
      }
    }
  }

  const filteredCompanies = companies.filter(company => company.name && company.name.length > 2);
  console.log('extractCompaniesFromText result:', filteredCompanies);
  return filteredCompanies;
}

function extractPhoneNumber(text) {
  // Enhanced phone number regex patterns
  const phoneRegexes = [
    /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, // Standard US format
    /\d{3}[-.]\d{3}[-.]\d{4}/g, // 123-456-7890 or 123.456.7890
    /\(\d{3}\)\s?\d{3}[-.]\d{4}/g, // (123) 456-7890
    /\d{10}/g // 1234567890
  ];

  for (const regex of phoneRegexes) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }
  
  return null;
}

function extractAddress(text) {
  // Enhanced address detection with regex patterns
  const addressIndicators = [
    /\b\d+\s+[\w\s]+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln|court|ct|plaza|plz|square|sq|trail|trl)\b/i,
    /P\.?O\.?\s+Box\s+\d+/i, // PO Box
    /\b\d+\s+[\w\s]+,\s*\w+\s*\d{5}(?:-\d{4})?\b/, // Address with zip code
    /\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln)\s+\d+/i
  ];

  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip lines that are too short or too long
    if (trimmedLine.length < 10 || trimmedLine.length > 100) continue;
    
    // Check for address indicators
    for (const regex of addressIndicators) {
      if (regex.test(trimmedLine)) {
        return trimmedLine;
      }
    }
    
    // Check for numbers and street words
    const hasNumbers = /\d/.test(trimmedLine);
    const hasStreetWords = /(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln|court|ct|plaza|plz|square|sq|trail|trl)/i.test(trimmedLine);
    
    if (hasNumbers && hasStreetWords) {
      return trimmedLine;
    }
  }

  return null;
}

function extractCompanyName(text) {
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and obviously too long/short lines
    if (!trimmedLine || trimmedLine.length < 2 || trimmedLine.length > 80) {
      continue;
    }
    
    // Skip lines that look like phone numbers or addresses
    if (extractPhoneNumber(trimmedLine)) continue;
    if (extractAddress(trimmedLine)) continue;
    
    // Look for company name indicators
    const words = trimmedLine.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();
    
    const companySuffixes = [
      'ltd', 'limited', 'inc', 'incorporated', 'llp', 'lp', 
      'corp', 'corporation', 'llc', 'company', 'co', 'group'
    ];
    
    if (companySuffixes.includes(lastWord.replace(/[.,]/g, ''))) {
      return trimmedLine;
    }
    
    // If line starts with capital letter and has reasonable length
    if (trimmedLine[0] === trimmedLine[0].toUpperCase() && 
        trimmedLine.length > 3 && 
        trimmedLine.length < 50) {
      return trimmedLine;
    }
  }

  // Fallback: first non-empty line that doesn't look like other data types
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.length > 2 && trimmedLine.length < 100) {
      if (!extractPhoneNumber(trimmedLine) && !extractAddress(trimmedLine)) {
        return trimmedLine;
      }
    }
  }

  return null;
}

// Clean company data (remove duplicates, validate) with industry detection
function cleanExtractedCompanies(companies) {
  const seen = new Set();
  const cleaned = [];
  
  for (const company of companies) {
    if (!company.name || company.name.length < 2) continue;
    
    const key = `${company.name}-${company.phone || ''}-${company.address || ''}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      
      // Clean up the data
      const cleanedCompany = {
        name: company.name.replace(/\s{2,}/g, ' ').trim(),
        phone: company.phone ? company.phone.replace(/\s{2,}/g, ' ').trim() : null,
        address: company.address ? company.address.replace(/\s{2,}/g, ' ').trim() : null,
        industry: company.industry || null // Preserve industry if detected during extraction
      };
      
      // Try to detect industry from company name if not already set
      if (!cleanedCompany.industry) {
        cleanedCompany.industry = extractIndustryFromCompany({ name: cleanedCompany.name });
      }
      
      cleaned.push(cleanedCompany);
    }
  }
  
  return cleaned;
}

// === Upload and Extract with Mistral ===
const uploadAndExtract = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    let companies = [];

    if (fileExtension === 'pdf') {
      const data = await pdf(fileBuffer);
      let rawText = data.text || '';
      if (!rawText || !rawText.trim()) {
        // OCR fallback for scanned PDFs
        const { data: ocr } = await Tesseract.recognize(fileBuffer, 'eng');
        rawText = ocr.text;
      }
      companies = extractCompaniesFromPDFText(rawText, 'CA');
    }
    else if (fileExtension === 'csv') {
      const records = parse(fileBuffer.toString(), { columns: true, skip_empty_lines: true });
      companies = records.map(r => ({
        name: r['Company Name']?.trim() || null,
        address: r['Address']?.trim() || null,
        phone: r['Phone Number']?.trim() || null,
        website: r['Website']?.trim() || null,
        linkedin: r['LinkedIn']?.trim() || null,
        facebook: r['Facebook']?.trim() || null,
        instagram: r['Instagram']?.trim() || null,
        twitter: r['Twitter/X']?.trim() || null,
        industry: r['Industry']?.trim() || null,
        notes: r['Notes']?.trim() || null
      }));
    }
    else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      companies = worksheet.map(r => ({
        name: r['Company Name']?.trim() || null,
        address: r['Address']?.trim() || null,
        phone: r['Phone Number']?.trim() || null,
        website: r['Website']?.trim() || null,
        linkedin: r['LinkedIn']?.trim() || null,
        facebook: r['Facebook']?.trim() || null,
        instagram: r['Instagram']?.trim() || null,
        twitter: r['Twitter/X']?.trim() || null,
        industry: r['Industry']?.trim() || null,
        notes: r['Notes']?.trim() || null
      }));
    }
    else {
      const rawText = fileBuffer.toString();
      companies = extractCompaniesFromPDFText(rawText, 'CA');
    }

    // Deduplicate by name (case-insensitive) before preview
    const seenNames = new Set();
    const uniqueCompanies = [];
    for (const c of companies) {
      const key = (c.name || '').trim().toLowerCase();
      if (key && !seenNames.has(key)) {
        seenNames.add(key);
        uniqueCompanies.push(c);
      }
    }
    // Expanded Logging
    console.log('[UPLOAD]');
    console.log('  File:', req.file.originalname);
    console.log('  Type:', fileExtension);
    console.log('  Total Extracted:', companies.length);
    console.log('  Unique (deduplicated by name):', uniqueCompanies.length);
    if (uniqueCompanies.length > 0) {
      console.log('  First 3 companies:', uniqueCompanies.slice(0, 3));
    }
    res.json({
      success: true,
      message: `Extracted ${uniqueCompanies.length} companies`,
      companies: uniqueCompanies,
      count: uniqueCompanies.length
    });

  } catch (error) {
    console.error('UPLOAD ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

// Enrich company data using external service
const enrichCompanyData = async (req, res) => {
  let companyId;
  // Deduplicate by company name (case-insensitive) in DB before enrichment
  console.log('[ENRICH] Deduplicating companies before enrichment...');
  await removeDuplicateCompaniesByName();
  try {
    companyId = req.params.id;
    const company = await getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    // Update status to 'enriching'
    await updateCompanyStatus(companyId, 'enriching');
    const existingData = {
      description: company.description || null,
      phone: company.phone || null,
      email: null,
      industry: company.industry || null
    };
    console.log('[ENRICH] Starting enrichment for company:', company.name, 'ID:', companyId);
    const enrichedData = await enrichCompany(
      company.name,
      company.address,
      company.phone
    );
    // Update company with all enriched fields
    // Only update phone/address if new values are found, otherwise keep existing
    let newPhone = (enrichedData.phones && enrichedData.phones.length > 0) ? enrichedData.phones[0] : company.phone;
    let newAddress = (enrichedData.address && enrichedData.address.length > 5) ? enrichedData.address : company.address;
    const updateData = {
      website: enrichedData.website || null,
      socials: enrichedData.socials ? JSON.stringify(enrichedData.socials) : null,
      industry: enrichedData.industry || company.industry || null,
      description: enrichedData.description || company.description || null,
      status: enrichedData.status || 'incomplete',
      phone: newPhone,
      address: newAddress,
      email: enrichedData.emails && enrichedData.emails.length > 0 ? enrichedData.emails[0] : company.email
    };
    const updatedCompany = await updateCompany(companyId, updateData);
    // Store all emails/phones as contacts (if not already present)
    const { emails = [], phones = [], employees = [] } = enrichedData;
    const { createContact } = await import('../models/Contact.js');
    // Add generic company-level contacts for emails/phones
    for (const email of emails) {
      await createContact(companyId, company.name, 'Generic', email, null, null, null, 'enrichment');
      console.log(`[ENRICH] Saved generic email contact: ${email}`);
    }
    for (const phone of phones) {
      await createContact(companyId, company.name, 'Generic', null, phone, null, null, 'enrichment');
      console.log(`[ENRICH] Saved generic phone contact: ${phone}`);
    }
    // Add employees as contacts (try to parse name, role, email, phone from raw if possible)
    for (const emp of employees) {
      let name = emp.raw || '';
      let role = '';
      let email = null;
      let phone = null;
      // Try to split name and role if possible
      const match = name.match(/^(.*?)(,|\-|\||\s{2,})(.*)$/);
      if (match) {
        name = match[1].trim();
        role = match[3].trim();
      }
      // Try to extract email/phone from raw if present
      if (emp.email) email = emp.email;
      if (emp.phone) phone = emp.phone;
      // Try to extract email/phone from text if present
      if (!email && /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/.test(emp.raw)) {
        email = emp.raw.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/)[0];
      }
      if (!phone && /(\+?\d[\d()\s.-]{6,}\d)/.test(emp.raw)) {
        phone = emp.raw.match(/(\+?\d[\d()\s.-]{6,}\d)/)[0];
      }
      await createContact(companyId, name, role, email, phone, null, null, 'enrichment');
      console.log(`[ENRICH] Saved employee contact: name=${name}, role=${role}, email=${email}, phone=${phone}`);
    }
    // Create audit log
    await createAuditLog(
      req.session.user.id,
      'enrich_company',
      'company',
      'company',
      companyId,
      { status: enrichedData.status, details: enrichedData }
    );
    res.json({
      message: `Enrichment status: ${enrichedData.status}`,
      company: updatedCompany
    });
    console.log('[ENRICH] Enrichment complete for company:', company.name, 'ID:', companyId);
  } catch (error) {
    console.error('Error in enrichCompanyData:', error);
    // Update status to 'failed'
    if (companyId) {
      await updateCompanyStatus(companyId, 'failed');
    }
    res.status(500).json({ error: 'Internal server error during enrichment.' });
  }
};

// Get all companies
const getCompaniesController = async (req, res) => {
  try {
    const companies = await getAllCompanies();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

// Save extracted companies to DB
const saveExtractedCompanies = async (req, res) => {
  try {
    const companies = req.body && req.body.companies ? req.body.companies : [];
    const saved = [];
    let failed = 0;
    for (const company of companies) {
      // If company is a stringified object, parse it
      let c = company;
      if (typeof c === 'string') {
        try { c = JSON.parse(c); } catch (e) { failed++; continue; }
      }
      // Only save if name and phone are present
      if (c.name && c.phone) {
        try {
          const savedCompany = await createCompany(
            c.name,
            c.phone,
            c.address || null,
            c.industry || null,
            c.description || null,
            c.email || null,
            c.website || null
          );
          saved.push(savedCompany);
        } catch (err) {
          failed++;
          console.error(`[SAVE ERROR] Failed to save company:`, c, 'Error:', err.message);
        }
      } else {
        failed++;
        console.warn(`[SAVE SKIP] Missing name or phone:`, c);
      }
    }
    // Deduplicate by company name (case-insensitive) in DB after save
    await removeDuplicateCompaniesByName();
    console.log(`[SAVE] Attempted: ${companies.length}, Saved: ${saved.length}, Failed: ${failed}`);
    res.json({ success: true, message: `Saved ${saved.length} companies`, companies: saved, failed });
  } catch (error) {
    console.error('[SAVE FATAL ERROR]', error);
    res.status(500).json({ error: error.message });
  }
};

// Detect industry for a specific company
const bulkEnrichCompanies = async (req, res) => {
  try {
    // Deduplicate before bulk enrichment
    console.log('[BULK ENRICH] Deduplicating companies before queueing...');
    await removeDuplicateCompaniesByName();
    // Log incoming request for debugging
    console.log('bulkEnrichCompanies called. Body:', req.body);
    if (req.body && req.body.companyIds) {
      console.log('Type of companyIds:', typeof req.body.companyIds, Array.isArray(req.body.companyIds));
      console.log('companyIds:', req.body.companyIds);
    }
    const { companyIds } = req.body;
    const userId = req.session.user.id;

    // Validate input
    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({
        success: false,
        error: 'companyIds array is required.'
      });
    }

    const results = [];

    // Add each company to the enrichment queue
    for (const companyId of companyIds) {
      try {
        const company = await getCompanyById(companyId);
        if (company) {
          // Add job to queue for parallel enrichment
          await webScrapingQueue.add({
            type: 'company_enrichment',
            companyId: companyId,
            companyName: company.name,
            url: company.website || null,
            userId: userId
          }, {
            attempts: 2,
            timeout: 180000 // 3 minutes
          });
          results.push({ companyId, status: 'queued' });
        } else {
          results.push({ companyId, status: 'skipped', reason: 'Company not found' });
        }
      } catch (error) {
        results.push({ companyId, status: 'error', reason: error.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    console.error('[BULK ENRICH ERROR]', error);
    res.status(500).json({ error: error.message });
  }
};
// ...existing code...

// Bulk detect industry for multiple companies
const bulkDetectIndustry = async (req, res) => {
  try {
    const { companyIds } = req.body;
    const userId = req.session.user.id;

    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({
        success: false,
        error: 'companyIds array is required.'
      });
    }

    const results = [];

    for (const companyId of companyIds) {
      try {
        const company = await getCompanyById(companyId);
        if (company) {
          const industryData = {
            name: company.name,
            description: company.description || '',
            websiteContent: '' // Would need to be fetched if available
          };
          
          const industry = extractIndustryFromCompany(industryData);
          
          if (industry) {
            await updateCompany(companyId, { industry });
            results.push({ companyId, status: 'success', industry });
          } else {
            results.push({ companyId, status: 'skipped', reason: 'Industry not detectable' });
          }
        } else {
          results.push({ companyId, status: 'skipped', reason: 'Company not found' });
        }
      } catch (error) {
        results.push({ companyId, status: 'error', error: error.message });
      }
    }

    // Create audit log
    await createAuditLog(
      userId,
      'bulk_industry_detection',
      'system',
      'company',
      null,
      { companies_processed: companyIds.length, results }
    );

    res.json({
      success: true,
      message: `Processed industry detection for ${results.length} companies.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulkDetectIndustry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk industry detection.'
    });
  }
};

export { 
  getCompaniesController, 
  enrichCompanyData, 
  bulkEnrichCompanies,
  bulkDetectIndustry,
  uploadAndExtract,
  saveExtractedCompanies,
  removeDuplicateCompaniesByName
};