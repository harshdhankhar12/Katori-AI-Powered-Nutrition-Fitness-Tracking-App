import React from 'react'
import { View, Text, Pressable, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'

const VerifyEmailAccessScreen = ({ navigation, route }: any) => {
    const defaultEmail = route?.params?.email || ''

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-5 py-4">
                <View className="mx-auto w-full max-w-[430px] flex-1 justify-center">
                    <View className="items-center rounded-[22px] bg-white px-5 py-7 shadow-card">
                        <Image
                            source={require('../../../../assets/onboarding/katori.png')}
                            resizeMode="contain"
                            className="h-16 w-16"
                        />
                        <Text className="mt-4 text-center text-[30px] font-extrabold text-secondary">
                            Verify Your Email
                        </Text>
                        <Text className="mt-2 text-center text-[15px] leading-[21px] text-main">
                            Your account access is restricted until your email is verified.
                        </Text>
                        {defaultEmail ? (
                            <View className="mt-2 flex-row items-center gap-1.5">
                                <Ionicons name="mail-outline" size={16} color="#264653" />
                                <Text className="text-center text-[14px] font-semibold text-main/80">{defaultEmail}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                            onPress={() => navigation.navigate('VerifyUser', { email: defaultEmail })}
                        >
                            <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                            <Text className="text-center text-[16px] font-bold text-white">Verify Email</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}

export default VerifyEmailAccessScreen