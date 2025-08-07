import { Router } from 'express';
import InvoiceController from '../controllers/InvoiceController';
import { auth } from '../../middleware/auth';
import { validation } from '../../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Invoice validation rules
const createInvoiceValidation = [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').notEmpty().withMessage('Line item description is required'),
  body('lineItems.*.quantity').isFloat({ min: 0.01 }).withMessage('Line item quantity must be positive'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Line item unit price must be non-negative'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be non-negative')
];

const updateInvoiceValidation = [
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('notes').optional().isString(),
  body('publicNotes').optional().isString(),
  body('privateNotes').optional().isString()
];

const sendReminderValidation = [
  body('reminderType').isIn(['first_reminder', 'second_reminder', 'final_notice']).withMessage('Invalid reminder type'),
  body('customEmail').optional().isEmail().withMessage('Valid email is required')
];

// Invoice routes
router.post('/', 
  auth, 
  createInvoiceValidation, 
  validation, 
  InvoiceController.createInvoice
);

router.get('/', 
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validation, 
  InvoiceController.listInvoices
);

router.get('/overdue', InvoiceController.getOverdueInvoices);

router.get('/financial-summary', InvoiceController.getFinancialSummary);

router.get('/revenue-report', 
  query('startDate').notEmpty().isISO8601().withMessage('Valid start date is required'),
  query('endDate').notEmpty().isISO8601().withMessage('Valid end date is required'),
  validation,
  InvoiceController.getRevenueReport
);

router.get('/number/:number', 
  param('number').notEmpty().withMessage('Invoice number is required'),
  validation,
  InvoiceController.getInvoiceByNumber
);

router.get('/:id', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  InvoiceController.getInvoice
);

router.put('/:id', 
  auth,
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  updateInvoiceValidation,
  validation,
  InvoiceController.updateInvoice
);

router.post('/:id/send', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  body('recipientEmail').optional().isEmail().withMessage('Valid email is required'),
  validation,
  InvoiceController.sendInvoice
);

router.post('/:id/view', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  InvoiceController.markAsViewed
);

router.post('/:id/paid', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  body('paymentAmount').isFloat({ min: 0 }).withMessage('Payment amount must be positive'),
  body('paidDate').optional().isISO8601().withMessage('Valid paid date is required'),
  validation,
  InvoiceController.markAsPaid
);

router.post('/:id/cancel', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  body('reason').optional().isString(),
  validation,
  InvoiceController.cancelInvoice
);

router.post('/:id/reminder', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  sendReminderValidation,
  validation,
  InvoiceController.sendReminder
);

router.post('/:id/pdf', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  InvoiceController.generatePDF
);

router.get('/:id/pdf', 
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  validation,
  InvoiceController.downloadPDF
);

router.post('/:id/duplicate', 
  auth,
  param('id').isMongoId().withMessage('Valid invoice ID is required'),
  body('customerId').optional().isMongoId().withMessage('Valid customer ID is required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  validation,
  InvoiceController.duplicateInvoice
);

export default router;