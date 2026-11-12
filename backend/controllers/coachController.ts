import { Request, Response } from 'express'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '../server'

dotenv.config()

type CoachMode = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'MAINTAIN' | 'INDIAN_HOME_STYLE'
type CoachRole = 'user' | 'assistant'
type CoachActionType = 'OPEN_RECIPES' | 'OPEN_MACRO_GAP' | 'OPEN_LOG_MEAL' | 'START_VOICE_LOG'

type CoachAction = {
    type: CoachActionType
    title: string
    subtitle?: string
}

type CoachMessageDto = {
    id: string
    role: CoachRole
    content: string
    actions?: CoachAction[]
    created_at: string
}

const VALID_MODES: CoachMode[] = ['FAT_LOSS', 'MUSCLE_GAIN', 'MAINTAIN', 'INDIAN_HOME_STYLE']
const VALID_ACTIONS: CoachActionType[] = ['OPEN_RECIPES', 'OPEN_MACRO_GAP', 'OPEN_LOG_MEAL', 'START_VOICE_LOG']

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const startOfLocalDay = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const endOfLocalDay = () => {
    const start = startOfLocalDay()
    return new Date(start.getTime() + 24 * 60 * 60 * 1000)
}

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) return null
    return new GoogleGenAI({ apiKey })
}

const parseJsonBlock = (input: string) => {
    const cleaned = input.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
}

const normalizeMode = (value?: string): CoachMode => {
    const normalized = String(value || '').toUpperCase()
    return VALID_MODES.includes(normalized as CoachMode) ? (normalized as CoachMode) : 'MAINTAIN'
}

const sanitizeActions = (value: unknown): CoachAction[] => {
    if (!Array.isArray(value)) return []

    const actions = value.map((item): CoachAction | null => {
        if (!item || typeof item !== 'object') return null

        const action = item as { type?: string; title?: string; subtitle?: string }
        const type = String(action.type || '').toUpperCase() as CoachActionType
        if (!VALID_ACTIONS.includes(type)) return null

        const title = String(action.title || '').trim()
        if (!title) return null

        const subtitle = String(action.subtitle || '').trim()

        return {
            type,
            title,
            ...(subtitle ? { subtitle } : {}),
        }
    })

    return actions.filter((item): item is CoachAction => item !== null)
}

const serializeMessage = (message: any): CoachMessageDto => {
    const actions = sanitizeActions(message.actions_json)
    return {
        id: String(message.id),
        role: String(message.role || 'assistant') === 'user' ? 'user' : 'assistant',
        content: String(message.content || ''),
        actions: actions.length ? actions : undefined,
        created_at: new Date(message.created_at || new Date()).toISOString(),
    }
}

const buildFallbackReply = (input: {
    mode: CoachMode
    remainingCalories: number
    remainingProtein: number
}): { reply: string; actions: CoachAction[] } => {
    const modeLine =
        input.mode === 'FAT_LOSS'
            ? '**Mode:** Fat loss focused'
            : input.mode === 'MUSCLE_GAIN'
                ? '**Mode:** Muscle gain focused'
                : input.mode === 'INDIAN_HOME_STYLE'
                    ? '**Mode:** Indian home-style focused'
                    : '**Mode:** Maintenance focused'

    const reply = [
        `${modeLine}`,
        '',
        '**Today Plan**',
        `- Calories left: **${Math.max(0, Math.round(input.remainingCalories))} kcal**`,
        `- Protein left: **${Math.max(0, Math.round(input.remainingProtein))} g**`,
        '- Keep dinner simple: one high-protein main + one fiber side.',
        '',
        '**Next Step**',
        '- Open Macro Gap and log a matched meal now.',
    ].join('\n')

    return {
        reply,
        actions: [
            { type: 'OPEN_MACRO_GAP', title: 'Fill Macro Gap', subtitle: 'Best match for remaining macros' },
            { type: 'OPEN_RECIPES', title: 'Open Recipes', subtitle: 'See quick meal ideas' },
            { type: 'OPEN_LOG_MEAL', title: 'Log Meal', subtitle: 'Track what you eat now' },
        ],
    }
}

