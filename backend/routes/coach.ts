import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware'
import {
    getCoachHistory,
    saveCoachCheckin,
    sendCoachMessage,
    setCoachMode,
} from '../controllers/coachController'

const router = Router()

router.get('/history', authenticateToken, getCoachHistory)
router.post('/chat', authenticateToken, sendCoachMessage)
router.post('/checkin', authenticateToken, saveCoachCheckin)
router.post('/mode', authenticateToken, setCoachMode)

export default router
