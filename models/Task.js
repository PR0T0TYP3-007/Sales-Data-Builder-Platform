import pool from '../database/db.js';

const createTask = async (workflow_id, company_id, contact_id, type, due_date, assigned_to = null) => {
  const query = `
    INSERT INTO tasks (workflow_id, company_id, contact_id, type, due_date, status, assigned_to)
    VALUES ($1, $2, $3, $4, $5, 'pending', $6)
    RETURNING *;
  `;
  const result = await pool.query(query, [workflow_id, company_id, contact_id, type, due_date, assigned_to]);
  return result.rows[0];
};

const getTasksByCompany = async (companyId) => {
  const query = `SELECT * FROM tasks WHERE company_id = $1;`;
  const result = await pool.query(query, [companyId]);
  return result.rows;
};

// Add this: Get all tasks
const getAllTasks = async () => {
  const query = `SELECT * FROM tasks;`;
  const result = await pool.query(query);
  return result.rows;
};

// Add this: Update a task by ID
const updateTask = async (taskId, status, notes) => {
  const query = `
    UPDATE tasks
    SET status = $1, notes = $2
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [status, notes, taskId]);
  return result.rows[0];
};

const getTasksWithDetails = async (filters = {}) => {
  let query = `
    SELECT 
      t.*,
      c.name as company_name,
      c.website as company_website,
      c.phone as company_phone,
      con.name as contact_name,
      con.role as contact_role,
      con.email as contact_email
    FROM tasks t
    LEFT JOIN companies c ON t.company_id = c.id
    LEFT JOIN contacts con ON t.contact_id = con.id
    WHERE 1=1
  `;
  
  const values = [];
  let paramCount = 0;
  
  // Add filters
  if (filters.status) {
    paramCount++;
    query += ` AND t.status = $${paramCount}`;
    values.push(filters.status);
  }
  
  if (filters.assigned_to) {
    paramCount++;
    query += ` AND t.assigned_to = $${paramCount}`;
    values.push(filters.assigned_to);
  }
  
  if (filters.due_date) {
    paramCount++;
    query += ` AND t.due_date = $${paramCount}`;
    values.push(filters.due_date);
  }
  
  if (filters.workflow_id) {
    paramCount++;
    query += ` AND t.workflow_id = $${paramCount}`;
    values.push(filters.workflow_id);
  }
  
  query += ` ORDER BY t.due_date, t.created_at`;
  
  const result = await pool.query(query, values);
  return result.rows;
};

// Update task with completion details
const completeTask = async (taskId, status, notes, outcome) => {
  // Mark this task as complete
  const query = `
    UPDATE tasks
    SET status = $1, notes = $2, outcome = $3, completed_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [status, notes, outcome, taskId]);

  // Find the next pending task for the same company/workflow assigned to the same user
  const currentTask = result.rows[0];
  if (currentTask) {
    // Find next step (pending, due_date is null)
    const nextTaskResult = await pool.query(
      `SELECT * FROM tasks WHERE company_id = $1 AND workflow_id = $2 AND assigned_to = $3 AND status = 'pending' AND due_date IS NULL ORDER BY id LIMIT 1`,
      [currentTask.company_id, currentTask.workflow_id, currentTask.assigned_to]
    );
    const nextTask = nextTaskResult.rows[0];
    if (nextTask) {
      // Get workflow steps and find the delay for this step
      const wfResult = await pool.query('SELECT steps FROM workflows WHERE id = $1', [currentTask.workflow_id]);
      let steps = wfResult.rows[0].steps;
      if (typeof steps === 'string') steps = JSON.parse(steps);
      // Find the step for nextTask.type
      let step = steps.find(s => s.type === nextTask.type);
      let delay = step && step.delay ? parseInt(step.delay) : 0;
      let newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + delay);
      await pool.query('UPDATE tasks SET due_date = $1 WHERE id = $2', [newDueDate, nextTask.id]);
    }
  }
  return result.rows[0];
};

// Get tasks due today
const getTasksDueToday = async () => {
  const query = `
    SELECT * FROM tasks 
    WHERE due_date = CURRENT_DATE AND status = 'pending'
    ORDER BY created_at;
  `;
  const result = await pool.query(query);
  return result.rows;
};


