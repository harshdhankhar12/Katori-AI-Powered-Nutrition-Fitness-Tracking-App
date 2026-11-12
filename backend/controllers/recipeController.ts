import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { MealType, Prisma, RecipeDifficulty, RecipeGoalMode } from '@prisma/client'
import { Request, Response } from 'express'
import { prisma } from '../server'

dotenv.config()

type MorphPayload = {
    goalMode?: 'WEIGHT_LOSS' | 'LEAN' | 'BULK'
    portionMultiplier?: number
    persist?: boolean
}

type FridgeUpsertPayload = {
    ingredient_name?: string
    quantity?: number
    unit?: string
    expires_at?: string
    food_id?: string
}

type GenerateFromFridgePayload = {
    ingredients?: string[]
    mealType?: MealType
}

type GenerateCustomRecipePayload = {
    title?: string
    meal_type?: MealType
    dietary_preference?: 'VEG' | 'NON_VEG'
    servings?: number
    cuisine_style?: string
    ingredients_input?: string
    cooking_goal?: string
    cooking_style?: string
    max_cook_time_mins?: number
    photos?: Array<{
        mime_type?: string
        data_base64?: string
    }>
}

type LogRecipePayload = {
    mealType?: MealType
    servings?: number
    loggedAt?: string
}

type SaveRecipePayload = {
    favorite?: boolean
}

const QUICK_NUTRITION: Record<string, { calories: number; protein: number; carbs: number; fat: number; unit: string }> = {
    roti: { calories: 120, protein: 3, carbs: 18, fat: 3, unit: 'piece' },
    chapati: { calories: 120, protein: 3, carbs: 18, fat: 3, unit: 'piece' },
    rice: { calories: 180, protein: 4, carbs: 38, fat: 1, unit: 'katori' },
    dal: { calories: 140, protein: 8, carbs: 18, fat: 3, unit: 'katori' },
    paneer: { calories: 130, protein: 8, carbs: 3, fat: 9, unit: 'piece' },
    curd: { calories: 90, protein: 4, carbs: 7, fat: 5, unit: 'katori' },
    yogurt: { calories: 90, protein: 4, carbs: 7, fat: 5, unit: 'katori' },
    chicken: { calories: 165, protein: 31, carbs: 0, fat: 4, unit: 'piece' },
    egg: { calories: 78, protein: 6, carbs: 1, fat: 5, unit: 'piece' },
    oats: { calories: 150, protein: 5, carbs: 27, fat: 3, unit: 'bowl' },
    milk: { calories: 90, protein: 3.4, carbs: 5, fat: 5, unit: 'glass' },
    oil: { calories: 120, protein: 0, carbs: 0, fat: 14, unit: 'tbsp' },
    ghee: { calories: 112, protein: 0, carbs: 0, fat: 12.7, unit: 'tbsp' },
    potato: { calories: 110, protein: 3, carbs: 26, fat: 0, unit: 'piece' },
    onion: { calories: 40, protein: 1, carbs: 9, fat: 0.1, unit: 'piece' },
    tomato: { calories: 22, protein: 1, carbs: 4.8, fat: 0.2, unit: 'piece' },
}

const NON_VEG_KEYWORDS = [
    'chicken',
    'mutton',
    'fish',
    'prawn',
    'egg',
    'meat',
    'beef',
    'pork',
    'bacon',
    'ham',
    'tuna',
    'salmon',
    'crab',
    'shrimp',
]

const normalize = (value: string) => value.trim().toLowerCase()

const startOfDay = (date: Date) => {
    const day = new Date(date)
    day.setHours(0, 0, 0, 0)
    return day
}

const endOfDay = (date: Date) => {
    const day = new Date(date)
    day.setHours(23, 59, 59, 999)
    return day
}

const parseMealType = (value?: string): MealType => {
    const normalized = String(value || '').toUpperCase()
    if (normalized === 'BREAKFAST' || normalized === 'LUNCH' || normalized === 'DINNER' || normalized === 'SNACK') {
        return normalized as MealType
    }
    return 'LUNCH'
}

const parseDifficulty = (value?: string): RecipeDifficulty => {
    const normalized = String(value || '').toUpperCase()
    if (normalized === 'EASY' || normalized === 'MEDIUM' || normalized === 'HARD') {
        return normalized as RecipeDifficulty
    }
    return 'MEDIUM'
}

