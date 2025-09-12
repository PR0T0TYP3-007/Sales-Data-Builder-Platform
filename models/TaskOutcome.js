import pool from '../database/db.js';

// Task outcome types based on PRD requirements
const OUTCOME_TYPES = {
  POSITIVE_RESPONSE: 'positive_response',
  NEGATIVE_RESPONSE: 'negative_response',
  NO_RESPONSE: 'no_response',
  WRONG_CONTACT: 'wrong_contact',
  LEFT_COMPANY: 'left_company',
  FOLLOW_UP_NEEDED: 'follow_up_needed'
};

// Log detailed task outcome
const logTaskOutcome = async (taskId, outcomeType, details = null) => {
  const query = `
    UPDATE tasks 
    SET outcome = $1, outcome_details = $2, completed_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *;
  `;
  
  const result = await pool.query(query, [
    outcomeType,
    details ? JSON.stringify(details) : null,
    taskId
  ]);
  
  return result.rows[0];
};

// Get task outcomes for analytics
const getTaskOutcomes = async (filters = {}) => {
  let query = `
    SELECT 
      outcome,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time_seconds
    FROM tasks 
    WHERE outcome IS NOT NULL
  `;
  
  const values = [];
  let paramCount = 0;
  
  if (filters.workflow_id) {
    paramCount++;
    query += ` AND workflow_id = $${paramCount}`;
    values.push(filters.workflow_id);
  }
  
  if (filters.company_id) {
    paramCount++;
    query += ` AND company_id = $${paramCount}`;
    values.push(filters.company_id);
  }
  
  if (filters.start_date) {
    paramCount++;
    query += ` AND completed_at >= $${paramCount}`;
    values.push(filters.start_date);
  }
  
  if (filters.end_date) {
    paramCount++;
    query += ` AND completed_at <= $${paramCount}`;
    values.push(filters.end_date);
  }
  
  query += ` GROUP BY outcome ORDER BY count DESC`;
  
  const result = await pool.query(query, values);
  return result.rows;
};

// Get response rate metrics
const getResponseMetrics = async (filters = {}) => {
  const outcomes = await getTaskOutcomes(filters);
  
  const totalCompleted = outcomes.reduce((sum, item) => sum + parseInt(item.count), 0);
  const positiveResponses = outcomes.find(item => item.outcome === OUTCOME_TYPES.POSITIVE_RESPONSE)?.count || 0;
  const negativeResponses = outcomes.find(item => item.outcome === OUTCOME_TYPES.NEGATIVE_RESPONSE)?.count || 0;
  const totalResponses = positiveResponses + negativeResponses;
  
  return {
    total_completed_tasks: totalCompleted,
    total_responses: totalResponses,
    positive_responses: positiveResponses,
    negative_responses: negativeResponses,
    response_rate: totalCompleted > 0 ? (totalResponses / totalCompleted) * 100 : 0,
    positive_response_rate: totalCompleted > 0 ? (positiveResponses / totalCompleted) * 100 : 0
  };
};

export { logTaskOutcome, getTaskOutcomes, getResponseMetrics, OUTCOME_TYPES };