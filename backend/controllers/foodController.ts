import { MealType, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../server';

type CreateMealItemInput = {
    foodId?: string;
    foodName?: string;
    quantity: number;
    unit: string;
    customNutrition?: {
        caloriesPerUnit: number;
        proteinPerUnit: number;
        carbsPerUnit: number;
        fatPerUnit: number;
    };
};

const QUICK_PRESET_NAMES = ['Roti', 'Dal', 'Rice', 'Paneer', 'Sabji', 'Curd', 'Egg'];

const DEFAULT_PRESET_NUTRITION: Record<string, {
    calories_per_unit: number;
    protein_per_unit: number;
    carbs_per_unit: number;
    fat_per_unit: number;
    default_unit: string;
}> = {
    roti: { calories_per_unit: 120, protein_per_unit: 3, carbs_per_unit: 18, fat_per_unit: 3, default_unit: 'piece' },
    dal: { calories_per_unit: 140, protein_per_unit: 8, carbs_per_unit: 18, fat_per_unit: 3, default_unit: 'katori' },
    rice: { calories_per_unit: 180, protein_per_unit: 4, carbs_per_unit: 38, fat_per_unit: 1, default_unit: 'bowl' },
    paneer: { calories_per_unit: 130, protein_per_unit: 8, carbs_per_unit: 3, fat_per_unit: 9, default_unit: 'piece' },
    sabji: { calories_per_unit: 110, protein_per_unit: 3, carbs_per_unit: 10, fat_per_unit: 6, default_unit: 'katori' },
    curd: { calories_per_unit: 90, protein_per_unit: 4, carbs_per_unit: 7, fat_per_unit: 5, default_unit: 'bowl' },
    egg: { calories_per_unit: 78, protein_per_unit: 6, carbs_per_unit: 1, fat_per_unit: 5, default_unit: 'piece' },
};

const startOfDay = (date: Date) => {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
};

const endOfDay = (date: Date) => {
    const day = new Date(date);
    day.setHours(23, 59, 59, 999);
    return day;
};

const sameDay = (a: Date, b: Date) => {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
};

const hasAnyLogForDay = async (
    db: Prisma.TransactionClient | typeof prisma,
    userId: string,
    date: Date,
) => {
    const count = await db.foodLog.count({
        where: {
            user_id: userId,
            logged_at: {
                gte: startOfDay(date),
                lte: endOfDay(date),
            },
        },
    });

    return count > 0;
};

const syncStreakForDate = async (
    db: Prisma.TransactionClient | typeof prisma,
    userId: string,
    date: Date,
) => {
    const streakDate = startOfDay(date);
    const hasLog = await hasAnyLogForDay(db, userId, streakDate);

    if (hasLog) {
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
        });
        return;
    }

    await db.userStreak.deleteMany({
        where: {
            user_id: userId,
            streak_date: streakDate,
        },
    });
};

const parseMealType = (value: string | undefined): MealType | null => {
    if (!value) return null;
    const normalized = value.toUpperCase();
    if (normalized === 'BREAKFAST' || normalized === 'LUNCH' || normalized === 'DINNER' || normalized === 'SNACK') {
        return normalized;
    }
    return null;
};

const normalizeNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return fallback;
    return parsed;
};

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
];

const isNonVegFood = (food: { food_name: string; category?: string | null }) => {
    const name = (food.food_name || '').toLowerCase();
    const category = (food.category || '').toLowerCase();

    if (category.includes('non veg') || category.includes('non-veg') || category.includes('meat')) {
        return true;
    }

    return NON_VEG_KEYWORDS.some((keyword) => name.includes(keyword));
};

const getIsVegOnlyUser = async (userId?: string) => {
    if (!userId) return false;
    const pref = await prisma.userPreference.findUnique({ where: { user_id: userId } });
    return pref?.dietary_preference === 'VEG';
};

const recalculateDailySummary = async (
    db: Prisma.TransactionClient | typeof prisma,
    userId: string,
    date: Date,
) => {
    const summaryDate = startOfDay(date);

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
    ]);

    const totalCalories = Number((totals._sum.total_calories || 0).toFixed(2));
    const totalProtein = Number((totals._sum.total_protein || 0).toFixed(2));
    const totalCarbs = Number((totals._sum.total_carbs || 0).toFixed(2));
    const totalFat = Number((totals._sum.total_fat || 0).toFixed(2));

    const targetCalories = profile?.daily_calorie_target || 0;
    const targetProtein = profile?.daily_protein_target || 0;

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
    });
};

