import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware'
import {
    deleteFridgeIngredient,
    generateCustomRecipe,
    generateRecipesFromFridge,
    getFridgeIngredients,
    getMacroGapRecipe,
    getRecipeByCustomId,
    getRecipeDetail,
    getRecipeHome,
    getSavedRecipes,
    logCustomRecipeMeal,
    logRecipeMeal,
    morphRecipeForGoal,
    saveRecipe,
    unsaveRecipe,
    upsertFridgeIngredient,
} from '../controllers/recipeController'

const router = Router()

router.get('/home', authenticateToken, getRecipeHome)
router.get('/saved', authenticateToken, getSavedRecipes)
router.get('/macro-gap', authenticateToken, getMacroGapRecipe)
router.get('/fridge', authenticateToken, getFridgeIngredients)
router.post('/fridge', authenticateToken, upsertFridgeIngredient)
router.delete('/fridge/:id', authenticateToken, deleteFridgeIngredient)
router.post('/fridge/generate', authenticateToken, generateRecipesFromFridge)
router.post('/custom/generate', authenticateToken, generateCustomRecipe)
router.get('/custom/:id', authenticateToken, getRecipeByCustomId)
router.post('/custom/:id/log', authenticateToken, logCustomRecipeMeal)
router.get('/:id', authenticateToken, getRecipeDetail)
router.post('/:id/save', authenticateToken, saveRecipe)
router.delete('/:id/save', authenticateToken, unsaveRecipe)
router.post('/:id/morph', authenticateToken, morphRecipeForGoal)
router.post('/:id/log', authenticateToken, logRecipeMeal)

export default router
