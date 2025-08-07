import { Router } from 'express';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealActivity,
  getDealsByStage,
  getDealStats,
  updateDealStage
} from '../controllers/dealController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get deal stats
router.get('/stats', catchAsync(getDealStats));

// Get deals by stage
router.get('/stage/:stage',
  validateRequest({ params: schemas.dealStage.params }),
  catchAsync(getDealsByStage)
);

// Get all deals
router.get('/', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getDeals)
);

// Create deal
router.post('/',
  validateRequest(schemas.createDeal),
  catchAsync(createDeal)
);

// Get single deal
router.get('/:id',
  validateRequest(schemas.idParam),
  catchAsync(getDeal)
);

// Update deal
router.put('/:id',
  validateRequest({ 
    ...schemas.updateDeal,
    params: schemas.idParam.params 
  }),
  catchAsync(updateDeal)
);

// Update deal stage
router.patch('/:id/stage',
  validateRequest({
    params: schemas.idParam.params,
    body: schemas.updateDealStage.body
  }),
  catchAsync(updateDealStage)
);

// Delete deal
router.delete('/:id',
  validateRequest(schemas.idParam),
  catchAsync(deleteDeal)
);

// Get deal activity
router.get('/:id/activity',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getDealActivity)
);

export default router;