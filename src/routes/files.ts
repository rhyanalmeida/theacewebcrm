import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
  getFilesByRelated,
  downloadFile
} from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { schemas } from '../middleware/validation';
import { catchAsync } from '../middleware/errorHandler';
import multer from 'multer';
import { config } from '../config/environment';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (config.uploads.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxSize },
  fileFilter
});

// All routes require authentication
router.use(authenticateToken);

// Get all files
router.get('/', 
  validateRequest({ query: schemas.pagination.query }),
  catchAsync(getFiles)
);

// Upload file
router.post('/upload',
  upload.single('file'),
  validateRequest({ body: schemas.uploadFile.body }),
  catchAsync(uploadFile)
);

// Get files by related entity
router.get('/related/:type/:id',
  validateRequest({ params: schemas.filesByRelated.params }),
  catchAsync(getFilesByRelated)
);

// Get single file
router.get('/:id',
  validateRequest(schemas.idParam),
  catchAsync(getFile)
);

// Download file
router.get('/:id/download',
  validateRequest(schemas.idParam),
  catchAsync(downloadFile)
);

// Delete file
router.delete('/:id',
  validateRequest(schemas.idParam),
  catchAsync(deleteFile)
);

export default router;