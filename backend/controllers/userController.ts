import { Request, Response } from 'express';
import { prisma } from '../server';
import { ActivityLevel, Gender, GoalType, Prisma } from '@prisma/client';

type OnboardingPayload = {
  step?: number;
  completed?: boolean;
  goal_type?: 'LOSE' | 'MAINTAIN' | 'GAIN';
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT';
  height_cm?: number;
  weight_kg?: number;
  activity_level?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VERY_ACTIVE';
  katori_size_ml?: number;
  roti_thickness?: 'THIN' | 'MEDIUM' | 'THICK';
  mic_granted?: boolean;
  google_fit_connected?: boolean;
  notifications_granted?: boolean;
};

type GoogleFitSyncPayload = {
  google_fit_connected?: boolean;
  steps_count?: number;
  calories_from_steps?: number;
  calories_burned?: number;
};

type PersonalizationFormula = 'AUTO' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'CUSTOM';

type SavePersonalizationPayload = {
  formula?: PersonalizationFormula;
  step_goal?: number;
  calorie_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  dietary_preference?: 'VEG' | 'NON_VEG';
};

const activityMultiplier: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.725,
};

const goalAdjustment: Record<GoalType, number> = {
  LOSE: -500,
  MAINTAIN: 0,
  GAIN: 300,
  TRANSFORM: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const computeBmr = (gender: Gender | null, age: number, weightKg: number, heightCm: number) => {
  if (gender === 'FEMALE') {
    return 447.6 + 9.2 * weightKg + 3.1 * heightCm - 4.3 * age;
  }

  return 88.36 + 13.4 * weightKg + 4.8 * heightCm - 5.7 * age;
};

const startOfLocalDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const startOfLocalDayFor = (value: Date) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const DAY_MS = 24 * 60 * 60 * 1000;

const buildStreakMetrics = (dates: Date[]) => {
  if (!dates.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalLoggedDays: 0,
      activeToday: false,
      lastStreakDate: null as string | null,
    };
  }

  const sorted = dates
    .map((date) => startOfLocalDayFor(date))
    .sort((a, b) => a.getTime() - b.getTime());

  const uniqueDates: Date[] = [];
  for (const date of sorted) {
    const last = uniqueDates[uniqueDates.length - 1];
    if (!last || last.getTime() !== date.getTime()) {
      uniqueDates.push(date);
    }
  }

  let longestStreak = 1;
  let runningLongest = 1;

  for (let i = 1; i < uniqueDates.length; i += 1) {
    const diff = Math.round((uniqueDates[i].getTime() - uniqueDates[i - 1].getTime()) / DAY_MS);
    if (diff === 1) {
      runningLongest += 1;
      if (runningLongest > longestStreak) {
        longestStreak = runningLongest;
      }
    } else {
      runningLongest = 1;
    }
  }

  const today = startOfLocalDay();
  const lastDate = uniqueDates[uniqueDates.length - 1];
  const daysFromToday = Math.round((today.getTime() - lastDate.getTime()) / DAY_MS);
  const activeToday = daysFromToday === 0;

  let currentStreak = 0;
  if (daysFromToday === 0 || daysFromToday === 1) {
    currentStreak = 1;
    for (let i = uniqueDates.length - 1; i > 0; i -= 1) {
      const diff = Math.round((uniqueDates[i].getTime() - uniqueDates[i - 1].getTime()) / DAY_MS);
      if (diff === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  const normalizedLongest = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak: normalizedLongest,
    totalLoggedDays: uniqueDates.length,
    activeToday,
    lastStreakDate: lastDate.toISOString(),
  };
};

const estimateStepGoal = (dailyCalorieTarget?: number | null) => {
  if (!dailyCalorieTarget || dailyCalorieTarget <= 0) {
    return 10000;
  }

  return clamp(Math.round(dailyCalorieTarget / 2), 6000, 12000);
};

const buildMacroTargets = (
  formula: PersonalizationFormula,
  calorieTarget: number,
  proteinTarget?: number,
  carbsTarget?: number,
  fatTarget?: number
) => {
  const safeCalories = clamp(Math.round(calorieTarget), 1200, 5000);

  if (formula === 'CUSTOM') {
    return {
      calorieTarget: safeCalories,
      proteinTarget: clamp(Math.round(Number(proteinTarget || 0)), 40, 320),
      carbsTarget: clamp(Math.round(Number(carbsTarget || 0)), 50, 600),
      fatTarget: clamp(Math.round(Number(fatTarget || 0)), 20, 220),
    };
  }

  if (formula === 'HIGH_PROTEIN') {
    const protein = Math.max(100, Math.round((safeCalories * 0.35) / 4));
    const fat = Math.max(45, Math.round((safeCalories * 0.25) / 9));
    const carbs = Math.max(80, Math.round((safeCalories - protein * 4 - fat * 9) / 4));
    return {
      calorieTarget: safeCalories,
      proteinTarget: protein,
      carbsTarget: carbs,
      fatTarget: fat,
    };
  }

  if (formula === 'LOW_CARB') {
    const protein = Math.max(90, Math.round((safeCalories * 0.3) / 4));
    const fat = Math.max(50, Math.round((safeCalories * 0.4) / 9));
    const carbs = Math.max(60, Math.round((safeCalories - protein * 4 - fat * 9) / 4));
    return {
      calorieTarget: safeCalories,
      proteinTarget: protein,
      carbsTarget: carbs,
      fatTarget: fat,
    };
  }

  const protein = Math.max(70, Math.round((safeCalories * 0.25) / 4));
  const fat = Math.max(45, Math.round((safeCalories * 0.25) / 9));
  const carbs = Math.max(120, Math.round((safeCalories - protein * 4 - fat * 9) / 4));
  return {
    calorieTarget: safeCalories,
    proteinTarget: protein,
    carbsTarget: carbs,
    fatTarget: fat,
  };
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        account_status: true,
        is_onboarded: true,
        onboarding_step: true,
        profile: {
          select: {
            full_name: true,
            age: true,
            gender: true,
            height_cm: true,
            weight_kg: true,
            activity_level: true,
            goal_type: true,
            bmr_calories: true,
            daily_calorie_target: true,
            daily_protein_target: true,
            daily_carbs_target: true,
            daily_fat_target: true,
            target_formula: true,
            step_goal: true,
          },
        },
        user_pref: {
          select: {
            katori_size_ml: true,
            roti_thickness: true,
            dietary_preference: true,
            google_fit_synced: true,
            notification_enabled: true,
            mic_permission: true,
          },
        },
        last_login_at: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const saveOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const payload = req.body as OnboardingPayload;
    const step = Number(payload.step || 0);
    const safeStep = clamp(step, 0, 5);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingProfile = await prisma.profile.findUnique({ where: { user_id: userId } });

    const resolvedGoal = payload.goal_type
      ? (payload.goal_type as GoalType)
      : (existingProfile?.goal_type || null);

    const resolvedGender = payload.gender
      ? (payload.gender === 'PREFER_NOT' ? 'OTHER' : payload.gender)
      : (existingProfile?.gender || null);

    const resolvedAge = payload.age ?? existingProfile?.age ?? null;
    const resolvedHeightCm = payload.height_cm ?? existingProfile?.height_cm ?? null;
    const resolvedWeightKg = payload.weight_kg ?? existingProfile?.weight_kg ?? null;
    const resolvedActivity = payload.activity_level
      ? (payload.activity_level as ActivityLevel)
      : (existingProfile?.activity_level || null);

    let bmrCalories: number | null = existingProfile?.bmr_calories ?? null;
    let dailyCalorieTarget: number | null = existingProfile?.daily_calorie_target ?? null;
    let dailyProteinTarget: number | null = existingProfile?.daily_protein_target ?? null;
    let dailyFatTarget: number | null = existingProfile?.daily_fat_target ?? null;
    let dailyCarbsTarget: number | null = existingProfile?.daily_carbs_target ?? null;

    if (resolvedGender && resolvedAge && resolvedHeightCm && resolvedWeightKg) {
      bmrCalories = computeBmr(
        resolvedGender,
        resolvedAge,
        resolvedWeightKg,
        resolvedHeightCm
      );

      const multiplier = resolvedActivity ? activityMultiplier[resolvedActivity] : 1.2;
      const adjustedCalories = bmrCalories * multiplier + (resolvedGoal ? goalAdjustment[resolvedGoal] : 0);
      dailyCalorieTarget = Math.max(1200, Math.round(adjustedCalories));

      const protein = Math.max(50, Math.round(resolvedWeightKg * 1.6));
      const fat = Math.max(35, Math.round((dailyCalorieTarget * 0.25) / 9));
      const carbs = Math.max(80, Math.round((dailyCalorieTarget - protein * 4 - fat * 9) / 4));

      dailyProteinTarget = protein;
      dailyFatTarget = fat;
      dailyCarbsTarget = carbs;
    }

    const profileData: Prisma.ProfileUncheckedCreateInput = {
      user_id: userId,
      full_name: user.name,
      age: resolvedAge,
      gender: resolvedGender,
      height_cm: resolvedHeightCm,
      weight_kg: resolvedWeightKg,
      activity_level: resolvedActivity,
      goal_type: resolvedGoal,
      bmr_calories: bmrCalories,
      daily_calorie_target: dailyCalorieTarget,
      daily_protein_target: dailyProteinTarget,
      daily_carbs_target: dailyCarbsTarget,
      daily_fat_target: dailyFatTarget,
    };

    await prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { user_id: userId },
        update: profileData,
        create: profileData,
      });

      const shouldUpsertPreference =
        payload.katori_size_ml !== undefined ||
        payload.roti_thickness !== undefined ||
        payload.google_fit_connected !== undefined ||
        payload.notifications_granted !== undefined ||
        payload.mic_granted !== undefined;

      if (shouldUpsertPreference) {
        await tx.userPreference.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            katori_size_ml: payload.katori_size_ml,
            roti_thickness: payload.roti_thickness?.toLowerCase(),
            dietary_preference: 'NON_VEG',
            default_meal_types: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
            google_fit_synced: payload.google_fit_connected ?? false,
            notification_enabled: payload.notifications_granted ?? true,
            mic_permission: payload.mic_granted ?? false,
          },
          update: {
            katori_size_ml: payload.katori_size_ml,
            roti_thickness: payload.roti_thickness?.toLowerCase(),
            google_fit_synced: payload.google_fit_connected,
            notification_enabled: payload.notifications_granted,
            mic_permission: payload.mic_granted,
          },
        });
      }

      const completed = Boolean(payload.completed) || safeStep >= 5;
      const nextStep = completed ? 5 : Math.max(user.onboarding_step, safeStep);

      await tx.user.update({
        where: { id: userId },
        data: {
          onboarding_step: nextStep,
          is_onboarded: completed || user.is_onboarded,
        },
      });

      if (completed) {
        const summaryDate = startOfLocalDay();
        await tx.dailySummary.upsert({
          where: {
            user_id_summary_date: {
              user_id: userId,
              summary_date: summaryDate,
            },
          },
          update: {
            remaining_calories: dailyCalorieTarget ?? 0,
            remaining_protein: dailyProteinTarget ?? 0,
          },
          create: {
            user_id: userId,
            summary_date: summaryDate,
            remaining_calories: dailyCalorieTarget ?? 0,
            remaining_protein: dailyProteinTarget ?? 0,
          },
        });
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        is_onboarded: true,
        onboarding_step: true,
        profile: {
          select: {
            age: true,
            gender: true,
            height_cm: true,
            weight_kg: true,
            activity_level: true,
            goal_type: true,
            bmr_calories: true,
            daily_calorie_target: true,
            daily_protein_target: true,
            daily_carbs_target: true,
            daily_fat_target: true,
          },
        },
        user_pref: {
          select: {
            katori_size_ml: true,
            roti_thickness: true,
            dietary_preference: true,
            google_fit_synced: true,
            notification_enabled: true,
            mic_permission: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Save onboarding error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const getActivitySummary = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const summaryDate = startOfLocalDay();

    const [profile, preferences, summary, activitySync] = await Promise.all([
      prisma.profile.findUnique({ where: { user_id: userId } }),
      prisma.userPreference.findUnique({ where: { user_id: userId } }),
      prisma.dailySummary.findUnique({
        where: {
          user_id_summary_date: {
            user_id: userId,
            summary_date: summaryDate,
          },
        },
      }),
      prisma.activitySync.findFirst({
        where: {
          user_id: userId,
          sync_date: summaryDate,
        },
        orderBy: { synced_at: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        google_fit_synced: preferences?.google_fit_synced ?? false,
        step_goal: profile?.step_goal ?? estimateStepGoal(profile?.daily_calorie_target),
        steps_count: summary?.steps_count ?? activitySync?.steps ?? 0,
        calories_from_steps: summary?.calories_from_steps ?? activitySync?.calories_burned ?? 0,
        last_synced_at: activitySync?.synced_at ?? null,
      },
    });
  } catch (error) {
    console.error('Get activity summary error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const getStreakSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const streakDays = await prisma.userStreak.findMany({
      where: { user_id: userId },
      orderBy: { streak_date: 'asc' },
      select: { streak_date: true },
    });

    const metrics = buildStreakMetrics(streakDays.map((item) => item.streak_date));

    return res.json({
      success: true,
      data: {
        current_streak: metrics.currentStreak,
        longest_streak: metrics.longestStreak,
        total_logged_days: metrics.totalLoggedDays,
        active_today: metrics.activeToday,
        last_streak_date: metrics.lastStreakDate,
      },
    });
  } catch (error) {
    console.error('Get streak summary error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const getStreakHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const daysParam = Number(req.query.days || 120);
    const safeDays = Number.isFinite(daysParam)
      ? Math.min(365, Math.max(30, Math.round(daysParam)))
      : 120;

    const rangeEnd = startOfLocalDay();
    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeEnd.getDate() - (safeDays - 1));

    const [allStreakDays, rangedDays] = await Promise.all([
      prisma.userStreak.findMany({
        where: { user_id: userId },
        orderBy: { streak_date: 'asc' },
        select: { streak_date: true },
      }),
      prisma.userStreak.findMany({
        where: {
          user_id: userId,
          streak_date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: { streak_date: 'asc' },
        select: { streak_date: true },
      }),
    ]);

    const metrics = buildStreakMetrics(allStreakDays.map((item) => item.streak_date));

    return res.json({
      success: true,
      data: {
        current_streak: metrics.currentStreak,
        longest_streak: metrics.longestStreak,
        total_logged_days: metrics.totalLoggedDays,
        active_today: metrics.activeToday,
        range_start: rangeStart.toISOString(),
        range_end: rangeEnd.toISOString(),
        entries: rangedDays.map((item) => ({
          date: item.streak_date.toISOString(),
          has_log: true,
        })),
      },
    });
  } catch (error) {
    console.error('Get streak history error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const syncGoogleFitActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const payload = req.body as GoogleFitSyncPayload;
    const connected = Boolean(payload.google_fit_connected);
    const stepsCount = Math.max(0, Math.round(Number(payload.steps_count || 0)));
    const caloriesFromSteps = Math.max(
      0,
      Math.round(Number(payload.calories_from_steps ?? payload.calories_burned ?? 0))
    );

    const summaryDate = startOfLocalDay();

    const [profile, summary] = await Promise.all([
      prisma.profile.findUnique({ where: { user_id: userId } }),
      prisma.dailySummary.findUnique({
        where: {
          user_id_summary_date: {
            user_id: userId,
            summary_date: summaryDate,
          },
        },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.userPreference.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          default_meal_types: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
          google_fit_synced: connected,
          notification_enabled: true,
          mic_permission: false,
        },
        update: {
          google_fit_synced: connected,
        },
      });

      if (connected) {
        const existingActivity = await tx.activitySync.findFirst({
          where: {
            user_id: userId,
            sync_date: summaryDate,
          },
          orderBy: { synced_at: 'desc' },
        });

        if (existingActivity) {
          await tx.activitySync.update({
            where: { id: existingActivity.id },
            data: {
              steps: stepsCount,
              calories_burned: caloriesFromSteps,
              source: 'GOOGLE_FIT',
              synced_at: new Date(),
            },
          });
        } else {
          await tx.activitySync.create({
            data: {
              user_id: userId,
              sync_date: summaryDate,
              steps: stepsCount,
              calories_burned: caloriesFromSteps,
              source: 'GOOGLE_FIT',
              synced_at: new Date(),
            },
          });
        }

        const totalCalories = summary?.total_calories || 0;
        const totalProtein = summary?.total_protein || 0;
        const totalCarbs = summary?.total_carbs || 0;
        const totalFat = summary?.total_fat || 0;
        const calorieTarget = profile?.daily_calorie_target || 0;
        const proteinTarget = profile?.daily_protein_target || 0;

        await tx.dailySummary.upsert({
          where: {
            user_id_summary_date: {
              user_id: userId,
              summary_date: summaryDate,
            },
          },
          update: {
            steps_count: stepsCount,
            calories_from_steps: caloriesFromSteps,
            remaining_calories: Math.max(calorieTarget - totalCalories, 0),
            remaining_protein: Math.max(proteinTarget - totalProtein, 0),
          },
          create: {
            user_id: userId,
            summary_date: summaryDate,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            steps_count: stepsCount,
            calories_from_steps: caloriesFromSteps,
            remaining_calories: Math.max(calorieTarget - totalCalories, 0),
            remaining_protein: Math.max(proteinTarget - totalProtein, 0),
          },
        });
      }
    });

    const refreshedSummary = await prisma.dailySummary.findUnique({
      where: {
        user_id_summary_date: {
          user_id: userId,
          summary_date: summaryDate,
        },
      },
    });

    const latestActivitySync = connected
      ? await prisma.activitySync.findFirst({
        where: {
          user_id: userId,
          sync_date: summaryDate,
        },
        orderBy: { synced_at: 'desc' },
      })
      : null;

    return res.json({
      success: true,
      data: {
        google_fit_synced: connected,
        step_goal: profile?.step_goal ?? estimateStepGoal(profile?.daily_calorie_target),
        steps_count: refreshedSummary?.steps_count ?? stepsCount,
        calories_from_steps: refreshedSummary?.calories_from_steps ?? caloriesFromSteps,
        last_synced_at: latestActivitySync?.synced_at ?? null,
      },
    });
  } catch (error) {
    console.error('Sync Google Fit activity error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const getPersonalization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const [profile, activeGoal] = await Promise.all([
      prisma.profile.findUnique({ where: { user_id: userId } }),
      prisma.userGoal.findFirst({
        where: { user_id: userId, is_active: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const calorieTarget = Math.round(
      Number(activeGoal?.daily_calorie_goal ?? profile?.daily_calorie_target ?? 2100)
    );
    const proteinTarget = Math.round(
      Number(activeGoal?.daily_protein_goal ?? profile?.daily_protein_target ?? 100)
    );
    const carbsTarget = Math.round(
      Number(activeGoal?.daily_carbs_goal ?? profile?.daily_carbs_target ?? 260)
    );
    const fatTarget = Math.round(
      Number(activeGoal?.daily_fat_goal ?? profile?.daily_fat_target ?? 70)
    );
    const stepGoal = profile?.step_goal ?? estimateStepGoal(profile?.daily_calorie_target);
    const preferences = await prisma.userPreference.findUnique({ where: { user_id: userId } });

    return res.json({
      success: true,
      data: {
        formula: (profile?.target_formula as PersonalizationFormula | null) || 'AUTO',
        step_goal: stepGoal,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        carbs_target: carbsTarget,
        fat_target: fatTarget,
        dietary_preference:
          preferences?.dietary_preference === 'VEG' ? 'VEG' : 'NON_VEG',
      },
    });
  } catch (error) {
    console.error('Get personalization error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const savePersonalization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const payload = req.body as SavePersonalizationPayload;
    const formula: PersonalizationFormula =
      payload.formula && ['AUTO', 'HIGH_PROTEIN', 'LOW_CARB', 'CUSTOM'].includes(payload.formula)
        ? payload.formula
        : 'AUTO';
    const dietaryPreference = payload.dietary_preference === 'VEG' ? 'VEG' : 'NON_VEG';

    const stepGoal = clamp(Math.round(Number(payload.step_goal || 0)), 3000, 30000);
    const calorieInput = clamp(Math.round(Number(payload.calorie_target || 0)), 1200, 5000);
    const targets = buildMacroTargets(
      formula,
      calorieInput,
      payload.protein_target,
      payload.carbs_target,
      payload.fat_target
    );

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found.');
      }

      const profile = await tx.profile.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          full_name: user.name,
          daily_calorie_target: targets.calorieTarget,
          daily_protein_target: targets.proteinTarget,
          daily_carbs_target: targets.carbsTarget,
          daily_fat_target: targets.fatTarget,
          target_formula: formula,
          step_goal: stepGoal,
        },
        update: {
          daily_calorie_target: targets.calorieTarget,
          daily_protein_target: targets.proteinTarget,
          daily_carbs_target: targets.carbsTarget,
          daily_fat_target: targets.fatTarget,
          target_formula: formula,
          step_goal: stepGoal,
        },
      });

      await tx.userPreference.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          default_meal_types: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
          notification_enabled: true,
          mic_permission: false,
          google_fit_synced: false,
          dietary_preference: dietaryPreference,
        },
        update: {
          dietary_preference: dietaryPreference,
        },
      });

      const currentActiveGoal = await tx.userGoal.findFirst({
        where: { user_id: userId, is_active: true },
        orderBy: { created_at: 'desc' },
      });

      if (currentActiveGoal) {
        await tx.userGoal.update({
          where: { id: currentActiveGoal.id },
          data: {
            daily_calorie_goal: targets.calorieTarget,
            daily_protein_goal: targets.proteinTarget,
            daily_carbs_goal: targets.carbsTarget,
            daily_fat_goal: targets.fatTarget,
          },
        });
      } else {
        await tx.userGoal.create({
          data: {
            user_id: userId,
            start_date: new Date(),
            daily_calorie_goal: targets.calorieTarget,
            daily_protein_goal: targets.proteinTarget,
            daily_carbs_goal: targets.carbsTarget,
            daily_fat_goal: targets.fatTarget,
            is_active: true,
          },
        });
      }

      const summaryDate = startOfLocalDay();
      const summary = await tx.dailySummary.findUnique({
        where: {
          user_id_summary_date: {
            user_id: userId,
            summary_date: summaryDate,
          },
        },
      });

      const totalCalories = summary?.total_calories ?? 0;
      const totalProtein = summary?.total_protein ?? 0;

      await tx.dailySummary.upsert({
        where: {
          user_id_summary_date: {
            user_id: userId,
            summary_date: summaryDate,
          },
        },
        create: {
          user_id: userId,
          summary_date: summaryDate,
          remaining_calories: Math.max(targets.calorieTarget - totalCalories, 0),
          remaining_protein: Math.max(targets.proteinTarget - totalProtein, 0),
        },
        update: {
          remaining_calories: Math.max(targets.calorieTarget - totalCalories, 0),
          remaining_protein: Math.max(targets.proteinTarget - totalProtein, 0),
        },
      });

      return profile;
    });

    return res.json({
      success: true,
      data: {
        formula: updated.target_formula || 'AUTO',
        step_goal: updated.step_goal || 10000,
        calorie_target: Math.round(Number(updated.daily_calorie_target || 0)),
        protein_target: Math.round(Number(updated.daily_protein_target || 0)),
        carbs_target: Math.round(Number(updated.daily_carbs_target || 0)),
        fat_target: Math.round(Number(updated.daily_fat_target || 0)),
        dietary_preference: dietaryPreference,
      },
    });
  } catch (error) {
    console.error('Save personalization error:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
