import { Router } from 'express';
import QuoteController from '../controllers/QuoteController';
import { auth } from '../../middleware/auth';
import { validation } from '../../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Quote validation rules
const createQuoteValidation = [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('expirationDate').isISO8601().withMessage('Valid expiration date is required'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').notEmpty().withMessage('Line item description is required'),
  body('lineItems.*.quantity').isFloat({ min: 0.01 }).withMessage('Line item quantity must be positive'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Line item unit price must be non-negative'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be non-negative')
];

const updateQuoteValidation = [
  body('expirationDate').optional().isISO8601().withMessage('Valid expiration date is required'),
  body('terms').optional().isString(),
  body('notes').optional().isString(),
  body('publicNotes').optional().isString(),
  body('privateNotes').optional().isString()
];

const lineItemValidation = [
  body('description').notEmpty().withMessage('Description is required'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('taxable').optional().isBoolean()
];

// Quote routes
router.post('/', 
  auth, 
  createQuoteValidation, 
  validation, 
  QuoteController.createQuote
);

router.get('/', 
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validation, 
  QuoteController.listQuotes
);

router.get('/expiring', 
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  validation,
  QuoteController.getExpiringQuotes
);

router.get('/metrics', 
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validation,
  QuoteController.getQuoteMetrics
);

router.get('/number/:number', 
  param('number').notEmpty().withMessage('Quote number is required'),
  validation,
  QuoteController.getQuoteByNumber
);

router.get('/:id', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  QuoteController.getQuote
);

router.put('/:id', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  updateQuoteValidation,
  validation,
  QuoteController.updateQuote
);

router.post('/:id/send', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  body('recipientEmail').optional().isEmail().withMessage('Valid email is required'),
  validation,
  QuoteController.sendQuote
);

router.post('/:id/accept', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  QuoteController.acceptQuote
);

router.post('/:id/reject', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  body('reason').optional().isString(),
  validation,
  QuoteController.rejectQuote
);

router.post('/:id/convert', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  validation,
  QuoteController.convertToInvoice
);

router.post('/:id/duplicate', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  body('customerId').optional().isMongoId().withMessage('Valid customer ID is required'),
  body('expirationDate').optional().isISO8601().withMessage('Valid expiration date is required'),
  validation,
  QuoteController.duplicateQuote
);

router.post('/:id/pdf', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  QuoteController.generatePDF
);

router.get('/:id/pdf', 
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  validation,
  QuoteController.downloadPDF
);

router.post('/:id/extend', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  body('newExpirationDate').isISO8601().withMessage('Valid new expiration date is required'),
  validation,
  QuoteController.extendExpirationDate
);

// Line item management
router.post('/:id/line-items', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  lineItemValidation,
  validation,
  QuoteController.addLineItem
);

router.put('/:id/line-items/:lineItemId', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  param('lineItemId').notEmpty().withMessage('Line item ID is required'),
  body('description').optional().isString(),
  body('quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('taxable').optional().isBoolean(),
  validation,
  QuoteController.updateLineItem
);

router.delete('/:id/line-items/:lineItemId', 
  auth,
  param('id').isMongoId().withMessage('Valid quote ID is required'),
  param('lineItemId').notEmpty().withMessage('Line item ID is required'),
  validation,
  QuoteController.removeLineItem
);

export default router;