const validateWorkflowSteps = (req, res, next) => {
  const { steps } = req.body;
  
  if (!Array.isArray(steps)) {
    return res.status(400).json({
      success: false,
      error: 'Steps must be an array'
    });
  }
  
  for (const [index, step] of steps.entries()) {
    if (!step.type) {
      return res.status(400).json({
        success: false,
        error: `Step ${index + 1} is missing type`
      });
    }
    
    if (step.offsetDays === undefined || typeof step.offsetDays !== 'number') {
      return res.status(400).json({
        success: false,
        error: `Step ${index + 1} requires a numerical offsetDays`
      });
    }
  }
  
  next();
};

export { validateWorkflowSteps };