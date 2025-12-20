import { Router } from 'express';
import { restore, generatePrompts, generateVideo } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();

router.post('/restore', authenticate, upload.single('file'), restore);
router.post('/prompts', authenticate, generatePrompts);
router.post('/video', authenticate, generateVideo);

export default router;

