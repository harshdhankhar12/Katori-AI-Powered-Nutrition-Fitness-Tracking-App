import { Router } from 'express';
import {
    getActivitySummary,
    getPersonalization,
    getStreakHistory,
    getStreakSummary,
    getUserProfile,
    saveOnboarding,
    savePersonalization,
    syncGoogleFitActivity,
} from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/profile', authenticateToken, getUserProfile);
router.get('/activity-summary', authenticateToken, getActivitySummary);
router.get('/streak-summary', authenticateToken, getStreakSummary);
router.get('/streak-history', authenticateToken, getStreakHistory);
router.get('/personalization', authenticateToken, getPersonalization);
router.post('/activity-sync', authenticateToken, syncGoogleFitActivity);
router.post('/onboarding', authenticateToken, saveOnboarding);
router.put('/personalization', authenticateToken, savePersonalization);

export default router;
