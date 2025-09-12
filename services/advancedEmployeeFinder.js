import axios from 'axios';
import { parse } from 'node-html-parser';
import { createContact } from '../models/Contact.js';
import { webScrapingQueue } from './queue.js';

// Government database search (mock implementation)
const searchGovernmentRecords = async (companyName, location) => {
  try {
    // Mock implementation - in real scenario, integrate with actual APIs
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
  } catch (error) {
    console.error('Government records search failed:', error);
    return [];
  }
};

// Press release search
const searchPressReleases = async (companyName) => {
  try {
    const searchUrl = `https://www.google.com/search?q="${companyName}"+"appoints"+"hires"+"promotes"+"press+release"`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const root = parse(html);
    
    const employees = [];
    // Extract potential employee mentions from search results
    // This is simplified - real implementation would need more sophisticated parsing
    
    return employees;
  } catch (error) {
    console.error('Press release search failed:', error);
    return [];
  }
};

// Social media mention search
const searchSocialMediaMentions = async (companyName) => {
  try {
    // Mock implementation - would integrate with social media APIs
    const mockMentions = [
      { name: 'Alex Chen', role: 'Tech Lead', source: 'LinkedIn Mention' },
      { name: 'Maria Garcia', role: 'Marketing Manager', source: 'Twitter Mention' }
    ];
    
    return mockMentions;
  } catch (error) {
    console.error('Social media search failed:', error);
    return [];
  }
};

// Main advanced employee discovery function
const advancedEmployeeDiscovery = async (companyId, companyName, location = '') => {
  try {
    console.log(`🚀 Starting advanced employee discovery for: ${companyName}`);
    
    const discoverySources = [
      searchGovernmentRecords(companyName, location),
      searchPressReleases(companyName),
      searchSocialMediaMentions(companyName)
    ];

    const results = await Promise.allSettled(discoverySources);
    
    const allEmployees = [];
    const savedContacts = [];

    // Process results from all sources
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEmployees.push(...result.value);
      }
    }

    // Remove duplicates
    const uniqueEmployees = allEmployees.filter((employee, index, array) =>
      index === array.findIndex(e => 
        e.name === employee.name && e.role === employee.role
      )
    );

    // Save to database
    for (const employee of uniqueEmployees) {
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
      } catch (dbError) {
        console.warn(`Failed to save contact ${employee.name}:`, dbError.message);
      }
    }

    return {
      totalFound: uniqueEmployees.length,
      savedCount: savedContacts.length,
      contacts: savedContacts,
      sources: results.map((r, i) => ({
        source: ['government', 'press_releases', 'social_media'][i],
        status: r.status,
        count: r.status === 'fulfilled' ? r.value.length : 0
      }))
    };

  } catch (error) {
    console.error('Advanced employee discovery failed:', error);
    return {
      totalFound: 0,
      savedCount: 0,
      contacts: [],
      sources: [],
      error: error.message
    };
  }
};

export { advancedEmployeeDiscovery, searchGovernmentRecords, searchPressReleases };