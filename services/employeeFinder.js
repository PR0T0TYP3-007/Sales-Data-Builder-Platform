// DuckDuckGo employee search
import { parse as parseHTML } from 'node-html-parser';
const searchDuckDuckGoEmployees = async (companyName) => {
  const employees = [];
  try {
    const query = encodeURIComponent(`${companyName} employees`);
    const url = `https://duckduckgo.com/html/?q=${query}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const root = parseHTML(response.data);
    const results = root.querySelectorAll('.result');
    for (const result of results) {
      const text = result.text.trim();
      // Simple regex to find patterns like: Name - Role at Company
      const match = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)[^\w]+([\w\s]+) at/i);
      if (match) {
        const name = match[1];
        const role = match[2].trim();
        employees.push({ name, role, source: url });
      }
    }
  } catch (err) {
    // Ignore errors, just return what we found
  }
  return employees;
};
import axios from 'axios';
import { parse } from 'node-html-parser';
import { createContact } from '../models/Contact.js';

// Configure axios for web scraping
const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  }
});

// Extract employees from a company website

const searchGovernmentRecords = async (companyName, location) => {
  // Mock implementation - replace with real API integration
  const mockData = {
    'Halifax': [
      { name: 'John Smith', role: 'Director', source: 'NS Corporate Registry' },
      { name: 'Sarah Johnson', role: 'Secretary', source: 'NS Corporate Registry' }
    ],
    'Toronto': [
      { name: 'Michael Brown', role: 'President', source: 'Ontario Business Registry' }
    ]
  };
  return mockData[location] || mockData['Halifax'] || [];
};

const searchPressReleases = async (companyName) => {
  // Real implementation would parse Google results for employee mentions
  return [];
};

const searchSocialMediaMentions = async (companyName) => {
  // Mock implementation - replace with real social media API integration
  return [
    { name: 'Alex Chen', role: 'Tech Lead', source: 'LinkedIn Mention' },
    { name: 'Maria Garcia', role: 'Marketing Manager', source: 'Twitter Mention' }
  ];
};

const findEmployees = async (companyId, companyName, websiteUrl, location = '') => {
  // 1. Scrape website for employees (normal logic)
  let employees = [];
  try {
    const teamPaths = [
      '/team', '/about', '/about-us', '/people', '/staff',
      '/leadership', '/management', '/company', '/our-team'
    ];
    for (const path of teamPaths) {
      try {
        const teamUrl = `${websiteUrl}${path}`;
        const response = await axiosInstance.get(teamUrl);
        const html = response.data;
        const root = parse(html);
        const employeeElements = root.querySelectorAll('.team-member, .employee, .staff-member, .person, [class*="team"], [class*="employee"]');
        for (const element of employeeElements) {
          const nameElement = element.querySelector('h2, h3, h4, [class*="name"], .name');
          const roleElement = element.querySelector('[class*="title"], .title, .position, [class*="role"]');
          const phoneElement = element.querySelector('[href^="tel:"], .phone, [class*="phone"], [data-phone]');
          const emailElement = element.querySelector('[href^="mailto:"], .email, [class*="email"], [data-email]');
          const deptElement = element.querySelector('.department, [class*="department"], [data-department]');
          const name = nameElement ? nameElement.text.trim() : null;
          const role = roleElement ? roleElement.text.trim() : null;
          let phone = null;
          if (phoneElement) {
            if (phoneElement.getAttribute('href')) {
              phone = phoneElement.getAttribute('href').replace('tel:', '').trim();
            } else {
              phone = phoneElement.text.trim();
            }
          }
          let email = null;
          if (emailElement) {
            if (emailElement.getAttribute('href')) {
              email = emailElement.getAttribute('href').replace('mailto:', '').trim();
            } else {
              email = emailElement.text.trim();
            }
          }
          const department = deptElement ? deptElement.text.trim() : null;
          if (name && name.length > 2) {
            employees.push({ name, role, phone, email, department, source: teamUrl });
          }
        }
        if (employees.length > 0) break;
      } catch (error) { continue; }
    }
    if (employees.length === 0) {
      try {
        const response = await axiosInstance.get(websiteUrl);
        const html = response.data;
        const root = parse(html);
        const text = root.text;
        if (text.includes('CEO') || text.includes('CTO') || text.includes('Founder') || text.includes('Director') || text.includes('Manager') || text.includes('President')) {
          employees.push({ name: 'Leadership Team', role: 'Needs manual identification', source: websiteUrl });
        }
      } catch (error) {}
    }
  } catch (error) {}

  // 2. Advanced sources: government, press releases, social media, DuckDuckGo
  const advancedSources = await Promise.allSettled([
    searchGovernmentRecords(companyName, location),
    searchPressReleases(companyName),
    searchSocialMediaMentions(companyName),
    searchDuckDuckGoEmployees(companyName)
  ]);
  for (const result of advancedSources) {
    if (result.status === 'fulfilled') {
      for (const emp of result.value) {
        // Avoid duplicates
        if (!employees.some(e => e.name === emp.name && e.role === emp.role)) {
          employees.push(emp);
        }
      }
    }
  }

  // Optionally save to DB if companyId is provided
  const savedContacts = [];
  if (companyId) {
    for (const employee of employees) {
      try {
        const contact = await createContact(
          companyId,
          employee.name,
          employee.role,
          null, // email
          null, // phone
          null, // department
          null, // linkedin_url
          employee.source
        );
        savedContacts.push(contact);
      } catch (dbError) {}
    }
  }
  return { employees, savedContacts };
};

export { findEmployees, searchGovernmentRecords, searchPressReleases, searchSocialMediaMentions };