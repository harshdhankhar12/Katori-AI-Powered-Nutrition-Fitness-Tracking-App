import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'
import type { OnboardingStackParamList } from '../../../navigation/OnboardingStack.tsx'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GoalSelection'>

type GoalOption = {
    key: 'LOSE' | 'MAINTAIN' | 'GAIN'
    icon: string
    title: string
    desc: string
}

const goalOptions: GoalOption[] = [
    { key: 'LOSE', icon: '🔥', title: 'Lose Weight', desc: 'Create a steady calorie deficit.' },
    { key: 'MAINTAIN', icon: '⚖️', title: 'Maintain', desc: 'Stay balanced and consistent.' },
    { key: 'GAIN', icon: '💪', title: 'Gain Muscle', desc: 'Build with higher energy and protein.' },
]

const OnboardingGoalScreen = ({ navigation }: Props) => {
    const [selectedGoal, setSelectedGoal] = useState<GoalOption['key'] | null>(null)
    const [saving, setSaving] = useState(false)
    const { getUserProfile } = useAuthStore()

    const canContinue = useMemo(() => Boolean(selectedGoal) && !saving, [selectedGoal, saving])

    const onContinue = async () => {
        if (!selectedGoal) return
        try {
            setSaving(true)
            await api.post('/user/onboarding', { step: 1, goal_type: selectedGoal })
            await getUserProfile()
            navigation.navigate('PersonalDetails')
        } catch (error: any) {
            Alert.alert('Unable to save goal', error?.response?.data?.error || 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.progressText}>1 of 5</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '20%' }]} />
                </View>

                <Text style={styles.title}>What's your goal?</Text>

                <View style={styles.cardsWrap}>
                    {goalOptions.map((item) => {
                        const selected = selectedGoal === item.key
                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => setSelectedGoal(item.key)}
                                style={[styles.card, selected && styles.cardSelected]}
                            >
                                <Text style={styles.cardIcon}>{item.icon}</Text>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardDesc}>{item.desc}</Text>
                            </Pressable>
                        )
                    })}
                </View>

                <Pressable
                    disabled={!canContinue}
                    style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
                    onPress={onContinue}
                >
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>CONTINUE</Text>}
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAF9F6' },
    container: { flex: 1, paddingHorizontal: 22, paddingVertical: 20 },
    progressText: { color: '#6C757D', fontSize: 13, fontWeight: '600' },
    progressTrack: { marginTop: 8, height: 8, borderRadius: 8, backgroundColor: '#E9ECEF', overflow: 'hidden' },
    progressFill: { height: 8, backgroundColor: '#F4A261' },
    title: { marginTop: 22, fontSize: 28, fontWeight: '800', color: '#1D3557' },
    cardsWrap: { marginTop: 16, gap: 12 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    cardSelected: { borderColor: '#2A9D8F', borderWidth: 2 },
    cardIcon: { fontSize: 22 },
    cardTitle: { marginTop: 6, color: '#1D3557', fontSize: 16, fontWeight: '700' },
    cardDesc: { marginTop: 4, color: '#6C757D', fontSize: 13 },
    primaryBtn: {
        marginTop: 'auto',
        backgroundColor: '#F4A261',
        borderRadius: 30,
        paddingVertical: 15,
        alignItems: 'center',
    },
    primaryBtnDisabled: { backgroundColor: '#E9ECEF' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})

export default OnboardingGoalScreen
