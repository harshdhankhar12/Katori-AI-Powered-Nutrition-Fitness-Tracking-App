import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegacyPlanStackParamList } from '../../../navigation/LegacyPlanStack'

const dietOptions = ['Veg', 'Non-Veg', 'Eggetarian', 'Jain'] as const
const foodSourceOptions = ['Home Cooked', 'Hostel/Mess', 'Office/Ordering'] as const
const regionOptions = ['North Indian', 'South Indian', 'West Indian', 'East Indian'] as const

const sourceHint: Record<(typeof foodSourceOptions)[number], string> = {
    'Home Cooked': 'Unlocks Maid Instructions feature',
    'Hostel/Mess': 'Unlocks Mess Optimizer weekly schedule',
    'Office/Ordering': 'Unlocks Swiggy/Zomato Scanner',
}

const PlanLifestyleScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<LegacyPlanStackParamList>>()
    const [diet, setDiet] = useState<(typeof dietOptions)[number]>('Veg')
    const [source, setSource] = useState<(typeof foodSourceOptions)[number]>('Hostel/Mess')
    const [region, setRegion] = useState<(typeof regionOptions)[number]>('South Indian')

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 py-4">
                <View className="mx-auto w-full max-w-[430px]">
                    <Text className="text-[28px] font-extrabold text-secondary">Step 3 of 5</Text>
                    <Text className="mt-1 text-[26px] font-extrabold text-black">Indian Context</Text>
                    <Text className="mt-2 text-[15px] leading-[22px] text-main">
                        Every Indian kitchen is different. Tell me yours.
                    </Text>

                    <View className="mt-5 rounded-[20px] bg-white p-4 shadow-card">
                        <Text className="text-[13px] font-semibold text-main/80">Diet Preference</Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                            {dietOptions.map((item) => (
                                <Pressable
                                    key={item}
                                    onPress={() => setDiet(item)}
                                    className={`rounded-full px-4 py-2 ${diet === item ? 'bg-secondary' : 'bg-secondary/10'}`}
                                >
                                    <Text className={`font-semibold ${diet === item ? 'text-white' : 'text-secondary'}`}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text className="mt-4 text-[13px] font-semibold text-main/80">Daily Food Source</Text>
                        <View className="mt-2 gap-2">
                            {foodSourceOptions.map((item) => {
                                const active = source === item
                                return (
                                    <Pressable
                                        key={item}
                                        onPress={() => setSource(item)}
                                        className={`rounded-xl border px-4 py-3 ${active ? 'border-secondary bg-secondary/5' : 'border-secondary/15 bg-background'
                                            }`}
                                    >
                                        <Text className={`font-semibold ${active ? 'text-secondary' : 'text-black'}`}>{item}</Text>
                                    </Pressable>
                                )
                            })}
                        </View>

                        <Text className="mt-4 text-[13px] font-semibold text-main/80">Regional Focus</Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                            {regionOptions.map((item) => (
                                <Pressable
                                    key={item}
                                    onPress={() => setRegion(item)}
                                    className={`rounded-full px-4 py-2 ${region === item ? 'bg-accent' : 'bg-accent/15'}`}
                                >
                                    <Text className={`font-semibold ${region === item ? 'text-white' : 'text-secondary'}`}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View className="mt-4 rounded-2xl bg-secondary px-4 py-3">
                        <Text className="text-[14px] leading-[20px] text-white">NutraDost: {sourceHint[source]}</Text>
                    </View>

                    <Pressable
                        onPress={() => navigation.navigate('PlanPermissions')}
                        className="mt-6 rounded-full bg-primary px-5 py-3.5 active:bg-primaryHover"
                    >
                        <Text className="text-center text-[17px] font-bold text-white">Continue</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default PlanLifestyleScreen
