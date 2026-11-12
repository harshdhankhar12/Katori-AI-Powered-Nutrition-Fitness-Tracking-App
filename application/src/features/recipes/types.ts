export type RecipeCard = {
    id: string
    name: string
    description?: string | null
    image_url?: string | null
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    cook_time_mins: number
    is_veg: boolean
    tags: string[]
    nutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
        servings: number
    }
}

export type RecipeIngredient = {
    id?: string
    food_id?: string | null
    ingredient_name: string
    quantity: number
    unit: string
    nutrition?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    substitution?: string
}

export type RecipeInstruction = {
    id?: string
    step_number: number
    instruction: string
}

export type RecipeDetail = RecipeCard & {
    ingredients: RecipeIngredient[]
    instructions: RecipeInstruction[]
    is_favorite?: boolean
}

export type RecipeHomeData = {
    recipes: RecipeCard[]
    for_you: RecipeCard[]
    for_you_reasoning: string
    popular_this_week: RecipeCard[]
    remaining: {
        calories: number
        protein: number
    }
}

export type MorphResult = {
    recipe_id: string
    modification_id?: string | null
    custom_recipe_id?: string | null
    goal_mode: 'WEIGHT_LOSS' | 'LEAN' | 'BULK'
    portion_multiplier: number
    original: {
        calories: number
        protein: number
        carbs: number
        fat: number
        servings: number
    }
    modified: {
        calories: number
        protein: number
        carbs: number
        fat: number
        servings: number
    }
    ingredient_changes: RecipeIngredient[]
}

export type MacroGapData = {
    remaining: {
        calories: number
        protein: number
    }
    featured: RecipeCard | null
    alternatives: RecipeCard[]
    reason: string
}

export type FridgeIngredient = {
    id: string
    food_id?: string | null
    ingredient_name: string
    quantity: number
    unit: string
    expires_at?: string | null
}

export type FridgeGenerateData = {
    selected_ingredients: string[]
    options: Array<RecipeCard & { match_percent: number; missing_items: string[] }>
}

export type SavedRecipesData = {
    favorites: Array<RecipeCard & { times_logged: number }>
    custom_recipes: Array<{
        id: string
        base_recipe_id?: string | null
        name: string
        description?: string | null
        image_url?: string | null
        meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
        difficulty: 'EASY' | 'MEDIUM' | 'HARD'
        cook_time_mins: number
        goal_mode: 'WEIGHT_LOSS' | 'LEAN' | 'BULK'
        portion_multiplier: number
        nutrition: {
            calories: number
            protein: number
            carbs: number
            fat: number
            servings?: number
        }
        created_at: string
    }>
}

export type CreateCustomRecipePayload = {
    title?: string
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    dietary_preference: 'VEG' | 'NON_VEG'
    servings: number
    cuisine_style?: string
    ingredients_input: string
    cooking_goal?: string
    cooking_style?: string
    max_cook_time_mins?: number
    photos?: Array<{
        mime_type: string
        data_base64: string
    }>
}

export type CreateCustomRecipeResult = {
    custom_recipe_id: string
    preview: {
        name: string
        description?: string | null
        image_url?: string | null
        meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
        difficulty: 'EASY' | 'MEDIUM' | 'HARD'
        cook_time_mins: number
        nutrition: {
            calories: number
            protein: number
            carbs: number
            fat: number
            servings: number
        }
    }
}

export type RecipeStackParamList = {
    RecipeHome: undefined
    CreateCustomRecipe: undefined
    RecipeDetail: { recipeId?: string; customRecipeId?: string }
    GoalMorphPanel: { recipeId: string }
    MacroGapFiller: undefined
    FridgeToPlate: undefined
    SavedRecipes: undefined
}
