// This file's logic has been merged into companyFinder.js for unified enrichment.

const COMMON_TLDS = ['.com', '.net', '.org', '.ca', '.co', '.io', '.biz', '.info', '.us', '.uk', '.fr', '.de', '.in'];
const PATTERNS = [
  '{base}', '{base}group', '{base}inc', '{base}ltd', '{base}company', '{base}corp', '{base}co', '{base}city', '{base}solutions', '{base}llc', '{base}plc', '{base}holdings', '{base}consulting', '{base}international', '{base}global', '{base}enterprises', '{base}ventures', '{base}partners', '{base}groupinc', '{base}groupco', '{base}groupplc', '{base}groupcorp', '{base}groupcompany', '{base}groupgroup'
];

function cleanCompanyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '')
    .replace(/ltd|inc|llc|corp|company|limited|plc|gmbh|pty|sarl|sa|bv|ag|kg|lp|llp|co/g, '');
}

async function checkUrl(url) {
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.status === 200 && res.data && typeof res.data === 'string' && !/domain parked|buy this domain|for sale/i.test(res.data)) {
      return true;
    }
  } catch (e) {}
  return false;
}

export async function advancedWebsiteGuess({ name, address, emails }) {
  if (!name) return null;
  const base = cleanCompanyName(name);
  let found = null;
  let timedOut = false;
  // Promise that resolves after 10 seconds
  const timeoutPromise = new Promise(resolve => setTimeout(() => { timedOut = true; resolve(null); }, 25000));
  // Main guessing logic as a promise
  const guessPromise = (async () => {
    // 6. Check for email domain
    if (emails && emails.length > 0) {
      for (const email of emails) {
        const match = email.match(/@([a-zA-Z0-9.-]+)\.[a-zA-Z]{2,}/);
        if (match && match[1]) {
          const domain = match[1];
          for (const tld of COMMON_TLDS) {
            if (timedOut) return null;
            const url = `https://www.${domain}${tld}`;
            if (await checkUrl(url)) return url;
          }
          // Try the domain as-is
          if (timedOut) return null;
          const url = `https://${domain}`;
          if (await checkUrl(url)) return url;
        }
      }
    }
    // 1,2. Try patterns and TLDs
    for (const pattern of PATTERNS) {
      const candidate = pattern.replace('{base}', base);
      for (const tld of COMMON_TLDS) {
        for (const prefix of ['https://www.', 'https://']) {
          if (timedOut) return null;
          const url = `${prefix}${candidate}${tld}`;
          if (await checkUrl(url)) return url;
        }
      }
    }
    return null;
  })();
  // Race the guessing logic against the timeout
  found = await Promise.race([guessPromise, timeoutPromise]);
  return found;
}

// 5. Fuzzy match Google results
export async function fuzzyGoogleWebsite({ name, address }) {
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
    const links = root.querySelectorAll('a[href^="/url?q="]');
    const base = cleanCompanyName(name);
    let best = null, bestScore = 0;
    for (const link of links.slice(0, 5)) {
      const href = link.getAttribute('href');
      const match = href.match(/\/url\?q=([^&]+)/);
      if (match && match[1]) {
        const candidate = match[1].toLowerCase();
        // Score: domain contains base, not a directory, not a social/profile
        let score = 0;
        if (candidate.includes(base)) score += 2;
        if (/\.com|\.net|\.org|\.ca|\.co|\.io|\.biz|\.info|\.us|\.uk|\.fr|\.de|\.in/.test(candidate)) score += 1;
        if (!/facebook|linkedin|twitter|instagram|youtube|wikipedia|crunchbase|glassdoor|indeed|yelp/.test(candidate)) score += 1;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
    }
    return best;
  } catch (err) {
    console.error('[FUZZY GOOGLE] Google search failed:', err.message);
    return null;
  }
}
