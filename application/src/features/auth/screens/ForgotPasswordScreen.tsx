import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../../services/api'

const ForgotPasswordScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<'email' | 'reset'>('email')

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email')
            return
        }

        setIsLoading(true)
        try {
            const response = await api.post('/auth/forgot-password', { email })
            setResetToken(response.data.data.resetToken)
            setStep('reset')
            Alert.alert('Success', 'Reset token sent. Please check your email.')
        } catch (error: any) {
            const errorMessage = 
              error.response?.data?.error || 
              error.message || 
              'Something went wrong'
            Alert.alert('Error', errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!resetToken || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters')
            return
        }

        setIsLoading(true)
        try {
            await api.post('/auth/reset-password', {
                email,
                resetToken,
                newPassword,
            })
            Alert.alert('Success', 'Password reset successfully. Please login.')
            navigation.goBack()
        } catch (error: any) {
            const errorMessage = 
              error.response?.data?.error || 
              error.message || 
              'Something went wrong'
            Alert.alert('Error', errorMessage)
        } finally {
            setIsLoading(false)
        }
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
                            <Pressable
                                onPress={() => navigation.goBack()}
                                className="mb-6"
                            >
                                <Text className="text-[16px] font-semibold text-secondary">← Back</Text>
                            </Pressable>

                            <Text className="text-[32px] font-extrabold text-secondary">Reset Password</Text>
                            <Text className="mt-2 text-[15px] leading-[21px] text-main">
                                {step === 'email'
                                    ? 'Enter your email to receive a password reset link.'
                                    : 'Enter your new password'}
                            </Text>

                            <View className="mt-7 rounded-[22px] bg-white px-4 py-5 shadow-card">
                                {step === 'email' ? (
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
                                                editable={!isLoading}
                                                className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                            />
                                        </View>

                                        <Pressable
                                            className="mt-5 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                                            onPress={handleForgotPassword}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text className="text-center text-[16px] font-bold text-white">
                                                    Send Reset Link
                                                </Text>
                                            )}
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View className="gap-3">
                                        <View>
                                            <Text className="mb-1.5 text-[13px] font-semibold text-main/80">
                                                Reset Token
                                            </Text>
                                            <TextInput
                                                placeholder="Enter reset token"
                                                placeholderTextColor="#7B8A97"
                                                value={resetToken}
                                                onChangeText={setResetToken}
                                                editable={!isLoading}
                                                className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                            />
                                        </View>

                                        <View>
                                            <Text className="mb-1.5 text-[13px] font-semibold text-main/80">
                                                New Password
                                            </Text>
                                            <TextInput
                                                placeholder="Enter new password"
                                                placeholderTextColor="#7B8A97"
                                                secureTextEntry
                                                value={newPassword}
                                                onChangeText={setNewPassword}
                                                editable={!isLoading}
                                                className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                            />
                                        </View>

                                        <View>
                                            <Text className="mb-1.5 text-[13px] font-semibold text-main/80">
                                                Confirm Password
                                            </Text>
                                            <TextInput
                                                placeholder="Confirm password"
                                                placeholderTextColor="#7B8A97"
                                                secureTextEntry
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                editable={!isLoading}
                                                className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-[15px] text-main"
                                            />
                                        </View>

                                        <Pressable
                                            className="mt-5 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                                            onPress={handleResetPassword}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text className="text-center text-[16px] font-bold text-white">
                                                    Reset Password
                                                </Text>
                                            )}
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="pb-2">
                            <Pressable onPress={() => navigation.goBack()}>
                                <Text className="text-center text-[13px] leading-[19px] text-main/75">
                                    Remember your password? Back to Login
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default ForgotPasswordScreen
