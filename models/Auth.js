import pool from '../database/db.js';


const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result;
}

// Get all team members (users with role 'team-member')
const getAllTeamMembers = async () => {
  const query = `SELECT id, name, email FROM users WHERE role = 'team-member'`;
  const result = await pool.query(query);
  return result.rows;
};

export default getUserByEmail;
export { getAllTeamMembers };

