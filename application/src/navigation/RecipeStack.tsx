import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FridgeToPlateScreen from '../features/recipes/screens/FridgeToPlateScreen'
import GoalMorphPanelScreen from '../features/recipes/screens/GoalMorphPanelScreen'
import MacroGapFillerScreen from '../features/recipes/screens/MacroGapFillerScreen'
import CreateCustomRecipeScreen from '../features/recipes/screens/CreateCustomRecipeScreen'
import RecipeDetailScreen from '../features/recipes/screens/RecipeDetailScreen'
import RecipeHomeScreen from '../features/recipes/screens/RecipeHomeScreen'
import SavedRecipesScreen from '../features/recipes/screens/SavedRecipesScreen'
import type { RecipeStackParamList } from '../features/recipes/types'

const Stack = createNativeStackNavigator<RecipeStackParamList>()

const RecipeStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="RecipeHome"
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="RecipeHome" component={RecipeHomeScreen} />
            <Stack.Screen name="CreateCustomRecipe" component={CreateCustomRecipeScreen} />
            <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
            <Stack.Screen name="GoalMorphPanel" component={GoalMorphPanelScreen} />
            <Stack.Screen name="MacroGapFiller" component={MacroGapFillerScreen} />
            <Stack.Screen name="FridgeToPlate" component={FridgeToPlateScreen} />
            <Stack.Screen name="SavedRecipes" component={SavedRecipesScreen} />
        </Stack.Navigator>
    )
}

export default RecipeStack
