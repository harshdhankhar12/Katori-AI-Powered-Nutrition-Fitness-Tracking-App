import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { Request, Response } from 'express'
import { prisma } from '../server'

dotenv.config()

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured.')
    }

    return new GoogleGenAI({ apiKey })
}

type VoiceSuggestionItem = {
    food_id?: string
    food_name: string
    quantity: number
    unit: string
    nutrition_per_unit?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    modifiers?: {
        type?: string | null
        size?: string | null
        thickness?: string | null
    }
}

type VoiceSuggestion = {
    title: string
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    confidence: number
    notes?: string
    items: VoiceSuggestionItem[]
}

type VoiceDraftPayload = {
    transcript?: string
    audioData?: string
}

type VoiceSelectionPayload = {
    voice_log_raw_id?: string
    selected_index?: number
}

const parseJsonBlock = (input: string) => {
    const cleaned = input.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
}

const DEFAULT_AI_NUTRITION: Record<string, { calories: number; protein: number; carbs: number; fat: number; unit: string }> = {
    roti: { calories: 120, protein: 3, carbs: 18, fat: 3, unit: 'piece' },
    chapati: { calories: 120, protein: 3, carbs: 18, fat: 3, unit: 'piece' },
    rice: { calories: 180, protein: 4, carbs: 38, fat: 1, unit: 'katori' },
    dal: { calories: 140, protein: 8, carbs: 18, fat: 3, unit: 'katori' },
    paneer: { calories: 130, protein: 8, carbs: 3, fat: 9, unit: 'piece' },
    sabji: { calories: 110, protein: 3, carbs: 10, fat: 6, unit: 'katori' },
    curd: { calories: 90, protein: 4, carbs: 7, fat: 5, unit: 'katori' },
    yogurt: { calories: 90, protein: 4, carbs: 7, fat: 5, unit: 'katori' },
    egg: { calories: 78, protein: 6, carbs: 1, fat: 5, unit: 'piece' },
    oats: { calories: 150, protein: 5, carbs: 27, fat: 3, unit: 'bowl' },
    banana: { calories: 105, protein: 1, carbs: 27, fat: 0, unit: 'piece' },
    chicken: { calories: 165, protein: 31, carbs: 0, fat: 4, unit: 'piece' },
    'ice cream': { calories: 137, protein: 2.3, carbs: 16, fat: 7, unit: 'piece' },
}

const FOOD_ALIAS_MAP: Record<string, string> = {
    chapathi: 'chapati',
    chapatti: 'chapati',
    phulka: 'roti',
    daal: 'dal',
    dahl: 'dal',
    curd: 'curd',
    dahi: 'curd',
    icecream: 'ice cream',
    iream: 'ice cream',
    icream: 'ice cream',
    icreacream: 'ice cream',
    icecrem: 'ice cream',
}

const cleanComparable = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '')

const normalizeFoodNameForVoice = (value: string) => {
    const cleaned = value
        .toLowerCase()
        .replace(/\b(breakfast|lunch|dinner|snack|meal|for|today|now)\b/g, '')
        .replace(/\b(around|about|approx|approximately|nearly|almost|just)\b/g, '')
        .replace(/\b(of|the|a|an)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    if (!cleaned) return cleaned

    const directAlias = FOOD_ALIAS_MAP[cleaned]
    if (directAlias) return directAlias

    const comparable = cleanComparable(cleaned)
    for (const [alias, canonical] of Object.entries(FOOD_ALIAS_MAP)) {
        if (comparable.includes(cleanComparable(alias))) {
            return canonical
        }
    }

    return cleaned
}

const getDefaultNutritionForName = (foodName: string) => {
    const normalized = normalizeFoodNameForVoice(foodName)
    const matchKey = Object.keys(DEFAULT_AI_NUTRITION).find((key) => normalized.includes(key))
    if (!matchKey) return null
    return DEFAULT_AI_NUTRITION[matchKey]
}

const splitCombinedFoodItem = (item: VoiceSuggestionItem): VoiceSuggestionItem[] => {
    const normalized = normalizeFoodNameForVoice(item.food_name)
    const matchedKeys = Object.keys(DEFAULT_AI_NUTRITION)
        .map((key) => ({ key, index: normalized.indexOf(key) }))
        .filter((entry) => entry.index >= 0)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.key)

    const uniqueKeys = Array.from(new Set(matchedKeys))
    if (uniqueKeys.length <= 1) {
        return [item]
    }

    return uniqueKeys.map((key) => {
        const fallback = DEFAULT_AI_NUTRITION[key]
        return {
            food_name: key,
            quantity: item.quantity || 1,
            unit: item.unit || fallback.unit,
            nutrition_per_unit: {
                calories: fallback.calories,
                protein: fallback.protein,
                carbs: fallback.carbs,
                fat: fallback.fat,
            },
        }
    })
}

