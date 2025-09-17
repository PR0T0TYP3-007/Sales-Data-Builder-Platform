import pool from '../database/db.js';

// Get all groups for a specific company
const getGroupsByCompanyId = async (company_id) => {
  const query = `
    SELECT g.*
    FROM groups g
    JOIN company_groups cg ON g.id = cg.group_id
    WHERE cg.company_id = $1;
  `;
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export { getGroupsByCompanyId };