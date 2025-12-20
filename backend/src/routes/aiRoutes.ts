import { Router } from 'express';
import { restore, generatePrompts, generateVideo } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

router.post('/restore', upload.single('file'), restore);
router.post('/prompts', generatePrompts);
router.post('/video', generateVideo);

export default router;

