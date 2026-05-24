import { Router } from 'express';
import { createJob, getJobs, getMyJobs, getJobById, updateJob, deleteJob } from '../controllers/jobController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authMiddleware, requireRole('HR'), createJob);
router.get('/me', authMiddleware, requireRole('HR'), getMyJobs);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.put('/:id', authMiddleware, requireRole('HR'), updateJob);
router.delete('/:id', authMiddleware, requireRole('HR'), deleteJob);

export default router;
