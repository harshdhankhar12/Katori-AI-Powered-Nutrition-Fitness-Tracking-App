import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegacyPlanStackParamList } from '../../../navigation/LegacyPlanStack'

const genders = ['Male', 'Female', 'Other'] as const

const PlanBioDataScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<LegacyPlanStackParamList>>()
    const [gender, setGender] = useState<(typeof genders)[number]>('Male')
    const [age, setAge] = useState('25')
    const [weight, setWeight] = useState('70')
    const [height, setHeight] = useState('170')

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 py-4">
                <View className="mx-auto w-full max-w-[430px]">
                    <Text className="text-[28px] font-extrabold text-secondary">Step 1 of 5</Text>
                    <Text className="mt-1 text-[26px] font-extrabold text-black">The Foundation</Text>
                    <Text className="mt-2 text-[15px] leading-[22px] text-main">
                        To calculate your metabolism, I need the basics. Don&apos;t worry, this stays between us.
                    </Text>

                    <View className="mt-5 rounded-[20px] bg-white p-4 shadow-card">
                        <Text className="text-[13px] font-semibold text-main/80">Gender</Text>
                        <View className="mt-2 flex-row gap-2">
                            {genders.map((item) => (
                                <Pressable
                                    key={item}
                                    onPress={() => setGender(item)}
                                    className={`rounded-full px-4 py-2 ${gender === item ? 'bg-secondary' : 'bg-secondary/10'}`}
                                >
                                    <Text className={`font-semibold ${gender === item ? 'text-white' : 'text-secondary'}`}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View className="mt-4 gap-3">
                            <View>
                                <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Age</Text>
                                <TextInput
                                    value={age}
                                    onChangeText={setAge}
                                    keyboardType="numeric"
                                    placeholder="Enter age"
                                    placeholderTextColor="#7B8A97"
                                    className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-main"
                                />
                            </View>

                            <View>
                                <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Current Weight (kg)</Text>
                                <TextInput
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="numeric"
                                    placeholder="Enter weight"
                                    placeholderTextColor="#7B8A97"
                                    className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-main"
                                />
                            </View>

                            <View>
                                <Text className="mb-1.5 text-[13px] font-semibold text-main/80">Height (cm)</Text>
                                <TextInput
                                    value={height}
                                    onChangeText={setHeight}
                                    keyboardType="numeric"
                                    placeholder="Enter height"
                                    placeholderTextColor="#7B8A97"
                                    className="rounded-xl border border-secondary/15 bg-background px-4 py-3 text-main"
                                />
                            </View>
                        </View>
                    </View>

                    <View className="mt-4 rounded-2xl bg-secondary px-4 py-3">
                        <Text className="text-[14px] leading-[20px] text-white">
                            NutraDost: Got it! This helps me find your BMR (Resting Calories).
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => navigation.navigate('PlanMission')}
                        className="mt-6 rounded-full bg-primary px-5 py-3.5 active:bg-primaryHover"
                    >
                        <Text className="text-center text-[17px] font-bold text-white">Continue</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default PlanBioDataScreen
