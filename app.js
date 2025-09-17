import db from './database/db.js';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import ejsMate from 'ejs-mate';
import multer from 'multer';

// Import model functions
import { getAllCompanies, getCompaniesPaginated, getCompaniesCount } from './models/Company.js';
import { getAllTasks } from './models/Task.js';
import { getAllWorkflows } from './models/Workflow.js';
import { requireRole } from './middleware/auth.js';
import { getAuditLogs } from './models/AuditLog.js';
import { createGroup } from './models/Group.js';
import { getAllTeamMembers } from './models/Auth.js';
import { uploadAndExtract } from './controller/companyController.js';
import { bulkEnrichCompanies } from './controller/companyController.js';
import { getCompanyById } from './models/Company.js';
import { getContactsByCompanyId } from './models/Contact.js';
import { getWorkflowsByCompanyId } from './models/Workflow.js';
import { getTasksByCompany } from './models/Task.js';

// Import route files
import authRoutes from './routes/auth.js';
import auditLogRoutes from './routes/auditLogs.js';
import analyticsRoutes from './routes/analytics.js';
// Import middleware
import { apiRateLimiter, scrapingRateLimiter, checkRobotsTxt } from './middleware/rateLimit.js';
import errorHandler from './middleware/errorHandler.js';
import companiesRoutes from './routes/companies.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); 
app.use(checkRobotsTxt);
app.use('/api/', apiRateLimiter);
app.use('/api/scrape/', scrapingRateLimiter);
app.use('/api/companies', companiesRoutes);

// Session configuration
app.use(session({
  secret: '3c327a1ecc25a6d4011f3572f4ce697696527fa1af4464bd30e371866c1c8d779d8c0a882125e4f96c09e5a28a71503109f9aa1ead17ed9ff4826eb45000f1e9', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Root route: redirect to dashboard or login (must be after session middleware)
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  } else {
    return res.redirect('/auth/login');
  }
});

// Middleware to make user data available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Authentication middleware to protect routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// Public routes (no authentication required)
app.use('/auth', authRoutes);
app.use('/api/audit-logs', requireAuth, requireRole('manager'), auditLogRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);


// Login page (redirect to dashboard if already logged in)
app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login',
    error: req.query.error,
    email: req.query.email
  });
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    if (req.session.user && req.session.user.role === 'team_member') {
      // Special dashboard for team members
      const allTasks = await getAllTasks();
      const userId = req.session.user.id;
      // Only show tasks assigned to this user
      const tasks = allTasks.filter(t => t.assigned_to == userId);
      const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        dueTasks: tasks.filter(t => t.status === 'pending' && new Date(t.due_date) <= new Date()).length
      };
      // Recently worked on tasks (last 5 updated)
      const recentTasks = tasks
        .sort((a, b) => new Date(b.updated_at || b.due_date) - new Date(a.updated_at || a.due_date))
        .slice(0, 5);
      res.render('dashboard_team', { title: 'My Dashboard', stats, recentTasks, user: req.session.user });
      return;
    }
    // Default dashboard for admin/manager
    const companies = await getAllCompanies();
    const tasks = await getAllTasks();
    const workflows = await getAllWorkflows();
    const stats = {
      totalCompanies: companies.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length
    };
    // Get up to 8 enriched or partially enriched companies
    const enrichedCompanies = companies.filter(c => c.status === 'enriched' || c.status === 'partially_enriched').slice(0, 8);
    let activity = [];
    try {
      activity = await getAuditLogs({});
    } catch (e) {
      activity = [];
    }
  // Limit recent activity to 8 items
  const limitedActivity = activity.slice(0, 8);
  // Calculate percent enriched based on actual data
  const enrichedCount = companies.filter(c => {
    return (c.website || (c.socials && (
      c.socials.linkedin || c.socials.facebook || c.socials.twitter || c.socials.instagram
    )));
  }).length;
  const percentEnriched = companies.length > 0 ? Math.round((enrichedCount / companies.length) * 100) : 0;
  stats.percentEnriched = percentEnriched;
  res.render('dashboard', { title: 'Dashboard', stats, activity: limitedActivity, user: req.session.user, enrichedCompanies });
  } catch (err) {
    res.render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: err.message });
  }
});

