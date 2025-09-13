import axios from "axios";
import * as XLSX from "xlsx";
import * as dotenv from "dotenv";
import cheerio from "cheerio";

dotenv.config();
const BING_KEY = process.env.BING_API_KEY;

// --- 1. Load companies from Excel ---
// Usage: pass array of company objects

// --- 2. Bing search helper ---
async function searchCompany(query) {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url, {
    headers: { "Ocp-Apim-Subscription-Key": BING_KEY }
  });
  return res.data.webPages?.value || [];
}

// --- 3. Extract likely official website + known social links from search ---
function extractLinks(results) {
  const website = results[0]?.url || "";
  const socials = { linkedin: "", facebook: "", twitter: "", instagram: "" };

  for (let r of results) {
    const link = r.url.toLowerCase();
    if (link.includes("linkedin.com/company")) socials.linkedin = r.url;
    if (link.includes("facebook.com")) socials.facebook = r.url;
    if (link.includes("twitter.com")) socials.twitter = r.url;
    if (link.includes("instagram.com")) socials.instagram = r.url;
  }

  return { website, ...socials };
}

// --- 4. Crawl a website and look for embedded social links ---
async function crawlWebsite(url) {
  const socials = { linkedin: "", facebook: "", twitter: "", instagram: "" };
  try {
    const res = await axios.get(url, { timeout: 7000 });
    const $ = cheerio.load(res.data);

    $("a[href]").each((_, el) => {
      const link = $(el).attr("href")?.toLowerCase();
      if (!link) return;
      if (link.includes("linkedin.com") && !socials.linkedin) socials.linkedin = link;
      if (link.includes("facebook.com") && !socials.facebook) socials.facebook = link;
      if ((link.includes("twitter.com") || link.includes("x.com")) && !socials.twitter)
        socials.twitter = link;
      if (link.includes("instagram.com") && !socials.instagram) socials.instagram = link;
    });
  } catch (err) {
    console.warn("Failed to crawl site:", url);
  }
  return socials;
}

// --- 5. Detect industry from website or LinkedIn ---
async function detectIndustry(websiteUrl, linkedinUrl) {
  let industry = "";

  // 1. Website meta description
  if (websiteUrl) {
    try {
      const res = await axios.get(websiteUrl, { timeout: 7000 });
      const $ = cheerio.load(res.data);
      industry = $('meta[name="description"]').attr("content") || $("title").text();
    } catch {
      console.warn("No industry info from website");
    }
  }

  // 2. LinkedIn company profile (if available)
  if (!industry && linkedinUrl) {
    try {
      const res = await axios.get(linkedinUrl, { timeout: 7000 });
      const $ = cheerio.load(res.data);

      // LinkedIn often stores company desc in meta tags
      const desc = $('meta[property="og:description"]').attr("content");
      const title = $('meta[property="og:title"]').attr("content");
      industry = desc || title || industry;
    } catch {
      console.warn("No industry info from LinkedIn");
    }
  }

  return industry;
}

// --- 6. Main enrichment function ---
export async function enrichCompanyBing(company) {
  const query = `${company.name || company["Company Name"] || ""} ${company.address || company["Address"] || ""} ${company.phone || company["Phone Number"] || ""}`;
  const results = await searchCompany(query);
  const { website, ...searchSocials } = extractLinks(results);

  // Crawl website if available
  let siteSocials = { linkedin: "", facebook: "", twitter: "", instagram: "" };
  let industry = "";
  if (website) {
    siteSocials = await crawlWebsite(website);
    industry = await detectIndustry(website, searchSocials.linkedin);
  }

  // Merge social results (prefer site > search)
  const socials = {
    linkedin: siteSocials.linkedin || searchSocials.linkedin,
    facebook: siteSocials.facebook || searchSocials.facebook,
    twitter: siteSocials.twitter || searchSocials.twitter,
    instagram: siteSocials.instagram || searchSocials.instagram
  };

  return {
    ...company,
    website,
    ...socials,
    industry
  };
}
