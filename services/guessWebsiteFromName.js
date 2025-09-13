// This file's logic has been merged into companyFinder.js for unified enrichment.

const COMMON_TLDS = ['.com', '.net', '.org', '.ca', '.co', '.io', '.biz', '.info'];

function cleanCompanyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '')
    .replace(/ltd|inc|llc|corp|company|limited|plc|gmbh|pty|sarl|sa|bv|ag|kg|lp|llp|co/g, '');
}

export async function guessWebsiteFromName(name) {
  if (!name) return null;
  const base = cleanCompanyName(name);
  for (const tld of COMMON_TLDS) {
    const url = `https://www.${base}${tld}`;
    try {
      const res = await axios.get(url, { timeout: 5000 });
      if (res.status === 200 && res.data && typeof res.data === 'string' && !/domain parked|buy this domain|for sale/i.test(res.data)) {
        return url;
      }
    } catch (e) {
      // Ignore errors (site doesn't exist, etc.)
    }
  }
  return null;
}