const parseGoalMode = (value?: string): RecipeGoalMode => {
    const normalized = String(value || '').toUpperCase()
    if (normalized === 'WEIGHT_LOSS' || normalized === 'LEAN' || normalized === 'BULK') {
        return normalized as RecipeGoalMode
    }
    return 'LEAN'
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

const isNonVegName = (foodName: string) => {
    const name = normalize(foodName)
    return NON_VEG_KEYWORDS.some((keyword) => name.includes(keyword))
}

const findQuickNutrition = (name: string) => {
    const normalized = normalize(name)
    const key = Object.keys(QUICK_NUTRITION).find((entry) => normalized.includes(entry))
    return key ? QUICK_NUTRITION[key] : null
}

const resolveIngredientNutrition = async (ingredientName: string) => {
    const normalized = normalize(ingredientName)
    const food = await prisma.foodDatabase.findFirst({
        where: {
            OR: [
                { food_name: { equals: normalized, mode: 'insensitive' } },
                { food_name: { contains: normalized, mode: 'insensitive' } },
            ],
        },
    })

    if (food) {
        return {
            foodId: food.id,
            name: food.food_name,
            unit: food.default_unit || 'piece',
            calories: Number(food.calories_per_unit || 0),
            protein: Number(food.protein_per_unit || 0),
            carbs: Number(food.carbs_per_unit || 0),
            fat: Number(food.fat_per_unit || 0),
            isVeg: !isNonVegName(food.food_name) && !isNonVegName(food.category || ''),
        }
    }

    const fallback = findQuickNutrition(normalized)
    if (fallback) {
        return {
            foodId: null,
            name: normalized,
            unit: fallback.unit,
            calories: fallback.calories,
            protein: fallback.protein,
            carbs: fallback.carbs,
            fat: fallback.fat,
            isVeg: !isNonVegName(normalized),
        }
    }

    return {
        foodId: null,
        name: normalized,
        unit: 'piece',
        calories: 100,
        protein: 4,
        carbs: 12,
        fat: 4,
        isVeg: !isNonVegName(normalized),
    }
}

const resolveRecipeTotals = (
    ingredients: Array<{ quantity: number; calories: number; protein: number; carbs: number; fat: number }>,
    servings: number,
) => {
    const safeServings = Math.max(servings || 1, 1)
    const total = ingredients.reduce(
        (acc, item) => {
            acc.calories += item.calories * item.quantity
            acc.protein += item.protein * item.quantity
            acc.carbs += item.carbs * item.quantity
            acc.fat += item.fat * item.quantity
            return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    return {
        servings: safeServings,
        calories: Number((total.calories / safeServings).toFixed(2)),
        protein: Number((total.protein / safeServings).toFixed(2)),
        carbs: Number((total.carbs / safeServings).toFixed(2)),
        fat: Number((total.fat / safeServings).toFixed(2)),
    }
}

const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

const recalculateDailySummary = async (db: Prisma.TransactionClient, userId: string, date: Date) => {
    const summaryDate = startOfDay(date)

    const [profile, totals] = await Promise.all([
        db.profile.findUnique({ where: { user_id: userId } }),
        db.foodLog.aggregate({
            where: {
                user_id: userId,
                logged_at: {
                    gte: startOfDay(date),
                    lte: endOfDay(date),
                },
            },
            _sum: {
                total_calories: true,
                total_protein: true,
                total_carbs: true,
                total_fat: true,
            },
        }),
    ])

    const totalCalories = Number((totals._sum.total_calories || 0).toFixed(2))
    const totalProtein = Number((totals._sum.total_protein || 0).toFixed(2))
    const totalCarbs = Number((totals._sum.total_carbs || 0).toFixed(2))
    const totalFat = Number((totals._sum.total_fat || 0).toFixed(2))
    const targetCalories = profile?.daily_calorie_target || 0
    const targetProtein = profile?.daily_protein_target || 0

    await db.dailySummary.upsert({
        where: {
            user_id_summary_date: {
                user_id: userId,
                summary_date: summaryDate,
            },
        },
        create: {
            user_id: userId,
            summary_date: summaryDate,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            remaining_calories: Number(Math.max(targetCalories - totalCalories, 0).toFixed(2)),
            remaining_protein: Number(Math.max(targetProtein - totalProtein, 0).toFixed(2)),
        },
        update: {
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            remaining_calories: Number(Math.max(targetCalories - totalCalories, 0).toFixed(2)),
            remaining_protein: Number(Math.max(targetProtein - totalProtein, 0).toFixed(2)),
        },
    })
}

const syncStreakForDate = async (db: Prisma.TransactionClient, userId: string, date: Date) => {
    const streakDate = startOfDay(date)
    const count = await db.foodLog.count({
        where: {
            user_id: userId,
            logged_at: {
                gte: startOfDay(date),
                lte: endOfDay(date),
            },
        },
    })

    if (count > 0) {
        await db.userStreak.upsert({
            where: {
                user_id_streak_date: {
                    user_id: userId,
                    streak_date: streakDate,
                },
            },
            create: {
                user_id: userId,
                streak_date: streakDate,
            },
            update: {},
        })
    } else {
        await db.userStreak.deleteMany({
            where: {
                user_id: userId,
                streak_date: streakDate,
            },
        })
    }
}

const getTagType = (name: string) => {
    const value = normalize(name)
    if (/(chicken|egg|paneer|tofu|fish|dal|chana|rajma|sprout)/.test(value)) return 'protein'
    if (/(rice|roti|chapati|bread|oats|potato|poha|upma|pasta)/.test(value)) return 'carb'
    if (/(oil|ghee|butter|cream|cheese|mayo|nuts|seed)/.test(value)) return 'fat'
    return 'base'
}

const getModeMultiplier = (mode: RecipeGoalMode, kind: string) => {
    if (mode === 'WEIGHT_LOSS') {
        if (kind === 'protein') return 0.95
        if (kind === 'carb') return 0.72
        if (kind === 'fat') return 0.58
        return 0.85
    }

    if (mode === 'LEAN') {
        if (kind === 'protein') return 1.18
        if (kind === 'carb') return 0.9
        if (kind === 'fat') return 0.75
        return 1
    }

    if (kind === 'protein') return 1.25
    if (kind === 'carb') return 1.3
    if (kind === 'fat') return 1.12
    return 1.1
}

const findSubstitution = (mode: RecipeGoalMode, ingredientName: string) => {
    const value = normalize(ingredientName)

    if (mode === 'WEIGHT_LOSS') {
        if (/(cream|malai)/.test(value)) return 'replace cream with yogurt'
        if (/(oil|ghee|butter)/.test(value)) return 'reduce oil by 50%'
        if (/(rice)/.test(value)) return 'use smaller rice portion'
    }

    if (mode === 'LEAN') {
        if (/(oil|ghee|butter)/.test(value)) return 'reduce added fats'
        if (/(paneer)/.test(value)) return 'use low-fat paneer'
        if (/(rice)/.test(value)) return 'balance with extra dal'
    }

    if (mode === 'BULK') {
        if (/(dal|chicken|paneer|egg)/.test(value)) return 'increase protein portion'
        if (/(rice|roti|oats)/.test(value)) return 'add extra carb serving'
        if (/(milk|curd)/.test(value)) return 'add dairy side for calories'
    }

    return 'adjusted portion'
}

const ensureSystemRecipes = async () => {
    const existing = await prisma.recipe.count({ where: { user_id: null } })
    if (existing > 0) return

    const seed = [
        {
            name: 'paneer bhurji with roti',
            description: 'Quick high-protein Indian meal with paneer, onion, tomato and roti.',
            meal_type: 'DINNER' as MealType,
            difficulty: 'EASY' as RecipeDifficulty,
            cook_time_mins: 25,
            tags: ['high-protein', 'indian', 'veg'],
            servings: 1,
            ingredients: [
                { ingredient_name: 'paneer', quantity: 1, unit: 'piece' },
                { ingredient_name: 'roti', quantity: 2, unit: 'piece' },
                { ingredient_name: 'onion', quantity: 1, unit: 'piece' },
                { ingredient_name: 'tomato', quantity: 1, unit: 'piece' },
                { ingredient_name: 'oil', quantity: 0.5, unit: 'tbsp' },
            ],
            instructions: [
                'Heat oil in a pan and saute onion until soft.',
                'Add tomato and cook until mushy.',
                'Crumble paneer, season and cook for 4-5 minutes.',
                'Serve hot with roti.',
            ],
        },
        {
            name: 'dal chawal comfort bowl',
            description: 'Classic dal and rice bowl for balanced lunch.',
            meal_type: 'LUNCH' as MealType,
            difficulty: 'EASY' as RecipeDifficulty,
            cook_time_mins: 30,
            tags: ['balanced', 'indian', 'veg'],
            servings: 1,
            ingredients: [
                { ingredient_name: 'dal', quantity: 1, unit: 'katori' },
                { ingredient_name: 'rice', quantity: 1, unit: 'katori' },
                { ingredient_name: 'ghee', quantity: 0.25, unit: 'tbsp' },
            ],
            instructions: [
                'Cook dal until soft and season with spices.',
                'Cook rice separately until fluffy.',
                'Serve dal over rice and drizzle a little ghee.',
            ],
        },
        {
            name: 'oats veggie breakfast bowl',
            description: 'Fiber rich oats bowl with quick vegetables and curd side.',
            meal_type: 'BREAKFAST' as MealType,
            difficulty: 'EASY' as RecipeDifficulty,
            cook_time_mins: 20,
            tags: ['low-carb', 'high-fiber', 'veg'],
            servings: 1,
            ingredients: [
                { ingredient_name: 'oats', quantity: 1, unit: 'bowl' },
                { ingredient_name: 'onion', quantity: 0.5, unit: 'piece' },
                { ingredient_name: 'tomato', quantity: 0.5, unit: 'piece' },
                { ingredient_name: 'curd', quantity: 0.5, unit: 'katori' },
            ],
            instructions: [
                'Dry roast oats for 1 minute.',
                'Cook vegetables lightly and add oats with water.',
                'Simmer until creamy and serve with curd.',
            ],
        },
    ]

    for (const item of seed) {
        const resolvedIngredients = await Promise.all(
            item.ingredients.map(async (ingredient, index) => {
                const nutrition = await resolveIngredientNutrition(ingredient.ingredient_name)
                return {
                    food_id: nutrition.foodId,
                    ingredient_name: nutrition.name,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit || nutrition.unit,
                    calories: nutrition.calories,
                    protein: nutrition.protein,
                    carbs: nutrition.carbs,
                    fat: nutrition.fat,
                    order_index: index,
                    isVeg: nutrition.isVeg,
                }
            })
        )

        const totals = resolveRecipeTotals(
            resolvedIngredients.map((entry) => ({
                quantity: entry.quantity,
                calories: entry.calories,
                protein: entry.protein,
                carbs: entry.carbs,
                fat: entry.fat,
            })),
            item.servings,
        )

        const isVeg = resolvedIngredients.every((entry) => entry.isVeg)

        await prisma.recipe.create({
            data: {
                name: item.name,
                description: item.description,
                image_url: null,
                meal_type: item.meal_type,
                difficulty: item.difficulty,
                cook_time_mins: item.cook_time_mins,
                is_veg: isVeg,
                tags: item.tags,
                popularity_score: 8,
                ingredients: {
                    create: resolvedIngredients.map((entry) => ({
                        food_id: entry.food_id,
                        ingredient_name: entry.ingredient_name,
                        quantity: entry.quantity,
                        unit: entry.unit,
                        calories: entry.calories,
                        protein: entry.protein,
                        carbs: entry.carbs,
                        fat: entry.fat,
                        order_index: entry.order_index,
                    })),
                },
                instructions: {
                    create: item.instructions.map((instruction, index) => ({
                        step_number: index + 1,
                        instruction,
                    })),
                },
                nutrition: {
                    create: totals,
                },
            },
        })
    }
}

const getRecommendationFromAi = async (input: {
    userHistory: string[]
    remainingCalories: number
    remainingProtein: number
    recipes: Array<{ id: string; name: string; calories: number; protein: number }>
}) => {
    const client = getGeminiClient()
    if (!client) return null

    try {
        const prompt = `Return JSON only with keys suggested_ids and reasoning.\nUser history foods: ${input.userHistory.join(', ')}\nRemaining calories: ${input.remainingCalories}\nRemaining protein: ${input.remainingProtein}\nCandidate recipes: ${JSON.stringify(input.recipes)}\nPick up to 3 recipe ids that best fit.`

        const response = await client.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
        })

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const parsed = parseJsonBlock(text) as { suggested_ids?: string[]; reasoning?: string }
        return {
            suggestedIds: Array.isArray(parsed.suggested_ids) ? parsed.suggested_ids.slice(0, 3) : [],
            reasoning: parsed.reasoning || '',
        }
    } catch {
        return null
    }
}

const serializeRecipeCard = (recipe: any) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    image_url: recipe.image_url,
    meal_type: recipe.meal_type,
    difficulty: recipe.difficulty,
    cook_time_mins: recipe.cook_time_mins,
    is_veg: recipe.is_veg,
    tags: recipe.tags,
    nutrition: recipe.nutrition
        ? {
            calories: Number(recipe.nutrition.calories || 0),
            protein: Number(recipe.nutrition.protein || 0),
            carbs: Number(recipe.nutrition.carbs || 0),
            fat: Number(recipe.nutrition.fat || 0),
            servings: Number(recipe.nutrition.servings || 1),
        }
        : { calories: 0, protein: 0, carbs: 0, fat: 0, servings: 1 },
})

