import { Router } from 'express';
import { SupabaseContactController } from '../controllers/supabaseContactController';
import { authenticate } from '../middleware/supabaseAuth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { contactSchemas, commonSchemas } from '../middleware/validation';

const router = Router();
const contactController = new SupabaseContactController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts with pagination and filtering
 * @access  Private
 */
router.get(
  '/',
  validateQuery({
    ...commonSchemas.pagination,
    ...commonSchemas.filters
  }.describe('Get contacts with pagination and filtering')),
  contactController.getContacts.bind(contactController)
);

/**
 * @route   GET /api/contacts/stats
 * @desc    Get contact statistics
 * @access  Private
 */
router.get(
  '/stats',
  contactController.getContactStats.bind(contactController)
);

/**
 * @route   GET /api/contacts/search
 * @desc    Search contacts
 * @access  Private
 */
router.get(
  '/search',
  validateQuery({
    q: commonSchemas.filters.keys.search.required(),
    limit: commonSchemas.pagination.keys.limit
  }),
  contactController.searchContacts.bind(contactController)
);

/**
 * @route   GET /api/contacts/company/:company
 * @desc    Get contacts by company name
 * @access  Private
 */
router.get(
  '/company/:company',
  validateParams({
    company: require('joi').string().min(1).max(100).required()
  }),
  contactController.getContacts.bind(contactController)
);

/**
 * @route   POST /api/contacts
 * @desc    Create new contact
 * @access  Private
 */
router.post(
  '/',
  validate(contactSchemas.create),
  contactController.createContact.bind(contactController)
);

/**
 * @route   GET /api/contacts/:id
 * @desc    Get contact by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  contactController.getContact.bind(contactController)
);

/**
 * @route   PUT /api/contacts/:id
 * @desc    Update contact
 * @access  Private
 */
router.put(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate(contactSchemas.update),
  contactController.updateContact.bind(contactController)
);

/**
 * @route   DELETE /api/contacts/:id
 * @desc    Delete contact
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  contactController.deleteContact.bind(contactController)
);

/**
 * @route   POST /api/contacts/:id/tags
 * @desc    Add tags to contact
 * @access  Private
 */
router.post(
  '/:id/bulk',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate({
    contacts: require('joi').array().items(require('joi').object()).min(1).required()
  }),
  contactController.bulkCreateContacts.bind(contactController)
);

/**
 * @route   DELETE /api/contacts/:id/tags
 * @desc    Remove tags from contact
 * @access  Private
 */
router.delete(
  '/bulk',
  validate({
    ids: require('joi').array().items(require('joi').string()).min(1).required()
  }),
  contactController.bulkDeleteContacts.bind(contactController)
);

export default router;