const ensureNutritionValues = (item: VoiceSuggestionItem) => {
    const current = item.nutrition_per_unit
    const hasValid = !!current && (Number(current.calories || 0) > 0 || Number(current.protein || 0) > 0 || Number(current.carbs || 0) > 0 || Number(current.fat || 0) > 0)
    if (hasValid) {
        return {
            ...item,
            nutrition_per_unit: {
                calories: Number(current?.calories || 0),
                protein: Number(current?.protein || 0),
                carbs: Number(current?.carbs || 0),
                fat: Number(current?.fat || 0),
            },
        }
    }

    const fallback = getDefaultNutritionForName(item.food_name)
    if (!fallback) {
        return {
            ...item,
            nutrition_per_unit: {
                calories: 100,
                protein: 3,
                carbs: 12,
                fat: 4,
            },
        }
    }

    return {
        ...item,
        unit: item.unit || fallback.unit,
        nutrition_per_unit: {
            calories: fallback.calories,
            protein: fallback.protein,
            carbs: fallback.carbs,
            fat: fallback.fat,
        },
    }
}

const refineSuggestionsWithAi = async (ai: GoogleGenAI, transcript: string, suggestions: VoiceSuggestion[]) => {
    const prompt = `Refine this meal suggestion JSON to ensure each item has a clean food_name and non-zero nutrition_per_unit.

Rules:
1. Return JSON only.
2. Keep exactly 3 suggestions.
3. Split combined names like "lunch rice and dal" into separate items.
4. Remove meal words (breakfast/lunch/dinner/snack) from food_name.
5. nutrition_per_unit must always be numeric and > 0 for calories.

Input transcript: ${transcript}

Input suggestions JSON:
${JSON.stringify({ suggestions })}

Output format:
{
  "suggestions": [
    {
      "title": "string",
      "meal_type": "BREAKFAST|LUNCH|DINNER|SNACK",
      "confidence": number,
      "notes": "string",
      "items": [
        {
          "food_name": "string",
          "quantity": number,
          "unit": "piece|katori|plate|bowl|gram|cup|glass|slice",
          "nutrition_per_unit": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
          }
        }
      ]
    }
  ]
}`

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
    })

    const output = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseJsonBlock(output) as { suggestions?: VoiceSuggestion[] }
    return Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : suggestions
}

const mealTypeFromTranscript = (transcript: string): VoiceSuggestion['meal_type'] => {
    const normalized = transcript.toLowerCase()
    if (/(breakfast|subah|morning|nashta|nasta)/.test(normalized)) return 'BREAKFAST'
    if (/(lunch|dopahar|afternoon|dekhna?)/.test(normalized)) return 'LUNCH'
    if (/(dinner|raat|night|shaam|evening)/.test(normalized)) return 'DINNER'
    if (/(snack|snacks|tea|chai|coffee|biscuits|biscuit|fruit|juice)/.test(normalized)) return 'SNACK'
    return 'LUNCH'
}

const quantityWordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    ek: 1,
    do: 2,
    teen: 3,
    char: 4,
    chaar: 4,
    panch: 5,
    paanch: 5,
    aadha: 0.5,
    half: 0.5,
}

