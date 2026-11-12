import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'
import type { OnboardingStackParamList } from '../../../navigation/OnboardingStack.tsx'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PortionSize'>

type BowlSize = 150 | 200 | 250
type RotiThickness = 'THIN' | 'MEDIUM' | 'THICK'

const OnboardingPortionScreen = ({ navigation }: Props) => {
    const prefs = useAuthStore((state) => state.user?.user_pref)
    const getUserProfile = useAuthStore((state) => state.getUserProfile)

    const [bowl, setBowl] = useState<BowlSize | null>((prefs?.katori_size_ml as BowlSize) || null)
    const [roti, setRoti] = useState<RotiThickness | null>(
        prefs?.roti_thickness ? (prefs.roti_thickness.toUpperCase() as RotiThickness) : null
    )
    const [saving, setSaving] = useState(false)

    const canContinue = useMemo(() => Boolean(bowl && roti) && !saving, [bowl, roti, saving])

    const onContinue = async () => {
        if (!bowl || !roti) return

        try {
            setSaving(true)
            await api.post('/user/onboarding', {
                step: 4,
                katori_size_ml: bowl,
                roti_thickness: roti,
            })
            await getUserProfile()
            navigation.navigate('Permissions')
        } catch (error: any) {
            Alert.alert('Unable to save portions', error?.response?.data?.error || 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.progressText}>4 of 5</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '80%' }]} />
                </View>

                <Text style={styles.title}>Your Katori, your rules</Text>
                <Text style={styles.subtitle}>We'll remember your portion sizes so you never repeat.</Text>

                <Text style={styles.sectionLabel}>Katori Size</Text>
                <View style={styles.rowWrap}>
                    {[150, 200, 250].map((item) => {
                        const active = bowl === item
                        return (
                            <Pressable key={item} onPress={() => setBowl(item as BowlSize)} style={[styles.optionCard, active && styles.optionCardActive]}>
                                <Text style={styles.optionTitle}>{item === 150 ? 'Small' : item === 200 ? 'Medium' : 'Large'}</Text>
                                <Text style={styles.optionSub}>{item}ml</Text>
                            </Pressable>
                        )
                    })}
                </View>

                <Text style={styles.sectionLabel}>Roti Thickness</Text>
                <View style={styles.rowWrap}>
                    {(['THIN', 'MEDIUM', 'THICK'] as RotiThickness[]).map((item) => {
                        const active = roti === item
                        return (
                            <Pressable key={item} onPress={() => setRoti(item)} style={[styles.optionCard, active && styles.optionCardActive]}>
                                <Text style={styles.optionTitle}>{item.charAt(0) + item.slice(1).toLowerCase()}</Text>
                            </Pressable>
                        )
                    })}
                </View>

                <Text style={styles.note}>You can change this later in Settings</Text>

                <Pressable disabled={!canContinue} style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]} onPress={onContinue}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>LET'S GO</Text>}
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
    subtitle: { marginTop: 8, fontSize: 14, color: '#6C757D', lineHeight: 20 },
    sectionLabel: { marginTop: 18, marginBottom: 8, fontSize: 14, color: '#1D3557', fontWeight: '700' },
    rowWrap: { flexDirection: 'row', gap: 10 },
    optionCard: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9ECEF',
        paddingVertical: 14,
        alignItems: 'center',
    },
    optionCardActive: { borderColor: '#2A9D8F', borderWidth: 2, backgroundColor: '#F2FCFA' },
    optionTitle: { color: '#1D3557', fontSize: 14, fontWeight: '700' },
    optionSub: { marginTop: 4, color: '#6C757D', fontSize: 12 },
    note: { marginTop: 14, color: '#6C757D', fontSize: 12 },
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

export default OnboardingPortionScreen
