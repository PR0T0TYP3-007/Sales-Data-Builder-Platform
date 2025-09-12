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
  const query = `
    UPDATE tasks
    SET status = $1, notes = $2, outcome = $3, completed_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [status, notes, outcome, taskId]);
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
    const companiesResult = await db.query(
        'SELECT id FROM companies WHERE group_id = $1', [groupId]
    );
    const companies = companiesResult.rows;

    // Get workflow steps
    const workflowResult = await db.query(
        'SELECT steps FROM workflows WHERE id = $1', [workflowId]
    );
    if (!workflowResult.rows[0]) return;
    const steps = JSON.parse(workflowResult.rows[0].steps);

    // For each company, create a task for each step
    for (const company of companies) {
        let prevDueDate = new Date();
        for (const step of steps) {
            // Calculate due date based on delay
            prevDueDate.setDate(prevDueDate.getDate() + (parseInt(step.delay) || 0));
            await db.query(
                `INSERT INTO tasks (workflow_id, company_id, type, due_date, status, assigned_role, template)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    workflowId,
                    company.id,
                    step.type,
                    new Date(prevDueDate),
                    'pending',
                    step.role,
                    step.template || ''
                ]
            );
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