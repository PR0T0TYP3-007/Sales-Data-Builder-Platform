import { getAllTasks, updateTask } from '../models/Task.js';

// GET /api/tasks - Get all tasks
const getTasks = async (req, res) => {
  try {
    const tasks = await getAllTasks();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });

  } catch (error) {
    console.error('Error in getTasks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching tasks.'
    });
  }
};

// PATCH /api/tasks/:id - Update a specific task
const updateTaskStatus = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, notes } = req.body;

    // Input validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'A "status" is required to update a task.'
      });
    }

    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedTask = await updateTask(taskId, status, notes || null);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskId} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updatedTask
    });

  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating the task.'
    });
  }
};

export { getTasks, updateTaskStatus };