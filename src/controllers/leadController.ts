import { Response } from 'express';
import { Lead } from '../models/Lead';
import { Deal } from '../models/Deal';
import { AuthRequest, LeadStatus, DealStage } from '../types';
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
 * Get all leads
 */
export const getLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filters = extractFilters(req);
  let searchQuery = buildSearchQuery(filters);
  
  // Apply role-based filtering
  searchQuery = applyRoleBasedFiltering(searchQuery, req.user);

  const [leads, total] = await Promise.all([
    applyPopulation(
      Lead.find(searchQuery).sort(sort).skip(skip).limit(limit),
      'lead'
    ),
    Lead.countDocuments(searchQuery)
  ]);

  const meta = createPaginationMeta(page, limit, total);
  
  sendPaginated(res, leads, meta, 'Leads retrieved successfully');
});

/**
 * Get lead by ID
 */
export const getLeadById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const lead = await applyPopulation(Lead.findOne(query), 'lead');
  
  if (!lead) {
    throw createApiError.notFound('Lead not found');
  }

  sendSuccess(res, lead, 'Lead retrieved successfully');
});

/**
 * Create new lead
 */
export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leadData = {
    ...req.body,
    owner: req.body.owner || req.user?._id,
    createdBy: req.user?._id,
    updatedBy: req.user?._id
  };

  const lead = new Lead(leadData);
  await lead.save();

  const populatedLead = await applyPopulation(
    Lead.findById(lead._id),
    'lead'
  );

  sendCreated(res, populatedLead, 'Lead created successfully');
});

/**
 * Update lead
 */
export const updateLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const updateData = {
    ...req.body,
    updatedBy: req.user?._id
  };

  const lead = await Lead.findOneAndUpdate(
    query,
    updateData,
    { new: true, runValidators: true }
  );

  if (!lead) {
    throw createApiError.notFound('Lead not found or access denied');
  }

  const populatedLead = await applyPopulation(
    Lead.findById(lead._id),
    'lead'
  );

  sendSuccess(res, populatedLead, 'Lead updated successfully');
});

/**
 * Delete lead
 */
export const deleteLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const lead = await Lead.findOneAndDelete(query);
  
  if (!lead) {
    throw createApiError.notFound('Lead not found or access denied');
  }

  sendDeleted(res, 'Lead deleted successfully');
});

/**
 * Convert lead to deal
 */
export const convertLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { companyId, contactId, dealTitle, dealValue } = req.body;
  
  let query: any = { _id: id };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const lead = await Lead.findOne(query);
  
  if (!lead) {
    throw createApiError.notFound('Lead not found or access denied');
  }

  if (lead.convertedTo) {
    throw createApiError.badRequest('Lead is already converted');
  }

  // Create new deal from lead
  const dealData = {
    title: dealTitle || `Deal for ${lead.firstName} ${lead.lastName}`,
    description: `Converted from lead: ${lead.firstName} ${lead.lastName}`,
    value: dealValue || lead.value || 0,
    stage: DealStage.PROSPECTING,
    contact: contactId,
    company: companyId,
    owner: lead.owner,
    createdBy: req.user?._id,
    updatedBy: req.user?._id,
    notes: lead.notes,
    tags: lead.tags
  };

  const deal = new Deal(dealData);
  await deal.save();

  // Update lead with conversion info
  lead.convertedTo = deal._id;
  lead.updatedBy = req.user?._id;
  await lead.save();

  const populatedDeal = await applyPopulation(
    Deal.findById(deal._id),
    'deal'
  );

  sendCreated(res, { lead, deal: populatedDeal }, 'Lead converted to deal successfully');
});

/**
 * Get leads by status
 */
export const getLeadsByStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.params;
  
  if (!Object.values(LeadStatus).includes(status as LeadStatus)) {
    throw createApiError.badRequest('Invalid lead status');
  }

  let query: any = { status };
  
  // Apply role-based filtering
  query = applyRoleBasedFiltering(query, req.user);

  const leads = await applyPopulation(
    Lead.find(query).sort({ createdAt: -1 }),
    'lead'
  );

  sendSuccess(res, leads, `Found ${leads.length} leads with status ${status}`);
});

/**
 * Get lead statistics
 */
export const getLeadStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  let baseQuery: any = {};
  
  // Apply role-based filtering
  baseQuery = applyRoleBasedFiltering(baseQuery, req.user);

  const [
    totalLeads,
    leadsByStatus,
    leadsBySource,
    convertedLeads,
    totalLeadValue,
    recentLeads
  ] = await Promise.all([
    Lead.countDocuments(baseQuery),
    
    Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
      { $sort: { count: -1 } }
    ]),
    
    Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$source', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    
    Lead.countDocuments({
      ...baseQuery,
      convertedTo: { $exists: true }
    }),
    
    Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: null, totalValue: { $sum: '$value' } } }
    ]),
    
    Lead.countDocuments({
      ...baseQuery,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(2) : 0;

  const stats = {
    total: totalLeads,
    converted: convertedLeads,
    conversionRate: `${conversionRate}%`,
    totalValue: totalLeadValue[0]?.totalValue || 0,
    recent: recentLeads,
    byStatus: leadsByStatus,
    bySource: leadsBySource
  };

  sendSuccess(res, stats, 'Lead statistics retrieved successfully');
});

/**
 * Search leads
 */
export const searchLeads = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q: query, limit = 10 } = req.query;
  
  if (!query || typeof query !== 'string') {
    throw createApiError.badRequest('Search query is required');
  }

  let searchQuery = {
    $or: [
      { firstName: new RegExp(query, 'i') },
      { lastName: new RegExp(query, 'i') },
      { email: new RegExp(query, 'i') },
      { company: new RegExp(query, 'i') },
      { source: new RegExp(query, 'i') }
    ]
  };

  // Apply role-based filtering
  searchQuery = applyRoleBasedFiltering(searchQuery, req.user);

  const leads = await applyPopulation(
    Lead.find(searchQuery)
      .limit(parseInt(limit as string, 10))
      .sort({ createdAt: -1 }),
    'lead'
  );

  sendSuccess(res, leads, `Found ${leads.length} leads`);
});

export default {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  getLeadsByStatus,
  getLeadStats,
  searchLeads
};