const resolveMealItems = async (
    tx: Prisma.TransactionClient,
    items: CreateMealItemInput[],
) => {
    const resolvedItems: Array<{
        foodName: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        isCustom: boolean;
    }> = [];

    for (const item of items) {
        let food = null;
        if (item.foodId) {
            food = await tx.foodDatabase.findUnique({ where: { id: item.foodId } });
        }

        if (!food && item.foodName) {
            food = await tx.foodDatabase.findFirst({
                where: {
                    food_name: {
                        equals: item.foodName,
                        mode: 'insensitive',
                    },
                },
            });
        }

        const quantity = item.quantity;

        if (food) {
            resolvedItems.push({
                foodName: food.food_name,
                quantity,
                unit: item.unit,
                calories: Number((food.calories_per_unit * quantity).toFixed(2)),
                protein: Number((food.protein_per_unit * quantity).toFixed(2)),
                carbs: Number((food.carbs_per_unit * quantity).toFixed(2)),
                fat: Number((food.fat_per_unit * quantity).toFixed(2)),
                isCustom: false,
            });
            continue;
        }

        const perUnit = item.customNutrition
            ? {
                calories_per_unit: normalizeNumber(item.customNutrition.caloriesPerUnit),
                protein_per_unit: normalizeNumber(item.customNutrition.proteinPerUnit),
                carbs_per_unit: normalizeNumber(item.customNutrition.carbsPerUnit),
                fat_per_unit: normalizeNumber(item.customNutrition.fatPerUnit),
            }
            : (DEFAULT_PRESET_NUTRITION[(item.foodName || '').toLowerCase()] || {
                calories_per_unit: 100,
                protein_per_unit: 3,
                carbs_per_unit: 12,
                fat_per_unit: 4,
                default_unit: item.unit,
            });

        const normalizedName = item.foodName || 'Custom Food';

        if (item.customNutrition && normalizedName) {
            const existing = await tx.foodDatabase.findFirst({
                where: {
                    food_name: {
                        equals: normalizedName,
                        mode: 'insensitive',
                    },
                },
            });

            if (!existing) {
                await tx.foodDatabase.create({
                    data: {
                        food_name: normalizedName,
                        category: 'Custom',
                        default_unit: item.unit,
                        calories_per_unit: perUnit.calories_per_unit,
                        protein_per_unit: perUnit.protein_per_unit,
                        carbs_per_unit: perUnit.carbs_per_unit,
                        fat_per_unit: perUnit.fat_per_unit,
                        is_verified: false,
                    },
                });
            }
        }

        resolvedItems.push({
            foodName: normalizedName,
            quantity,
            unit: item.unit,
            calories: Number((perUnit.calories_per_unit * quantity).toFixed(2)),
            protein: Number((perUnit.protein_per_unit * quantity).toFixed(2)),
            carbs: Number((perUnit.carbs_per_unit * quantity).toFixed(2)),
            fat: Number((perUnit.fat_per_unit * quantity).toFixed(2)),
            isCustom: true,
        });
    }

    return resolvedItems;
};

const parseAndValidateItems = (itemsInput: unknown): { valid: boolean; items: CreateMealItemInput[] } => {
    const items = Array.isArray(itemsInput) ? (itemsInput as CreateMealItemInput[]) : [];
    if (!items.length) {
        return { valid: false, items: [] };
    }

    const normalizedItems = items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unit: String(item.unit || '').trim(),
        foodName: item.foodName?.trim(),
        customNutrition: item.customNutrition
            ? {
                caloriesPerUnit: normalizeNumber(item.customNutrition.caloriesPerUnit),
                proteinPerUnit: normalizeNumber(item.customNutrition.proteinPerUnit),
                carbsPerUnit: normalizeNumber(item.customNutrition.carbsPerUnit),
                fatPerUnit: normalizeNumber(item.customNutrition.fatPerUnit),
            }
            : undefined,
    }));

    const invalidItem = normalizedItems.find(
        (item) => !item.quantity || item.quantity <= 0 || !item.unit || (!item.foodId && !item.foodName),
    );

    if (invalidItem) {
        return { valid: false, items: normalizedItems };
    }

    return { valid: true, items: normalizedItems };
};

