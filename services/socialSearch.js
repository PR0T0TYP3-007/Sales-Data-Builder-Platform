import axios from 'axios';
import { parse } from 'node-html-parser';

// Helper to search a social platform using Google and extract the first matching profile/page
async function searchSocial(companyName, platform) {
  const queries = {
    facebook: `${companyName} site:facebook.com`,
    twitter: `${companyName} site:twitter.com`,
    linkedin: `${companyName} site:linkedin.com`,
    instagram: `${companyName} site:instagram.com`,
  };
  const query = encodeURIComponent(queries[platform]);
  const url = `https://www.google.com/search?q=${query}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const root = parse(response.data);
    const link = root.querySelector('a[href^="/url?q=https://www.' + platform + '.com"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/\/url\?q=(https:\/\/[a-zA-Z0-9./_-]+)&/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (err) {
    console.error(`[SOCIAL SEARCH] ${platform} search failed:`, err.message);
    return null;
  }
}

export async function searchAllSocials(companyName) {
  const socials = {};
  for (const platform of ['facebook', 'twitter', 'linkedin', 'instagram']) {
    const url = await searchSocial(companyName, platform);
    if (url) socials[platform] = url;
  }
  return socials;
}
