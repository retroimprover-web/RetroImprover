import { Router } from 'express';
import { downloadFile } from '../controllers/downloadController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, downloadFile);

export default router;


