import { Router } from 'express';
import { getProjects, toggleLike, deleteProject } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

router.get('/', getProjects);
router.post('/:id/like', toggleLike);
router.delete('/:id', deleteProject);

export default router;

