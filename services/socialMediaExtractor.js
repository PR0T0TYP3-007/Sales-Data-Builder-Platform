import axios from 'axios';
import { parse } from 'node-html-parser';

// Configure axios for social media discovery
const axiosInstance = axios.create({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  }
});

// Extract social media links from website
const extractSocialMediaLinks = async (websiteUrl) => {
  console.log(`🔍 Searching for social media links on: ${websiteUrl}`);
  
  try {
    const response = await axiosInstance.get(websiteUrl);
    const html = response.data;
    const root = parse(html);
    
    const socialLinks = {
      linkedin: null,
      facebook: null,
      twitter: null,
      instagram: null,
      youtube: null
    };
    
    // Find all links on the page
    const links = root.querySelectorAll('a[href]');
    
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      
      const url = href.toLowerCase();
      
      // Check for social media patterns
      if (url.includes('linkedin.com/company') || url.includes('linkedin.com/in')) {
        socialLinks.linkedin = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
      }
      else if (url.includes('facebook.com') || url.includes('fb.com')) {
        socialLinks.facebook = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
      }
      else if (url.includes('twitter.com') || url.includes('x.com')) {
        socialLinks.twitter = href.startsWith('http') ? href : `https://www.twitter.com${href}`;
      }
      else if (url.includes('instagram.com')) {
        socialLinks.instagram = href.startsWith('http') ? href : `https://www.instagram.com${href}`;
      }
      else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        socialLinks.youtube = href.startsWith('http') ? href : `https://www.youtube.com${href}`;
      }
    }
    
    // Also check meta tags for social media URLs
    const metaTags = root.querySelectorAll('meta[content]');
    for (const meta of metaTags) {
      const content = meta.getAttribute('content');
      if (!content) continue;
      
      const url = content.toLowerCase();
      
      if (url.includes('linkedin.com') && !socialLinks.linkedin) {
        socialLinks.linkedin = content;
      }
      else if (url.includes('facebook.com') && !socialLinks.facebook) {
        socialLinks.facebook = content;
      }
      else if ((url.includes('twitter.com') || url.includes('x.com')) && !socialLinks.twitter) {
        socialLinks.twitter = content;
      }
      else if (url.includes('instagram.com') && !socialLinks.instagram) {
        socialLinks.instagram = content;
      }
      else if (url.includes('youtube.com') && !socialLinks.youtube) {
        socialLinks.youtube = content;
      }
    }
    
    // Filter out null values
    const filteredLinks = Object.fromEntries(
      Object.entries(socialLinks).filter(([_, value]) => value !== null)
    );
    
    console.log(`Found ${Object.keys(filteredLinks).length} social media links`);
    return filteredLinks;
    
  } catch (error) {
    console.error(`Error extracting social media links from ${websiteUrl}:`, error.message);
    return {};
  }
};

// Search for social media profiles using company name
const searchSocialMediaProfiles = async (companyName, websiteUrl = null) => {
  console.log(`🔍 Searching for social media profiles for: ${companyName}`);
  
  const socialLinks = {};
  const cleanName = companyName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '').toLowerCase();
  
  // Common social media URL patterns to try
  const patterns = [
    { platform: 'linkedin', url: `https://www.linkedin.com/company/${cleanName}` },
    { platform: 'facebook', url: `https://www.facebook.com/${cleanName}` },
    { platform: 'twitter', url: `https://www.twitter.com/${cleanName}` },
    { platform: 'instagram', url: `https://www.instagram.com/${cleanName}` }
  ];
  
  // Test each URL pattern
  for (const { platform, url } of patterns) {
    try {
      const response = await axiosInstance.head(url);
      if (response.status >= 200 && response.status < 400) {
        socialLinks[platform] = url;
        console.log(`✅ Found ${platform} profile: ${url}`);
      }
    } catch (error) {
      // Profile not found or other error
      continue;
    }
  }
  
  return socialLinks;
};

export { extractSocialMediaLinks, searchSocialMediaProfiles };