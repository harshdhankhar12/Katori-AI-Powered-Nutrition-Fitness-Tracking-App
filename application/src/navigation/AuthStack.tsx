import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import LoginScreen from '../features/auth/screens/LoginScreen'
import RegisterScreen from '../features/auth/screens/RegisterScreen'
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen'
import VerifyUserScreen from '../features/auth/screens/VerifyUser'
import AuthSplashScreen from '../features/auth/screens/AuthSplashScreen'
import AuthWelcomeScreen from '../features/auth/screens/AuthWelcomeScreen'

export type RootAuthStackParamList = {
    Splash: undefined
    Welcome: undefined
    Login: undefined
    Register: undefined
    ForgotPassword: undefined
    VerifyUser: { email?: string } | undefined
}

const Stack = createNativeStackNavigator<RootAuthStackParamList>()

const AuthStack = () => {
    return (
        <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Splash" component={AuthSplashScreen} />
            <Stack.Screen name="Welcome" component={AuthWelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyUser" component={VerifyUserScreen} />
        </Stack.Navigator>
    )
}

export default AuthStack
