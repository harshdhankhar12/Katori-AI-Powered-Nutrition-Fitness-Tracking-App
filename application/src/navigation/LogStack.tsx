import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import LogFirstMealScreen from '../features/log/screens/LogFirstMealScreen'
import MealTypeSelectionScreen from '../features/log/screens/MealTypeSelectionScreen'
import FoodSearchScreen from '../features/log/screens/FoodSearchScreen'
import VoiceLogScreen from '../features/log/screens/VoiceLogScreen'

export type LogStackParamList = {
    LogHome: undefined
    VoiceLog: undefined
    MealTypeSelection: undefined
    FoodSearch: {
        mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
        loggedAt?: string
        prefillItems?: Array<{
            foodId?: string
            foodName: string
            quantity: number
            unit: string
            isCustom?: boolean
            customNutrition?: {
                caloriesPerUnit: number
                proteinPerUnit: number
                carbsPerUnit: number
                fatPerUnit: number
            }
        }>
        editLog?: {
            id: string
            logged_at: string
            meal_items: Array<{
                id: string
                food_name: string
                quantity: number
                unit: string
                calories: number
                protein: number
                carbs: number
                fat: number
                is_custom: boolean
            }>
        }
    }
}

const Stack = createNativeStackNavigator<LogStackParamList>()

const LogStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="LogHome"
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="LogHome" component={LogFirstMealScreen} />
            <Stack.Screen name="VoiceLog" component={VoiceLogScreen} />
            <Stack.Screen name="MealTypeSelection" component={MealTypeSelectionScreen} />
            <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
        </Stack.Navigator>
    )
}

export default LogStack
