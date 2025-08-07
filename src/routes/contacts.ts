import { Router } from 'express';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  getContactsByCompany,
  getContactStats,
  addContactTags,
  removeContactTags
} from '../controllers/contactController';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { contactSchemas, commonSchemas } from '../middleware/validation';

const router = Router();

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
  getContacts
);

/**
 * @route   GET /api/contacts/stats
 * @desc    Get contact statistics
 * @access  Private
 */
router.get(
  '/stats',
  getContactStats
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
  searchContacts
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
  getContactsByCompany
);

/**
 * @route   POST /api/contacts
 * @desc    Create new contact
 * @access  Private
 */
router.post(
  '/',
  validate(contactSchemas.create),
  createContact
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
  getContactById
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
  updateContact
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
  deleteContact
);

/**
 * @route   POST /api/contacts/:id/tags
 * @desc    Add tags to contact
 * @access  Private
 */
router.post(
  '/:id/tags',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate({
    tags: require('joi').array().items(require('joi').string().trim()).min(1).required()
  }),
  addContactTags
);

/**
 * @route   DELETE /api/contacts/:id/tags
 * @desc    Remove tags from contact
 * @access  Private
 */
router.delete(
  '/:id/tags',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate({
    tags: require('joi').array().items(require('joi').string().trim()).min(1).required()
  }),
  removeContactTags
);

export default router;