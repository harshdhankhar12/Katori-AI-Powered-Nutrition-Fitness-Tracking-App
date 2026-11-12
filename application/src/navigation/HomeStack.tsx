import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
    ActivityInfoScreen,
    DashboardHomeScreen,
    MacroInfoScreen,
    PersonalizationScreen,
    RemainingCaloriesInfoScreen,
    SettingsScreen,
    StreakHistoryScreen,
} from '../features/dashboard/screens'
import type { HomeStackParamList } from './types'

export type { HomeStackParamList } from './types'

const Stack = createNativeStackNavigator<HomeStackParamList>()

const HomeStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="HomeMain"
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="HomeMain" component={DashboardHomeScreen} />
            <Stack.Screen name="StreakHistory" component={StreakHistoryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen name="RemainingCaloriesInfo" component={RemainingCaloriesInfoScreen} />
            <Stack.Screen name="ActivityInfo" component={ActivityInfoScreen} />
            <Stack.Screen name="MacroInfo" component={MacroInfoScreen} />
        </Stack.Navigator>
    )
}

export default HomeStack