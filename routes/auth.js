// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});
// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { 
    title: 'Login',
    error: null,
    user: null,
    currentPage: 'login'
  });
});

// Login processing - FIXED
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
        return res.render('auth/login', { 
          title: 'Login',
          error: 'Invalid credentials',
          user: null,
          currentPage: 'login'
        });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.render('auth/login', { 
          title: 'Login',
          error: 'Invalid credentials',
          user: null,
          currentPage: 'login'
        });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    res.redirect('/');

  } catch (error) {
    console.error('Login error:', error);
      res.render('auth/login', { 
        title: 'Login',
        error: 'Server error. Please try again later.',
        user: null,
        currentPage: 'login'
      });
  }
});

// Registration form (admin only)
router.get('/register', requireAuth, requireRole('admin'), (req, res) => {
    res.render('auth/register', { title: 'Register', user: req.session.user });
});

// Registration handler (admin only)
router.post('/register', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
        return res.render('auth/register', {
          title: 'Register',
          error: 'User with this email already exists',
          user: null,
          currentPage: 'register'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [name, email, hashedPassword, role || 'team_member'] // Default to team_member
    );

    res.redirect('/auth/login');

  } catch (error) {
    console.error('Registration error:', error);
      res.render('auth/register', {
        title: 'Register',
        error: 'Registration failed. Please try again.',
        user: null,
        currentPage: 'register'
      });
  }
});

export default router;