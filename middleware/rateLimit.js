import rateLimit from 'express-rate-limit';

// Memory store for rate limiting (replaces Redis store)
const memoryStore = new Map();

// Simple in-memory rate limiting
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.'
    });
  }
});

// Strict rate limiting for scraping endpoints
export const scrapingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: 'Too many scraping requests, please slow down.'
});

// Domain-specific rate limiting (in-memory implementation)
export const domainRateLimiter = (domain) => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute per domain
    max: 2, // max 2 requests per minute per domain
    keyGenerator: (req) => {
      return `${domain}:${req.ip}`;
    },
    message: `Too many requests to ${domain}, respecting website rate limits.`
  });
};

// Robots.txt checker middleware
export const checkRobotsTxt = async (req, res, next) => {
  if (req.path.includes('/api/scrape/')) {
    const targetUrl = req.body.url || req.query.url;
    
    if (targetUrl) {
      try {
        const axios = (await import('axios')).default;
        const domain = new URL(targetUrl).origin;
        const robotsUrl = `${domain}/robots.txt`;
        
        const response = await axios.get(robotsUrl, { timeout: 5000 });
        const robotsTxt = response.data;
        
        // Check if path is disallowed
        const path = new URL(targetUrl).pathname;
        if (robotsTxt.includes(`Disallow: ${path}`)) {
          return res.status(403).json({
            error: 'Access to this URL is disallowed by robots.txt'
          });
        }
      } catch (error) {
        // If robots.txt is inaccessible, proceed with caution
        console.warn('Robots.txt check failed:', error.message);
      }
    }
  }
  
  next();
};