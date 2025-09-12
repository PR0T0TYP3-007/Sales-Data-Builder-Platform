import express from 'express';
import {
  createNewGroup,
  addCompaniesToGroupController,
  runWorkflowOnGroup,
  getGroups,
  bulkAssignWorkflow,
  bulkCreateGroups
} from '../controller/groupController.js';
import { generateTasksForGroup } from '../models/Task.js';
import db from '../database/db.js';

const router = express.Router();

// GET /api/groups - Get all groups
router.get('/', getGroups);

// POST /api/groups - Create a new group
router.post('/', createNewGroup);

// POST /api/groups/:groupId/companies - Add companies to a group
router.post('/:groupId/companies', addCompaniesToGroupController);

// POST /api/groups/:groupId/run-workflow/:workflowId - Run workflow on group
router.post('/:groupId/run-workflow/:workflowId', runWorkflowOnGroup);

// POST /api/groups/:groupId/assign-workflow - Assign a workflow to a group and generate tasks
router.post('/:groupId/assign-workflow', async (req, res) => {
  const { workflowId } = req.body;
  const { groupId } = req.params;

  // Optionally, store the assignment in a join table if needed
  await db.query(
    'INSERT INTO group_workflows (group_id, workflow_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [groupId, workflowId]
  );

  // Generate tasks for all companies in the group
  await generateTasksForGroup(workflowId, groupId);

  res.redirect(`/groups/${groupId}`);
});

router.post('/bulk-assign-workflow', bulkAssignWorkflow);
router.post('/bulk-create', bulkCreateGroups);

export default router;