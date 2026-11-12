import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import './global.css'
import AuthStack from './src/navigation/AuthStack'
import DashboardTabs from './src/navigation/DashboardTabs'
import { useAuthStore } from './src/store/authStore'
import { ActivityIndicator, View } from 'react-native'
import VerifyEmailAccessScreen from './src/features/auth/screens/VerifyEmailAccessScreen'
import VerifyUserScreen from './src/features/auth/screens/VerifyUser'
import OnboardingStack from './src/navigation/OnboardingStack'

const Stack = createNativeStackNavigator()

const RootNavigator = () => {
  const { isAuthenticated, isInitializing, initAuth, user } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6B5B95" />
      </View>
    )
  }

  const needsEmailVerification =
    isAuthenticated &&
    user?.account_status !== 'ACTIVE' &&
    user?.email_verified === false

  const needsOnboarding = isAuthenticated && !needsEmailVerification && user?.is_onboarded !== true

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        needsEmailVerification ? (
          <>
            <Stack.Screen
              name="VerifyEmailAccess"
              component={VerifyEmailAccessScreen}
              initialParams={{ email: user?.email || '' }}
            />
            <Stack.Screen
              name="VerifyUser"
              component={VerifyUserScreen}
              initialParams={{ email: user?.email || '' }}
            />
          </>
        ) : (
          needsOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingStack} />
          ) : (
            <Stack.Screen name="Dashboard" component={DashboardTabs} />
          )
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default App