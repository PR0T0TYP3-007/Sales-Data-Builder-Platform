import axios from 'axios';
import { parse } from 'node-html-parser';

// Configure axios for web scraping
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  }
});

// Extract employees from a company website
const findEmployees = async (companyId, companyName, websiteUrl) => {
  console.log(`\n--- Searching for employees at: ${websiteUrl} ---`);
  
  try {
    // Common paths for team/about pages
    const teamPaths = [
      '/team', '/about', '/about-us', '/people', '/staff',
      '/leadership', '/management', '/company', '/our-team'
    ];
    
    let employees = [];
    
    // Try each potential team page path
    for (const path of teamPaths) {
      try {
        const teamUrl = `${websiteUrl}${path}`;
        console.log(`Trying team page: ${teamUrl}`);
        
        const response = await axiosInstance.get(teamUrl);
        const html = response.data;
        const root = parse(html);
        
        // Try to find employee elements - this will vary by website
        const employeeElements = root.querySelectorAll('.team-member, .employee, .staff-member, .person, [class*="team"], [class*="employee"]');
        
        for (const element of employeeElements) {
          try {
            const nameElement = element.querySelector('h2, h3, h4, [class*="name"], .name');
            const roleElement = element.querySelector('[class*="title"], .title, .position, [class*="role"]');
            const bioElement = element.querySelector('p, [class*="bio"], .description');
            
            const name = nameElement ? nameElement.text.trim() : null;
            const role = roleElement ? roleElement.text.trim() : null;
            
            if (name && name.length > 2) {
              employees.push({
                name,
                role,
                source: teamUrl
              });
            }
          } catch (error) {
            console.log(`Error parsing employee element: ${error.message}`);
          }
        }
        
        // If we found employees, break out of the loop
        if (employees.length > 0) {
          console.log(`Found ${employees.length} employees on ${teamUrl}`);
          break;
        }
      } catch (error) {
        // This path didn't work, try the next one
        continue;
      }
    }
    
    // If no employees found on dedicated pages, try the homepage
    if (employees.length === 0) {
      try {
        const response = await axiosInstance.get(websiteUrl);
        const html = response.data;
        const root = parse(html);
        
        // Look for leadership mentions in the main content
        const text = root.text;
        if (text.includes('CEO') || text.includes('CTO') || text.includes('Founder') || 
            text.includes('Director') || text.includes('Manager') || text.includes('President')) {
          
          // This is a simple approach - in a real implementation, you'd use more sophisticated NLP
          console.log('Found potential leadership mentions on homepage, but need manual review');
          employees.push({
            name: 'Leadership Team',
            role: 'Needs manual identification',
            source: websiteUrl
          });
        }
      } catch (error) {
        console.log(`Error checking homepage for employees: ${error.message}`);
      }
    }
    
    return employees;
    
  } catch (error) {
    console.error(`Error finding employees for ${companyName}: ${error.message}`);
    return [];
  }
};

export default findEmployees;