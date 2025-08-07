import { Router } from 'express';
import {
  sendEmail,
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getEmailHistory,
  previewEmailTemplate
} from '../controllers/emailController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Send email
router.post('/send',
  validateRequest({ body: schemas.sendEmail.body }),
  catchAsync(sendEmail)
);

// Get email history
router.get('/history',
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getEmailHistory)
);

// Email templates (admin/manager only)
router.get('/templates',
  authorizeRoles('admin', 'manager'),
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getEmailTemplates)
);

router.post('/templates',
  authorizeRoles('admin', 'manager'),
  validateRequest({ body: schemas.createEmailTemplate.body }),
  catchAsync(createEmailTemplate)
);

router.get('/templates/:id',
  authorizeRoles('admin', 'manager'),
  validateRequest(schemas.idParam),
  catchAsync(getEmailTemplate)
);

router.get('/templates/:id/preview',
  authorizeRoles('admin', 'manager'),
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.previewTemplate.query
  }),
  catchAsync(previewEmailTemplate)
);

router.put('/templates/:id',
  authorizeRoles('admin', 'manager'),
  validateRequest({ 
    ...schemas.updateEmailTemplate,
    params: schemas.idParam.params 
  }),
  catchAsync(updateEmailTemplate)
);

router.delete('/templates/:id',
  authorizeRoles('admin', 'manager'),
  validateRequest(schemas.idParam),
  catchAsync(deleteEmailTemplate)
);

export default router;