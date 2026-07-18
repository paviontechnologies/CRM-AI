import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask
} from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.patch('/:id/status', toggleTaskStatus);
router.delete('/:id', deleteTask);

export default router;
