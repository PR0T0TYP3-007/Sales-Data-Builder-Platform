import findEmployees from '../services/employeeFinder.js';
import { advancedEmployeeDiscovery } from '../services/advancedEmployeeFinder.js';
import { createContact, getContactsByCompanyId } from '../models/Contact.js';
import { getCompanyById } from '../models/Company.js';
import { createAuditLog } from '../models/AuditLog.js';
import { webScrapingQueue } from '../services/queue.js';

// Find and save employees for a company
const findAndSaveEmployees = async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Get company details
    const company = await getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    
    if (!company.website) {
      return res.status(400).json({ error: 'Company does not have a website to search for employees.' });
    }
    
    // Find employees
    const employees = await findEmployees(companyId, company.name, company.website);
    
    // Save employees to database
    const savedContacts = [];
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
      } catch (dbError) {
        console.warn(`Failed to save contact ${employee.name}:`, dbError.message);
      }
    }
    
    res.json({
      message: `Found ${employees.length} employees and saved ${savedContacts.length} contacts.`,
      totalFound: employees.length,
      savedCount: savedContacts.length,
      contacts: savedContacts
    });
    
  } catch (error) {
    console.error('Error in findAndSaveEmployees:', error);
    res.status(500).json({ error: 'Internal server error during employee search.' });
  }
};

// Advanced employee discovery endpoint
const advancedFindEmployees = async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await getCompanyById(companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    // Queue advanced discovery job
    await webScrapingQueue.add({
      type: 'employee_discovery',
      companyId: companyId,
      companyName: company.name,
      location: company.address,
      userId: req.session.user.id
    }, {
      attempts: 2,
      timeout: 300000 // 5 minutes
    });

    res.json({
      success: true,
      message: 'Advanced employee discovery queued. This may take several minutes.',
      data: {
        company_id: companyId,
        company_name: company.name,
        job_status: 'queued'
      }
    });

  } catch (error) {
    console.error('Error in advancedFindEmployees:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during advanced employee search.' 
    });
  }
};

// Get contacts for a company
const getCompanyContacts = async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const contacts = await getContactsByCompanyId(companyId);
    
    res.json({
      success: true,
      count: contacts.length,
      data: contacts
    });
    
  } catch (error) {
    console.error('Error in getCompanyContacts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error while fetching contacts.' 
    });
  }
};

// Bulk employee discovery for multiple companies
const bulkFindEmployees = async (req, res) => {
  try {
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({
        success: false,
        error: 'companyIds array is required.'
      });
    }

    const results = [];

    for (const companyId of companyIds) {
      try {
        const company = await getCompanyById(companyId);
        if (company && company.website) {
          await webScrapingQueue.add({
            type: 'employee_discovery',
            companyId: companyId,
            companyName: company.name,
            website: company.website,
            userId: req.session.user.id
          });
          results.push({ companyId, status: 'queued' });
        } else {
          results.push({ companyId, status: 'skipped', reason: 'No website' });
        }
      } catch (error) {
        results.push({ companyId, status: 'error', error: error.message });
      }
    }

    // Audit log
    await createAuditLog(
      req.session.user.id,
      'bulk_employee_discovery',
      'system',
      null,
      { companies_processed: companyIds.length, results }
    );

    res.json({
      success: true,
      message: `Queued employee discovery for ${results.filter(r => r.status === 'queued').length} companies.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulkFindEmployees:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk employee search.'
    });
  }
};

export { 
  findAndSaveEmployees, 
  getCompanyContacts, 
  advancedFindEmployees,
  bulkFindEmployees 
};