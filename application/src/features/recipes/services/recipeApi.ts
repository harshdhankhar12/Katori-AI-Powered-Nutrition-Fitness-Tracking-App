import api from '../../../services/api'
import type {
    CreateCustomRecipePayload,
    CreateCustomRecipeResult,
    FridgeGenerateData,
    FridgeIngredient,
    MacroGapData,
    MorphResult,
    RecipeDetail,
    RecipeHomeData,
    SavedRecipesData,
} from '../types'

export const recipeApi = {
    getHome: async (params?: { query?: string; mealType?: string; tag?: string }) => {
        const response = await api.get('/recipes/home', { params })
        return response.data.data as RecipeHomeData
    },

    getDetail: async (recipeId: string) => {
        const response = await api.get(`/recipes/${recipeId}`)
        return response.data.data as RecipeDetail
    },

    getCustomDetail: async (customRecipeId: string) => {
        const response = await api.get(`/recipes/custom/${customRecipeId}`)
        return response.data.data as RecipeDetail
    },

    logRecipe: async (recipeId: string, payload?: { mealType?: string; servings?: number }) => {
        const response = await api.post(`/recipes/${recipeId}/log`, payload || {})
        return response.data.data
    },

    logCustomRecipe: async (customRecipeId: string, payload?: { mealType?: string; servings?: number }) => {
        const response = await api.post(`/recipes/custom/${customRecipeId}/log`, payload || {})
        return response.data.data
    },

    saveRecipe: async (recipeId: string, favorite = true) => {
        await api.post(`/recipes/${recipeId}/save`, { favorite })
    },

    unsaveRecipe: async (recipeId: string) => {
        await api.delete(`/recipes/${recipeId}/save`)
    },

    morphRecipe: async (recipeId: string, payload: { goalMode: string; portionMultiplier: number; persist?: boolean }) => {
        const response = await api.post(`/recipes/${recipeId}/morph`, payload)
        return response.data.data as MorphResult
    },

    getMacroGap: async () => {
        const response = await api.get('/recipes/macro-gap')
        return response.data.data as MacroGapData
    },

    getFridge: async () => {
        const response = await api.get('/recipes/fridge')
        return response.data.data as FridgeIngredient[]
    },

    upsertFridge: async (payload: { ingredient_name: string; quantity: number; unit: string; expires_at?: string; food_id?: string }) => {
        const response = await api.post('/recipes/fridge', payload)
        return response.data.data as FridgeIngredient
    },

    deleteFridge: async (id: string) => {
        await api.delete(`/recipes/fridge/${id}`)
    },

    generateFromFridge: async (payload?: { ingredients?: string[]; mealType?: string }) => {
        const response = await api.post('/recipes/fridge/generate', payload || {})
        return response.data.data as FridgeGenerateData
    },

    getSaved: async () => {
        const response = await api.get('/recipes/saved')
        return response.data.data as SavedRecipesData
    },

    generateCustomRecipe: async (payload: CreateCustomRecipePayload) => {
        const response = await api.post('/recipes/custom/generate', payload)
        return response.data.data as CreateCustomRecipeResult
    },
}