const generateCoachReply = async (input: {
    mode: CoachMode
    message: string
    userName: string
    profile: any
    preference: any
    summary: any
    recentLogs: any[]
    todayCheckin: any | null
    recentMessages: Array<{ role: string; content: string }>
}) => {
    const client = getGeminiClient()
    if (!client) {
        return buildFallbackReply({
            mode: input.mode,
            remainingCalories: Number(input.summary?.remaining_calories || 0),
            remainingProtein: Number(input.summary?.remaining_protein || 0),
        })
    }

    const context = {
        user_name: input.userName,
        mode: input.mode,
        profile: {
            goal_type: input.profile?.goal_type || null,
            daily_calorie_target: Number(input.profile?.daily_calorie_target || 0),
            daily_protein_target: Number(input.profile?.daily_protein_target || 0),
            daily_carbs_target: Number(input.profile?.daily_carbs_target || 0),
            daily_fat_target: Number(input.profile?.daily_fat_target || 0),
            activity_level: input.profile?.activity_level || null,
        },
        preferences: {
            dietary_preference: input.preference?.dietary_preference || null,
            katori_size_ml: Number(input.preference?.katori_size_ml || 0),
            roti_thickness: input.preference?.roti_thickness || null,
        },
        today_summary: {
            remaining_calories: Number(input.summary?.remaining_calories || 0),
            remaining_protein: Number(input.summary?.remaining_protein || 0),
            total_calories: Number(input.summary?.total_calories || 0),
            total_protein: Number(input.summary?.total_protein || 0),
        },
        today_checkin: input.todayCheckin
            ? {
                hunger_level: Number(input.todayCheckin.hunger_level || 0),
                energy_level: Number(input.todayCheckin.energy_level || 0),
                cravings_note: input.todayCheckin.cravings_note || null,
                notes: input.todayCheckin.notes || null,
            }
            : null,
        recent_food_logs: input.recentLogs.map((log) => ({
            meal_type: log.meal_type,
            total_calories: Number(log.total_calories || 0),
            total_protein: Number(log.total_protein || 0),
            foods: Array.isArray(log.meal_items) ? log.meal_items.map((item: any) => item.food_name).slice(0, 5) : [],
        })),
        recent_chat: input.recentMessages.slice(-8),
    }

    const prompt = `You are NutraDost Coach, a concise and practical Indian nutrition coach.\n\nReturn strict JSON only with shape:\n{\n  "reply": "string",\n  "actions": [{"type":"OPEN_RECIPES|OPEN_MACRO_GAP|OPEN_LOG_MEAL|START_VOICE_LOG","title":"string","subtitle":"string"}]\n}\n\nRules:\n- Keep reply under 120 words.\n- Use short sections and bullet points.\n- Use markdown bold with **text** for key numbers only.\n- Do not use unsafe medical claims.\n- Respect dietary preference and goal mode.\n- Keep tone motivating but specific.\n- Include 2 or 3 actions max.\n\nUser message: ${input.message}\n\nContext JSON:\n${JSON.stringify(context)}`

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
        })

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const parsed = parseJsonBlock(text) as { reply?: string; actions?: unknown }
        const reply = String(parsed.reply || '').trim()
        const actions = sanitizeActions(parsed.actions)

        if (!reply) {
            throw new Error('Empty coach reply')
        }

        return {
            reply,
            actions: actions.slice(0, 3),
        }
    } catch {
        return buildFallbackReply({
            mode: input.mode,
            remainingCalories: Number(input.summary?.remaining_calories || 0),
            remainingProtein: Number(input.summary?.remaining_protein || 0),
        })
    }
}

export const getCoachHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        const db = prisma as any
        const [messages, pref, todayCheckin] = await Promise.all([
            db.coachMessage.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'asc' },
                take: 80,
            }),
            db.coachPreference.findUnique({ where: { user_id: userId } }),
            db.coachCheckIn.findFirst({
                where: {
                    user_id: userId,
                    checkin_date: {
                        gte: startOfLocalDay(),
                        lt: endOfLocalDay(),
                    },
                },
            }),
        ])

        return res.json({
            success: true,
            data: {
                mode: normalizeMode(pref?.mode),
                messages: messages.map(serializeMessage),
                today_checkin: todayCheckin
                    ? {
                        hunger_level: Number(todayCheckin.hunger_level || 0),
                        energy_level: Number(todayCheckin.energy_level || 0),
                        cravings_note: todayCheckin.cravings_note || '',
                        notes: todayCheckin.notes || '',
                        checkin_date: new Date(todayCheckin.checkin_date).toISOString(),
                    }
                    : null,
            },
        })
    } catch (error) {
        console.error('Coach history error:', error)
        return res.status(500).json({ error: 'Could not load coach history.' })
    }
}

