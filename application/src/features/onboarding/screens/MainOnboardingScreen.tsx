import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
    Image,
    Pressable,
    Text,
    View,
} from 'react-native'
import { RootAuthStackParamList } from '../../../navigation/AuthStack'
import { SafeAreaView } from 'react-native-safe-area-context'

const MainOnboardingScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootAuthStackParamList>>()

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-5 py-4">
                <View className="mx-auto w-full max-w-[430px] flex-1 justify-between">
                    <View>
                        <View className="items-center">
                            <Image
                                source={require('../../../../assets/onboarding/katori.png')}
                                resizeMode="contain"
                                className="h-16 w-16"
                            />
                            <Text className="mt-4 text-[36px] font-extrabold text-secondary">Katori</Text>
                            <Text className="mt-2 text-center text-[15px] leading-[21px] text-main">
                                Your smart Indian nutrition journey starts here with your context-aware AI coach.
                            </Text>
                        </View>

                        <View className="mt-12 gap-3">
                            <Pressable
                                onPress={() => navigation.navigate('Register')}
                                className="rounded-full bg-secondary px-4 py-3.5 active:bg-secondaryLight"
                            >
                                <Text className="text-center text-[16px] font-bold text-white">Create Account</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => navigation.navigate('Login')}
                                className="rounded-full border-2 border-secondary px-4 py-3.5 active:bg-secondary/5"
                            >
                                <Text className="text-center text-[16px] font-bold text-secondary">Sign In</Text>
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
        </SafeAreaView>
    )
}

export default MainOnboardingScreen