export type HomeStackParamList = {
    HomeMain: undefined
    StreakHistory: undefined
    Settings: undefined
    Personalization: undefined
    RemainingCaloriesInfo: {
        targetCalories: number
        eatenCalories: number
        remainingCalories: number
    }
    ActivityInfo: {
        steps: number
        stepGoal: number
        caloriesFromSteps: number
    }
    MacroInfo: {
        protein: number
        proteinTarget: number
        carbs: number
        carbsTarget: number
        fats: number
        fatsTarget: number
        calories: number
        caloriesTarget: number
    }
}