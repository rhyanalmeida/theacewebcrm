import Joi from 'joi';

// Additional validation schemas for the new endpoints
export const additionalSchemas = {
  // Auth-related schemas
  register: {
    body: Joi.object({
      email: Joi.string().email().required(),
      first_name: Joi.string().min(1).max(50).required(),
      last_name: Joi.string().min(1).max(50).required(),
      password: Joi.string().min(8).required(),
      company_name: Joi.string().optional()
    })
  },

  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },

  refreshToken: {
    body: Joi.object({
      refresh_token: Joi.string().required()
    })
  },

  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  },

  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      new_password: Joi.string().min(8).required()
    })
  },

  updateProfile: {
    body: Joi.object({
      first_name: Joi.string().min(1).max(50).optional(),
      last_name: Joi.string().min(1).max(50).optional(),
      phone: Joi.string().optional(),
      department: Joi.string().optional(),
      timezone: Joi.string().optional(),
      language: Joi.string().optional()
    })
  },

  changePassword: {
    body: Joi.object({
      current_password: Joi.string().required(),
      new_password: Joi.string().min(8).required()
    })
  },

  // Deal schemas
  createDeal: {
    body: Joi.object({
      title: Joi.string().min(1).max(200).required(),
      description: Joi.string().optional(),
      value: Joi.number().min(0).required(),
      stage: Joi.string().valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost').default('prospecting'),
      probability: Joi.number().min(0).max(100).default(10),
      expected_close_date: Joi.date().optional(),
      company_id: Joi.string().uuid().optional(),
      contact_id: Joi.string().uuid().optional(),
      assigned_to: Joi.string().uuid().optional()
    })
  },

  updateDeal: {
    body: Joi.object({
      title: Joi.string().min(1).max(200).optional(),
      description: Joi.string().optional(),
      value: Joi.number().min(0).optional(),
      stage: Joi.string().valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost').optional(),
      probability: Joi.number().min(0).max(100).optional(),
      expected_close_date: Joi.date().optional(),
      company_id: Joi.string().uuid().optional(),
      contact_id: Joi.string().uuid().optional(),
      assigned_to: Joi.string().uuid().optional()
    })
  },

  dealStage: {
    params: Joi.object({
      stage: Joi.string().valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost').required()
    })
  },

  updateDealStage: {
    body: Joi.object({
      stage: Joi.string().valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost').required()
    })
  },

  // Project schemas
  createProject: {
    body: Joi.object({
      name: Joi.string().min(1).max(200).required(),
      description: Joi.string().optional(),
      status: Joi.string().valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled').default('planning'),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      budget: Joi.number().min(0).optional(),
      company_id: Joi.string().uuid().optional(),
      assigned_to: Joi.string().uuid().optional()
    })
  },

  updateProject: {
    body: Joi.object({
      name: Joi.string().min(1).max(200).optional(),
      description: Joi.string().optional(),
      status: Joi.string().valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled').optional(),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
      start_date: Joi.date().optional(),
      due_date: Joi.date().optional(),
      completion_date: Joi.date().optional(),
      budget: Joi.number().min(0).optional(),
      actual_cost: Joi.number().min(0).optional(),
      company_id: Joi.string().uuid().optional(),
      assigned_to: Joi.string().uuid().optional(),
      progress: Joi.number().min(0).max(100).optional()
    })
  },

  projectStatus: {
    params: Joi.object({
      status: Joi.string().valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled').required()
    })
  },

  updateProjectStatus: {
    body: Joi.object({
      status: Joi.string().valid('planning', 'in_progress', 'on_hold', 'completed', 'cancelled').required()
    })
  },

  updateProjectProgress: {
    body: Joi.object({
      progress: Joi.number().min(0).max(100).required()
    })
  },

  // Payment schemas
  createPaymentIntent: {
    body: Joi.object({
      amount: Joi.number().min(100).required(), // Minimum $1.00
      currency: Joi.string().length(3).default('USD'),
      invoice_id: Joi.string().uuid().optional(),
      customer_email: Joi.string().email().optional(),
      metadata: Joi.object().optional()
    })
  },

  createInvoice: {
    body: Joi.object({
      client_id: Joi.string().uuid().required(),
      project_id: Joi.string().uuid().optional(),
      subtotal: Joi.number().min(0).required(),
      tax_rate: Joi.number().min(0).max(1).default(0),
      tax_amount: Joi.number().min(0).default(0),
      total: Joi.number().min(0).required(),
      currency: Joi.string().length(3).default('USD'),
      issue_date: Joi.date().default(Date.now),
      due_date: Joi.date().required(),
      payment_terms: Joi.string().optional(),
      notes: Joi.string().optional(),
      line_items: Joi.array().items(
        Joi.object({
          description: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          unit_price: Joi.number().min(0).required(),
          total: Joi.number().min(0).required()
        })
      ).min(1).required()
    })
  },

  updateInvoice: {
    body: Joi.object({
      subtotal: Joi.number().min(0).optional(),
      tax_rate: Joi.number().min(0).max(1).optional(),
      tax_amount: Joi.number().min(0).optional(),
      total: Joi.number().min(0).optional(),
      due_date: Joi.date().optional(),
      payment_terms: Joi.string().optional(),
      notes: Joi.string().optional(),
      status: Joi.string().valid('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled').optional()
    })
  },

  processRefund: {
    body: Joi.object({
      amount: Joi.number().min(100).optional(), // If not provided, full refund
      reason: Joi.string().optional()
    })
  },

  // File schemas
  uploadFile: {
    body: Joi.object({
      related_type: Joi.string().valid('lead', 'contact', 'company', 'deal', 'project', 'invoice', 'user').required(),
      related_id: Joi.string().uuid().optional(),
      is_public: Joi.boolean().default(false)
    })
  },

  filesByRelated: {
    params: Joi.object({
      type: Joi.string().valid('lead', 'contact', 'company', 'deal', 'project', 'invoice', 'user').required(),
      id: Joi.string().uuid().required()
    })
  },

  // Email schemas
  sendEmail: {
    body: Joi.object({
      to: Joi.alternatives().try(
        Joi.string().email(),
        Joi.array().items(Joi.string().email())
      ).required(),
      subject: Joi.string().min(1).max(200).required(),
      body: Joi.string().required(),
      template_id: Joi.string().uuid().optional(),
      variables: Joi.object().optional(),
      related_type: Joi.string().valid('lead', 'contact', 'company', 'deal', 'project', 'invoice').optional(),
      related_id: Joi.string().uuid().optional()
    })
  },

  createEmailTemplate: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      subject: Joi.string().min(1).max(200).required(),
      body: Joi.string().required(),
      type: Joi.string().valid('welcome', 'password_reset', 'invoice', 'notification', 'marketing', 'custom').default('custom'),
      is_active: Joi.boolean().default(true),
      variables: Joi.object().optional()
    })
  },

  updateEmailTemplate: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      subject: Joi.string().min(1).max(200).optional(),
      body: Joi.string().optional(),
      type: Joi.string().valid('welcome', 'password_reset', 'invoice', 'notification', 'marketing', 'custom').optional(),
      is_active: Joi.boolean().optional(),
      variables: Joi.object().optional()
    })
  },

  previewTemplate: {
    query: Joi.object({
      variables: Joi.string().optional() // JSON string of variables
    })
  },

  // Analytics schemas
  dateRange: {
    query: Joi.object({
      start_date: Joi.date().optional(),
      end_date: Joi.date().optional(),
      period: Joi.string().valid('week', 'month', 'quarter', 'year').optional()
    })
  },

  customReport: {
    body: Joi.object({
      name: Joi.string().min(1).max(200).required(),
      description: Joi.string().optional(),
      metrics: Joi.array().items(Joi.string()).min(1).required(),
      filters: Joi.object().optional(),
      date_range: Joi.object({
        start_date: Joi.date().required(),
        end_date: Joi.date().required()
      }).required(),
      group_by: Joi.string().optional(),
      format: Joi.string().valid('json', 'csv', 'pdf').default('json')
    })
  },

  // Common schemas
  idParam: {
    params: Joi.object({
      id: Joi.string().uuid().required()
    })
  },

  pagination: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().optional()
    })
  }
};