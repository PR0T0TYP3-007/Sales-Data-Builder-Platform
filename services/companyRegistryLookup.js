import axios from 'axios';

/**
 * Looks up company info from OpenCorporates API by name and (optionally) address.
 * Returns { website, socials } if found, else null.
 * Free tier: 1000 requests/month, no key needed for basic search.
 */
export async function lookupCompanyOpenCorporates({ name, address }) {
  if (!name) return null;
  const query = encodeURIComponent(name + (address ? ' ' + address : ''));
  const url = `https://api.opencorporates.com/v0.4/companies/search?q=${query}`;
  try {
    const res = await axios.get(url);
    if (res.data && res.data.results && res.data.results.companies && res.data.results.companies.length > 0) {
      const company = res.data.results.companies[0].company;
      // OpenCorporates sometimes has a website field
      const website = company.homepage_url || null;
      // Socials are not always present, but sometimes in 'identifiers' or 'network'
      let socials = {};
      if (company.networks) {
        for (const net of company.networks) {
          if (net.network_name && net.network_url) {
            socials[net.network_name.toLowerCase()] = net.network_url;
          }
        }
      }
      return { website, socials };
    }
    return null;
  } catch (e) {
    console.error('[REGISTRY LOOKUP] OpenCorporates error:', e.message);
    return null;
  }
}
