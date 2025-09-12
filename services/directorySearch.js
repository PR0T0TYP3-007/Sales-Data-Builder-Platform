import axios from 'axios';
import { parse } from 'node-html-parser';

// Helper to search a business directory using Google and extract the first matching profile/page
async function searchDirectory(companyName, directory) {
  const queries = {
    yelp: `${companyName} site:yelp.com`,
    yellowpages: `${companyName} site:yellowpages.com`,
    bbb: `${companyName} site:bbb.org`,
  };
  const query = encodeURIComponent(queries[directory]);
  const url = `https://www.google.com/search?q=${query}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const root = parse(response.data);
    const link = root.querySelector('a[href^="/url?q=https://www.' + (directory === 'bbb' ? '' : directory + '.') + (directory === 'yellowpages' ? 'yellowpages.com' : directory === 'bbb' ? 'bbb.org' : 'yelp.com') + '"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/\/url\?q=(https:\/\/[a-zA-Z0-9./_-]+)&/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (err) {
    console.error(`[DIRECTORY SEARCH] ${directory} search failed:`, err.message);
    return null;
  }
}

export async function searchAllDirectories(companyName) {
  const directories = {};
  for (const dir of ['yelp', 'yellowpages', 'bbb']) {
    const url = await searchDirectory(companyName, dir);
    if (url) directories[dir] = url;
  }
  return directories;
}