const normalizeFoodPhrase = (phrase: string) => {
    return normalizeFoodNameForVoice(
        phrase
            .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|chaar|panch|paanch|aadha|half|\d+(?:\.\d+)?)\b/gi, '')
            .replace(/\b(small|medium|large|tiny|big)\b/gi, '')
            .replace(/\b(around|about|approx|approximately|roughly|near)\b/gi, '')
            .replace(/\b(ml|milliliter|milliliters|gram|grams|g|piece|pieces|katori|bowl|plate|cup|glass|slice|slices|serving|servings|scoop|scoops)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
    )
}

const roundTo = (value: number, digits: number) => {
    const factor = 10 ** digits
    return Math.round(value * factor) / factor
}

const detectMlQuantity = (phrase: string) => {
    const match = phrase.match(/\b(\d+(?:\.\d+)?)\s*(ml|milliliter|milliliters)\b/i)
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const isDrinkLikePhrase = (phrase: string) => {
    return /(milk|chai|tea|coffee|juice|lassi|water|pani|paani|shikanji|smoothie|shake)/i.test(phrase)
}

const detectQuantity = (phrase: string) => {
    const quantityMatch = phrase.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|chaar|panch|paanch|aadha|half|\d+(?:\.\d+)?)\b/i)
    if (!quantityMatch) return 1

    const token = quantityMatch[1].toLowerCase()
    if (quantityWordMap[token] !== undefined) {
        return quantityWordMap[token]
    }

    const numericValue = Number(token)
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

const detectUnit = (phrase: string) => {
    const normalized = phrase.toLowerCase()
    if (/(ml|milliliter|milliliters)/.test(normalized)) return 'katori'
    if (/(scoop|scoops)/.test(normalized)) return 'piece'
    if (/(katori|bowl|cup|glass|glassful)/.test(normalized)) return 'katori'
    if (/(plate|thali|platter|chaat)/.test(normalized)) return 'plate'
    if (/(gram|grams|g\b)/.test(normalized)) return 'gram'
    if (/(milk|chai|tea|coffee|juice|lassi|water|pani|paani|nimbu pani|shikanji|coconut water)/.test(normalized)) return 'glass'
    if (/(slice|slices)/.test(normalized)) return 'slice'
    return 'piece'
}

const inferFoodItems = (transcript: string, katoriSize: number): VoiceSuggestionItem[] => {
    const chunks = transcript
        .split(/(?:,| and | aur | with | plus | then | फिर | साथ)/i)
        .map((part) => part.trim())
        .filter(Boolean)

    const items = chunks.map((chunk) => {
        const mlQuantity = detectMlQuantity(chunk)
        const inferredUnit = detectUnit(chunk)
        const quantity = mlQuantity
            ? isDrinkLikePhrase(chunk)
                ? roundTo(Math.max(mlQuantity / 250, 0.25), 2)
                : roundTo(Math.max(mlQuantity / katoriSize, 0.25), 2)
            : detectQuantity(chunk)

        const unit = mlQuantity
            ? isDrinkLikePhrase(chunk)
                ? 'glass'
                : 'katori'
            : inferredUnit

        const food_name = normalizeFoodPhrase(chunk) || chunk.trim()

        return {
            food_name,
            quantity,
            unit,
        }
    })

    return items.length ? items.slice(0, 5) : [{ food_name: normalizeFoodNameForVoice(transcript), quantity: 1, unit: 'piece' }]
}

const buildFallbackSuggestions = (transcript: string, dietaryPreference: string, katoriSize: number): VoiceSuggestion[] => {
    const meal_type = mealTypeFromTranscript(transcript)
    const items = inferFoodItems(transcript, katoriSize)

    const notesByMeal: Record<VoiceSuggestion['meal_type'], string> = {
        BREAKFAST: 'Fallback interpretation based on a breakfast-style transcript.',
        LUNCH: 'Fallback interpretation based on a lunch-style transcript.',
        DINNER: 'Fallback interpretation based on a dinner-style transcript.',
        SNACK: 'Fallback interpretation based on a snack-style transcript.',
    }

    const confidenceOffsets = [0.88, 0.78, 0.68]

    return confidenceOffsets.map((confidence, index) => ({
        title: index === 0 ? 'Best match' : index === 1 ? 'Alternate match' : 'Loose match',
        meal_type,
        confidence: dietaryPreference === 'VEG' ? confidence : confidence - index * 0.02,
        notes: notesByMeal[meal_type],
        items,
    }))
}

