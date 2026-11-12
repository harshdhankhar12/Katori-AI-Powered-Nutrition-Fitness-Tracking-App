import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'
import type { OnboardingStackParamList } from '../../../navigation/OnboardingStack.tsx'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ActivityLevel'>

type ActivityValue = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VERY_ACTIVE'

const options: Array<{ key: ActivityValue; icon: string; title: string; desc: string }> = [
    { key: 'SEDENTARY', icon: '🛋️', title: 'Sedentary', desc: 'Desk job, no exercise' },
    { key: 'LIGHT', icon: '🚶', title: 'Lightly Active', desc: 'Walk occasionally, 1-2 days/week' },
    { key: 'MODERATE', icon: '🏃', title: 'Moderately Active', desc: 'Active job or 3-4 days/week' },
    { key: 'VERY_ACTIVE', icon: '💪', title: 'Very Active', desc: 'Physical job or 5+ days/week' },
]

const OnboardingActivityScreen = ({ navigation }: Props) => {
    const profile = useAuthStore((state) => state.user?.profile)
    const getUserProfile = useAuthStore((state) => state.getUserProfile)
    const [selected, setSelected] = useState<ActivityValue | null>((profile?.activity_level as ActivityValue) || null)
    const [saving, setSaving] = useState(false)

    const canContinue = useMemo(() => Boolean(selected) && !saving, [selected, saving])

    const onContinue = async () => {
        if (!selected) return
        try {
            setSaving(true)
            await api.post('/user/onboarding', { step: 3, activity_level: selected })
            await getUserProfile()
            navigation.navigate('PortionSize')
        } catch (error: any) {
            Alert.alert('Unable to save activity', error?.response?.data?.error || 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.progressText}>3 of 5</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '60%' }]} />
                </View>

                <Text style={styles.title}>How active is your day?</Text>

                <View style={styles.cardsWrap}>
                    {options.map((item) => {
                        const active = item.key === selected
                        return (
                            <Pressable key={item.key} onPress={() => setSelected(item.key)} style={[styles.card, active && styles.cardActive]}>
                                <Text style={styles.icon}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <Text style={styles.cardDesc}>{item.desc}</Text>
                                </View>
                            </Pressable>
                        )
                    })}
                </View>

                <Pressable disabled={!canContinue} style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]} onPress={onContinue}>
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
    cardsWrap: { marginTop: 16, gap: 10 },
    card: {
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9ECEF',
        padding: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    cardActive: { borderColor: '#2A9D8F', borderWidth: 2 },
    icon: { fontSize: 22 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1D3557' },
    cardDesc: { marginTop: 3, fontSize: 13, color: '#6C757D' },
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

export default OnboardingActivityScreen
