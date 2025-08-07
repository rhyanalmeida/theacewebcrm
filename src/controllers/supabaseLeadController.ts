import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupabaseService } from '../services/supabaseService';
import { catchAsync, CustomError } from '../middleware/errorHandler';

export const getLeads = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, search, status, assigned_to } = req.query;

  const filters: any = {};
  if (status) filters.status = status;
  if (assigned_to) filters.assigned_to = assigned_to;
  if (search) filters.email_search = search;

  const { data: leads, count } = await SupabaseService.findAll(
    'leads',
    filters,
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: leads,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      pages: Math.ceil(count / Number(limit))
    }
  });
});

export const getLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  const lead = await SupabaseService.findById('leads', id);
  
  if (!lead) {
    throw new CustomError('Lead not found', 404);
  }

  res.json({
    success: true,
    data: lead
  });
});

export const createLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const leadData = {
    ...req.body,
    assigned_to: req.body.assigned_to || req.user!.id
  };

  const lead = await SupabaseService.create('leads', leadData);

  // Log activity
  await SupabaseService.logActivity(
    'note',
    'Lead created',
    'lead',
    lead.id,
    req.user!.id,
    `New lead created: ${lead.first_name} ${lead.last_name}`
  );

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead
  });
});

export const updateLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = req.body;

  const lead = await SupabaseService.update('leads', id, updateData);

  // Log activity
  await SupabaseService.logActivity(
    'note',
    'Lead updated',
    'lead',
    id,
    req.user!.id,
    'Lead information updated'
  );

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: lead
  });
});

export const deleteLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  await SupabaseService.delete('leads', id);

  res.json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

export const getLeadActivity = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const { data: activities, count } = await SupabaseService.findAll(
    'activities',
    { related_type: 'lead', related_id: id },
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: activities,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      pages: Math.ceil(count / Number(limit))
    }
  });
});

export const convertLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { company_name, deal_title, deal_value } = req.body;

  // Get the lead
  const lead = await SupabaseService.findById('leads', id);
  if (!lead) {
    throw new CustomError('Lead not found', 404);
  }

  // Create company if provided
  let companyId = null;
  if (company_name) {
    const company = await SupabaseService.create('companies', {
      name: company_name,
      created_by: req.user!.id
    });
    companyId = company.id;
  }

  // Create contact from lead
  const contact = await SupabaseService.create('contacts', {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    company_id: companyId,
    created_by: req.user!.id
  });

  // Create deal if specified
  let deal = null;
  if (deal_title && deal_value) {
    deal = await SupabaseService.create('deals', {
      title: deal_title,
      value: deal_value,
      contact_id: contact.id,
      company_id: companyId,
      assigned_to: lead.assigned_to,
      created_by: req.user!.id
    });
  }

  // Update lead status to converted
  await SupabaseService.update('leads', id, { status: 'closed_won' });

  // Log activity
  await SupabaseService.logActivity(
    'note',
    'Lead converted',
    'lead',
    id,
    req.user!.id,
    `Lead converted to contact${deal ? ' and deal' : ''}`
  );

  res.json({
    success: true,
    message: 'Lead converted successfully',
    data: {
      contact,
      deal,
      company_id: companyId
    }
  });
});

export const assignLead = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  const lead = await SupabaseService.update('leads', id, { assigned_to });

  // Log activity
  await SupabaseService.logActivity(
    'note',
    'Lead reassigned',
    'lead',
    id,
    req.user!.id,
    `Lead assigned to user ${assigned_to}`
  );

  res.json({
    success: true,
    message: 'Lead assigned successfully',
    data: lead
  });
});

export const getLeadStats = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const totalLeads = await SupabaseService.getCount('leads');
  const newLeads = await SupabaseService.getCount('leads', { status: 'new' });
  const contactedLeads = await SupabaseService.getCount('leads', { status: 'contacted' });
  const qualifiedLeads = await SupabaseService.getCount('leads', { status: 'qualified' });
  const proposalLeads = await SupabaseService.getCount('leads', { status: 'proposal' });
  const closedWonLeads = await SupabaseService.getCount('leads', { status: 'closed_won' });
  const closedLostLeads = await SupabaseService.getCount('leads', { status: 'closed_lost' });

  res.json({
    success: true,
    data: {
      total: totalLeads,
      by_status: {
        new: newLeads,
        contacted: contactedLeads,
        qualified: qualifiedLeads,
        proposal: proposalLeads,
        closed_won: closedWonLeads,
        closed_lost: closedLostLeads
      }
    }
  });
});