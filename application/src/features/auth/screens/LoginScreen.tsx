import React, { useState } from 'react'
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
    ActivityIndicator,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../../store/authStore'

const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { login } = useAuthStore()

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        try {
            setIsSubmitting(true)
            await login(email, password)
        } catch (error: any) {
            const errorMessage = 
              error.response?.data?.error || 
              error.message || 
              'Something went wrong'
            Alert.alert('Login Failed', errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleForgotPassword = () => {
        navigation.navigate('ForgotPassword')
    }

    const handleRegister = () => {
        navigation.navigate('Register')
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="flex-1 px-5 py-4">
                    <View className="mx-auto w-full max-w-[430px] flex-1 justify-between">
                        <View>
                            <View className="items-center">
                                <Image
                                    source={require('../../../../assets/onboarding/katori.png')}
                                    resizeMode="contain"
                                    className="h-16 w-16"
                                />
                                <Text className="mt-2 text-[32px] font-extrabold text-secondary">Welcome Back</Text>
                                <Text className="mt-1 text-center text-[15px] leading-[21px] text-main">
                                    Sign in to continue your smart nutrition journey with Katori.
                                </Text>
                            </View>

                            <View className="mt-7 rounded-[22px] bg-white px-4 py-5 shadow-card">
                                <View className="gap-3">
                                    <View>
                                        <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Email</Text>
                                        <TextInput
                                            placeholder="Enter your email"
                                            placeholderTextColor="#7B8A97"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                            editable={!isSubmitting}
                                            className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                        />
                                    </View>

                                    <View>
                                        <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Password</Text>
                                        <TextInput
                                            placeholder="Enter your password"
                                            placeholderTextColor="#7B8A97"
                                            secureTextEntry
                                            value={password}
                                            onChangeText={setPassword}
                                            editable={!isSubmitting}
                                            className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    className="mt-5 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                                    onPress={handleLogin}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-center text-[16px] font-bold text-white">Login</Text>
                                    )}
                                </Pressable>

                                <Pressable
                                    onPress={handleForgotPassword}
                                    disabled={isSubmitting}
                                    className="mt-4"
                                >
                                    <Text className="text-center text-[13px] font-semibold text-secondary">
                                        Forgot Password?
                                    </Text>
                                </Pressable>

                                <View className="mt-4 flex-row items-center justify-center">
                                    <Text className="text-[13px] text-main/75">Don't have an account? </Text>
                                    <Pressable onPress={handleRegister} disabled={isSubmitting}>
                                        <Text className="text-[13px] font-semibold text-secondary">Sign Up</Text>
                                    </Pressable>
                                </View>

                                <View className="mt-5 flex-row items-center">
                                    <View className="h-[1px] flex-1 bg-secondary/15" />
                                    <Text className="mx-3 text-[12px] font-semibold text-main/60">OR</Text>
                                    <View className="h-[1px] flex-1 bg-secondary/15" />
                                </View>

                                <Text className="mt-4 text-center text-[13px] font-semibold tracking-[1px] text-main/75">
                                    LOGIN WITH GOOGLE
                                </Text>

                                <Pressable className="mt-3 flex-row items-center justify-center rounded-full border border-secondary/15 bg-white px-4 py-3.5 active:bg-secondary/5">
                                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                                        <Text className="text-[17px] font-bold text-secondary">G</Text>
                                    </View>
                                    <Text className="text-[16px] font-semibold text-secondary">Continue with Google</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View className="pb-2">
                            <Text className="text-center text-[13px] leading-[19px] text-main/75">
                                By continuing, you agree to our Terms and Privacy Policy.
                            </Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default LoginScreen