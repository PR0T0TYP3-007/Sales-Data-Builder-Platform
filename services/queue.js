import { searchAllDirectories } from './directorySearch.js';
import { searchAllSocials } from './socialSearch.js';

class SimpleQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
    this.processors = new Map();
  }

  add(data, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data,
      attempts: options.attempts || 1,
      backoff: options.backoff || { type: 'fixed', delay: 5000 },
      timestamp: Date.now()
    };

    this.jobs.push(job);
    // Always trigger processQueue asynchronously to avoid race conditions
    setTimeout(() => this.processQueue(), 0);
    return Promise.resolve(job);
  }

  process(name, concurrency, processor) {
    this.processors.set(name, processor);
  }

  async processQueue() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;
    try {
      while (this.jobs.length > 0) {
        const job = this.jobs.shift();
        try {
          const processor = this.processors.get(job.data.type) || this.processors.get('default');
          if (processor) {
            await processor(job);
          }
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          // Retry logic
          if (job.attempts > 1) {
            job.attempts--;
            job.timestamp = Date.now() + (job.backoff.delay || 5000);
            this.jobs.push(job);
          }
        }
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.processing = false;
    }
  }
}

// Create singleton instance
const simpleQueue = new SimpleQueue();

// Task Generation Processor
simpleQueue.process('task_generation', 1, async (job) => {
  const { groupId, workflowId, userId } = job.data;
  
  try {
    // Use dynamic imports to avoid circular dependencies
    const { generateTasksForGroup } = await import('./taskGenerator.js');
    const { getCompaniesInGroup } = await import('../models/Group.js');
    const { getWorkflowById } = await import('../models/Workflow.js');
    const { createAuditLog } = await import('../models/AuditLog.js');

    const companies = await getCompaniesInGroup(groupId);
    const workflow = await getWorkflowById(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const generatedTasks = await generateTasksForGroup(companies, workflow);
    
    await createAuditLog(
      userId,
      'generate_tasks',
      'group',
      groupId,
      { 
        workflow_id: workflowId,
        tasks_created: generatedTasks.length,
        companies_processed: companies.length 
      }
    );
    
    console.log(`✅ Generated ${generatedTasks.length} tasks for workflow "${workflow.name}"`);
    
  } catch (error) {
    console.error('Task generation failed:', error);
    throw error;
  }
});


// Email Processor (if you need it)
simpleQueue.process('email', 1, async (job) => {
  const { taskId, toEmail, subject, template, variables, userId } = job.data;
  
  try {
    const { sendEmail } = await import('./emailService.js');
    await sendEmail(taskId, toEmail, subject, template, variables, userId);
  } catch (error) {
    console.error('Email job failed:', error);
    throw error;
  }
});
// Company Enrichment Processor
import { advancedWebsiteGuess, fuzzyGoogleWebsite } from './advancedWebsiteGuesser.js';
import { lookupCompanyOpenCorporates } from './companyRegistryLookup.js';
import { nlpExtractLinks } from './nlpExtractLinks.js';

/**
 * Processor for company enrichment jobs.
 * Uses a waterfall approach:
 * 1. Try registry API for website/socials
 * 2. Try advanced guesser
 * 3. Try public social and directory search
 * 4. Try fuzzy Google match
 * 5. Scrape website and extract data
 * 6. NLP extraction for additional links
 * Updates company record with website and socials.
 */
simpleQueue.process('company_enrichment', 3, async (job) => {
  const { companyId, url, userId, companyName } = job.data;
  try {
    console.log(`[QUEUE] Processing enrichment job for companyId=${companyId}, url=${url}, userId=${userId}, companyName=${companyName}`);
    const { scrapeWebsiteData } = await import('./scraper.js');
    const { updateCompany } = await import('../models/Company.js');
    const { createAuditLog } = await import('../models/AuditLog.js');
    const { default: companyFinder } = await import('./companyFinder.js');
    let websiteToUse = url;
    let emails = [];
    let address = '';
    let socials = {};
    // Step 1: Use companyFinder service first
    // Get company details from DB if needed
    let companyDetails = { name: companyName, address: '', phone: '' };
    if (!companyName || typeof companyName === 'object') {
      const { getCompanyById } = await import('../models/Company.js');
      const dbCompany = await getCompanyById(companyId);
      companyDetails = {
        name: dbCompany?.name || '',
        address: dbCompany?.address || '',
        phone: dbCompany?.phone || ''
      };
    }
    let finderResult = await companyFinder(companyDetails.name, companyDetails.address, companyDetails.phone);
    // Determine enrichment status
    let enrichmentStatus = "incomplete";
    const hasSocials = finderResult && finderResult.socials && (
      finderResult.socials.linkedin || finderResult.socials.facebook || finderResult.socials.twitter || finderResult.socials.instagram
    );
    if (finderResult && (finderResult.website || hasSocials)) {
      enrichmentStatus = "enriched";
      websiteToUse = finderResult.website;
      socials = { ...socials, ...finderResult.socials };
      console.log(`[QUEUE] companyFinder found for companyId=${companyId}:`, websiteToUse, socials);
    } else if (finderResult && (finderResult.email || finderResult.description || finderResult.industry)) {
      enrichmentStatus = "partially_enriched";
      console.log(`[QUEUE] companyFinder partially enriched for companyId=${companyId}`);
    } else {
      console.log(`[QUEUE] companyFinder did not find website or socials for companyId=${companyId}`);
    }
    // Step 2: Try registry API for website/socials if not found
    if (!websiteToUse) {
      try {
        const { getCompanyById } = await import('../models/Company.js');
        const dbCompany = await getCompanyById(companyId);
        address = dbCompany?.address || '';
        if (dbCompany?.emails) {
          try { emails = JSON.parse(dbCompany.emails); } catch (e) { emails = []; }
        }
      } catch (e) {}
      const registryResult = await lookupCompanyOpenCorporates({ name: companyName, address });
      if (registryResult && registryResult.website) {
        websiteToUse = registryResult.website;
        socials = { ...socials, ...registryResult.socials };
        console.log(`[QUEUE] RegistryLookup found for companyId=${companyId}:`, websiteToUse, socials);
      } else {
        console.log(`[QUEUE] RegistryLookup did not find website for companyId=${companyId}`);
      }
    }
    // Step 3: Try advanced guesser
    if (!websiteToUse) {
      websiteToUse = await advancedWebsiteGuess({ name: companyName, address, emails });
      console.log(`[QUEUE] AdvancedWebsiteGuess found for companyId=${companyId}:`, websiteToUse);
    }
  // Removed Step 4: Public social and directory search
    // Step 5: Fuzzy Google match
    if (!websiteToUse) {
      websiteToUse = await fuzzyGoogleWebsite({ name: companyName, address });
      console.log(`[QUEUE] FuzzyGoogleWebsite found for companyId=${companyId}:`, websiteToUse);
    }
    // Step 6: Scrape website and extract data
    let scrapedData = { url: websiteToUse, socialLinks: socials };
    if (websiteToUse) {
      scrapedData = await scrapeWebsiteData(websiteToUse);
      // Step 7: NLP extraction for additional links
      let nlpLinks = { website: null, socials: {} };
      if (scrapedData && scrapedData.html) {
        nlpLinks = nlpExtractLinks(scrapedData.html);
      } else if (scrapedData && scrapedData.description) {
        nlpLinks = nlpExtractLinks(scrapedData.description);
      }
      // Merge all sources: finder, registry, NLP, scraped, social, directories
      // Priority: companyFinder > registry > NLP > scraped > public social > directories > guess/google
      const allSocials = { ...scrapedData.socialLinks, ...nlpLinks.socials, ...socials };
      // Deduplicate socials (prefer official/shortest links)
      const dedupedSocials = {};
      for (const [key, value] of Object.entries(allSocials)) {
        if (!dedupedSocials[key] || (value && value.length < dedupedSocials[key].length)) {
          dedupedSocials[key] = value;
        }
      }
      scrapedData.socialLinks = dedupedSocials;
      // Website: prefer companyFinder, then registry, then NLP, then scraped, then guessed
      if (!websiteToUse && nlpLinks.website) websiteToUse = nlpLinks.website;
      if (!websiteToUse && scrapedData.url) websiteToUse = scrapedData.url;
      console.log(`[QUEUE] Scraped data for companyId=${companyId}:`, scrapedData);
    } else {
      console.log(`[QUEUE] No website found for companyId=${companyId}, skipping scrape. Returning empty socials.`);
    }
    // Update website, socials, and enrichment status columns
    const updateFields = { status: enrichmentStatus };
    if (websiteToUse) {
      updateFields.website = websiteToUse;
    }
    if (scrapedData.socialLinks) {
      updateFields.socials = JSON.stringify(scrapedData.socialLinks);
    }
    await updateCompany(companyId, updateFields);
    await createAuditLog(
      userId,
      'company_enrichment',
      'company',
      companyId, // targetId as integer
      null,      // sub-target (not used)
      { website: updateFields.website, socials: updateFields.socials }
    );
    console.log(`✅ Enriched company ${companyId} (${companyName})`);
  } catch (error) {
    console.error('[QUEUE] Company enrichment job failed:', error);
    throw error;
  }
});

// Export the queue instances
export const taskGenerationQueue = simpleQueue;
export const webScrapingQueue = simpleQueue;
export const emailQueue = simpleQueue;