// Companies list
app.get('/companies', requireAuth, async (req, res, next) => {
  if (req.session.user && req.session.user.role === 'team_member') {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 15;
  const search = req.query.search ? req.query.search.trim() : '';
  try {
    const [companies, total] = await Promise.all([
      getCompaniesPaginated(page, limit, search || null),
      getCompaniesCount(search || null)
    ]);
    const totalPages = Math.ceil(total / limit);
    res.render('companies', {
      title: 'Companies',
      companies,
      user: req.session.user,
      page,
      totalPages,
      search
    });
  } catch (err) {
    res.render('companies', { title: 'Companies', companies: [], user: req.session.user, error: err.message, page: 1, totalPages: 1, search });
  }
});


import { getGroupsByCompanyId } from './models/CompanyGroups.js';
app.get('/companies/:id', requireAuth, async (req, res) => {
  try {
    const company = await getCompanyById(req.params.id);
    const contacts = await getContactsByCompanyId(req.params.id);
    const workflows = await getWorkflowsByCompanyId(req.params.id);
    const tasks = await getTasksByCompany(req.params.id);
    const groups = await getGroupsByCompanyId(req.params.id);
    res.render('companyProfile', { title: 'Company Profile', company, contacts, workflows, tasks, groups, user: req.session.user });
  } catch (err) {
    res.render('companyProfile', { title: 'Company Profile', company: {}, contacts: [], workflows: [], tasks: [], groups: [], user: req.session.user, error: err.message });
  }
});

import { getAllGroups, addCompaniesToGroup } from './models/Group.js';
app.get('/groups', requireAuth, async (req, res) => {
  try {
    const groups = await getAllGroups();
    const workflows = await getAllWorkflows();
    const allCompanies = await getAllCompanies();
    res.render('groups', { title: 'Groups', groups, workflows, allCompanies, user: req.session.user });
  } catch (err) {
    res.render('groups', { title: 'Groups', groups: [], workflows: [], allCompanies: [], user: req.session.user, error: err.message });
  }
});

// Assign companies to group
app.post('/groups/:groupId/add-companies', requireAuth, async (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  const { groupId } = req.params;
  let companyIds = req.body.company_ids;
  if (!Array.isArray(companyIds)) {
    companyIds = [companyIds];
  }
  try {
    await addCompaniesToGroup(parseInt(groupId), companyIds.map(id => parseInt(id)));
    res.redirect('/groups');
  } catch (err) {
    // fallback: reload groups page with error
    const groups = await getAllGroups();
    const workflows = await getAllWorkflows();
    const allCompanies = await getAllCompanies();
    res.render('groups', { title: 'Groups', groups, workflows, allCompanies, user: req.session.user, error: err.message });
  }
});
// Groups (admin/manager only)
app.get('/groups', requireAuth, (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  next();
}, async (req, res) => {
  try {
    const groups = await getAllGroups();
    const workflows = await getAllWorkflows();
    res.render('groups', { title: 'Groups', groups, workflows, user: req.session.user });
  } catch (err) {
    res.render('groups', { title: 'Groups', groups: [], workflows: [], user: req.session.user, error: err.message });
  }
});

// New group page (GET)
app.get('/groups/new', requireAuth, (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  res.render('group_new', { title: 'New Group', user: req.session.user });
});

// New group (POST)
app.post('/groups/new', requireAuth, async (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  const { name, description } = req.body;
  try {
    await createGroup(name, description);
    res.redirect('/groups');
  } catch (err) {
    res.render('group_new', { title: 'New Group', user: req.session.user, error: err.message });
  }
});

app.get('/workflows', requireAuth, async (req, res) => {
  try {
    const workflows = await getAllWorkflows();
    res.render('workflows', { title: 'Workflows', workflows, user: req.session.user });
  } catch (err) {
    res.render('workflows', { title: 'Workflows', workflows: [], user: req.session.user, error: err.message });
  }
});
// Workflows (admin/manager only)
app.get('/workflows', requireAuth, (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  next();
}, async (req, res) => {
  try {
    const workflows = await getAllWorkflows();
    res.render('workflows', { title: 'Workflows', workflows, user: req.session.user });
  } catch (err) {
    res.render('workflows', { title: 'Workflows', workflows: [], user: req.session.user, error: err.message });
  }
});

import { generateTasksForGroup } from './models/Task.js';
app.post('/groups/:groupId/assign-workflow', requireAuth, async (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  const { workflow_id } = req.body;
  const { groupId } = req.params;
  try {
    await db.query(
      'INSERT INTO group_workflows (group_id, workflow_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, workflow_id]
    );
    await generateTasksForGroup(workflow_id, groupId);
    res.redirect('/groups');
  } catch (err) {
    const groups = await getAllGroups();
    const workflows = await getAllWorkflows();
    const allCompanies = await getAllCompanies();
    res.render('groups', { title: 'Groups', groups, workflows, allCompanies, user: req.session.user, error: err.message });
  }
});

app.get('/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await getAllTasks();
    const workflows = await getAllWorkflows();
    const companies = await getAllCompanies();
    const teamMembers = await getAllTeamMembers();
    const filter = {};
    res.render('tasks', { title: 'Tasks', tasks, workflows, companies, teamMembers, filter, user: req.session.user });
  } catch (err) {
    res.render('tasks', { title: 'Tasks', tasks: [], workflows: [], companies: [], teamMembers: [], filter: {}, user: req.session.user, error: err.message });
  }
});

