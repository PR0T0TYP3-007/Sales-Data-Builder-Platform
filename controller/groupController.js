// Delete a group
import { deleteGroup } from '../models/Group.js';
import db from '../database/db.js';

const deleteGroupController = async (req, res) => {
  try {
    const { groupId } = req.params;
    await deleteGroup(groupId);
    // Optionally, create audit log
    if (req.session && req.session.user) {
      await createAuditLog(
        req.session.user.id,
        'delete_group',
        'group',
        groupId,
        { status: 'deleted' }
      );
    }
    res.redirect('/groups');
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).send('Failed to delete group');
  }
};

import { createGroup, addCompaniesToGroup, getCompaniesInGroup, getAllGroups } from '../models/Group.js';
import { getWorkflowById } from '../models/Workflow.js';
import { taskGenerationQueue } from '../services/queue.js';
import { createAuditLog } from '../models/AuditLog.js';

// Create a new group
const createNewGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required.'
      });
    }

    const group = await createGroup(name, description);
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully.',
      data: group
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
};

// Add companies to a group
const addCompaniesToGroupController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({
        success: false,
        error: 'companyIds array is required.'
      });
    }

    const results = await addCompaniesToGroup(parseInt(groupId), companyIds);
    
    res.json({
      success: true,
      message: `Added ${results.length} companies to group.`,
      data: results
    });

  } catch (error) {
    console.error('Error adding companies to group:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
};

// Run workflow on group with background job
const runWorkflowOnGroup = async (req, res) => {
  try {
    const { groupId, workflowId } = req.params;
    const userId = req.session.user.id;

    // Queue the task generation job
    await taskGenerationQueue.add({
      groupId: parseInt(groupId),
      workflowId: parseInt(workflowId),
      userId: userId
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });

    // Create immediate audit log
    await createAuditLog(
      userId,
      'queue_workflow',
      'group',
      parseInt(groupId),
      { workflow_id: parseInt(workflowId), status: 'queued' }
    );

    res.json({
      success: true,
      message: 'Workflow execution queued successfully. Tasks will be generated in the background.',
      data: {
        group_id: groupId,
        workflow_id: workflowId,
        job_status: 'queued'
      }
    });

  } catch (error) {
    console.error('Error queuing workflow job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue workflow execution.'
    });
  }
};

// Get all groups
const getGroups = async (req, res) => {
  console.log('DEBUG getGroups: req.session:', req.session);
  if (!req.session || !req.session.user) {
    console.log('DEBUG getGroups: Access denied, session or user missing');
    return res.status(403).render('error', { title: 'Error', error: 'Access denied.', user: null });
  }
  try {
    const groups = await getAllGroups();
    // Fetch all companies and workflows for admin/manager actions
    const { rows: allCompanies } = await db.query('SELECT * FROM companies WHERE product_id = 1');
    const { rows: workflows } = await db.query('SELECT * FROM workflows WHERE product_id = 1');
    res.render('groups', { title: 'Groups', groups, allCompanies, workflows, user: req.session.user });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).render('error', { title: 'Error', error: 'Internal server error.', user: req.session && req.session.user ? req.session.user : null });
  }
};

const bulkAddCompaniesToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      return res.status(400).json({
        success: false,
        error: 'companyIds array is required.'
      });
    }

    const results = await addCompaniesToGroup(parseInt(groupId), companyIds);
    
    // Audit log
    await createAuditLog(
      req.session.user.id,
      'bulk_add_companies',
      'group',
      parseInt(groupId),
      { companies_added: results.length, company_ids: companyIds }
    );

    res.json({
      success: true,
      message: `Added ${results.length} companies to group.`,
      data: results
    });

  } catch (error) {
    console.error('Error adding companies to group:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
};

const bulkAssignWorkflow = async (req, res) => {
  try {
    const { groupIds, workflowId } = req.body;
    const userId = req.session.user.id;

    if (!groupIds || !Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        error: 'groupIds array is required.'
      });
    }

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId is required.'
      });
    }

    const results = [];

    for (const groupId of groupIds) {
      try {
        // Queue workflow execution for each group
        await taskGenerationQueue.add({
          groupId: parseInt(groupId),
          workflowId: parseInt(workflowId),
          userId: userId
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });

        results.push({ groupId, status: 'queued' });
      } catch (error) {
        results.push({ groupId, status: 'error', error: error.message });
      }
    }

    // Create audit log
    await createAuditLog(
      userId,
      'bulk_assign_workflow',
      'system',
      null,
      { groups_processed: groupIds.length, workflow_id: workflowId, results }
    );

    res.json({
      success: true,
      message: `Queued workflow execution for ${results.filter(r => r.status === 'queued').length} groups.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulkAssignWorkflow:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk workflow assignment.'
    });
  }
};

// Bulk create groups
const bulkCreateGroups = async (req, res) => {
  try {
    const { groups } = req.body;
    const userId = req.session.user.id;

    if (!groups || !Array.isArray(groups)) {
      return res.status(400).json({
        success: false,
        error: 'groups array is required.'
      });
    }

    const results = [];

    for (const groupData of groups) {
      try {
        const { name, description } = groupData;
        
        if (!name) {
          results.push({ groupData, status: 'skipped', reason: 'Name is required' });
          continue;
        }

        const group = await createGroup(name, description);
        results.push({ groupData, status: 'success', group });
      } catch (error) {
        results.push({ groupData, status: 'error', error: error.message });
      }
    }

    // Create audit log
    await createAuditLog(
      userId,
      'bulk_create_groups',
      'system',
      null,
      { groups_processed: groups.length, results }
    );

    res.json({
      success: true,
      message: `Created ${results.filter(r => r.status === 'success').length} groups.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulkCreateGroups:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk group creation.'
    });
  }
};

export {createNewGroup, addCompaniesToGroupController, runWorkflowOnGroup, getGroups, bulkAddCompaniesToGroup, bulkAssignWorkflow, bulkCreateGroups, deleteGroupController};