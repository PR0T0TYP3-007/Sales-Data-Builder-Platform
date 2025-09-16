
import axios from "axios";
import * as cheerio from "cheerio";

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
  try {
    console.log(`[Crawler] Crawling website: ${url}`);
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
  } catch (err) {
    console.warn(`[Crawler] Crawl error:`, err.message);
  }
  return { socials, email, description };
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
  const website = results[0] || null;
  let socials = {}, email = null, description = "", html = "";
  let emails = [], phones = [];
  let employees = [];
  if (website) {
    console.log(`[Enrichment] Found website: ${website}`);
    const crawlResult = await crawlWebsite(website);
    socials = crawlResult.socials;
    email = crawlResult.email;
    description = crawlResult.description;
    html = crawlResult.html || "";
    // Extract additional emails/phones from HTML
    if (html) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
      emails = Array.from(new Set((html.match(emailRegex) || [])));
      phones = Array.from(new Set((html.match(phoneRegex) || [])));
    }
    // Find employees by crawling about/team pages
    try {
      const employeePages = ["about", "team", "leadership", "our-people", "management"];
      for (let path of employeePages) {
        try {
          const res = await axios.get(`${website.replace(/\/$/, "")}/${path}`, { headers: HEADERS, timeout: 10000 });
          const $ = cheerio.load(res.data);
          $("p, h2, h3, li").each((_, el) => {
            const text = $(el).text().trim();
            if (
              text.match(/[A-Z][a-z]+ [A-Z][a-z]+/) &&
              (text.includes("CEO") || text.includes("Manager") || text.includes("Director") || text.includes("Officer") || text.includes("President"))
            ) {
              employees.push({ raw: text });
            }
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[Enrichment] Employee enrichment failed:', err.message);
    }
  } else {
    console.log(`[Enrichment] No website found for: ${name}`);
  }
  // Always include the direct email/phone if present
  if (email && !emails.includes(email)) emails.unshift(email);
  if (phone && !phones.includes(phone)) phones.unshift(phone);
  // Remove duplicates
  emails = Array.from(new Set(emails));
  phones = Array.from(new Set(phones));
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
    phone,
    website,
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