const buildPrompt = (params: {
    transcript: string
    katoriSize: number
    rotiThickness: string
    dietaryPreference: string
    defaultMealTypes: string[]
}) => {
    const allowedMealTypes = params.defaultMealTypes.length ? params.defaultMealTypes.join(', ') : 'BREAKFAST, LUNCH, DINNER, SNACK'

    return `You are a senior Indian meal parsing and nutrition assistant for a React Native meal logging app.

Convert this spoken Hinglish transcript into 3 selectable meal-log suggestions.

USER PROFILE:
- Katori size: ${params.katoriSize}ml
- Roti thickness preference: ${params.rotiThickness}
- Dietary preference: ${params.dietaryPreference}
- Allowed meal types: ${allowedMealTypes}

RULES:
1. Return ONLY valid JSON.
2. Do not include explanations or markdown.
3. Generate exactly 3 suggestions.
4. Each suggestion must include a title, meal_type, confidence, notes, and items.
5. Keep food names lowercase and singular.
6. Convert Hinglish numbers to numeric values.
7. If dietary preference is VEG, do not include non-veg items.
8. If transcript is ambiguous, make the 3 suggestions slightly different so the user can choose the best one.
9. If transcript is clearly one meal, still return 3 variants that differ only in confidence or minor interpretation, but keep them realistic.
10. Do not invent ingredients not implied by the transcript.
11. Never output size words as item names. Invalid item names include: "small", "medium", "large", "2 small", "around 100ml".
12. Extract quantity and unit from phrases like "2 small roti", "around 100ml dal", "1 scoop ice cream".
13. Keep food_name as only the edible item, for example: roti, dal, ice cream.
14. nutrition_per_unit must be realistic and conservative for Indian home food. Do not fabricate extreme values.
15. For uncertain nutrition, choose a reasonable default near common Indian nutrition references.

EXAMPLE INPUT:
"2 small roti, around 100ml dal, 1 scoop of icecream"

EXAMPLE ITEM EXTRACTION:
- { food_name: "roti", quantity: 2, unit: "piece" }
- { food_name: "dal", quantity: 0.5, unit: "katori" }  // assuming katori ~200ml
- { food_name: "ice cream", quantity: 1, unit: "piece" }

JSON FORMAT:
{
  "transcript": "string",
  "suggestions": [
  {
    "title": "string",
    "meal_type": "BREAKFAST|LUNCH|DINNER|SNACK",
    "confidence": number,
    "notes": "string",
    "items": [
    {
      "food_name": "string",
      "quantity": number,
      "unit": "piece|katori|plate|bowl|gram|cup|glass|slice",
    "nutrition_per_unit": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
    },
      "modifiers": {
      "type": "string or null",
      "size": "small|medium|large or null",
      "thickness": "thin|medium|thick or null"
      }
    }
    ]
  }
  ]
}

TRANSCRIPT:
${params.transcript}`
}

const isGarbageFoodName = (value: string) => {
    const normalized = normalizeFoodNameForVoice(value)
    if (!normalized || !/[a-z]/.test(normalized)) return true
    if (/^(small|medium|large|tiny|big|around|about|approx|approximately|\d+(?:\.\d+)?)$/.test(normalized)) return true
    return false
}

const hasValidNutritionNumbers = (item: VoiceSuggestionItem) => {
    const nutrition = item.nutrition_per_unit
    if (!nutrition) return false
    return Number(nutrition.calories || 0) > 0 || Number(nutrition.protein || 0) > 0 || Number(nutrition.carbs || 0) > 0 || Number(nutrition.fat || 0) > 0
}

const buildFoodLookupQueries = (foodName: string) => {
    const normalized = normalizeFoodNameForVoice(foodName)
    if (!normalized) return []

    const terms = normalized
        .split(' ')
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)

    return Array.from(new Set([normalized, ...terms]))
}