export const getRecipeHome = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        await ensureSystemRecipes()

        const query = String(req.query.query || '').trim()
        const mealType = String(req.query.mealType || '').toUpperCase()
        const tag = String(req.query.tag || '').trim().toLowerCase()

        const pref = await prisma.userPreference.findUnique({ where: { user_id: userId } })
        const vegOnly = pref?.dietary_preference === 'VEG'

        const baseWhere: Prisma.RecipeWhereInput = {
            OR: [{ user_id: null }, { user_id: userId }],
            ...(vegOnly ? { is_veg: true } : {}),
            ...(mealType === 'BREAKFAST' || mealType === 'LUNCH' || mealType === 'DINNER' || mealType === 'SNACK'
                ? { meal_type: mealType as MealType }
                : {}),
            ...(tag ? { tags: { has: tag } } : {}),
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                        { ingredients: { some: { ingredient_name: { contains: query, mode: 'insensitive' } } } },
                    ],
                }
                : {}),
        }

        const recipes = await prisma.recipe.findMany({
            where: baseWhere,
            include: {
                nutrition: true,
                ingredients: {
                    select: {
                        ingredient_name: true,
                    },
                    orderBy: { order_index: 'asc' },
                    take: 8,
                },
            },
            orderBy: [{ popularity_score: 'desc' }, { created_at: 'desc' }],
            take: 40,
        })

        const today = startOfDay(new Date())
        const [summary, profile, recentLogs] = await Promise.all([
            prisma.dailySummary.findUnique({
                where: {
                    user_id_summary_date: {
                        user_id: userId,
                        summary_date: today,
                    },
                },
            }),
            prisma.profile.findUnique({ where: { user_id: userId } }),
            prisma.mealItem.findMany({
                where: {
                    food_log: {
                        user_id: userId,
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 10,
                select: { food_name: true },
            }),
        ])

        const remainingCalories = Math.max(Number(summary?.remaining_calories ?? profile?.daily_calorie_target ?? 0), 0)
        const remainingProtein = Math.max(Number(summary?.remaining_protein ?? profile?.daily_protein_target ?? 0), 0)
        const cards = recipes.map(serializeRecipeCard)

        const aiRecommendation = await getRecommendationFromAi({
            userHistory: recentLogs.map((item) => item.food_name),
            remainingCalories,
            remainingProtein,
            recipes: cards.map((item) => ({ id: item.id, name: item.name, calories: item.nutrition.calories, protein: item.nutrition.protein })),
        })

        const forYou = aiRecommendation?.suggestedIds?.length
            ? cards.filter((item) => aiRecommendation.suggestedIds.includes(item.id)).slice(0, 5)
            : [...cards]
                .sort((a, b) => {
                    const scoreA = Math.abs(a.nutrition.calories - remainingCalories) + Math.abs(a.nutrition.protein - remainingProtein) * 10
                    const scoreB = Math.abs(b.nutrition.calories - remainingCalories) + Math.abs(b.nutrition.protein - remainingProtein) * 10
                    return scoreA - scoreB
                })
                .slice(0, 5)

        const popular = cards.slice(0, 8)

        return res.json({
            success: true,
            data: {
                recipes: cards,
                for_you: forYou,
                for_you_reasoning: aiRecommendation?.reasoning || 'Matched your recent foods and remaining macros.',
                popular_this_week: popular,
                remaining: {
                    calories: Math.round(remainingCalories),
                    protein: Math.round(remainingProtein),
                },
            },
        })
    } catch (error) {
        console.error('Get recipe home error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const getRecipeDetail = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const recipeId = String(req.params.id || '').trim()
        if (!recipeId) return res.status(400).json({ error: 'Recipe id is required.' })

        const recipe = await prisma.recipe.findFirst({
            where: {
                id: recipeId,
                OR: [{ user_id: null }, { user_id: userId }],
            },
            include: {
                nutrition: true,
                ingredients: {
                    orderBy: { order_index: 'asc' },
                },
                instructions: {
                    orderBy: { step_number: 'asc' },
                },
            },
        })

        if (!recipe) return res.status(404).json({ error: 'Recipe not found.' })

        const saved = await prisma.userSavedRecipe.findUnique({
            where: {
                user_id_recipe_id: {
                    user_id: userId,
                    recipe_id: recipe.id,
                },
            },
        })

        return res.json({
            success: true,
            data: {
                ...serializeRecipeCard(recipe),
                ingredients: recipe.ingredients.map((item) => ({
                    id: item.id,
                    food_id: item.food_id,
                    ingredient_name: item.ingredient_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    nutrition: {
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                    },
                })),
                instructions: recipe.instructions.map((item) => ({
                    id: item.id,
                    step_number: item.step_number,
                    instruction: item.instruction,
                })),
                is_favorite: Boolean(saved?.is_favorite),
            },
        })
    } catch (error) {
        console.error('Get recipe detail error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const saveRecipe = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const recipeId = String(req.params.id || '').trim()
        if (!recipeId) return res.status(400).json({ error: 'Recipe id is required.' })

        const payload = req.body as SaveRecipePayload
        const favorite = payload.favorite !== false

        const recipe = await prisma.recipe.findFirst({
            where: {
                id: recipeId,
                OR: [{ user_id: null }, { user_id: userId }],
            },
        })

        if (!recipe) return res.status(404).json({ error: 'Recipe not found.' })

        await prisma.userSavedRecipe.upsert({
            where: {
                user_id_recipe_id: {
                    user_id: userId,
                    recipe_id: recipeId,
                },
            },
            create: {
                user_id: userId,
                recipe_id: recipeId,
                is_favorite: favorite,
            },
            update: {
                is_favorite: favorite,
            },
        })

        return res.json({ success: true })
    } catch (error) {
        console.error('Save recipe error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const unsaveRecipe = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const recipeId = String(req.params.id || '').trim()
        if (!recipeId) return res.status(400).json({ error: 'Recipe id is required.' })

        await prisma.userSavedRecipe.deleteMany({
            where: {
                user_id: userId,
                recipe_id: recipeId,
            },
        })

        return res.json({ success: true })
    } catch (error) {
        console.error('Unsave recipe error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const getSavedRecipes = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const saved = await prisma.userSavedRecipe.findMany({
            where: {
                user_id: userId,
                is_favorite: true,
            },
            include: {
                recipe: {
                    include: {
                        nutrition: true,
                    },
                },
            },
            orderBy: { updated_at: 'desc' },
        })

        const custom = await prisma.userCustomRecipe.findMany({
            where: { user_id: userId },
            orderBy: { updated_at: 'desc' },
        })

        const favorites = saved.map((entry) => ({
            ...serializeRecipeCard(entry.recipe),
            times_logged: entry.times_logged,
        }))

        const customRecipes = custom.map((item) => ({
            id: item.id,
            base_recipe_id: item.base_recipe_id,
            name: item.name,
            description: item.description,
            image_url: item.image_url,
            meal_type: item.meal_type,
            difficulty: item.difficulty,
            cook_time_mins: item.cook_time_mins,
            goal_mode: item.goal_mode,
            portion_multiplier: item.portion_multiplier,
            nutrition: item.nutrition_json,
            created_at: item.created_at,
        }))

        return res.json({
            success: true,
            data: {
                favorites,
                custom_recipes: customRecipes,
            },
        })
    } catch (error) {
        console.error('Get saved recipes error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const morphRecipeForGoal = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const recipeId = String(req.params.id || '').trim()
        if (!recipeId) return res.status(400).json({ error: 'Recipe id is required.' })

        const payload = req.body as MorphPayload
        const goalMode = parseGoalMode(payload.goalMode)
        const portionMultiplier = Math.min(2, Math.max(0.5, Number(payload.portionMultiplier || 1)))
        const persist = payload.persist === true

        const recipe = await prisma.recipe.findFirst({
            where: {
                id: recipeId,
                OR: [{ user_id: null }, { user_id: userId }],
            },
            include: {
                nutrition: true,
                ingredients: {
                    orderBy: { order_index: 'asc' },
                },
                instructions: {
                    orderBy: { step_number: 'asc' },
                },
            },
        })

        if (!recipe || !recipe.nutrition) return res.status(404).json({ error: 'Recipe not found.' })

        const transformed = recipe.ingredients.map((item) => {
            const kind = getTagType(item.ingredient_name)
            const modeMultiplier = getModeMultiplier(goalMode, kind)
            const nextQty = Number((item.quantity * portionMultiplier * modeMultiplier).toFixed(2))
            const ratio = item.quantity > 0 ? nextQty / item.quantity : 1

            return {
                ...item,
                quantity: nextQty,
                calories: Number((item.calories * ratio).toFixed(2)),
                protein: Number((item.protein * ratio).toFixed(2)),
                carbs: Number((item.carbs * ratio).toFixed(2)),
                fat: Number((item.fat * ratio).toFixed(2)),
                substitution: findSubstitution(goalMode, item.ingredient_name),
            }
        })

        const modifiedTotals = resolveRecipeTotals(
            transformed.map((item) => ({
                quantity: item.quantity,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
            })),
            Number(recipe.nutrition.servings || 1),
        )

        const originalNutrition = {
            calories: recipe.nutrition.calories,
            protein: recipe.nutrition.protein,
            carbs: recipe.nutrition.carbs,
            fat: recipe.nutrition.fat,
            servings: recipe.nutrition.servings,
        }

        const changeSummary = transformed.map((item) => ({
            ingredient_name: item.ingredient_name,
            quantity: item.quantity,
            unit: item.unit,
            substitution: item.substitution,
        }))

        let modificationId: string | null = null
        let customRecipeId: string | null = null

        if (persist) {
            const modification = await prisma.recipeModification.create({
                data: {
                    recipe_id: recipe.id,
                    user_id: userId,
                    goal_mode: goalMode,
                    portion_multiplier: portionMultiplier,
                    original_nutrition: originalNutrition,
                    modified_nutrition: modifiedTotals,
                    change_summary: changeSummary,
                },
            })

            const custom = await prisma.userCustomRecipe.create({
                data: {
                    user_id: userId,
                    base_recipe_id: recipe.id,
                    name: `${recipe.name} (${goalMode.toLowerCase()})`,
                    description: recipe.description,
                    image_url: null,
                    meal_type: recipe.meal_type,
                    difficulty: recipe.difficulty,
                    cook_time_mins: recipe.cook_time_mins,
                    ingredients_json: transformed.map((item) => ({
                        ingredient_name: item.ingredient_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        nutrition: {
                            calories: item.calories,
                            protein: item.protein,
                            carbs: item.carbs,
                            fat: item.fat,
                        },
                        substitution: item.substitution,
                    })),
                    instructions_json: recipe.instructions.map((step) => ({
                        step_number: step.step_number,
                        instruction: step.instruction,
                    })),
                    nutrition_json: modifiedTotals,
                    goal_mode: goalMode,
                    portion_multiplier: portionMultiplier,
                },
            })

            modificationId = modification.id
            customRecipeId = custom.id
        }

        return res.json({
            success: true,
            data: {
                recipe_id: recipe.id,
                modification_id: modificationId,
                custom_recipe_id: customRecipeId,
                goal_mode: goalMode,
                portion_multiplier: portionMultiplier,
                original: originalNutrition,
                modified: modifiedTotals,
                ingredient_changes: changeSummary,
            },
        })
    } catch (error) {
        console.error('Morph recipe error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const getMacroGapRecipe = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        await ensureSystemRecipes()

        const today = startOfDay(new Date())
        const [summary, profile, pref] = await Promise.all([
            prisma.dailySummary.findUnique({
                where: {
                    user_id_summary_date: {
                        user_id: userId,
                        summary_date: today,
                    },
                },
            }),
            prisma.profile.findUnique({ where: { user_id: userId } }),
            prisma.userPreference.findUnique({ where: { user_id: userId } }),
        ])

        const remainingCalories = Math.max(Number(summary?.remaining_calories ?? profile?.daily_calorie_target ?? 0), 0)
        const remainingProtein = Math.max(Number(summary?.remaining_protein ?? profile?.daily_protein_target ?? 0), 0)
        const vegOnly = pref?.dietary_preference === 'VEG'

        const recipes = await prisma.recipe.findMany({
            where: {
                OR: [{ user_id: null }, { user_id: userId }],
                ...(vegOnly ? { is_veg: true } : {}),
            },
            include: { nutrition: true },
            take: 100,
        })

        const ranked: Array<{ recipe: any; cal: number; protein: number; score: number; fits: boolean }> = recipes
            .map((recipe) => {
                const nutrition = recipe.nutrition
                if (!nutrition) return null
                const cal = Number(nutrition.calories || 0)
                const protein = Number(nutrition.protein || 0)
                const proteinThreshold = remainingProtein * 0.8
                const fitsCal = cal <= remainingCalories || remainingCalories <= 0
                const fitsProtein = protein >= proteinThreshold || remainingProtein <= 0
                const score = Math.abs(Math.max(remainingCalories, 0) - cal) + Math.abs(Math.max(remainingProtein, 0) - protein) * 12

                return {
                    recipe,
                    cal,
                    protein,
                    score,
                    fits: fitsCal && fitsProtein,
                }
            })
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
            .sort((a, b) => {
                if (a.fits !== b.fits) return a.fits ? -1 : 1
                return a.score - b.score
            })

        const featured = ranked[0]
        const alternatives = ranked.slice(1, 4)

        return res.json({
            success: true,
            data: {
                remaining: {
                    calories: Math.round(remainingCalories),
                    protein: Math.round(remainingProtein),
                },
                featured: featured ? serializeRecipeCard(featured.recipe) : null,
                alternatives: alternatives.map((entry) => serializeRecipeCard(entry.recipe)),
                reason: featured
                    ? `This recipe is closest to your remaining macros with ${Math.round(featured.cal)} kcal and ${Math.round(featured.protein)}g protein.`
                    : 'No matching recipe found for current macro gap.',
            },
        })
    } catch (error) {
        console.error('Get macro gap recipe error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const getFridgeIngredients = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const items = await prisma.fridgeIngredient.findMany({
            where: { user_id: userId },
            orderBy: { updated_at: 'desc' },
        })

        return res.json({
            success: true,
            data: items.map((item) => ({
                id: item.id,
                food_id: item.food_id,
                ingredient_name: item.ingredient_name,
                quantity: item.quantity,
                unit: item.unit,
                expires_at: item.expires_at,
            })),
        })
    } catch (error) {
        console.error('Get fridge ingredients error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const upsertFridgeIngredient = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const payload = req.body as FridgeUpsertPayload
        const ingredientName = String(payload.ingredient_name || '').trim().toLowerCase()
        const quantity = Math.max(0, Number(payload.quantity || 0))
        const unit = String(payload.unit || 'piece').trim().toLowerCase()
        const foodId = payload.food_id ? String(payload.food_id) : null
        const expiresAt = payload.expires_at ? new Date(payload.expires_at) : null

        if (!ingredientName) {
            return res.status(400).json({ error: 'ingredient_name is required.' })
        }

        const existing = await prisma.fridgeIngredient.findFirst({
            where: {
                user_id: userId,
                ingredient_name: ingredientName,
            },
        })

        const item = existing
            ? await prisma.fridgeIngredient.update({
                where: { id: existing.id },
                data: {
                    quantity,
                    unit,
                    food_id: foodId,
                    expires_at: expiresAt,
                },
            })
            : await prisma.fridgeIngredient.create({
                data: {
                    user_id: userId,
                    ingredient_name: ingredientName,
                    quantity,
                    unit,
                    food_id: foodId,
                    expires_at: expiresAt,
                },
            })

        return res.json({ success: true, data: item })
    } catch (error) {
        console.error('Upsert fridge ingredient error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const deleteFridgeIngredient = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const ingredientId = String(req.params.id || '').trim()
        if (!ingredientId) return res.status(400).json({ error: 'Ingredient id is required.' })

        await prisma.fridgeIngredient.deleteMany({
            where: {
                id: ingredientId,
                user_id: userId,
            },
        })

        return res.json({ success: true })
    } catch (error) {
        console.error('Delete fridge ingredient error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

const aiGenerateRecipeOptions = async (ingredients: string[], mealType: MealType) => {
    const client = getGeminiClient()
    if (!client) return null

    try {
        const prompt = `Return JSON only. Generate exactly 3 Indian recipe options using mostly these ingredients: ${ingredients.join(', ')}. Meal type: ${mealType}. Output format {"recipes":[{"name":"","description":"","meal_type":"BREAKFAST|LUNCH|DINNER|SNACK","difficulty":"EASY|MEDIUM|HARD","cook_time_mins":number,"ingredients":[{"ingredient_name":"","quantity":number,"unit":"piece|katori|bowl|gram|tbsp|glass"}],"instructions":["step1","step2"],"tags":[""],"missing":["item"]}]}`

        const response = await client.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
        })

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const parsed = parseJsonBlock(text) as { recipes?: any[] }
        if (!Array.isArray(parsed.recipes)) return null
        return parsed.recipes.slice(0, 3)
    } catch {
        return null
    }
}

export const generateCustomRecipe = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const payload = req.body as GenerateCustomRecipePayload
        const mealType = parseMealType(payload.meal_type)
        const servings = Math.max(1, Number(payload.servings || 1))
        const dietaryPreference = payload.dietary_preference === 'VEG' ? 'VEG' : 'NON_VEG'
        const maxCookTime = Math.max(10, Number(payload.max_cook_time_mins || 30))
        const ingredientsInput = String(payload.ingredients_input || '').trim()
        const photos = Array.isArray(payload.photos)
            ? payload.photos
                .slice(0, 5)
                .map((item) => ({
                    mime_type: String(item?.mime_type || '').trim(),
                    data_base64: String(item?.data_base64 || '').trim(),
                }))
                .filter((item) => item.mime_type && item.data_base64)
            : []

        if (!ingredientsInput) {
            return res.status(400).json({ error: 'ingredients_input is required.' })
        }

        const profile = await prisma.profile.findUnique({ where: { user_id: userId } })
        const preference = await prisma.userPreference.findUnique({ where: { user_id: userId } })
        const ai = getGeminiClient()

        let aiRecipe: any = null
        if (ai) {
            try {
                const prompt = `You are a senior clinical nutrition chef and a practical Indian home cook.\nReturn strict JSON only with this exact schema:\n{\n  "name": string,\n  "description": string,\n  "meal_type": "BREAKFAST"|"LUNCH"|"DINNER"|"SNACK",\n  "difficulty": "EASY"|"MEDIUM"|"HARD",\n  "cook_time_mins": number,\n  "tags": string[],\n  "ingredients": [{"ingredient_name": string, "quantity": number, "unit": string}],\n  "instructions": string[],\n  "image_hint": string,\n  "nutrition_reasoning": string\n}\n\nConstraints:\n- Cuisine direction: ${String(payload.cuisine_style || 'indian home style').trim()}\n- Meal type: ${mealType}\n- Dietary preference: ${dietaryPreference}\n- Ingredients from user: ${ingredientsInput}\n- Cooking goal: ${String(payload.cooking_goal || 'balanced meal').trim()}\n- Cooking style: ${String(payload.cooking_style || 'simple home-style').trim()}\n- Max cook time: ${maxCookTime} minutes\n- Servings target: ${servings}\n- Optional dish name from user: ${String(payload.title || '').trim() || 'not provided'}\n- Attached reference photos count: ${photos.length}\n- User profile targets: calories=${Number(profile?.daily_calorie_target || 0)}, protein=${Number(profile?.daily_protein_target || 0)}\n- Existing user dietary preference: ${String(preference?.dietary_preference || '').trim() || 'not set'}\n\nQuality bar:\n- Make ingredient quantities realistic and coherent for ${servings} serving(s).\n- Keep steps concise, numbered logic, and executable by a home cook.\n- If dietary preference is VEG, never include non-veg ingredients.\n- If attached photos conflict with dietary rules, obey dietary rules and explain in nutrition_reasoning.\n- Prioritize high protein if cooking goal implies it.\n- Keep output deterministic, no markdown, no extra keys, no commentary.`

                const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: prompt }]
                photos.forEach((photo) => {
                    parts.push({
                        inlineData: {
                            mimeType: photo.mime_type,
                            data: photo.data_base64,
                        },
                    })
                })

                const response = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: [{ role: 'user', parts }] as any,
                })
                const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
                aiRecipe = parseJsonBlock(text)
            } catch {
                aiRecipe = null
            }
        }

        const rawIngredients = Array.isArray(aiRecipe?.ingredients) && aiRecipe.ingredients.length
            ? aiRecipe.ingredients
            : ingredientsInput
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 10)
                .map((name) => ({ ingredient_name: name, quantity: 1, unit: 'piece' }))

        if (!rawIngredients.length) {
            return res.status(400).json({ error: 'Could not derive ingredients from input.' })
        }

        const resolvedIngredients = await Promise.all(
            rawIngredients.map(async (item: any, index: number) => {
                const ingredientName = String(item.ingredient_name || '').trim().toLowerCase()
                const quantity = Math.max(0.1, Number(item.quantity || 1))
                const nutrition = await resolveIngredientNutrition(ingredientName)
                return {
                    food_id: nutrition.foodId,
                    ingredient_name: ingredientName || nutrition.name,
                    quantity,
                    unit: String(item.unit || nutrition.unit || 'piece').toLowerCase(),
                    calories: nutrition.calories,
                    protein: nutrition.protein,
                    carbs: nutrition.carbs,
                    fat: nutrition.fat,
                    order_index: index,
                }
            })
        )

        const nutrition = resolveRecipeTotals(
            resolvedIngredients.map((item) => ({
                quantity: item.quantity,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
            })),
            servings,
        )

        const instructions: string[] = Array.isArray(aiRecipe?.instructions) && aiRecipe.instructions.length
            ? aiRecipe.instructions.map((step: any) => String(step).trim()).filter(Boolean).slice(0, 8)
            : [
                'Prepare and measure all ingredients.',
                'Cook on medium heat and combine ingredients gradually.',
                'Adjust seasoning and texture, then serve warm.',
            ]

        const safeName = String(aiRecipe?.name || payload.title || 'custom recipe').trim().toLowerCase()
        const safeDescription = String(aiRecipe?.description || 'AI-generated recipe based on your request.').trim()
        const safeTags = Array.isArray(aiRecipe?.tags)
            ? aiRecipe.tags.map((tag: any) => String(tag).toLowerCase()).filter(Boolean).slice(0, 8)
            : ['ai-generated', String(payload.cuisine_style || 'custom').trim().toLowerCase()].filter(Boolean)

        const custom = await prisma.userCustomRecipe.create({
            data: {
                user_id: userId,
                base_recipe_id: null,
                name: safeName,
                description: safeDescription,
                image_url: null,
                meal_type: parseMealType(aiRecipe?.meal_type || mealType),
                difficulty: parseDifficulty(aiRecipe?.difficulty),
                cook_time_mins: Math.min(180, Math.max(10, Number(aiRecipe?.cook_time_mins || maxCookTime))),
                ingredients_json: resolvedIngredients.map((item) => ({
                    ingredient_name: item.ingredient_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    nutrition: {
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                    },
                })),
                instructions_json: instructions.map((step: string, index: number) => ({
                    step_number: index + 1,
                    instruction: step,
                })),
                nutrition_json: nutrition,
                goal_mode: 'LEAN',
                portion_multiplier: 1,
                context_json: {
                    source: 'custom-create',
                    tags: safeTags,
                    dietary_preference: dietaryPreference,
                    cooking_goal: String(payload.cooking_goal || '').trim() || null,
                    cooking_style: String(payload.cooking_style || '').trim() || null,
                    cuisine_style: String(payload.cuisine_style || '').trim() || null,
                    photo_count: photos.length,
                    image_hint: String(aiRecipe?.image_hint || '').trim() || null,
                    nutrition_reasoning: String(aiRecipe?.nutrition_reasoning || '').trim() || null,
                },
            },
        })

        return res.status(201).json({
            success: true,
            data: {
                custom_recipe_id: custom.id,
                preview: {
                    name: custom.name,
                    description: custom.description,
                    image_url: null,
                    meal_type: custom.meal_type,
                    difficulty: custom.difficulty,
                    cook_time_mins: custom.cook_time_mins,
                    nutrition,
                },
            },
        })
    } catch (error) {
        console.error('Generate custom recipe error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const generateRecipesFromFridge = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        await ensureSystemRecipes()

        const payload = req.body as GenerateFromFridgePayload
        const mealType = parseMealType(payload.mealType)
        const fridgeItems = await prisma.fridgeIngredient.findMany({
            where: { user_id: userId },
            select: { ingredient_name: true },
        })

        const selected = Array.isArray(payload.ingredients) && payload.ingredients.length
            ? payload.ingredients.map((entry) => normalize(String(entry))).filter(Boolean)
            : fridgeItems.map((entry) => normalize(entry.ingredient_name)).filter(Boolean)

        if (!selected.length) {
            return res.status(400).json({ error: 'No ingredients provided.' })
        }

        const recipes = await prisma.recipe.findMany({
            where: {
                OR: [{ user_id: null }, { user_id: userId }],
                meal_type: mealType,
            },
            include: {
                nutrition: true,
                ingredients: true,
            },
            take: 80,
        })

        const ranked = recipes
            .map((recipe) => {
                const ingredientNames = recipe.ingredients.map((item) => normalize(item.ingredient_name))
                const hits = selected.filter((item) => ingredientNames.some((name) => name.includes(item) || item.includes(name)))
                const matchScore = ingredientNames.length ? (hits.length / ingredientNames.length) * 100 : 0
                const missing = ingredientNames.filter((name) => !selected.some((item) => name.includes(item) || item.includes(name)))
                return {
                    recipe,
                    matchScore,
                    missing,
                }
            })
            .sort((a, b) => b.matchScore - a.matchScore)

        let top = ranked.slice(0, 3)

        if (top.length < 3 || top[0]?.matchScore < 35) {
            const aiOptions = await aiGenerateRecipeOptions(selected, mealType)
            if (aiOptions?.length) {
                const created: Array<{ recipe: any; matchScore: number; missing: string[] }> = []

                for (const option of aiOptions) {
                    const rawIngredients = Array.isArray(option.ingredients) ? option.ingredients : []
                    const resolved = await Promise.all(
                        rawIngredients.map(async (item: any, index: number) => {
                            const ingredientName = String(item.ingredient_name || '').trim().toLowerCase()
                            const quantity = Math.max(0.1, Number(item.quantity || 1))
                            const data = await resolveIngredientNutrition(ingredientName)
                            return {
                                food_id: data.foodId,
                                ingredient_name: ingredientName || data.name,
                                quantity,
                                unit: String(item.unit || data.unit || 'piece').toLowerCase(),
                                calories: data.calories,
                                protein: data.protein,
                                carbs: data.carbs,
                                fat: data.fat,
                                order_index: index,
                            }
                        })
                    )

                    const nutrition = resolveRecipeTotals(
                        resolved.map((item) => ({
                            quantity: item.quantity,
                            calories: item.calories,
                            protein: item.protein,
                            carbs: item.carbs,
                            fat: item.fat,
                        })),
                        1,
                    )

                    const recipe = await prisma.recipe.create({
                        data: {
                            user_id: userId,
                            name: String(option.name || 'custom fridge recipe').trim().toLowerCase(),
                            description: String(option.description || 'Generated from your fridge ingredients.'),
                            image_url: null,
                            meal_type: parseMealType(option.meal_type),
                            difficulty: parseDifficulty(option.difficulty),
                            cook_time_mins: Math.max(10, Number(option.cook_time_mins || 25)),
                            is_veg: !resolved.some((item) => isNonVegName(item.ingredient_name)),
                            tags: Array.isArray(option.tags) ? option.tags.map((entry: any) => String(entry).toLowerCase()) : ['ai-generated'],
                            is_ai_generated: true,
                            ingredients: {
                                create: resolved,
                            },
                            instructions: {
                                create: Array.isArray(option.instructions) && option.instructions.length
                                    ? option.instructions.map((step: any, index: number) => ({ step_number: index + 1, instruction: String(step) }))
                                    : [
                                        { step_number: 1, instruction: 'Prepare all ingredients.' },
                                        { step_number: 2, instruction: 'Cook according to preference and adjust seasoning.' },
                                        { step_number: 3, instruction: 'Serve warm.' },
                                    ],
                            },
                            nutrition: {
                                create: nutrition,
                            },
                        },
                        include: {
                            nutrition: true,
                            ingredients: true,
                        },
                    })

                    const ingredientNames = recipe.ingredients.map((item) => normalize(item.ingredient_name))
                    const hits = selected.filter((item) => ingredientNames.some((name) => name.includes(item) || item.includes(name)))
                    const matchScore = ingredientNames.length ? (hits.length / ingredientNames.length) * 100 : 0
                    const missing = ingredientNames.filter((name) => !selected.some((item) => name.includes(item) || item.includes(name)))

                    created.push({ recipe, matchScore, missing })
                }

                const aiRanked = created
                    .sort((a, b) => b.matchScore - a.matchScore)

                top = [...top, ...aiRanked].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3)
            }
        }

        const options = top.map((entry) => ({
            ...serializeRecipeCard(entry.recipe),
            match_percent: Math.round(entry.matchScore),
            missing_items: entry.missing.slice(0, 4),
            cook_time_mins: entry.recipe.cook_time_mins,
        }))

        return res.json({
            success: true,
            data: {
                selected_ingredients: selected,
                options,
            },
        })
    } catch (error) {
        console.error('Generate recipes from fridge error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const logRecipeMeal = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const recipeId = String(req.params.id || '').trim()
        if (!recipeId) return res.status(400).json({ error: 'Recipe id is required.' })

        const payload = req.body as LogRecipePayload
        const mealType = parseMealType(payload.mealType)
        const servings = Math.max(0.25, Number(payload.servings || 1))
        const loggedAt = payload.loggedAt ? new Date(payload.loggedAt) : new Date()

        const recipe = await prisma.recipe.findFirst({
            where: {
                id: recipeId,
                OR: [{ user_id: null }, { user_id: userId }],
            },
            include: {
                ingredients: true,
                nutrition: true,
            },
        })

        if (!recipe || !recipe.nutrition) {
            return res.status(404).json({ error: 'Recipe not found.' })
        }

        const result = await prisma.$transaction(async (tx) => {
            const foodLog = await tx.foodLog.create({
                data: {
                    user_id: userId,
                    meal_type: mealType,
                    logged_at: loggedAt,
                    total_calories: Number((recipe.nutrition!.calories * servings).toFixed(2)),
                    total_protein: Number((recipe.nutrition!.protein * servings).toFixed(2)),
                    total_carbs: Number((recipe.nutrition!.carbs * servings).toFixed(2)),
                    total_fat: Number((recipe.nutrition!.fat * servings).toFixed(2)),
                    source: 'recipe',
                },
            })

            await tx.mealItem.createMany({
                data: recipe.ingredients.map((item) => ({
                    food_log_id: foodLog.id,
                    food_name: item.ingredient_name,
                    quantity: Number((item.quantity * servings).toFixed(2)),
                    unit: item.unit,
                    calories: Number((item.calories * item.quantity * servings).toFixed(2)),
                    protein: Number((item.protein * item.quantity * servings).toFixed(2)),
                    carbs: Number((item.carbs * item.quantity * servings).toFixed(2)),
                    fat: Number((item.fat * item.quantity * servings).toFixed(2)),
                    is_custom: !item.food_id,
                    additional_info: {
                        recipe_id: recipe.id,
                        recipe_name: recipe.name,
                    },
                })),
            })

            await recalculateDailySummary(tx, userId, loggedAt)
            await syncStreakForDate(tx, userId, loggedAt)

            await tx.userSavedRecipe.upsert({
                where: {
                    user_id_recipe_id: {
                        user_id: userId,
                        recipe_id: recipe.id,
                    },
                },
                create: {
                    user_id: userId,
                    recipe_id: recipe.id,
                    is_favorite: true,
                    times_logged: 1,
                },
                update: {
                    times_logged: {
                        increment: 1,
                    },
                },
            })

            await tx.recipe.update({
                where: { id: recipe.id },
                data: {
                    popularity_score: {
                        increment: 1,
                    },
                },
            })

            return foodLog
        })

        return res.status(201).json({
            success: true,
            data: result,
            message: 'Recipe logged successfully.',
        })
    } catch (error) {
        console.error('Log recipe meal error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const getRecipeByCustomId = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const customId = String(req.params.id || '').trim()
        if (!customId) return res.status(400).json({ error: 'Custom recipe id is required.' })

        const custom = await prisma.userCustomRecipe.findFirst({
            where: {
                id: customId,
                user_id: userId,
            },
        })

        if (!custom) return res.status(404).json({ error: 'Custom recipe not found.' })

        return res.json({
            success: true,
            data: {
                id: custom.id,
                base_recipe_id: custom.base_recipe_id,
                name: custom.name,
                description: custom.description,
                image_url: custom.image_url,
                meal_type: custom.meal_type,
                difficulty: custom.difficulty,
                cook_time_mins: custom.cook_time_mins,
                ingredients: custom.ingredients_json,
                instructions: custom.instructions_json,
                nutrition: custom.nutrition_json,
                goal_mode: custom.goal_mode,
                portion_multiplier: custom.portion_multiplier,
            },
        })
    } catch (error) {
        console.error('Get custom recipe detail error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}

export const logCustomRecipeMeal = async (req: Request, res: Response) => {
    try {
        const userId = req.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

        const customId = String(req.params.id || '').trim()
        if (!customId) return res.status(400).json({ error: 'Custom recipe id is required.' })

        const payload = req.body as LogRecipePayload
        const mealType = parseMealType(payload.mealType)
        const servings = Math.max(0.25, Number(payload.servings || 1))
        const loggedAt = payload.loggedAt ? new Date(payload.loggedAt) : new Date()

        const custom = await prisma.userCustomRecipe.findFirst({
            where: {
                id: customId,
                user_id: userId,
            },
        })

        if (!custom) {
            return res.status(404).json({ error: 'Custom recipe not found.' })
        }

        const nutrition = custom.nutrition_json as { calories?: number; protein?: number; carbs?: number; fat?: number }
        const ingredients = Array.isArray(custom.ingredients_json) ? custom.ingredients_json as any[] : []

        const result = await prisma.$transaction(async (tx) => {
            const foodLog = await tx.foodLog.create({
                data: {
                    user_id: userId,
                    meal_type: mealType,
                    logged_at: loggedAt,
                    total_calories: Number((Number(nutrition.calories || 0) * servings).toFixed(2)),
                    total_protein: Number((Number(nutrition.protein || 0) * servings).toFixed(2)),
                    total_carbs: Number((Number(nutrition.carbs || 0) * servings).toFixed(2)),
                    total_fat: Number((Number(nutrition.fat || 0) * servings).toFixed(2)),
                    source: 'recipe-custom',
                },
            })

            await tx.mealItem.createMany({
                data: ingredients.map((item) => {
                    const qty = Number(item.quantity || 0)
                    const unit = String(item.unit || 'piece')
                    const baseNutrition = item.nutrition || {}
                    return {
                        food_log_id: foodLog.id,
                        food_name: String(item.ingredient_name || 'ingredient'),
                        quantity: Number((qty * servings).toFixed(2)),
                        unit,
                        calories: Number((Number(baseNutrition.calories || 0) * qty * servings).toFixed(2)),
                        protein: Number((Number(baseNutrition.protein || 0) * qty * servings).toFixed(2)),
                        carbs: Number((Number(baseNutrition.carbs || 0) * qty * servings).toFixed(2)),
                        fat: Number((Number(baseNutrition.fat || 0) * qty * servings).toFixed(2)),
                        is_custom: true,
                        additional_info: {
                            custom_recipe_id: custom.id,
                            custom_recipe_name: custom.name,
                        },
                    }
                }),
            })

            await recalculateDailySummary(tx, userId, loggedAt)
            await syncStreakForDate(tx, userId, loggedAt)

            return foodLog
        })

        return res.status(201).json({ success: true, data: result })
    } catch (error) {
        console.error('Log custom recipe meal error:', error)
        return res.status(500).json({ error: 'Something went wrong.' })
    }
}
