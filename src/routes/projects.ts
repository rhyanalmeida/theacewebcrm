import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectActivity,
  getProjectsByStatus,
  getProjectStats,
  updateProjectStatus,
  updateProjectProgress
} from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get project stats
router.get('/stats', catchAsync(getProjectStats));

// Get projects by status
router.get('/status/:status',
  validateRequest({ params: schemas.projectStatus.params }),
  catchAsync(getProjectsByStatus)
);

// Get all projects
router.get('/', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getProjects)
);

// Create project
router.post('/',
  validateRequest(schemas.createProject),
  catchAsync(createProject)
);

// Get single project
router.get('/:id',
  validateRequest(schemas.idParam),
  catchAsync(getProject)
);

// Update project
router.put('/:id',
  validateRequest({ 
    ...schemas.updateProject,
    params: schemas.idParam.params 
  }),
  catchAsync(updateProject)
);

// Update project status
router.patch('/:id/status',
  validateRequest({
    params: schemas.idParam.params,
    body: schemas.updateProjectStatus.body
  }),
  catchAsync(updateProjectStatus)
);

// Update project progress
router.patch('/:id/progress',
  validateRequest({
    params: schemas.idParam.params,
    body: schemas.updateProjectProgress.body
  }),
  catchAsync(updateProjectProgress)
);

// Delete project
router.delete('/:id',
  validateRequest(schemas.idParam),
  catchAsync(deleteProject)
);

// Get project activity
router.get('/:id/activity',
  validateRequest({ 
    params: schemas.idParam.params,
    query: schemas.pagination.query 
  }),
  catchAsync(getProjectActivity)
);

export default router;