async function generateTasksForGroup(workflowId, groupId) {
  // Get companies in group
  const companiesResult = await pool.query(
    'SELECT c.id, c.email FROM companies c JOIN company_groups cg ON c.id = cg.company_id WHERE cg.group_id = $1', [groupId]
  );
  const companies = companiesResult.rows;

  // Get workflow steps
  const workflowResult = await pool.query(
    'SELECT steps FROM workflows WHERE id = $1', [workflowId]
  );
  if (!workflowResult.rows[0]) return;
  let steps = workflowResult.rows[0].steps;
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps);
    } catch (e) {
      throw new Error('Workflow steps are not valid JSON');
    }
  }

  // Get all team members
  const teamMembersResult = await pool.query("SELECT id FROM users WHERE role = 'team_member'");
  const teamMembers = teamMembersResult.rows;

    let companyIdx = 0;
    for (const company of companies) {
      // Assign each company to a different team member (round-robin)
      const assignedUser = teamMembers.length ? teamMembers[companyIdx % teamMembers.length].id : null;
      companyIdx++;
    // Get all contacts (employees/owners) for this company
    const contactsResult = await pool.query('SELECT id, name, email, phone, linkedin_url FROM contacts WHERE company_id = $1', [company.id]);
    const contacts = contactsResult.rows;

    // Collect all emails/phones/linkedin: company, employees, owners
    let emails = [];
    let phones = [];
    let linkedins = [];
    if (company.email) emails.push({ value: company.email, owner: company.name });
    if (company.phone) phones.push({ value: company.phone, owner: company.name });
    for (const contact of contacts) {
      if (contact.email) emails.push({ value: contact.email, owner: contact.name });
      if (contact.phone) phones.push({ value: contact.phone, owner: contact.name });
      if (contact.linkedin_url) linkedins.push({ value: contact.linkedin_url, owner: contact.name });
    }

    let prevDueDate = new Date();
    let lastTaskId = null;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let dueDate = new Date(prevDueDate);
      if (i > 0 && lastTaskId) {
        // Set due date to null for now, will update after previous is completed
        dueDate = null;
      }
      if (step.type === 'email') {
        if (emails.length) {
          for (const emailObj of emails) {
            const result = await pool.query(
              `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_email, owner_name)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
              [
                workflowId,
                company.id,
                step.type,
                dueDate,
                'pending',
                assignedUser,
                step.template || '',
                null,
                emailObj.value,
                emailObj.owner
              ]
            );
            lastTaskId = result.rows[0].id;
          }
        } else {
          // Only one fallback task for the assigned user
          const result = await pool.query(
            `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_email, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              workflowId,
              company.id,
              step.type,
              dueDate,
              'pending',
              assignedUser,
              step.template || '',
              null,
              'Manually Find Email',
              company.name
            ]
          );
          lastTaskId = result.rows[0].id;
        }
      } else if (step.type === 'call') {
        // Always try to use company phone first
        let phoneUsed = false;
        if (company.phone) {
          const result = await pool.query(
            `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_phone, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              workflowId,
              company.id,
              step.type,
              dueDate,
              'pending',
              assignedUser,
              step.template || '',
              null,
              company.phone,
              company.name
            ]
          );
          lastTaskId = result.rows[0].id;
          phoneUsed = true;
        }
        if (phones.length && !phoneUsed) {
          for (const phoneObj of phones) {
            const result = await pool.query(
              `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_phone, owner_name)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
              [
                workflowId,
                company.id,
                step.type,
                dueDate,
                'pending',
                assignedUser,
                step.template || '',
                null,
                phoneObj.value,
                phoneObj.owner
              ]
            );
            lastTaskId = result.rows[0].id;
          }
        }
        if (!company.phone && !phones.length) {
          // Only one fallback task for the assigned user
          const result = await pool.query(
            `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_phone, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              workflowId,
              company.id,
              step.type,
              dueDate,
              'pending',
              assignedUser,
              step.template || '',
              null,
              'Manually Find Phone number',
              company.name
            ]
          );
          lastTaskId = result.rows[0].id;
        }
      } else if (step.type === 'linkedin') {
        if (linkedins.length) {
          for (const linkedinObj of linkedins) {
            const result = await pool.query(
              `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_linkedin, owner_name)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
              [
                workflowId,
                company.id,
                step.type,
                dueDate,
                'pending',
                assignedUser,
                step.template || '',
                null,
                linkedinObj.value,
                linkedinObj.owner
              ]
            );
            lastTaskId = result.rows[0].id;
          }
        } else {
          // Only one fallback task for the assigned user
          const result = await pool.query(
            `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template, contact_id, contact_linkedin, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              workflowId,
              company.id,
              step.type,
              dueDate,
              'pending',
              assignedUser,
              step.template || '',
              null,
              'Manually Find LinkedIn',
              company.name
            ]
          );
          lastTaskId = result.rows[0].id;
        }
      } else {
        const result = await pool.query(
          `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_to, template)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            workflowId,
            company.id,
            step.type,
            dueDate,
            'pending',
            assignedUser,
            step.template || ''
          ]
        );
        lastTaskId = result.rows[0].id;
      }
      prevDueDate = new Date();
    }
  }
}

export { 
  createTask, 
  getTasksByCompany, 
  getAllTasks, 
  updateTask, 
  getTasksWithDetails, 
  completeTask, 
  getTasksDueToday,
  generateTasksForGroup
};