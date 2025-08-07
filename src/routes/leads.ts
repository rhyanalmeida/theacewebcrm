import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  getLeadsByStatus,
  getLeadStats,
  searchLeads
} from '../controllers/leadController';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { leadSchemas, commonSchemas } from '../middleware/validation';
import { LeadStatus } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/leads
 * @desc    Get all leads with pagination and filtering
 * @access  Private
 */
router.get(
  '/',
  validateQuery({
    ...commonSchemas.pagination,
    ...commonSchemas.filters
  }.describe('Get leads with pagination and filtering')),
  getLeads
);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private
 */
router.get(
  '/stats',
  getLeadStats
);

/**
 * @route   GET /api/leads/search
 * @desc    Search leads
 * @access  Private
 */
router.get(
  '/search',
  validateQuery({
    q: commonSchemas.filters.keys.search.required(),
    limit: commonSchemas.pagination.keys.limit
  }),
  searchLeads
);

/**
 * @route   GET /api/leads/status/:status
 * @desc    Get leads by status
 * @access  Private
 */
router.get(
  '/status/:status',
  validateParams({
    status: require('joi').string().valid(...Object.values(LeadStatus)).required()
  }),
  getLeadsByStatus
);

/**
 * @route   POST /api/leads
 * @desc    Create new lead
 * @access  Private
 */
router.post(
  '/',
  validate(leadSchemas.create),
  createLead
);

/**
 * @route   GET /api/leads/:id
 * @desc    Get lead by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  getLeadById
);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  Private
 */
router.put(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate(leadSchemas.update),
  updateLead
);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  deleteLead
);

/**
 * @route   POST /api/leads/:id/convert
 * @desc    Convert lead to deal
 * @access  Private
 */
router.post(
  '/:id/convert',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate({
    companyId: commonSchemas.objectId.required(),
    contactId: commonSchemas.objectId.required(),
    dealTitle: require('joi').string().trim().min(2).max(200),
    dealValue: require('joi').number().min(0)
  }),
  convertLead
);

export default router;