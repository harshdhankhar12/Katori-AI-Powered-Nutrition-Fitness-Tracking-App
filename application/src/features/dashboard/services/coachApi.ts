import api from '../../../services/api'
import type { CoachChatData, CoachHistoryData, CoachMode } from '../types/coach'

export const coachApi = {
    getHistory: async () => {
        const response = await api.get('/coach/history')
        return response.data.data as CoachHistoryData
    },

    sendMessage: async (payload: { message: string; mode?: CoachMode }) => {
        const response = await api.post('/coach/chat', payload)
        return response.data.data as CoachChatData
    },

    saveCheckin: async (payload: { hunger_level: number; energy_level: number; cravings_note?: string; notes?: string }) => {
        const response = await api.post('/coach/checkin', payload)
        return response.data.data
    },

    setMode: async (mode: CoachMode) => {
        const response = await api.post('/coach/mode', { mode })
        return response.data.data as { mode: CoachMode }
    },
}
