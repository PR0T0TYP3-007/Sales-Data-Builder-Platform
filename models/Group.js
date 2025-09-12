import pool from '../database/db.js';

// Create a new group
const createGroup = async (name, description = null) => {
  const query = `
    INSERT INTO groups (name, description, product_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [name, description, 1]);
  return result.rows[0];
};

// Add companies to a group
const addCompaniesToGroup = async (group_id, company_ids) => {
  const values = company_ids.map((company_id, index) => 
    `($${index * 2 + 1}, $${index * 2 + 2})`
  ).join(', ');

  const query = `
    INSERT INTO company_groups (company_id, group_id)
    VALUES ${values}
    ON CONFLICT (company_id, group_id) DO NOTHING
    RETURNING *;
  `;
  
  // Flatten the array: [1, [1, 2, 3]] becomes [1, 1, 1, 2, 1, 3]
  const flatValues = company_ids.flatMap(company_id => [company_id, group_id]);
  
  const result = await pool.query(query, flatValues);
  return result.rows;
};

// Get all companies in a specific group
const getCompaniesInGroup = async (group_id) => {
  const query = `
    SELECT c.* 
    FROM companies c
    JOIN company_groups cg ON c.id = cg.company_id
    WHERE cg.group_id = $1;
  `;
  const result = await pool.query(query, [group_id]);
  return result.rows;
};


// Get all groups, with companies in each group
const getAllGroups = async () => {
  const groupQuery = `
    SELECT g.*, COUNT(cg.company_id) as company_count
    FROM groups g
    LEFT JOIN company_groups cg ON g.id = cg.group_id
    GROUP BY g.id
    ORDER BY g.name;
  `;
  const groupResult = await pool.query(groupQuery);
  const groups = groupResult.rows;

  // For each group, fetch companies
  for (const group of groups) {
    const companyQuery = `
      SELECT c.*
      FROM companies c
      JOIN company_groups cg ON c.id = cg.company_id
      WHERE cg.group_id = $1;
    `;
    const companyResult = await pool.query(companyQuery, [group.id]);
    group.companies = companyResult.rows;
  }
  return groups;
};

export { createGroup, addCompaniesToGroup, getCompaniesInGroup, getAllGroups };