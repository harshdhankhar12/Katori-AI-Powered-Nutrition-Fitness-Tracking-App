import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegacyPlanStackParamList } from '../../../navigation/LegacyPlanStack'

const options = [
    {
        key: 'lose',
        title: 'Lose Weight (Leaning)',
        desc: 'High protein, lower calorie recipes.',
        preview: 'Preview: Grilled paneer bowl, high volume + lean protein',
    },
    {
        key: 'build',
        title: 'Build Muscle (Bulking)',
        desc: 'High calorie, high protein Architect recipes.',
        preview: 'Preview: Bulk thali with extra dal + paneer + ghee rice',
    },
    {
        key: 'maintain',
        title: 'Maintain & Tone',
        desc: 'Balanced daily macros.',
        preview: 'Preview: Balanced roti sabzi + curd + fruit plate',
    },
] as const

const PlanMissionScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<LegacyPlanStackParamList>>()
    const [selected, setSelected] = useState<(typeof options)[number]['key']>('build')

    const selectedItem = options.find((item) => item.key === selected)

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 py-4">
                <View className="mx-auto w-full max-w-[430px]">
                    <Text className="text-[28px] font-extrabold text-secondary">Step 2 of 5</Text>
                    <Text className="mt-1 text-[26px] font-extrabold text-black">The Mission</Text>
                    <Text className="mt-2 text-[15px] leading-[22px] text-main">
                        What&apos;s our focus? This changes how I suggest your recipes.
                    </Text>

                    <View className="mt-5 gap-3">
                        {options.map((item) => {
                            const active = item.key === selected

                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => setSelected(item.key)}
                                    className={`rounded-[18px] border p-4 ${active ? 'border-secondary bg-secondary/5' : 'border-secondary/15 bg-white'
                                        }`}
                                >
                                    <Text className={`text-[17px] font-bold ${active ? 'text-secondary' : 'text-black'}`}>
                                        {item.title}
                                    </Text>
                                    <Text className="mt-1 text-[14px] text-main">{item.desc}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <View className="mt-4 rounded-2xl bg-accent/15 px-4 py-3">
                        <Text className="text-[14px] font-semibold text-secondary">Dish Preview</Text>
                        <Text className="mt-1 text-[14px] leading-[20px] text-main">{selectedItem?.preview}</Text>
                    </View>

                    <Pressable
                        onPress={() => navigation.navigate('PlanLifestyle')}
                        className="mt-6 rounded-full bg-primary px-5 py-3.5 active:bg-primaryHover"
                    >
                        <Text className="text-center text-[17px] font-bold text-white">Continue</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default PlanMissionScreen
