import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// Task Inbox with filters
router.get('/', async (req, res) => {
    const { workflow, company, status } = req.query;
    let query = `
        SELECT t.*, c.name AS company_name, w.name AS workflow_name
        FROM tasks t
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN workflows w ON t.workflow_id = w.id
        WHERE 1=1
    `;
    const params = [];
    if (workflow) {
        params.push(workflow);
        query += ` AND t.workflow_id = $${params.length}`;
    }
    if (company) {
        params.push(company);
        query += ` AND t.company_id = $${params.length}`;
    }
    if (status) {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
    }
    query += ' ORDER BY t.due_date ASC';

    const tasks = (await db.query(query, params)).rows;
    const workflows = (await db.query('SELECT id, name FROM workflows')).rows;
    const companies = (await db.query('SELECT id, name FROM companies')).rows;

    res.render('tasks', {
        title: 'Tasks',
        tasks,
        workflows,
        companies,
        selectedWorkflow: workflow,
        selectedCompany: company,
        status,
        user: req.session.user
    });
});

// Mark task as complete
router.post('/:id/complete', async (req, res) => {
    await db.query('UPDATE tasks SET status = $1 WHERE id = $2', ['complete', req.params.id]);
    res.redirect('/tasks');
});

export default router;