export const getQuickPresets = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const isVegOnlyUser = await getIsVegOnlyUser(userId);

        const presets = await prisma.foodDatabase.findMany({
            where: {
                OR: QUICK_PRESET_NAMES.map((name) => ({
                    food_name: { contains: name, mode: 'insensitive' as Prisma.QueryMode },
                })),
            },
            orderBy: { food_name: 'asc' },
            take: 20,
        });

        const filteredPresets = isVegOnlyUser ? presets.filter((item) => !isNonVegFood(item)) : presets;

        const fallbackSource = isVegOnlyUser
            ? QUICK_PRESET_NAMES.filter((name) => !NON_VEG_KEYWORDS.includes(name.toLowerCase()))
            : QUICK_PRESET_NAMES;

        const existingNames = new Set(filteredPresets.map((item) => item.food_name.toLowerCase()));
        const fallbackRows = fallbackSource.filter((name) => !existingNames.has(name.toLowerCase())).map((name) => {
            const nutrition = DEFAULT_PRESET_NUTRITION[name.toLowerCase()];
            return {
                id: `preset-${name.toLowerCase()}`,
                food_name: name,
                category: 'Indian',
                calories_per_unit: nutrition.calories_per_unit,
                protein_per_unit: nutrition.protein_per_unit,
                carbs_per_unit: nutrition.carbs_per_unit,
                fat_per_unit: nutrition.fat_per_unit,
                default_unit: nutrition.default_unit,
                is_verified: true,
            };
        });

        return res.json({
            success: true,
            data: [...filteredPresets, ...fallbackRows],
        });
    } catch (error) {
        console.error('Get quick presets error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const searchFoods = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const query = String(req.query.query || '').trim();

        if (!query) {
            return res.json({ success: true, data: [] });
        }

        const isVegOnlyUser = await getIsVegOnlyUser(userId);

        const foods = await prisma.foodDatabase.findMany({
            where: {
                food_name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            orderBy: [{ is_verified: 'desc' }, { food_name: 'asc' }],
            take: isVegOnlyUser ? 120 : 25,
        });

        const filteredFoods = isVegOnlyUser ? foods.filter((item) => !isNonVegFood(item)).slice(0, 25) : foods;

        return res.json({
            success: true,
            data: filteredFoods,
        });
    } catch (error) {
        console.error('Search foods error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const createFoodLog = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const mealType = parseMealType(req.body.mealType);
        const loggedAt = req.body.loggedAt ? new Date(req.body.loggedAt) : new Date();
        const parsedItems = parseAndValidateItems(req.body.items);

        if (!mealType) {
            return res.status(400).json({ error: 'Invalid meal type.' });
        }

        if (!parsedItems.items.length) {
            return res.status(400).json({ error: 'At least one food item is required.' });
        }

        if (!parsedItems.valid) {
            return res.status(400).json({ error: 'Each item needs valid food and quantity.' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const resolvedItems = await resolveMealItems(tx, parsedItems.items);

            const totals = resolvedItems.reduce(
                (acc, curr) => ({
                    calories: acc.calories + curr.calories,
                    protein: acc.protein + curr.protein,
                    carbs: acc.carbs + curr.carbs,
                    fat: acc.fat + curr.fat,
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            const foodLog = await tx.foodLog.create({
                data: {
                    user_id: userId,
                    meal_type: mealType,
                    logged_at: loggedAt,
                    total_calories: Number(totals.calories.toFixed(2)),
                    total_protein: Number(totals.protein.toFixed(2)),
                    total_carbs: Number(totals.carbs.toFixed(2)),
                    total_fat: Number(totals.fat.toFixed(2)),
                    source: 'manual',
                },
            });

            await tx.mealItem.createMany({
                data: resolvedItems.map((item) => ({
                    food_log_id: foodLog.id,
                    food_name: item.foodName,
                    quantity: item.quantity,
                    unit: item.unit,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    is_custom: item.isCustom,
                })),
            });

            await recalculateDailySummary(tx, userId, loggedAt);
            await syncStreakForDate(tx, userId, loggedAt);

            const logWithItems = await tx.foodLog.findUnique({
                where: { id: foodLog.id },
                include: { meal_items: true },
            });

            return logWithItems;
        });

        return res.status(201).json({
            success: true,
            message: 'Meal logged successfully.',
            data: result,
        });
    } catch (error) {
        console.error('Create food log error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const updateFoodLog = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const logId = String(req.params.id || '');

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        if (!logId) {
            return res.status(400).json({ error: 'Log id is required.' });
        }

        const mealType = parseMealType(req.body.mealType);
        const parsedItems = parseAndValidateItems(req.body.items);
        const loggedAt = req.body.loggedAt ? new Date(req.body.loggedAt) : undefined;

        if (!mealType) {
            return res.status(400).json({ error: 'Invalid meal type.' });
        }

        if (!parsedItems.items.length || !parsedItems.valid) {
            return res.status(400).json({ error: 'Each item needs valid food and quantity.' });
        }

        const existing = await prisma.foodLog.findFirst({ where: { id: logId, user_id: userId } });
        if (!existing) {
            return res.status(404).json({ error: 'Food log not found.' });
        }

        const previousDate = new Date(existing.logged_at);

        const updated = await prisma.$transaction(async (tx) => {
            const resolvedItems = await resolveMealItems(tx, parsedItems.items);

            const totals = resolvedItems.reduce(
                (acc, curr) => ({
                    calories: acc.calories + curr.calories,
                    protein: acc.protein + curr.protein,
                    carbs: acc.carbs + curr.carbs,
                    fat: acc.fat + curr.fat,
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 },
            );

            const newLoggedAt = loggedAt && !Number.isNaN(loggedAt.getTime()) ? loggedAt : existing.logged_at;

            await tx.foodLog.update({
                where: { id: logId },
                data: {
                    meal_type: mealType,
                    logged_at: newLoggedAt,
                    total_calories: Number(totals.calories.toFixed(2)),
                    total_protein: Number(totals.protein.toFixed(2)),
                    total_carbs: Number(totals.carbs.toFixed(2)),
                    total_fat: Number(totals.fat.toFixed(2)),
                },
            });

            await tx.mealItem.deleteMany({ where: { food_log_id: logId } });
            await tx.mealItem.createMany({
                data: resolvedItems.map((item) => ({
                    food_log_id: logId,
                    food_name: item.foodName,
                    quantity: item.quantity,
                    unit: item.unit,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    is_custom: item.isCustom,
                })),
            });

            await recalculateDailySummary(tx, userId, previousDate);
            await recalculateDailySummary(tx, userId, newLoggedAt);
            await syncStreakForDate(tx, userId, newLoggedAt);

            if (!sameDay(previousDate, newLoggedAt)) {
                await syncStreakForDate(tx, userId, previousDate);
            }

            return tx.foodLog.findUnique({
                where: { id: logId },
                include: { meal_items: true },
            });
        });

        return res.json({
            success: true,
            message: 'Meal log updated successfully.',
            data: updated,
        });
    } catch (error) {
        console.error('Update food log error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const deleteFoodLog = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const logId = String(req.params.id || '');

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        if (!logId) {
            return res.status(400).json({ error: 'Log id is required.' });
        }

        const existing = await prisma.foodLog.findFirst({ where: { id: logId, user_id: userId } });
        if (!existing) {
            return res.status(404).json({ error: 'Food log not found.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.foodLog.delete({ where: { id: logId } });
            await recalculateDailySummary(tx, userId, new Date(existing.logged_at));
            await syncStreakForDate(tx, userId, new Date(existing.logged_at));
        });

        return res.json({
            success: true,
            message: 'Meal log deleted successfully.',
        });
    } catch (error) {
        console.error('Delete food log error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getDailyFoodLogs = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const dateInput = req.query.date ? new Date(String(req.query.date)) : new Date();
        if (Number.isNaN(dateInput.getTime())) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        const logs = await prisma.foodLog.findMany({
            where: {
                user_id: userId,
                logged_at: {
                    gte: startOfDay(dateInput),
                    lte: endOfDay(dateInput),
                },
            },
            include: {
                meal_items: true,
            },
            orderBy: {
                logged_at: 'asc',
            },
        });

        return res.json({
            success: true,
            data: logs,
        });
    } catch (error) {
        console.error('Get daily food logs error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const dateInput = req.query.date ? new Date(String(req.query.date)) : new Date();
        if (Number.isNaN(dateInput.getTime())) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        const summaryDate = startOfDay(dateInput);

        const [summary, profile] = await Promise.all([
            prisma.dailySummary.findUnique({
                where: {
                    user_id_summary_date: {
                        user_id: userId,
                        summary_date: summaryDate,
                    },
                },
            }),
            prisma.profile.findUnique({ where: { user_id: userId } }),
        ]);

        return res.json({
            success: true,
            data: {
                total_calories: summary?.total_calories || 0,
                total_protein: summary?.total_protein || 0,
                total_carbs: summary?.total_carbs || 0,
                total_fat: summary?.total_fat || 0,
                remaining_calories: summary?.remaining_calories || Math.max((profile?.daily_calorie_target || 0), 0),
                remaining_protein: summary?.remaining_protein || Math.max((profile?.daily_protein_target || 0), 0),
                calorie_target: profile?.daily_calorie_target || 2100,
                protein_target: profile?.daily_protein_target || 75,
                carbs_target: profile?.daily_carbs_target || 260,
                fat_target: profile?.daily_fat_target || 70,
            },
        });
    } catch (error) {
        console.error('Get dashboard summary error:', error);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};
