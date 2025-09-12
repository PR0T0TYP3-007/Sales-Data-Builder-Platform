import express from 'express';
import { getResponseMetrics, getTaskOutcomes } from '../models/TaskOutcome.js';
import { getAllCompanies } from '../models/Company.js';
import { getAllTasks } from '../models/Task.js';
import { getAllWorkflows } from '../models/Workflow.js';

const router = express.Router();

// Get overall dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const [companies, tasks, workflows, responseMetrics] = await Promise.all([
      getAllCompanies(),
      getAllTasks(),
      getAllWorkflows(),
      getResponseMetrics()
    ]);

    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const completedTasks = tasks.filter(task => task.status === 'completed');

    res.json({
      success: true,
      data: {
        company_count: companies.length,
        task_count: tasks.length,
        pending_tasks: pendingTasks.length,
        completed_tasks: completedTasks.length,
        workflow_count: workflows.length,
        response_metrics: responseMetrics,
        completion_rate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

// Get workflow performance analytics
router.get('/workflow-performance', async (req, res) => {
  try {
    const { workflow_id, start_date, end_date } = req.query;
    
    const filters = {};
    if (workflow_id) filters.workflow_id = workflow_id;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const outcomes = await getTaskOutcomes(filters);
    const metrics = await getResponseMetrics(filters);

    res.json({
      success: true,
      data: {
        outcomes,
        metrics
      }
    });

  } catch (error) {
    console.error('Error fetching workflow performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow performance data'
    });
  }
});

export default router;