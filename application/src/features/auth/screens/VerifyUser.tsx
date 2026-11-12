import React, { useMemo, useState } from 'react'
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
import Ionicons from 'react-native-vector-icons/Ionicons'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'

const VerifyUserScreen = ({ route }: any) => {
    const initialEmail = useMemo(() => route?.params?.email || '', [route?.params?.email])
    const [email, setEmail] = useState(initialEmail)
    const [otp, setOtp] = useState('')
    const [isSendingOtp, setIsSendingOtp] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [hasSentOtp, setHasSentOtp] = useState(false)
    const { getUserProfile } = useAuthStore()

    const handleSendOtp = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email')
            return
        }

        try {
            setIsSendingOtp(true)
            await api.post('/auth/send-otp', { email })
            setHasSentOtp(true)
            Alert.alert('OTP Sent', 'Please check your email for the verification code.')
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error ||
                error.message ||
                'Something went wrong'
            Alert.alert('Failed to Send OTP', errorMessage)
        } finally {
            setIsSendingOtp(false)
        }
    }

    const handleVerifyOtp = async () => {
        if (!email || !otp) {
            Alert.alert('Error', 'Please fill in email and OTP')
            return
        }

        try {
            setIsVerifying(true)
            await api.post('/auth/verify-otp', { email, otp })
            await getUserProfile()
            Alert.alert('Success', 'Email verified successfully. Access granted!')
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error ||
                error.message ||
                'Something went wrong'
            Alert.alert('Verification Failed', errorMessage)
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="flex-1 px-5 py-4">
                    <View className="mx-auto w-full max-w-[430px] flex-1 justify-center">
                        <View className="rounded-[22px] bg-white px-4 py-5 shadow-card">
                            <Text className="text-[32px] font-extrabold text-secondary">Verify Email</Text>
                            <Text className="mt-2 text-[15px] leading-[21px] text-main">
                                Enter your email and OTP to activate your account.
                            </Text>

                            <View className="mt-6 gap-3">
                                <View>
                                    <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Email</Text>
                                    <View className="flex-row items-center rounded-xl border border-secondary/15 bg-background px-3">
                                        <Ionicons name="mail-outline" size={18} color="#264653" />
                                        <TextInput
                                            placeholder="Enter your email"
                                            placeholderTextColor="#7B8A97"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                            editable={!isSendingOtp && !isVerifying}
                                            className="flex-1 px-2 py-3 text-[15px] text-main"
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    className="flex-row items-center justify-center gap-2 rounded-full border border-secondary/25 bg-white px-4 py-3 active:bg-secondary/5"
                                    onPress={handleSendOtp}
                                    disabled={isSendingOtp || isVerifying}
                                >
                                    {isSendingOtp ? (
                                        <ActivityIndicator color="#1D3557" />
                                    ) : (
                                        <>
                                            <Ionicons name="paper-plane-outline" size={17} color="#1D3557" />
                                            <Text className="text-center text-[15px] font-bold text-secondary">
                                                {hasSentOtp ? 'Resend OTP' : 'Send OTP'}
                                            </Text>
                                        </>
                                    )}
                                </Pressable>

                                <View>
                                    <Text className="mb-1.5 text-[13px] font-semibold text-main/80">OTP</Text>
                                    <View className="flex-row items-center rounded-xl border border-secondary/15 bg-background px-3">
                                        <Ionicons name="key-outline" size={18} color="#264653" />
                                        <TextInput
                                            placeholder="Enter 6-digit OTP"
                                            placeholderTextColor="#7B8A97"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={otp}
                                            onChangeText={setOtp}
                                            editable={!isVerifying}
                                            className="flex-1 px-2 py-3 text-[15px] text-main"
                                        />
                                    </View>
                                </View>
                            </View>

                            <Pressable
                                className="mt-5 flex-row items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                                onPress={handleVerifyOtp}
                                disabled={isVerifying || isSendingOtp}
                            >
                                {isVerifying ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                                        <Text className="text-center text-[16px] font-bold text-white">Verify Email</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default VerifyUserScreen