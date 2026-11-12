import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegacyPlanStackParamList } from '../../../navigation/LegacyPlanStack'

type PermissionState = {
    fit: boolean
    mic: boolean
    nudges: boolean
}

const PlanPermissionsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<LegacyPlanStackParamList>>()
    const [state, setState] = useState<PermissionState>({
        fit: false,
        mic: false,
        nudges: false,
    })

    const toggle = (key: keyof PermissionState) => {
        setState((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 py-4">
                <View className="mx-auto w-full max-w-[430px]">
                    <Text className="text-[28px] font-extrabold text-secondary">Step 4 of 5</Text>
                    <Text className="mt-1 text-[26px] font-extrabold text-black">Tech Handshake</Text>
                    <Text className="mt-2 text-[15px] leading-[22px] text-main">
                        Let&apos;s make this effortless. Give me these powers.
                    </Text>

                    <View className="mt-5 gap-3">
                        <View className="rounded-[20px] bg-white p-4 shadow-card">
                            <Text className="text-[17px] font-bold text-black">Google Fit Sync</Text>
                            <Text className="mt-1 text-[14px] leading-[20px] text-main">
                                To enable Burn-Back calorie credits.
                            </Text>
                            <Pressable
                                onPress={() => toggle('fit')}
                                className={`mt-3 rounded-full px-4 py-3 ${state.fit ? 'bg-accent' : 'bg-secondary'}`}
                            >
                                <Text className="text-center font-bold text-white">{state.fit ? 'Synced' : 'Sync My Steps'}</Text>
                            </Pressable>
                        </View>

                        <View className="rounded-[20px] bg-white p-4 shadow-card">
                            <Text className="text-[17px] font-bold text-black">Microphone Access</Text>
                            <Text className="mt-1 text-[14px] leading-[20px] text-main">
                                For 1-second Hinglish voice logging.
                            </Text>
                            <Pressable
                                onPress={() => toggle('mic')}
                                className={`mt-3 rounded-full px-4 py-3 ${state.mic ? 'bg-accent' : 'bg-secondary'}`}
                            >
                                <Text className="text-center font-bold text-white">
                                    {state.mic ? 'Voice Enabled' : 'Enable Voice Logging'}
                                </Text>
                            </Pressable>
                        </View>

                        <View className="rounded-[20px] bg-white p-4 shadow-card">
                            <Text className="text-[17px] font-bold text-black">Notifications</Text>
                            <Text className="mt-1 text-[14px] leading-[20px] text-main">
                                For Know Your Next reminders at 4 PM and 8 PM.
                            </Text>
                            <Pressable
                                onPress={() => toggle('nudges')}
                                className={`mt-3 rounded-full px-4 py-3 ${state.nudges ? 'bg-accent' : 'bg-secondary'}`}
                            >
                                <Text className="text-center font-bold text-white">
                                    {state.nudges ? 'Nudges Enabled' : 'Enable NutraDost Nudges'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <Pressable
                        onPress={() => navigation.navigate('PlanReveal')}
                        className="mt-6 rounded-full bg-primary px-5 py-3.5 active:bg-primaryHover"
                    >
                        <Text className="text-center text-[17px] font-bold text-white">Continue</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default PlanPermissionsScreen
