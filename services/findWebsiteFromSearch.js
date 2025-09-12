import axios from 'axios';
import { parse } from 'node-html-parser';

/**
 * Attempts to find a company website by searching Google with the company name and address.
 * Returns the first likely website URL, or null if not found.
 * WARNING: This is experimental and may break if Google changes its HTML.
 */
export async function findWebsiteFromSearch({ name, address }) {
  if (!name) return null;
  const query = encodeURIComponent(`${name} ${address || ''}`);
  const url = `https://www.google.com/search?q=${query}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const root = parse(response.data);
    // Google search result links have hrefs like /url?q=https://company.com&sa=...
    const link = root.querySelector('a[href^="/url?q="]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/\/url\?q=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  } catch (err) {
    console.error('[FIND WEBSITE] Google search failed:', err.message);
    return null;
  }
}
