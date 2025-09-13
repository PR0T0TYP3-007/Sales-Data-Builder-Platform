/**
 * Company Finder Service
 * Discovers company websites using a waterfall approach (URL patterns, Google, API).
 * Scrapes and validates company data for enrichment.
 */
import axios from 'axios';
import * as dotenv from "dotenv";
import * as cheerio from "cheerio";
dotenv.config();
const BING_KEY = process.env.BING_API_KEY;

async function searchCompany(query) {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url, {
    headers: { "Ocp-Apim-Subscription-Key": BING_KEY }
  });
  return res.data.webPages?.value || [];
}

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

async function detectIndustry(websiteUrl, linkedinUrl) {
  let industry = "";
  if (websiteUrl) {
    try {
      const res = await axios.get(websiteUrl, { timeout: 7000 });
      const $ = cheerio.load(res.data);
      industry = $('meta[name="description"]').attr("content") || $("title").text();
    } catch {
      console.warn("No industry info from website");
    }
  }
  if (!industry && linkedinUrl) {
    try {
      const res = await axios.get(linkedinUrl, { timeout: 7000 });
      const $ = cheerio.load(res.data);
      const desc = $('meta[property="og:description"]').attr("content");
      const title = $('meta[property="og:title"]').attr("content");
      industry = desc || title || industry;
    } catch {
      console.warn("No industry info from LinkedIn");
    }
  }
  return industry;
}

async function enrichCompanyBing(company) {
  const query = `${company.name || company["Company Name"] || ""} ${company.address || company["Address"] || ""} ${company.phone || company["Phone Number"] || ""}`;
  const results = await searchCompany(query);
  const { website, ...searchSocials } = extractLinks(results);
  let siteSocials = { linkedin: "", facebook: "", twitter: "", instagram: "" };
  let industry = "";
  if (website) {
    siteSocials = await crawlWebsite(website);
    industry = await detectIndustry(website, searchSocials.linkedin);
  }
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

const enrichCompany = async (companyId, companyName, location, existingData = {}) => {
  try {
    const companyObj = {
      name: companyName,
      address: existingData.address || '',
      phone: existingData.phone || '',
    };
    const enriched = await enrichCompanyBing(companyObj);
    let status = 'failed';
    if (enriched.website) {
      status = 'enriched';
    } else if (enriched.linkedin || enriched.facebook || enriched.twitter || enriched.instagram) {
      status = 'partially_enriched';
    }
    return {
      website: enriched.website || null,
      description: enriched.industry || null,
      phone: enriched.phone || null,
      email: enriched.email || null,
      socials: {
        linkedin: enriched.linkedin || null,
        facebook: enriched.facebook || null,
        twitter: enriched.twitter || null,
        instagram: enriched.instagram || null
      },
      industry: enriched.industry || null,
      status,
      enrichment_status: status,
      last_enrichment_attempt: new Date()
    };
  } catch (error) {
    console.error(`❌ Critical enrichment error for "${companyName}":`, error.message);
    return {
      website: null,
      description: null,
      phone: null,
      email: null,
      socials: null,
      industry: null,
      status: 'scraping_failed',
      enrichment_status: 'scraping_failed',
      last_enrichment_attempt: new Date(),
      error_message: error.message
    };
  }
};

module.exports = enrichCompany;