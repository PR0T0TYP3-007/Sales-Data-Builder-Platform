import { createTask } from '../models/Task.js';
import { getContactsByCompanyId } from '../models/Contact.js';

/**
 * Generates tasks for all companies in a group with proper assignment
 */
const generateTasksForGroup = async (companies, workflow, defaultAssignee = null) => {
  const tasks = [];
  const today = new Date();

  if (!Array.isArray(workflow.steps)) {
    throw new Error('Workflow steps must be an array.');
  }

  for (const company of companies) {
    if (!company.id) {
      console.error('Company object missing id:', company);
      continue;
    }

    // Get contacts for this company to assign tasks
    const contacts = await getContactsByCompanyId(company.id);
    const primaryContact = contacts.find(c => c.role && 
      (c.role.toLowerCase().includes('ceo') || 
       c.role.toLowerCase().includes('manager') || 
       c.role.toLowerCase().includes('director'))) || contacts[0];

    for (const step of workflow.steps) {
      // Calculate due date
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + step.offsetDays);

      // Determine assignment
      let assignedTo = defaultAssignee;
      if (step.assignedRole) {
        // Logic to find user by role would go here
        // For now, we'll use defaultAssignee
      }

      try {
        const createdTask = await createTask(
          workflow.id,
          company.id,
          primaryContact?.id || null,
          step.type,
          dueDate.toISOString().split('T')[0],
          assignedTo
        );
        tasks.push(createdTask);
      } catch (error) {
        console.error(`Failed to create task for company ${company.id}:`, error);
      }
    }
  }

  console.log(`Generated and saved ${tasks.length} tasks for workflow "${workflow.name}".`);
  return tasks;
};

export {generateTasksForGroup};