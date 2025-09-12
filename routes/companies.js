import express from 'express';
import multer from 'multer';
import { uploadAndParsePdf, getCompaniesController, enrichCompanyData, detectCompanyIndustry, bulkEnrichCompanies, bulkDetectIndustry } from '../controller/companyController.js';
import { findAndSaveEmployees, getCompanyContacts, advancedFindEmployees, bulkFindEmployees } from '../controller/employeeController.js';
import { scrapingRateLimiter } from '../middleware/rateLimit.js';
import { parseCompanyFile } from '../services/companyFinder.js';
import { bulkInsertCompanies } from '../models/Company.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1}
});

router.post('/upload', upload.single('file'), uploadAndParsePdf);
router.get('/', getCompaniesController);
router.post('/:id/enrich', enrichCompanyData);
router.post('/:id/detect-industry', detectCompanyIndustry);
router.post('/:id/find-employees', findAndSaveEmployees);
router.get('/:id/contacts', getCompanyContacts);
router.post('/:id/advanced-find-employees', scrapingRateLimiter, advancedFindEmployees);
router.post('/bulk-find-employees', bulkFindEmployees);
router.get('/upload', (req, res) => {
    res.render('upload', { title: 'Upload Companies', user: req.session.user });
});
router.post('/bulk-enrich', bulkEnrichCompanies);
router.post('/bulk-detect-industry', bulkDetectIndustry)
router.post('/bulk-enrich', async (req, res) => {
  try {
    await bulkEnrichCompanies(req, res);
  } catch (error) {
    console.error('Error in bulk enrichment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk enrichment'
    });
  }
});

router.post('/import', upload.single('companyFile'), async (req, res) => {
    try {
        const previewCompanies = await parseCompanyFile(req.file.path);
        if (!previewCompanies || previewCompanies.length === 0) {
            throw new Error('No companies found in file. Please check your file format.');
        }
        res.render('dashboard', { 
            title: 'Dashboard', 
            previewCompanies, 
            user: req.session.user 
        });
    } catch (err) {
        console.error('File parsing error:', err);
        res.render('dashboard', { 
            title: 'Dashboard', 
            importError: err.message || 'Failed to parse file.', 
            user: req.session.user 
        });
    }
});

router.post('/confirm-import', async (req, res) => {
    try {
        const companies = JSON.parse(req.body.companies);
        // You may want to get productId from session or user context
        const productId = req.session.productId || 1;
        await bulkInsertCompanies(companies, productId);
        res.redirect('/companies');
    } catch (err) {
        res.render('dashboard', { 
            title: 'Dashboard', 
            importError: 'Failed to save companies.', 
            user: req.session.user 
        });
    }
});

router.get('/:id', async (req, res) => {
    const company = await getCompanyById(req.params.id); // implement this in your model
    const employees = await getEmployeesByCompanyId(req.params.id); // implement this in your model
    const workflows = await getWorkflowsByCompanyId(req.params.id); // implement this in your model
    res.render('companyProfile', { 
        title: company.name, 
        company, 
        employees, 
        workflows, 
        user: req.session.user 
    });
});

export default router;