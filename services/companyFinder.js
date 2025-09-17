
import axios from "axios";
import * as cheerio from "cheerio";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { findEmployees as findEmployeesAdvanced } from './employeeFinder.js';

const HEADERS = { "User-Agent": "Mozilla/5.0" };

// DuckDuckGo HTML scraping
async function searchDuckDuckGo(query, maxResults = 5) {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log(`[DuckDuckGo] Searching for: ${query}`);
    const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const links = [];
    $("a.result__a").each((_, el) => {
      const link = $(el).attr("href");
      if (link) links.push(link);
    });
    // Parse DuckDuckGo redirect URLs to get the real website
    const parsedLinks = links.map(l => {
      if (l && l.includes('duckduckgo.com/l/?uddg=')) {
        try {
          const urlObj = new URL('https:' + l.replace(/^\//, ''));
          const realUrl = urlObj.searchParams.get('uddg');
          return realUrl ? decodeURIComponent(realUrl) : l;
        } catch (e) {
          return l;
        }
      }
      return l;
    });
    console.log(`[DuckDuckGo] Found ${parsedLinks.length} results:`, parsedLinks.slice(0, maxResults));
    return parsedLinks.slice(0, maxResults);
  } catch (err) {
    console.error(`[DuckDuckGo] Search error:`, err.message);
    return [];
  }
}

async function crawlWebsite(url) {
  const socials = { linkedin: "", facebook: "", twitter: "", instagram: "" };
  let email = null;
  let description = "";
  let homepage = url;
  try {
    console.log(`[Crawler] Crawling website: ${url}`);
    // Always resolve homepage
    try {
      const u = new URL(url);
      homepage = u.origin + '/';
    } catch {}
    const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $("title").text();
    $("a[href]").each((_, el) => {
      const link = $(el).attr("href").toLowerCase();
      if (link.includes("linkedin.com") && !socials.linkedin) socials.linkedin = link;
      if (link.includes("facebook.com") && !socials.facebook) socials.facebook = link;
      if ((link.includes("twitter.com") || link.includes("x.com")) && !socials.twitter)
        socials.twitter = link;
      if (link.includes("instagram.com") && !socials.instagram) socials.instagram = link;
      if (link.startsWith("mailto:") && !email) email = link.replace("mailto:", "").split("?")[0];
    });
    console.log(`[Crawler] Extracted description: ${description}`);
    console.log(`[Crawler] Extracted socials:`, socials);
    if (email) console.log(`[Crawler] Found email: ${email}`);
    // Return homepage for normalization
    return { socials, email, description, homepage };
  } catch (err) {
    // Log and return empty but do not throw, so enrichment continues
    console.warn(`[Crawler] Crawl error:`, err.message);
    return { socials, email, description, homepage, crawlError: err.message };
  }
  return { socials, email, description, homepage };
}

function inferIndustry(text) {
  const t = text.toLowerCase();
  let industry = "";
  if (t.includes("construction") || t.includes("builder")) industry = "Construction";
  else if (t.includes("real estate") || t.includes("property")) industry = "Real Estate";
  else if (t.includes("finance") || t.includes("mortgage")) industry = "Finance";
  else if (t.includes("software") || t.includes("technology")) industry = "Technology";
  else if (t.includes("health") || t.includes("clinic") || t.includes("hospital")) industry = "Healthcare";
  if (industry) console.log(`[Industry] Inferred industry: ${industry}`);
  return industry;
}


const enrichCompany = async (name, address, phone) => {
  console.log(`[Enrichment] Starting enrichment for: ${name}, ${address}, ${phone}`);
  const query = `${name} ${address} ${phone}`;
  const results = await searchDuckDuckGo(query);
  let website = results[0] || null;
  let homepage = website;
  let socials = {}, email = null, description = "";
  let emails = [], phones = [], employees = [];
  let linkedinEmployees = [];
  if (website) {
    // Normalize to homepage
    try {
      const u = new URL(website);
      homepage = u.origin + '/';
      website = homepage;
    } catch {}
    console.log(`[Enrichment] Found website: ${website}`);
    const crawlResult = await crawlWebsite(website);
    socials = crawlResult.socials;
    email = crawlResult.email;
    description = crawlResult.description;
    homepage = crawlResult.homepage || homepage;
    // Use advanced employee finder (website + LinkedIn)
    let advancedEmployees = [];
    try {
      advancedEmployees = (await findEmployeesAdvanced(null, name, homepage)).employees || [];
    } catch (e) {
      console.warn('[Enrichment] Advanced employee finder failed:', e.message);
    }
    // LinkedIn crawl if found
    if (socials.linkedin) {
      try {
        const linkedInResult = await findEmployeesAdvanced(null, name, socials.linkedin);
        linkedinEmployees = linkedInResult.employees || [];
      } catch (e) {
        console.warn('[Enrichment] LinkedIn crawl failed:', e.message);
      }
    }
    // Merge and dedupe employees (LinkedIn > website > others)
    const allEmployees = [...linkedinEmployees, ...advancedEmployees];
    // Filter out global false-positives and generic names, dedupe by (name, role, source)
    const blacklist = [
      'alen chen', 'alex chen', 'leadership team', 'contact us', 'top employees', 'per year', 'average salary', 'team', 'staff', 'management', 'needs manual identification'
    ];
    const empSet = new Set();
    employees = allEmployees.filter(emp => {
      if (!emp.name || emp.name.length < 3) return false;
      const norm = emp.name.toLowerCase().replace(/[^a-z ]/g, '');
      if (blacklist.includes(norm)) return false;
      // Dedupe by (name, role, source)
      const key = `${emp.name.toLowerCase()}|${emp.role ? emp.role.toLowerCase() : ''}|${emp.source ? emp.source.toLowerCase() : ''}`;
      if (empSet.has(key)) return false;
      empSet.add(key);
      // Must have at least two capitalized words (likely a real name)
      if (!emp.name.match(/\b[A-Z][a-z]+ [A-Z][a-z]+/)) return false;
      // Must have a role or email/phone
      if (!(emp.role || emp.email || emp.phone)) return false;
      return true;
    });
    // Extract additional emails/phones from website
    try {
      const res = await axios.get(website, { headers: HEADERS, timeout: 10000 });
      const html = res.data;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      emails = Array.from(new Set((html.match(emailRegex) || [])));
      // Phone extraction: only valid, normalized, 11-13 digits
      const phoneRegex = /(\+?\d[\d\s().-]{9,20}\d)/g;
      let phoneMatches = html.match(phoneRegex) || [];
      phones = phoneMatches
        .map(num => {
          try {
            const pn = parsePhoneNumberFromString(num, 'CA');
            if (pn && pn.isValid() && pn.number.length >= 11 && pn.number.length <= 13) return pn.format('E.164');
          } catch {}
          return null;
        })
        .filter(Boolean);
      phones = Array.from(new Set(phones));
    } catch (e) {
      // fallback: no extra emails/phones
    }
  } else {
    console.log(`[Enrichment] No website found for: ${name}`);
  }
  // Always include the direct email/phone if present and valid
  if (email && !emails.includes(email)) emails.unshift(email);
  if (phone) {
    try {
      const pn = parsePhoneNumberFromString(phone, 'CA');
      if (pn && pn.isValid() && pn.number.length >= 11 && pn.number.length <= 13 && !phones.includes(pn.format('E.164'))) {
        phones.unshift(pn.format('E.164'));
      }
    } catch {}
  }
  // Remove duplicates
  emails = Array.from(new Set(emails));
  phones = Array.from(new Set(phones));
  // Rank: LinkedIn > website > others (already ordered)
  // Pick best website (homepage)
  const industry = inferIndustry(description);
  // Determine enrichment status
  let status = "incomplete";
  const hasSocials = socials && (socials.linkedin || socials.facebook || socials.twitter || socials.instagram);
  if (website || hasSocials) {
    status = "enriched";
  } else if (emails.length || description || industry) {
    status = "partially_enriched";
  }
  const result = {
    companyName: name,
    address,
    phone: phones[0] || null,
    website: homepage,
    socials,
    emails,
    phones,
    employees,
    description,
    industry,
    status
  };
  console.log(`[Enrichment] Final enrichment result:`, result);
  return result;
};

export default enrichCompany;