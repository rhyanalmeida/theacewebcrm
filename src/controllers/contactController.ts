import { Response } from 'express';
import { Contact } from '../models/Contact';
import { AuthRequest, UserRole } from '../types';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { sendSuccess, sendCreated, sendDeleted, sendPaginated } from '../utils/responseHelpers';
import { 
  parsePagination, 
  buildSearchQuery, 
  createPaginationMeta, 
  extractFilters,
  applyRoleBasedFiltering,
  applyPopulation 
} from '../utils/queryHelpers';

/**
 * Get all contacts
 */
export const getContacts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filters = extractFilters(req);
  let searchQuery = buildSearchQuery(filters);
  
  // Apply role-based filtering
  searchQuery = applyRoleBasedFiltering(searchQuery, req.user);

  const [contacts, total] = await Promise.all([
    applyPopulation(
      Contact.find(searchQuery).sort(sort).skip(skip).limit(limit),
      'contact'
    ),
    Contact.countDocuments(searchQuery)
  ]);

  const meta = createPaginationMeta(page, limit, total);
  
  sendPaginated(res, contacts, meta, 'Contacts retrieved successfully');
});

/**
 * Get contact by ID
 */
export const getContactById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const contact = await applyPopulation(Contact.findOne(query), 'contact');
  
  if (!contact) {
    throw createApiError.notFound('Contact not found');
  }

  sendSuccess(res, contact, 'Contact retrieved successfully');
});

/**
 * Create new contact
 */
export const createContact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const contactData = {
    ...req.body,
    owner: req.body.owner || req.user?._id,
    createdBy: req.user?._id,
    updatedBy: req.user?._id
  };

  const contact = new Contact(contactData);
  await contact.save();

  const populatedContact = await applyPopulation(
    Contact.findById(contact._id),
    'contact'
  );

  sendCreated(res, populatedContact, 'Contact created successfully');
});

/**
 * Update contact
 */
export const updateContact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const updateData = {
    ...req.body,
    updatedBy: req.user?._id
  };

  const contact = await Contact.findOneAndUpdate(
    query,
    updateData,
    { new: true, runValidators: true }
  );

  if (!contact) {
    throw createApiError.notFound('Contact not found or access denied');
  }

  const populatedContact = await applyPopulation(
    Contact.findById(contact._id),
    'contact'
  );

  sendSuccess(res, populatedContact, 'Contact updated successfully');
});

/**
 * Delete contact
 */
export const deleteContact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const contact = await Contact.findOneAndDelete(query);
  
  if (!contact) {
    throw createApiError.notFound('Contact not found or access denied');
  }

  sendDeleted(res, 'Contact deleted successfully');
});

/**
 * Search contacts
 */
export const searchContacts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q: query, limit = 10 } = req.query;
  
  if (!query || typeof query !== 'string') {
    throw createApiError.badRequest('Search query is required');
  }

  let searchQuery = {
    $or: [
      { firstName: new RegExp(query, 'i') },
      { lastName: new RegExp(query, 'i') },
      { email: new RegExp(query, 'i') },
      { company: new RegExp(query, 'i') }
    ]
  };

  // Apply role-based filtering
  searchQuery = applyRoleBasedFiltering(searchQuery, req.user);

  const contacts = await applyPopulation(
    Contact.find(searchQuery)
      .limit(parseInt(limit as string, 10))
      .sort({ firstName: 1 }),
    'contact'
  );

  sendSuccess(res, contacts, `Found ${contacts.length} contacts`);
});

/**
 * Get contacts by company
 */
export const getContactsByCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { company } = req.params;
  
  let query: any = { company: new RegExp(company, 'i') };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const contacts = await applyPopulation(
    Contact.find(query).sort({ firstName: 1 }),
    'contact'
  );

  sendSuccess(res, contacts, `Found ${contacts.length} contacts for ${company}`);
});

/**
 * Get contact statistics
 */
export const getContactStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  let baseQuery: any = {};
  
  // Apply role-based filtering
  baseQuery = applyRoleBasedFiltering(baseQuery, req.user);

  const [
    totalContacts,
    contactsByCompany,
    recentContacts,
    topTags
  ] = await Promise.all([
    Contact.countDocuments(baseQuery),
    
    Contact.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    
    Contact.countDocuments({
      ...baseQuery,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }),
    
    Contact.aggregate([
      { $match: baseQuery },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  const stats = {
    total: totalContacts,
    recent: recentContacts,
    byCompany: contactsByCompany,
    topTags: topTags
  };

  sendSuccess(res, stats, 'Contact statistics retrieved successfully');
});

/**
 * Add tags to contact
 */
export const addContactTags = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tags } = req.body;
  
  if (!Array.isArray(tags)) {
    throw createApiError.badRequest('Tags must be an array');
  }

  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const contact = await Contact.findOneAndUpdate(
    query,
    { 
      $addToSet: { tags: { $each: tags.map(tag => tag.toLowerCase()) } },
      updatedBy: req.user?._id
    },
    { new: true, runValidators: true }
  );

  if (!contact) {
    throw createApiError.notFound('Contact not found or access denied');
  }

  const populatedContact = await applyPopulation(
    Contact.findById(contact._id),
    'contact'
  );

  sendSuccess(res, populatedContact, 'Tags added successfully');
});

/**
 * Remove tags from contact
 */
export const removeContactTags = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tags } = req.body;
  
  if (!Array.isArray(tags)) {
    throw createApiError.badRequest('Tags must be an array');
  }

  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const contact = await Contact.findOneAndUpdate(
    query,
    { 
      $pullAll: { tags: tags.map(tag => tag.toLowerCase()) },
      updatedBy: req.user?._id
    },
    { new: true, runValidators: true }
  );

  if (!contact) {
    throw createApiError.notFound('Contact not found or access denied');
  }

  const populatedContact = await applyPopulation(
    Contact.findById(contact._id),
    'contact'
  );

  sendSuccess(res, populatedContact, 'Tags removed successfully');
});

export default {
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
};