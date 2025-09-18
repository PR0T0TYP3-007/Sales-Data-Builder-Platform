// routes/workflow.js
import express from 'express';
import { createWorkflow, getWorkflowById, updateWorkflow } from '../models/Workflow.js';
import { deleteWorkflowController } from '../controller/workflowController.js';


const router = express.Router();

// Render create workflow form
router.get('/new', (req, res) => {
    const user = req.session && req.session.user ? req.session.user : null;
    res.render('workflowBuilder', { title: 'Create Workflow', workflow: null, user });
});

// Handle delete workflow
router.post('/:id/delete', deleteWorkflowController);

// Handle create workflow
router.post('/new', async (req, res) => {
    const { name } = req.body;
    let steps = [];
    try {
        if (typeof req.body.steps === 'string') {
            steps = JSON.parse(req.body.steps);
        } else {
            steps = req.body.steps;
        }
    } catch (e) {}
    await createWorkflow({ name, steps, productId: 1 });
    res.redirect('/workflows');
});

// Render edit workflow form
router.get('/:id/edit', async (req, res) => {
    const workflow = await getWorkflowById(req.params.id);
    const user = req.session && req.session.user ? req.session.user : null;
    res.render('workflowBuilder', { title: 'Edit Workflow', workflow, user });
});

// Handle update workflow
router.post('/:id/edit', async (req, res) => {
    const { name } = req.body;
    let steps = [];
    try {
        if (typeof req.body.steps === 'string') {
            steps = JSON.parse(req.body.steps);
        } else {
            steps = req.body.steps;
        }
    } catch (e) {}
    await updateWorkflow(req.params.id, { name, steps });
    res.redirect('/workflows');
});

// Fixed export name to be consistent
export default router;