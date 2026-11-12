export type CoachMode = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'MAINTAIN' | 'INDIAN_HOME_STYLE'

export type CoachActionType = 'OPEN_RECIPES' | 'OPEN_MACRO_GAP' | 'OPEN_LOG_MEAL' | 'START_VOICE_LOG'

export type CoachAction = {
    type: CoachActionType
    title: string
    subtitle?: string
}

export type CoachMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    actions?: CoachAction[]
    created_at: string
}

export type CoachCheckin = {
    hunger_level: number
    energy_level: number
    cravings_note?: string
    notes?: string
    checkin_date: string
}

export type CoachHistoryData = {
    mode: CoachMode
    messages: CoachMessage[]
    today_checkin: CoachCheckin | null
}

export type CoachChatData = {
    mode: CoachMode
    user_message: CoachMessage
    assistant_message: CoachMessage
}
