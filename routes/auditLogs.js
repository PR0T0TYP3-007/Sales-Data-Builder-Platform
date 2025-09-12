import express from 'express';
import { getAuditLogs } from '../models/AuditLog.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { entity, entity_id, action } = req.query;
    const filters = {};
    
    if (entity) filters.entity = entity;
    if (entity_id) filters.entity_id = entity_id;
    if (action) filters.action = action;
    
    const logs = await getAuditLogs(filters);
    
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

export default router;