import React, { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/authStore'
import OnboardingSplashScreen from '../features/onboarding/screens/OnboardingSplashScreen'
import OnboardingWelcomeScreen from '../features/onboarding/screens/OnboardingWelcomeScreen'
import OnboardingGoalScreen from '../features/onboarding/screens/OnboardingGoalScreen'
import OnboardingPersonalDetailsScreen from '../features/onboarding/screens/OnboardingPersonalDetailsScreen'
import OnboardingActivityScreen from '../features/onboarding/screens/OnboardingActivityScreen'
import OnboardingPortionScreen from '../features/onboarding/screens/OnboardingPortionScreen'
import OnboardingPermissionsScreen from '../features/onboarding/screens/OnboardingPermissionsScreen'

export type OnboardingStackParamList = {
    OnboardingSplash: { nextRoute: Exclude<keyof OnboardingStackParamList, 'OnboardingSplash'> }
    OnboardingWelcome: undefined
    GoalSelection: undefined
    PersonalDetails: undefined
    ActivityLevel: undefined
    PortionSize: undefined
    Permissions: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

const OnboardingStack = () => {
    const step = useAuthStore((state) => state.user?.onboarding_step || 0)

    const nextRoute = useMemo<Exclude<keyof OnboardingStackParamList, 'OnboardingSplash'>>(() => {
        if (step >= 4) return 'Permissions'
        if (step === 3) return 'PortionSize'
        if (step === 2) return 'ActivityLevel'
        if (step === 1) return 'PersonalDetails'
        return 'OnboardingWelcome'
    }, [step])

    return (
        <Stack.Navigator initialRouteName="OnboardingSplash" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OnboardingSplash" component={OnboardingSplashScreen} initialParams={{ nextRoute }} />
            <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
            <Stack.Screen name="GoalSelection" component={OnboardingGoalScreen} />
            <Stack.Screen name="PersonalDetails" component={OnboardingPersonalDetailsScreen} />
            <Stack.Screen name="ActivityLevel" component={OnboardingActivityScreen} />
            <Stack.Screen name="PortionSize" component={OnboardingPortionScreen} />
            <Stack.Screen name="Permissions" component={OnboardingPermissionsScreen} />
        </Stack.Navigator>
    )
}

export default OnboardingStack
