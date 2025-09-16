// Remove duplicate companies by name (case-insensitive), keep the lowest id
const removeDuplicateCompaniesByName = async () => {
  const findDupesQuery = `
    SELECT LOWER(name) as lname, MIN(id) as keep_id, ARRAY_AGG(id) as all_ids
    FROM companies
    GROUP BY lname
    HAVING COUNT(*) > 1
  `;
  const { rows } = await pool.query(findDupesQuery);
  for (const row of rows) {
    const idsToDelete = row.all_ids.filter(id => id !== row.keep_id);
    if (idsToDelete.length > 0) {
      console.log(`[DEDUPLICATE] '${row.lname}' → keeping ID ${row.keep_id}, deleting IDs: ${idsToDelete.join(', ')}`);
      await pool.query('DELETE FROM companies WHERE id = ANY($1)', [idsToDelete]);
    }
  }
};
// Get companies with pagination and optional search
const getCompaniesPaginated = async (page = 1, limit = 15, search = null) => {
  const offset = (page - 1) * limit;
  let query = `SELECT * FROM companies WHERE product_id = 1`;
  let params = [];
  if (search) {
    query += ` AND (
      LOWER(name) LIKE $1 OR
      LOWER(COALESCE(website, '')) LIKE $1 OR
      LOWER(COALESCE(phone, '')) LIKE $1 OR
      LOWER(COALESCE(address, '')) LIKE $1 OR
      LOWER(COALESCE(industry, '')) LIKE $1
    )`;
    params.push(`%${search.toLowerCase()}%`);
  }
  query += ` ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);
  const result = await pool.query(query, params);
  return result.rows;
};

// Get total count for pagination and optional search
const getCompaniesCount = async (search = null) => {
  let query = `SELECT COUNT(*) FROM companies WHERE product_id = 1`;
  let params = [];
  if (search) {
    query += ` AND (
      LOWER(name) LIKE $1 OR
      LOWER(COALESCE(website, '')) LIKE $1 OR
      LOWER(COALESCE(phone, '')) LIKE $1 OR
      LOWER(COALESCE(address, '')) LIKE $1 OR
      LOWER(COALESCE(industry, '')) LIKE $1
    )`;
    params.push(`%${search.toLowerCase()}%`);
  }
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count, 10);
};
import pool from '../database/db.js';

// Create a new company with additional fields
const createCompany = async (name, phone, address, industry = null, description = null, email = null, website = null) => {
  const query = `
    INSERT INTO companies (name, phone, address, industry, description, email, website, product_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const result = await pool.query(query, [name, phone, address, industry, description, email, website, 1]);
  return result.rows[0];
};

// Retrieve all companies associated with product_id = 1
const getAllCompanies = async () => {
  const query = `SELECT * FROM companies WHERE product_id = 1;`;
  const result = await pool.query(query);
  return result.rows;
};

// Retrieve a company by its ID
const getCompanyById = async (id) => {
  const query = `SELECT * FROM companies WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Update company with support for JSON fields like socials
const updateCompany = async (id, updates) => {
  // This allows updating any field passed in the 'updates' object
  const setClause = Object.keys(updates).map((key, index) => {
    if (key === 'socials') {
      return `${key} = $${index + 1}::JSONB`;
    }
    return `${key} = $${index + 1}`;
  }).join(', ');
  
  const values = Object.values(updates);
  values.push(id);

  const query = `
    UPDATE companies
    SET ${setClause}
    WHERE id = $${values.length}
    RETURNING *;
  `;
  const result = await pool.query(query, values);
  return result.rows[0];
};


async function bulkInsertCompanies(companies, productId) {
    const values = companies.map(c => [
        productId,
        c.name,
        c.phone,
        c.address,
        'incomplete'
    ]);
    const query = `
        INSERT INTO companies (product_id, name, phone, address, status)
        VALUES ${values.map(() => '(?, ?, ?, ?, ?)').join(',')}
        RETURNING *;
    `;
    const flat = values.flat();
    const result = await db.query(query, flat);
    return result.rows;
}

async function getEmployeesByCompanyId(companyId) {
    const result = await db.query('SELECT * FROM contacts WHERE company_id = $1', [companyId]);
    return result.rows;
}

async function getWorkflowsByCompanyId(companyId) {
    const result = await db.query(`
        SELECT w.*, 
            json_agg(t.*) as tasks
        FROM workflows w
        LEFT JOIN tasks t ON t.workflow_id = w.id AND t.company_id = $1
        WHERE w.product_id = (
            SELECT product_id FROM companies WHERE id = $1
        )
        GROUP BY w.id
    `, [companyId]);
    return result.rows;
}

export {
  getAllCompanies,
  getCompaniesPaginated,
  getCompaniesCount,
  getCompanyById,
  updateCompany,
  createCompany,
  bulkInsertCompanies,
  getEmployeesByCompanyId,
  getWorkflowsByCompanyId,
  removeDuplicateCompaniesByName
};