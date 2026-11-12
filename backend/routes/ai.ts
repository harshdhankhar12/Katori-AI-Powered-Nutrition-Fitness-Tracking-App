import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware'
import { confirmVoiceTranscriptionSuggestion, voiceTranscriptionForLogMeals } from '../controllers/aiController'

const router = Router()

router.post('/voice/suggestions', authenticateToken, voiceTranscriptionForLogMeals)
router.post('/voice/suggestions/confirm', authenticateToken, confirmVoiceTranscriptionSuggestion)

export default router