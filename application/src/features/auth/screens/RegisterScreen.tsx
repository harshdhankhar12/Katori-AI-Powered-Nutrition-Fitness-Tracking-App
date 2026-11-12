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

const RegisterScreen = ({ navigation }: any) => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { register } = useAuthStore()

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match')
            return
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters')
            return
        }

        try {
            setIsSubmitting(true)
            await register(name, email, password)
        } catch (error: any) {
            console.error('Registration error:', error)
            const errorMessage =
                error.response?.data?.error ||
                error.message ||
                'Something went wrong'
            Alert.alert('Registration Failed', errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleLogin = () => {
        navigation.navigate('Login')
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
                                <Text className="mt-2 text-[32px] font-extrabold text-secondary">Create Account</Text>
                                <Text className="mt-1 text-center text-[15px] leading-[21px] text-main">
                                    Join Katori and start your smart nutrition journey today.
                                </Text>
                            </View>

                            <View className="mt-7 rounded-[22px] bg-white px-4 py-5 shadow-card">
                                <View className="gap-3">
                                    <View>
                                        <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Full Name</Text>
                                        <TextInput
                                            placeholder="Enter your full name"
                                            placeholderTextColor="#7B8A97"
                                            autoCapitalize="words"
                                            value={name}
                                            onChangeText={setName}
                                            editable={!isSubmitting}
                                            className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                        />
                                    </View>

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
                                            placeholder="Create a password"
                                            placeholderTextColor="#7B8A97"
                                            secureTextEntry
                                            value={password}
                                            onChangeText={setPassword}
                                            editable={!isSubmitting}
                                            className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                        />
                                    </View>

                                    <View>
                                        <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Confirm Password</Text>
                                        <TextInput
                                            placeholder="Confirm your password"
                                            placeholderTextColor="#7B8A97"
                                            secureTextEntry
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            editable={!isSubmitting}
                                            className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    className="mt-5 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                                    onPress={handleRegister}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-center text-[16px] font-bold text-white">Create Account</Text>
                                    )}
                                </Pressable>

                                <View className="mt-4 flex-row items-center justify-center">
                                    <Text className="text-[13px] text-main/75">Already have an account? </Text>
                                    <Pressable onPress={handleLogin} disabled={isSubmitting}>
                                        <Text className="text-[13px] font-semibold text-secondary">Sign In</Text>
                                    </Pressable>
                                </View>

                            </View>
                        </View>

                        <View className="pb-2">
                            <Text className="text-center text-[13px] leading-[19px] text-main/75">
                                By creating an account, you agree to our Terms and Privacy Policy.
                            </Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default RegisterScreen
