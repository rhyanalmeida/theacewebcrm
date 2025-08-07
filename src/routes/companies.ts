import { Router } from 'express';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyContacts,
  getCompanyDeals,
  getCompanyProjects,
  getCompanyActivity,
  getCompanyStats
} from '../controllers/companyController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get company stats
router.get('/stats', catchAsync(getCompanyStats));

// Get all companies
router.get('/', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getCompanies)
);

// Create company
router.post('/',
  validateRequest(schemas.createCompany),
  catchAsync(createCompany)
);

// Get single company
router.get('/:id',
  validateRequest(schemas.idParam),
  catchAsync(getCompany)
);

// Update company
router.put('/:id',
  validateRequest({ 
    ...schemas.updateCompany,
    params: schemas.idParam.params 
  }),
  catchAsync(updateCompany)
);

// Delete company
router.delete('/:id',
  validateRequest(schemas.idParam),
  catchAsync(deleteCompany)
);

// Get company contacts
router.get('/:id/contacts',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getCompanyContacts)
);

// Get company deals
router.get('/:id/deals',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getCompanyDeals)
);

// Get company projects
router.get('/:id/projects',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getCompanyProjects)
);

// Get company activity
router.get('/:id/activity',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getCompanyActivity)
);

export default router;