export const setCoachMode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        const mode = normalizeMode(req.body?.mode)
        const db = prisma as any

        await db.coachPreference.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                mode,
            },
            update: {
                mode,
            },
        })

        return res.json({
            success: true,
            data: { mode },
        })
    } catch (error) {
        console.error('Set coach mode error:', error)
        return res.status(500).json({ error: 'Could not update coach mode.' })
    }
}

export const saveCoachCheckin = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        const hungerLevel = clamp(Number(req.body?.hunger_level || 0), 1, 5)
        const energyLevel = clamp(Number(req.body?.energy_level || 0), 1, 5)
        const cravingsNote = String(req.body?.cravings_note || '').trim()
        const notes = String(req.body?.notes || '').trim()
        const checkinDate = startOfLocalDay()

        const db = prisma as any
        const checkin = await db.coachCheckIn.upsert({
            where: {
                user_id_checkin_date: {
                    user_id: userId,
                    checkin_date: checkinDate,
                },
            },
            create: {
                user_id: userId,
                checkin_date: checkinDate,
                hunger_level: hungerLevel,
                energy_level: energyLevel,
                cravings_note: cravingsNote || null,
                notes: notes || null,
            },
            update: {
                hunger_level: hungerLevel,
                energy_level: energyLevel,
                cravings_note: cravingsNote || null,
                notes: notes || null,
            },
        })

        return res.json({
            success: true,
            data: {
                hunger_level: Number(checkin.hunger_level),
                energy_level: Number(checkin.energy_level),
                cravings_note: checkin.cravings_note || '',
                notes: checkin.notes || '',
                checkin_date: new Date(checkin.checkin_date).toISOString(),
            },
        })
    } catch (error) {
        console.error('Coach check-in error:', error)
        return res.status(500).json({ error: 'Could not save check-in.' })
    }
}

export const sendCoachMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        const message = String(req.body?.message || '').trim()
        if (!message) {
            return res.status(400).json({ error: 'Message is required.' })
        }

        const db = prisma as any
        const modeOverride = req.body?.mode ? normalizeMode(req.body?.mode) : null

        if (modeOverride) {
            await db.coachPreference.upsert({
                where: { user_id: userId },
                create: { user_id: userId, mode: modeOverride },
                update: { mode: modeOverride },
            })
        }

        const [userRow, profile, preference, todaySummary, recentLogs, recentMessages, currentModePref, todayCheckin] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
            prisma.profile.findUnique({ where: { user_id: userId } }),
            prisma.userPreference.findUnique({ where: { user_id: userId } }),
            prisma.dailySummary.findFirst({
                where: {
                    user_id: userId,
                    summary_date: {
                        gte: startOfLocalDay(),
                        lt: endOfLocalDay(),
                    },
                },
            }),
            prisma.foodLog.findMany({
                where: { user_id: userId },
                orderBy: { logged_at: 'desc' },
                take: 5,
                include: {
                    meal_items: {
                        select: { food_name: true },
                    },
                },
            }),
            db.coachMessage.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                take: 12,
                select: {
                    role: true,
                    content: true,
                },
            }),
            db.coachPreference.findUnique({ where: { user_id: userId } }),
            db.coachCheckIn.findFirst({
                where: {
                    user_id: userId,
                    checkin_date: {
                        gte: startOfLocalDay(),
                        lt: endOfLocalDay(),
                    },
                },
            }),
        ])

        const mode = modeOverride || normalizeMode(currentModePref?.mode)

        const userMessage = await db.coachMessage.create({
            data: {
                user_id: userId,
                role: 'user',
                content: message,
            },
        })

        const aiResult = await generateCoachReply({
            mode,
            message,
            userName: userRow?.name || 'friend',
            profile,
            preference,
            summary: todaySummary,
            recentLogs,
            todayCheckin,
            recentMessages: recentMessages.reverse(),
        })

        const assistantMessage = await db.coachMessage.create({
            data: {
                user_id: userId,
                role: 'assistant',
                content: aiResult.reply,
                actions_json: aiResult.actions,
            },
        })

        return res.json({
            success: true,
            data: {
                mode,
                user_message: serializeMessage(userMessage),
                assistant_message: serializeMessage(assistantMessage),
            },
        })
    } catch (error) {
        console.error('Coach chat error:', error)
        return res.status(500).json({ error: 'Could not send coach message.' })
    }
}
