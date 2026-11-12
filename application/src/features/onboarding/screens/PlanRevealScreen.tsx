import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegacyPlanStackParamList } from '../../../navigation/LegacyPlanStack'

const PlanRevealScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<LegacyPlanStackParamList>>()

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-5 py-4">
                <View className="mx-auto w-full max-w-[430px] flex-1 justify-between">
                    <View>
                        <Text className="text-[28px] font-extrabold text-secondary">Step 5 of 5</Text>
                        <Text className="mt-1 text-[26px] font-extrabold text-black">Your Daily Plan</Text>
                        <Text className="mt-2 text-[15px] leading-[22px] text-main">
                            I&apos;ve built your plan! Here is our daily target.
                        </Text>

                        <View className="mt-6 rounded-[24px] bg-white p-5 shadow-card">
                            <Text className="text-[14px] font-semibold text-main/70">Daily Target</Text>
                            <Text className="mt-1 text-[52px] font-extrabold leading-[58px] text-secondary">2,100</Text>
                            <Text className="text-[15px] font-semibold text-main">kcal / day</Text>

                            <View className="mt-5 rounded-xl bg-primary/15 px-4 py-3">
                                <Text className="text-[13px] font-semibold text-main/80">Must-Hit Protein Goal</Text>
                                <Text className="mt-1 text-[28px] font-extrabold text-secondary">100g</Text>
                            </View>
                        </View>

                        <View className="mt-4 rounded-2xl bg-secondary px-4 py-3">
                            <Text className="text-[14px] leading-[20px] text-white">
                                NutraDost: Built for your goal, routine, and Indian food context.
                            </Text>
                        </View>
                    </View>

                    <View className="pb-2 gap-3">
                        <Pressable
                            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DashboardTabs', params: { screen: 'Home' } }] })}
                            className="rounded-full bg-primary px-5 py-3.5 active:bg-primaryHover"
                        >
                            <Text className="text-center text-[17px] font-bold text-white">Go to My Dashboard</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DashboardTabs', params: { screen: 'Log' } }] })}
                            className="rounded-full border border-secondary/20 bg-white px-5 py-3.5 active:bg-secondary/5"
                        >
                            <Text className="text-center text-[17px] font-bold text-secondary">Log My First Meal</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}

export default PlanRevealScreen
