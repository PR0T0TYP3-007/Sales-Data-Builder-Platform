import pool from '../database/db.js';

const createAuditLog = async (actor_id, action, entity, entity_type, entity_id, details = null) => {
  const query = `
    INSERT INTO audit_logs (actor_id, action, entity, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    actor_id,
    action,
    entity,
    entity_type,
    entity_id,
    details ? JSON.stringify(details) : null
  ]);
  return result.rows[0];
};

const getAuditLogs = async (filters = {}) => {
    let query = `
      SELECT al.*, u.email as actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    if (filters.entity) {
      paramCount++;
      query += ` AND al.entity = $${paramCount}`;
      values.push(filters.entity);
    }

    if (filters.entity_id) {
      paramCount++;
      query += ` AND al.entity_id = $${paramCount}`;
      values.push(filters.entity_id);
    }

    if (filters.action) {
      paramCount++;
      query += ` AND al.action = $${paramCount}`;
      values.push(filters.action);
    }

    // Pagination support
    if (filters.limit) {
      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1}`;
      values.push(filters.limit);
      if (filters.offset) {
        query += ` OFFSET $${paramCount + 2}`;
        values.push(filters.offset);
      }
    } else {
      query += ` ORDER BY al.created_at DESC LIMIT 100`;
    }

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (err) {
      throw err;
    }
};

export { createAuditLog, getAuditLogs };