import { deleteWorkflow } from '../models/Workflow.js';

// Delete a workflow
const deleteWorkflowController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteWorkflow(id);
    // Optionally, create audit log
    if (req.session && req.session.user) {
      // You can add audit log logic here if needed
    }
    res.redirect('/workflows');
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).send('Failed to delete workflow');
  }
};
// controllers/workflowController.js
import { createWorkflow, getWorkflowById } from '../models/Workflow.js';

const createNewWorkflow = async (req, res) => {
  try {
    const { name, steps } = req.body;

    if (!name || !steps) {
      return res.status(400).json({ 
        success: false,
        error: 'Name and steps are required.' 
      });
    }

    // Validate that steps is an array
    if (!Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'Steps must be an array.'
      });
    }

    // Validate each step in the array
    for (const [index, step] of steps.entries()) {
      if (!step || typeof step !== 'object') {
        return res.status(400).json({
          success: false,
          error: `Step at index ${index} must be an object.`
        });
      }

      if (!step.type) {
        return res.status(400).json({
          success: false,
          error: `Step at index ${index} must have a 'type' property.`
        });
      }

      if (step.offsetDays === undefined || typeof step.offsetDays !== 'number') {
        return res.status(400).json({
          success: false,
          error: `Step at index ${index} must have a numerical 'offsetDays' property.`
        });
      }
    }

    const workflow = await createWorkflow(name, steps);
    
    res.status(201).json({
      success: true,
      message: 'Workflow created successfully.',
      data: workflow
    });

  } catch (error) {
    console.error('Error creating workflow:', error);
    
    // Handle specific PostgreSQL JSON errors
    if (error.message.includes('invalid input syntax for type json')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON format in steps. Please use proper JSON syntax with double quotes.'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error.' 
    });
  }
};

export { createNewWorkflow, deleteWorkflowController };