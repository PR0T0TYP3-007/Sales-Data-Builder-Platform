// routes/workflow.js
import express from 'express';
import { createWorkflow, getWorkflowById, updateWorkflow } from '../models/Workflow.js';

const router = express.Router();

// Render create workflow form
router.get('/new', (req, res) => {
    res.render('workflowBuilder', { title: 'Create Workflow', user: req.session.user });
});

// Handle create workflow
router.post('/new', async (req, res) => {
    const { name } = req.body;
    let steps = [];
    try {
        steps = JSON.parse(req.body.steps);
    } catch (e) {}
    const productId = req.session.productId || 1;
    await createWorkflow({ name, steps, productId });
    res.redirect('/workflows');
});

// Render edit workflow form
router.get('/:id/edit', async (req, res) => {
    const workflow = await getWorkflowById(req.params.id);
    res.render('workflowBuilder', { title: 'Edit Workflow', workflow, user: req.session.user });
});

// Handle update workflow
router.post('/:id/edit', async (req, res) => {
    const { name } = req.body;
    let steps = [];
    try {
        steps = JSON.parse(req.body.steps);
    } catch (e) {}
    await updateWorkflow(req.params.id, { name, steps });
    res.redirect('/workflows');
});

// Fixed export name to be consistent
export default router;