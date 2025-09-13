/**
 * Company Controller
 * Handles company upload, parsing, enrichment, and industry detection.
 * Bulk enrichment uses a job queue for parallel processing.
 */
import pdf from 'pdf-parse';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { createCompany, getAllCompanies, getCompanyById, updateCompany } from '../models/Company.js';
import { createAuditLog } from '../models/AuditLog.js';
import enrichCompany from '../services/companyFinder.js';
import { extractIndustryFromCompany } from '../services/industryDetector.js';
import { webScrapingQueue } from '../services/queue.js';

// Enhanced helper functions for parsing
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
    const address = extractAddress(trimmedBlock);
    const name = extractCompanyName(trimmedBlock) || trimmedBlock;

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

  return companies.filter(company => company.name && company.name.length > 2);
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

// Parse PDF and extract company information
const uploadAndParsePdf = async (req, res) => {
  try {
    console.log('UPLOAD: Received upload request');
    if (!req.file) {
      console.error('UPLOAD: No file uploaded');
      req.session.uploadResult = {
        success: false,
        message: 'No file uploaded.'
      };
      return res.redirect('/upload');
    }

    const fileBuffer = req.file.buffer;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    console.log('UPLOAD: File extension:', fileExtension);
    
    let extractedText = '';
    let companies = [];

    // Parse based on file type
    if (fileExtension === 'pdf') {
      const data = await pdf(fileBuffer);
      extractedText = data.text;
      console.log('UPLOAD: Extracted text length (PDF):', extractedText.length);
    } else if (fileExtension === 'csv') {
      extractedText = fileBuffer.toString();
      const records = parse(extractedText, { columns: true, skip_empty_lines: true });
      companies = records.map(record => ({
        name: record.company || record.name || record["Company Name"] || '',
        phone: record.phone || record.telephone || record["Phone Number"] || '',
        address: record.address || record.location || record["Address"] || '',
        industry: record.industry || record.category || null
      }));
      console.log('UPLOAD: Extracted companies from CSV:', companies.length);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      companies = data.map(row => ({
        name: row.company || row.name || row["Company Name"] || '',
        phone: row.phone || row.telephone || row["Phone Number"] || '',
        address: row.address || row.location || row["Address"] || '',
        industry: row.industry || row.category || null
      }));
      console.log('UPLOAD: Extracted companies from Excel:', companies.length);
    } else {
      // Text extraction from PDF or other files
      const data = await pdf(fileBuffer);
      extractedText = data.text;
      companies = extractCompaniesFromText(extractedText);
      console.log('UPLOAD: Extracted companies from text:', companies.length);
    }

    // Clean and validate extracted companies
    const cleanedCompanies = cleanExtractedCompanies(companies);
    console.log('UPLOAD: Cleaned companies:', cleanedCompanies.length);

    // Save to database
    const savedCompanies = [];
    for (const company of cleanedCompanies) {
      try {
        const savedCompany = await createCompany(
          company.name,
          company.phone,
          company.address,
          company.industry
        );
        savedCompanies.push(savedCompany);
      } catch (dbError) {
        console.warn(`UPLOAD: Failed to save company ${company.name}:`, dbError.message);
      }
    }
    console.log('UPLOAD: Saved companies:', savedCompanies.length);

    // Store result in session
    req.session.uploadResult = {
      success: true,
      message: `Successfully processed ${savedCompanies.length} companies from ${fileExtension.toUpperCase()}`,
      companies: savedCompanies
    };

    // Audit log for upload
    if (req.session.user && req.session.user.id) {
      await createAuditLog(
        req.session.user.id,
        'upload_file',
        'company',
        'file',
        null,
        { count: savedCompanies.length, fileType: fileExtension }
      );
    }

    res.redirect('/upload');

  } catch (error) {
    console.error('UPLOAD: Error processing file:', error);
    req.session.uploadResult = {
      success: false,
      message: 'Failed to process file: ' + error.message
    };
    res.redirect('/upload');
  }
};

// Enrich company data using external service
const enrichCompanyData = async (req, res) => {
  try {
    const companyId = req.params.id;
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

    const enrichedData = await enrichCompany(
      companyId, 
      company.name, 
      company.address,
      existingData
    );

    // Update company with new data and status
    // Auto-detect industry from enriched data
    let detectedIndustry = null;
    if (!enrichedData.industry) {
      detectedIndustry = extractIndustryFromCompany({
        name: company.name,
        description: enrichedData.description || company.description || '',
        websiteContent: enrichedData.websiteContent || ''
      });
      if (detectedIndustry) {
        enrichedData.industry = detectedIndustry;
      }
    }
    const updateData = { ...enrichedData };
    if (enrichedData.status === 'enriched') {
      updateData.status = 'enriched';
    } else if (enrichedData.status === 'failed') {
      updateData.status = 'failed';
    }
    const updatedCompany = await updateCompany(companyId, updateData);

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

// Detect industry for a specific company
const detectCompanyIndustry = async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Get the company from DB
    const company = await getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    
    // Detect industry
    const industryData = {
      name: company.name,
      description: company.description || '',
      websiteContent: ''
    };
    
    const industry = extractIndustryFromCompany(industryData);
    
    // Update company with detected industry
    if (industry) {
      const updatedCompany = await updateCompany(companyId, { industry });
      return res.json({
        success: true,
        message: `Detected industry: ${industry}`,
        industry: industry,
        company: updatedCompany
      });
    } else {
      return res.json({
        success: false,
        message: 'Could not detect industry with confidence',
        industry: null
      });
    }
    
  } catch (error) {
    console.error('Error in detectCompanyIndustry:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during industry detection.' 
    });
  }
};

const updateCompanyStatus = async (companyId, status) => {
  const query = `UPDATE companies SET status = $1 WHERE id = $2 RETURNING *;`;
  const result = await pool.query(query, [status, companyId]);
  return result.rows[0];
};

/**
 * Bulk enrichment for multiple companies using a job queue.
 * Each company is added to the webScrapingQueue for parallel processing.
 * The queue processor will use a waterfall approach for website discovery and enrichment.
 */
const bulkEnrichCompanies = async (req, res) => {
  try {
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
        results.push({ companyId, status: 'error', error: error.message });
      }
    }

    // Audit log for bulk enrichment
    await createAuditLog(
      userId,
      'bulk_company_enrichment',
      'system',
      'company',
      null,
      { companies_processed: companyIds.length, results }
    );

    // Respond with queue status
    res.json({
      success: true,
      message: `Queued enrichment for ${results.filter(r => r.status === 'queued').length} companies.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulkEnrichCompanies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk enrichment.'
    });
  }
};

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
  uploadAndParsePdf, 
  getCompaniesController, 
  enrichCompanyData, 
  detectCompanyIndustry,
  bulkEnrichCompanies,
  bulkDetectIndustry 
};