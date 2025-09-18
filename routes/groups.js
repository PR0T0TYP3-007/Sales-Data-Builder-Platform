import express from 'express';
import {
  createNewGroup,
  addCompaniesToGroupController,
  runWorkflowOnGroup,
  getGroups,
  bulkAssignWorkflow,
  bulkCreateGroups,
  deleteGroupController
} from '../controller/groupController.js';

import { generateTasksForGroup } from '../models/Task.js';
import db from '../database/db.js';

const router = express.Router();

// GET /groups - Render groups page
// GET /groups - Return JSON using controller
router.get('/', getGroups);

// POST /groups/:groupId/delete - Delete a group
router.post('/:groupId/delete', deleteGroupController);

// POST /api/groups - Create a new group
router.post('/', createNewGroup);

// POST /api/groups/:groupId/companies - Add companies to a group
router.post('/:groupId/companies', addCompaniesToGroupController);

// POST /api/groups/:groupId/run-workflow/:workflowId - Run workflow on group
router.post('/:groupId/run-workflow/:workflowId', runWorkflowOnGroup);

// POST /api/groups/:groupId/assign-workflow - Assign a workflow to a group and generate tasks
router.post('/:groupId/assign-workflow', async (req, res) => {
  const { workflow_id } = req.body;
  const { groupId } = req.params;
  if (!workflow_id) {
    return res.status(400).render('error', { title: 'Error', error: 'Workflow ID is required.' });
  }
  await db.query(
    'INSERT INTO group_workflows (group_id, workflow_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [groupId, workflow_id]
  );
  await generateTasksForGroup(workflow_id, groupId);
  res.redirect('/dashboard');
});

router.post('/bulk-assign-workflow', bulkAssignWorkflow);
router.post('/bulk-create', bulkCreateGroups);

export default router;