// Assign a task to a team member
app.post('/tasks/:taskId/assign', requireAuth, async (req, res) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { title: 'Dashboard', stats: {}, activity: [], user: req.session.user, error: 'Access denied.' });
  }
  const { taskId } = req.params;
  const { assigned_to } = req.body;
  try {
    await db.query('UPDATE tasks SET assigned_to = $1 WHERE id = $2', [assigned_to, taskId]);
    res.redirect('/tasks');
  } catch (err) {
    const tasks = await getAllTasks();
    const workflows = await getAllWorkflows();
    const companies = await getAllCompanies();
    const teamMembers = await getAllTeamMembers();
    const filter = {};
    res.render('tasks', { title: 'Tasks', tasks, workflows, companies, teamMembers, filter, user: req.session.user, error: err.message });
  }
});



// /upload GET route for UI (keep for navigation, but POST is handled by /api/companies/extract)
app.get('/upload', requireAuth, (req, res) => {
  if (!req.session.user || req.session.user.role === 'team_member') {
    return res.status(403).render('dashboard_team', { title: 'My Dashboard', stats: {}, recentTasks: [], user: req.session.user, error: 'Access denied.' });
  }
  res.render('upload', { title: 'Upload Companies', user: req.session.user, preview: null, error: null });
});


// Enrich page (GET: render, POST: enrich)
app.get('/enrich', requireAuth, async (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
    return res.status(403).render('dashboard', { error: 'Access denied.', user: req.session.user });
  }
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 15;
  const search = req.query.search ? req.query.search.trim() : '';
  const [companies, total] = await Promise.all([
    getCompaniesPaginated(page, limit, search || null),
    getCompaniesCount(search || null)
  ]);
  const totalPages = Math.ceil(total / limit);
  const flash = req.session.flash;
  delete req.session.flash;
  res.render('enrich', {
    title: 'Enrichment Progress',
    companies,
    user: req.session.user,
    page,
    totalPages,
    search,
    flash
  });
});
app.post('/enrich', requireAuth, async (req, res, next) => {
  if (!req.session.user || req.session.user.role === 'team_member') {
    return res.status(403).render('dashboard_team', { title: 'My Dashboard', stats: {}, recentTasks: [], user: req.session.user, error: 'Access denied.' });
  }
  try {
    // Call the enrichment logic directly
    const { companyIds } = req.body;
    // If only one selected, companyIds may be a string
    let ids = companyIds;
    if (typeof ids === 'string') ids = [ids];
    if (!ids || !Array.isArray(ids)) {
      req.session.flash = { type: 'danger', message: 'No companies selected.' };
      return res.redirect('/enrich');
    }
    // Call the enrichment logic (simulate controller)
    const userId = req.session.user.id;
    const results = [];
    const { getCompanyById, updateCompany } = await import('./models/Company.js');
    const { webScrapingQueue } = await import('./services/queue.js');
    for (const companyId of ids) {
      try {
        const company = await getCompanyById(companyId);
        if (company) {
          await webScrapingQueue.add({
            type: 'company_enrichment',
            companyId: companyId,
            companyName: company.name,
            url: company.website || null,
            userId: userId
          }, { attempts: 2, timeout: 180000 });
          results.push({ companyId, status: 'queued' });
        } else {
          results.push({ companyId, status: 'skipped', reason: 'Company not found' });
        }
      } catch (error) {
        results.push({ companyId, status: 'error', reason: error.message });
      }
    }
    req.session.flash = { type: 'success', message: `Enrichment queued for ${results.length} companies.` };
    return res.redirect('/enrich');
  } catch (error) {
    req.session.flash = { type: 'danger', message: 'Error during enrichment: ' + error.message };
    return res.redirect('/enrich');
  }
});

app.get('/audit-logs', requireAuth, requireRole('manager'), async (req, res) => {
  try {
    const logs = await getAuditLogs();
    res.render('audit', { title: 'Audit Logs', logs, user: req.session.user });
  } catch (err) {
    res.render('audit', { title: 'Audit Logs', logs: [], user: req.session.user, error: err.message });
  }
});

// Settings
app.get('/settings', requireAuth, (req, res) => {
  res.render('settings', { title: 'Settings', user: req.session.user });
});

app.use((req, res, next) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


