// routes/frontend.js
import express from 'express';
import { getAllCompanies } from '../models/Company.js';
import { getAllTasks } from '../models/Task.js';
import { getAllWorkflows } from '../models/Workflow.js';
import { getAllGroups } from '../models/Group.js';

const router = express.Router();

// API endpoints for frontend data loading
router.get('/companies', async (req, res) => {
  try {
    const companies = await getAllCompanies();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await getAllTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    const workflows = await getAllWorkflows();
    res.json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/groups', async (req, res) => {
  try {
    const groups = await getAllGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;