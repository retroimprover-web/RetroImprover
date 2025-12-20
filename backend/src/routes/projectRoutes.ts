import { Router } from 'express';
import { getProjects, toggleLike, deleteProject } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getProjects);
router.post('/:id/like', authenticate, toggleLike);
router.delete('/:id', authenticate, deleteProject);

export default router;

