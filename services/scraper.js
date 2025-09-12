import axios from 'axios';
import { parse } from 'node-html-parser';
import { domainRateLimiter } from '../middleware/rateLimit.js';

const scrapeWebsiteData = async (url) => {
  try {
    console.log(`[SCRAPER] Scraping: ${url}`);
    
    const axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });

    // Add delay to be polite
    await new Promise(resolve => setTimeout(resolve, parseInt(process.env.SCRAPING_DELAY_MS) || 2000));

    const response = await axiosInstance.get(url);
    const html = response.data;
    const root = parse(html);

    // Extract meta description
    const metaDescription = root.querySelector('meta[name="description"]');
    const description = metaDescription ? metaDescription.getAttribute('content') : '';

    // Extract Open Graph data
    const ogTitle = root.querySelector('meta[property="og:title"]');
    const ogDescription = root.querySelector('meta[property="og:description"]');
    const ogImage = root.querySelector('meta[property="og:image"]');

    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const textContent = root.text;
    const phoneMatches = textContent.match(phoneRegex) || [];

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = textContent.match(emailRegex) || [];

    // Extract social media links
    const socialLinks = {};
    const links = root.querySelectorAll('a[href]');
    
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;

      const lurl = href.toLowerCase();
      if (lurl.includes('linkedin.com')) socialLinks.linkedin = href;
      else if (lurl.includes('facebook.com')) socialLinks.facebook = href;
      else if (lurl.includes('twitter.com') || lurl.includes('x.com')) socialLinks.twitter = href;
      else if (lurl.includes('instagram.com')) socialLinks.instagram = href;
      else if (lurl.includes('youtube.com')) socialLinks.youtube = href;
    }
    console.log(`[SCRAPER] Extracted description: ${description}`);
    console.log(`[SCRAPER] Extracted phones:`, phoneMatches);
    console.log(`[SCRAPER] Extracted emails:`, emailMatches);
    console.log(`[SCRAPER] Extracted socials:`, socialLinks);

    return {
      url,
      title: root.querySelector('title')?.text || '',
      description: description || ogDescription?.getAttribute('content') || '',
      phone: phoneMatches[0] || null,
      emails: emailMatches,
      socialLinks,
      ogTitle: ogTitle?.getAttribute('content') || '',
      ogImage: ogImage?.getAttribute('content') || '',
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  }
};

export { scrapeWebsiteData };