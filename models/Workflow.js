// models/Workflow.js
import pool from '../database/db.js';

const createWorkflow = async ({ name, steps, productId }) => {
  try {
    const result = await pool.query(
      'INSERT INTO workflows (name, steps, product_id) VALUES ($1, $2::JSONB, $3) RETURNING *',
      [name, JSON.stringify(steps), productId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createWorkflow:', error);
    throw error; // Re-throw the error for the controller to handle
  }
};

const getWorkflowById = async (id) => {
  const result = await pool.query('SELECT * FROM workflows WHERE id = $1', [id]);
  const workflow = result.rows[0];
  if (workflow) {
    if (workflow.steps && typeof workflow.steps === 'string' && workflow.steps.trim() !== '') {
      try {
        workflow.steps = JSON.parse(workflow.steps);
      } catch (e) {
        workflow.steps = [];
      }
    } else {
      workflow.steps = [];
    }
  }
  return workflow;
};

const updateWorkflow = async (id, { name, steps }) => {
  await pool.query(
    'UPDATE workflows SET name = $1, steps = $2::JSONB WHERE id = $3',
    [name, JSON.stringify(steps), id]
  );
};

// models/Workflow.js - Add this function
const getAllWorkflows = async () => {
  const result = await pool.query(
    'SELECT * FROM workflows WHERE product_id = 1 ORDER BY created_at DESC'
  );
  return result.rows;
};

const createWorkflowWithSteps = async (name, steps, product_id = 1) => {
  try {
    // Validate steps
    for (const [index, step] of steps.entries()) {
      if (!step.type || !step.offsetDays) {
        throw new Error(`Step ${index + 1} is missing required fields (type or offsetDays)`);
      }
      
      // Set default template if not provided
      if (!step.template) {
        step.template = getTemplateForType(step.type);
      }
    }
    
    const stepsJson = JSON.stringify(steps);
    
    const query = `
      INSERT INTO workflows (name, steps, product_id) 
      VALUES ($1, $2::JSONB, $3) 
      RETURNING *;
    `;
    
    const result = await pool.query(query, [name, stepsJson, product_id]);
    return result.rows[0];
    
  } catch (error) {
    console.error('Database error in createWorkflowWithSteps:', error);
    throw error;
  }
};
const getWorkflowsByCompanyId = async (companyId) => {
  const result = await pool.query(
    'SELECT w.* FROM workflows w JOIN company_workflows cw ON w.id = cw.workflow_id WHERE cw.company_id = $1',
    [companyId]
  );
  return result.rows;
};

// Delete a workflow by ID
const deleteWorkflow = async (workflowId) => {
  // Remove company-workflow assignments (optional)
  await pool.query('DELETE FROM company_workflows WHERE workflow_id = $1', [workflowId]);
  // Remove group-workflow assignments (optional)
  await pool.query('DELETE FROM group_workflows WHERE workflow_id = $1', [workflowId]);
  // Delete the workflow itself
  await pool.query('DELETE FROM workflows WHERE id = $1', [workflowId]);
};

export { createWorkflow, getWorkflowById, updateWorkflow, getAllWorkflows, createWorkflowWithSteps, getWorkflowsByCompanyId, deleteWorkflow };
