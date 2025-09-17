import axios from 'axios';
import { parse } from 'node-html-parser';

const scrapeWebsiteData = async (url) => {
  try {
    console.log(`[SCRAPER] Scraping: ${url}`);
    
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });

  // Removed unnecessary delay for performance

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

    // Extract phone numbers (only those with 11-13 digits, ignoring symbols)
    const phoneRegex = /(\+?\d[\d\s().-]{9,20}\d)/g;
    const textContent = root.text;
    let phoneMatches = textContent.match(phoneRegex) || [];
    // Filter to only those with 11-13 digits
    phoneMatches = phoneMatches.filter(num => {
      const digits = num.replace(/\D/g, '');
      return digits.length >= 11 && digits.length <= 13;
    });

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