const getFoodNutritionFromDatabase = async (
    foodName: string,
    cache: Map<string, VoiceSuggestionItem['nutrition_per_unit'] & { unit?: string } | null>
) => {
    const normalized = normalizeFoodNameForVoice(foodName)
    if (!normalized) return null
    if (cache.has(normalized)) return cache.get(normalized) || null

    const queries = buildFoodLookupQueries(normalized)
    let found: {
        calories_per_unit: number
        protein_per_unit: number
        carbs_per_unit: number
        fat_per_unit: number
        default_unit: string
    } | null = null

    for (const query of queries) {
        const result = await prisma.foodDatabase.findFirst({
            where: {
                OR: [
                    { food_name: { equals: query, mode: 'insensitive' } },
                    { food_name: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                calories_per_unit: true,
                protein_per_unit: true,
                carbs_per_unit: true,
                fat_per_unit: true,
                default_unit: true,
            },
        })

        if (result) {
            found = result
            break
        }
    }

    if (!found) {
        cache.set(normalized, null)
        return null
    }

    const mapped = {
        calories: Number(found.calories_per_unit || 0),
        protein: Number(found.protein_per_unit || 0),
        carbs: Number(found.carbs_per_unit || 0),
        fat: Number(found.fat_per_unit || 0),
        unit: found.default_unit || undefined,
    }

    cache.set(normalized, mapped)
    return mapped
}

const sanitizeAndEnrichItem = async (
    item: VoiceSuggestionItem,
    transcript: string,
    katoriSize: number,
    nutritionCache: Map<string, VoiceSuggestionItem['nutrition_per_unit'] & { unit?: string } | null>
) => {
    let cleanedItem: VoiceSuggestionItem = {
        ...item,
        food_name: normalizeFoodNameForVoice(item.food_name),
    }

    if (isGarbageFoodName(cleanedItem.food_name)) {
        const inferred = inferFoodItems(transcript, katoriSize).find((candidate) => !isGarbageFoodName(candidate.food_name))
        if (inferred) {
            cleanedItem = {
                ...cleanedItem,
                food_name: inferred.food_name,
                quantity: cleanedItem.quantity || inferred.quantity,
                unit: cleanedItem.unit || inferred.unit,
            }
        }
    }

    if (!Number.isFinite(cleanedItem.quantity) || cleanedItem.quantity <= 0) {
        cleanedItem.quantity = 1
    }

    const dbNutrition = await getFoodNutritionFromDatabase(cleanedItem.food_name, nutritionCache)
    if (dbNutrition) {
        cleanedItem = {
            ...cleanedItem,
            unit: cleanedItem.unit || dbNutrition.unit || 'piece',
            nutrition_per_unit: {
                calories: dbNutrition.calories,
                protein: dbNutrition.protein,
                carbs: dbNutrition.carbs,
                fat: dbNutrition.fat,
            },
        }
    }

    if (!hasValidNutritionNumbers(cleanedItem)) {
        cleanedItem = ensureNutritionValues(cleanedItem)
    }

    return cleanedItem
}

export const voiceTranscriptionForLogMeals = async (req: Request, res: Response) => {
    try {
        const payload = req.body as VoiceDraftPayload
        const transcript = String(payload.transcript || payload.audioData || '').trim()
        const userId = req.userId

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required.' })
        }

        const userPrefs = await prisma.userPreference.findUnique({
            where: { user_id: userId },
            select: {
                katori_size_ml: true,
                roti_thickness: true,
                default_meal_types: true,
                dietary_preference: true,
            },
        })

        const katoriSize = userPrefs?.katori_size_ml || 200
        const rotiThickness = userPrefs?.roti_thickness || 'medium'
        const dietaryPreference = userPrefs?.dietary_preference || 'NON_VEG'
        const defaultMealTypes = userPrefs?.default_meal_types || ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

        let parsedTranscript = transcript
        let suggestions: VoiceSuggestion[] = []

        try {
            const ai = getGeminiClient()
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: buildPrompt({
                    transcript,
                    katoriSize,
                    rotiThickness,
                    dietaryPreference,
                    defaultMealTypes,
                }),
            })

            const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (!aiResponse.trim()) {
                throw new Error('AI returned an empty response.')
            }

            const parsedResponse = parseJsonBlock(aiResponse) as {
                transcript?: string
                suggestions?: VoiceSuggestion[]
            }

            suggestions = Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions.slice(0, 3) : []
            parsedTranscript = parsedResponse.transcript || transcript
        } catch (generationError) {
            console.warn('Voice AI generation failed, using fallback suggestions:', generationError)
            suggestions = buildFallbackSuggestions(transcript, dietaryPreference, katoriSize)
        }

        if (!suggestions.length) {
            suggestions = buildFallbackSuggestions(transcript, dietaryPreference, katoriSize)
        }

        try {
            const ai = getGeminiClient()
            suggestions = await refineSuggestionsWithAi(ai, transcript, suggestions)
        } catch (refineError) {
            console.warn('Voice AI refinement failed, keeping generated suggestions:', refineError)
        }

        const nutritionCache = new Map<string, VoiceSuggestionItem['nutrition_per_unit'] & { unit?: string } | null>()

        suggestions = await Promise.all(
            suggestions.map(async (suggestion) => {
                const expandedItems = suggestion.items.flatMap((item) => splitCombinedFoodItem(item))

                const cleanedItems = await Promise.all(
                    expandedItems.map((item) => sanitizeAndEnrichItem(item, transcript, katoriSize, nutritionCache))
                )

                const validItems = cleanedItems.filter((item) => !isGarbageFoodName(item.food_name))
                const fallbackItems = inferFoodItems(transcript, katoriSize)

                return {
                    ...suggestion,
                    items: validItems.length ? validItems : fallbackItems,
                }
            })
        )

        let voiceDraftId: string | null = null
        try {
            const voiceDraft = await prisma.voiceLogRaw.create({
                data: {
                    user_id: userId,
                    raw_transcript: transcript,
                    parsed_json: {
                        transcript: parsedTranscript,
                        suggestions,
                    },
                    success: true,
                    confidence_score: Number(Math.max(...suggestions.map((item) => Number(item.confidence || 0)), 0).toFixed(2)),
                },
            })
            voiceDraftId = voiceDraft.id
        } catch (persistError) {
            console.error('Voice draft persistence failed:', persistError)
        }

        return res.json({
            success: true,
            data: {
                voice_log_raw_id: voiceDraftId,
                transcript: parsedTranscript,
                suggestions,
            },
        })
    } catch (error) {
        console.error('Voice suggestion generation error:', error)

        const message = error instanceof Error ? error.message : 'Something went wrong.'
        if (message.includes('GEMINI_API_KEY is not configured')) {
            return res.status(500).json({ error: 'Voice AI is not configured on the server.' })
        }

        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const confirmVoiceTranscriptionSuggestion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' })
        }

        const payload = req.body as VoiceSelectionPayload
        const voiceLogRawId = String(payload.voice_log_raw_id || '').trim()
        const selectedIndex = Number(payload.selected_index)

        if (!voiceLogRawId) {
            return res.status(400).json({ error: 'voice_log_raw_id is required.' })
        }

        if (Number.isNaN(selectedIndex) || selectedIndex < 0) {
            return res.status(400).json({ error: 'selected_index is required.' })
        }

        const draft = await prisma.voiceLogRaw.findFirst({
            where: { id: voiceLogRawId, user_id: userId },
        })

        if (!draft) {
            return res.status(404).json({ error: 'Voice log draft not found.' })
        }

        const parsed = (draft.parsed_json as { suggestions?: VoiceSuggestion[] } | null) || null
        const selectedSuggestion = parsed?.suggestions?.[selectedIndex]

        if (!selectedSuggestion) {
            return res.status(400).json({ error: 'Selected suggestion not found.' })
        }

        await prisma.voiceLogRaw.update({
            where: { id: draft.id },
            data: {
                corrected_by_user: true,
                parsed_json: {
                    ...parsed,
                    selected_index: selectedIndex,
                    selected_suggestion: selectedSuggestion,
                },
            },
        })

        return res.json({
            success: true,
            data: {
                voice_log_raw_id: draft.id,
                selected_index: selectedIndex,
                selected_suggestion: selectedSuggestion,
            },
        })
    } catch (error) {
        console.error('Voice suggestion confirmation error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}


