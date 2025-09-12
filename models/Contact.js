import pool from '../database/db.js';

// Create a new contact
const createContact = async (company_id, name, role, email, phone, department, linkedin_url, source) => {
  const query = `
    INSERT INTO contacts (company_id, name, role, email, phone, department, linkedin_url, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const result = await pool.query(query, [company_id, name, role, email, phone, department, linkedin_url, source]);
  return result.rows[0];
};

// Get contacts by company ID
const getContactsByCompanyId = async (companyId) => {
  const query = `SELECT * FROM contacts WHERE company_id = $1 ORDER BY name;`;
  const result = await pool.query(query, [companyId]);
  return result.rows;
};

// Update contact
const updateContact = async (id, updates) => {
  const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `
    UPDATE contacts
    SET ${setClause}
    WHERE id = $${values.length}
    RETURNING *;
  `;
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete contact
const deleteContact = async (id) => {
  const query = `DELETE FROM contacts WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export { createContact, getContactsByCompanyId, updateContact, deleteContact };