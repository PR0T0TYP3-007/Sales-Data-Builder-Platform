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
simpleQueue.process('company_enrichment', 3, async (job) => {
  const { companyId, url, userId, companyName } = job.data;
  try {
    console.log(`[QUEUE] Processing enrichment job for companyId=${companyId}, url=${url}, userId=${userId}, companyName=${companyName}`);
    const { scrapeWebsiteData } = await import('./scraper.js');
    const { updateCompany } = await import('../models/Company.js');
    const { createAuditLog } = await import('../models/AuditLog.js');
    let websiteToUse = url;
    let emails = [];
    let address = '';
    let socials = {};
    if (!websiteToUse) {
      // Try to get emails and address from DB
      try {
        const { getCompanyById } = await import('../models/Company.js');
        const dbCompany = await getCompanyById(companyId);
        address = dbCompany?.address || '';
        if (dbCompany?.emails) {
          try { emails = JSON.parse(dbCompany.emails); } catch (e) { emails = []; }
        }
      } catch (e) {}
      // 1: Try company registry API first
      const registryResult = await lookupCompanyOpenCorporates({ name: companyName, address });
      if (registryResult && registryResult.website) {
        websiteToUse = registryResult.website;
        socials = registryResult.socials || {};
        console.log(`[QUEUE] RegistryLookup found for companyId=${companyId}:`, websiteToUse, socials);
      }
    }
    if (!websiteToUse) {
      // 6, 2, 1: Try advanced guesser
      websiteToUse = await advancedWebsiteGuess({ name: companyName, address, emails });
      console.log(`[QUEUE] AdvancedWebsiteGuess found for companyId=${companyId}:`, websiteToUse);
    }
  // Social media public search (all four platforms)
  const publicSocials = await searchAllSocials(companyName);
  socials = { ...socials, ...publicSocials };
  // Business directory search (Yelp, YellowPages, BBB)
  const directories = await searchAllDirectories(companyName);
  socials = { ...socials, ...directories };
    if (!websiteToUse) {
      // 5: Fuzzy Google match
      websiteToUse = await fuzzyGoogleWebsite({ name: companyName, address });
      console.log(`[QUEUE] FuzzyGoogleWebsite found for companyId=${companyId}:`, websiteToUse);
    }
    let scrapedData = { url: websiteToUse, socialLinks: socials };
    if (websiteToUse) {
      scrapedData = await scrapeWebsiteData(websiteToUse);
      // NLP extraction from HTML/text
      let nlpLinks = { website: null, socials: {} };
      if (scrapedData && scrapedData.html) {
        nlpLinks = nlpExtractLinks(scrapedData.html);
      } else if (scrapedData && scrapedData.description) {
        nlpLinks = nlpExtractLinks(scrapedData.description);
      }
      // Merge all sources: registry, NLP, scraped, social, directories
      // Priority: registry > NLP > scraped > public social > directories > guess/google
      const allSocials = { ...scrapedData.socialLinks, ...nlpLinks.socials, ...socials };
      // Deduplicate socials (prefer official/shortest links)
      const dedupedSocials = {};
      for (const [key, value] of Object.entries(allSocials)) {
        if (!dedupedSocials[key] || (value && value.length < dedupedSocials[key].length)) {
          dedupedSocials[key] = value;
        }
      }
      scrapedData.socialLinks = dedupedSocials;
      // Website: prefer registry, then NLP, then scraped, then guessed
      if (!websiteToUse && nlpLinks.website) websiteToUse = nlpLinks.website;
      if (!websiteToUse && scrapedData.url) websiteToUse = scrapedData.url;
      console.log(`[QUEUE] Scraped data for companyId=${companyId}:`, scrapedData);
    } else {
      console.log(`[QUEUE] No website found for companyId=${companyId}, skipping scrape. Returning empty socials.`);
    }
    // Only update the website and socials columns
    const updateFields = {};
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