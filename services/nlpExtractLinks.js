// Extract website and social links from raw text using simple NLP patterns
export function nlpExtractLinks(text) {
  if (!text) return { website: null, socials: {} };
  const socials = {};
  let website = null;

  // Website patterns
  const websiteRegex = /(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?)/gi;
  const websitePhraseRegex = /(visit us at|official website|our website|find us at)\s*:?\s*(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;

  // Social patterns
  const socialPatterns = {
    linkedin: /https?:\/\/(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/]+/gi,
    facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9\-_/]+/gi,
    twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9\-_/]+/gi,
    instagram: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9\-_/]+/gi,
    youtube: /https?:\/\/(www\.)?youtube\.com\/[a-zA-Z0-9\-_/]+/gi
  };

  // 1. Look for explicit website phrases
  const phraseMatch = text.match(websitePhraseRegex);
  if (phraseMatch && phraseMatch[2]) {
    website = phraseMatch[2];
  }
  // 2. Otherwise, take the first generic website found
  if (!website) {
    const allWebsites = text.match(websiteRegex);
    if (allWebsites && allWebsites.length > 0) {
      website = allWebsites[0];
    }
  }
  // 3. Socials
  for (const [key, regex] of Object.entries(socialPatterns)) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      socials[key] = matches[0];
    }
  }
  return { website, socials };
}
