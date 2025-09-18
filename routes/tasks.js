import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// Task Inbox with filters
router.get('/', async (req, res) => {
    const { workflow, company, status } = req.query;
    let query = `
        SELECT t.*, c.name AS company_name, c.phone AS company_phone, c.email AS company_email,
               c.socials->>'linkedin' AS company_linkedin,
               ct.email AS contact_email, ct.phone AS contact_phone,
               w.name AS workflow_name
        FROM tasks t
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN LATERAL (
            SELECT email, phone
            FROM contacts
            WHERE company_id = c.id
            LIMIT 1
        ) ct ON true
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
    // Only show tasks assigned to the logged-in team member
    if (req.session.user && (req.session.user.role === 'team_member' || req.session.user.role === 'team-member')) {
        params.push(req.session.user.id);
        query += ` AND t.assigned_to = $${params.length}`;
    }
    query += ' ORDER BY t.due_date ASC';

    const allTasks = (await db.query(query, params)).rows;
    console.log('DEBUG tasks: Raw DB tasks:', allTasks);
    const workflows = (await db.query('SELECT id, name FROM workflows')).rows;
    const companies = (await db.query('SELECT id, name FROM companies')).rows;

    // Defensive: If user is team_member, filter tasks after query as well
    let filteredTasks = allTasks;
    if (req.session.user && (req.session.user.role === 'team_member' || req.session.user.role === 'team-member')) {
        console.log('DEBUG tasks: Filtering for user id:', req.session.user.id, 'type:', typeof req.session.user.id);
        allTasks.forEach(t => {
            console.log('Task id:', t.id, 'assigned_to:', t.assigned_to, 'type:', typeof t.assigned_to);
        });
        filteredTasks = allTasks.filter(t => String(t.assigned_to) === String(req.session.user.id));
        console.log('DEBUG tasks: Showing only tasks assigned to user', req.session.user.id, 'Filtered:', filteredTasks);
    } else {
        console.log('DEBUG tasks: Showing all tasks (not team_member), Filtered:', filteredTasks);
    }

    // Group tasks by company
    let groupedTasks = {};
    if (filteredTasks && filteredTasks.length) {
        filteredTasks.forEach(task => {
            if (!groupedTasks[task.company_id]) {
                groupedTasks[task.company_id] = {
                    company_name: task.company_name,
                    tasks: []
                };
            }
            groupedTasks[task.company_id].tasks.push(task);
        });
        console.log('DEBUG tasks: Grouped tasks by company:', groupedTasks);
    } else {
        groupedTasks = {};
        console.log('DEBUG tasks: No tasks to group.');
    }

    const filter = {
        workflow_id: workflow || '',
        company_id: company || '',
        status: status || ''
    };
    res.render('tasks', {
        title: 'Tasks',
        groupedTasks,
        workflows,
        companies,
        filter,
        user: req.session.user
    });
});

// Mark task as complete
router.post('/:id/complete', async (req, res) => {
    await db.query('UPDATE tasks SET status = $1 WHERE id = $2', ['completed', req.params.id]);
    res.redirect('/tasks');
});

export default router;