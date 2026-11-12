import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
    createFoodLog,
    deleteFoodLog,
    getDashboardSummary,
    getDailyFoodLogs,
    getQuickPresets,
    searchFoods,
    updateFoodLog,
} from '../controllers/foodController';

const router = Router();

router.get('/quick-presets', authenticateToken, getQuickPresets);
router.get('/search', authenticateToken, searchFoods);
router.get('/daily-logs', authenticateToken, getDailyFoodLogs);
router.get('/dashboard-summary', authenticateToken, getDashboardSummary);
router.post('/logs', authenticateToken, createFoodLog);
router.put('/logs/:id', authenticateToken, updateFoodLog);
router.delete('/logs/:id', authenticateToken, deleteFoodLog);

export default router;
