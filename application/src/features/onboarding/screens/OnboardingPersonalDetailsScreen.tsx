import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'
import type { OnboardingStackParamList } from '../../../navigation/OnboardingStack.tsx'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PersonalDetails'>

type GenderOption = 'MALE' | 'FEMALE' | 'PREFER_NOT'

const OnboardingPersonalDetailsScreen = ({ navigation }: Props) => {
    const user = useAuthStore((state) => state.user)
    const getUserProfile = useAuthStore((state) => state.getUserProfile)

    const [age, setAge] = useState(user?.profile?.age ? String(user.profile.age) : '')
    const [heightCm, setHeightCm] = useState(user?.profile?.height_cm ? String(user.profile.height_cm) : '')
    const [weightKg, setWeightKg] = useState(user?.profile?.weight_kg ? String(user.profile.weight_kg) : '')
    const [gender, setGender] = useState<GenderOption>((user?.profile?.gender as GenderOption) || 'MALE')
    const [saving, setSaving] = useState(false)

    const valid = useMemo(() => {
        const ageNum = Number(age)
        const heightNum = Number(heightCm)
        const weightNum = Number(weightKg)

        return (
            ageNum >= 15 &&
            ageNum <= 100 &&
            heightNum >= 100 &&
            heightNum <= 250 &&
            weightNum >= 30 &&
            weightNum <= 200
        )
    }, [age, heightCm, weightKg])

    const onContinue = async () => {
        if (!valid || saving) return

        try {
            setSaving(true)
            await api.post('/user/onboarding', {
                step: 2,
                age: Number(age),
                gender,
                height_cm: Number(heightCm),
                weight_kg: Number(weightKg),
            })
            await getUserProfile()
            navigation.navigate('ActivityLevel')
        } catch (error: any) {
            Alert.alert('Unable to save details', error?.response?.data?.error || 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.progressText}>2 of 5</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '40%' }]} />
                </View>

                <Text style={styles.title}>Tell us about yourself</Text>

                <View style={styles.formWrap}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        value={age}
                        onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="15 - 100"
                        placeholderTextColor="#8F9AA6"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.segmentWrap}>
                        {(['MALE', 'FEMALE', 'PREFER_NOT'] as GenderOption[]).map((item) => {
                            const selected = gender === item
                            const label = item === 'PREFER_NOT' ? 'Prefer not' : item.charAt(0) + item.slice(1).toLowerCase()
                            return (
                                <Pressable
                                    key={item}
                                    onPress={() => setGender(item)}
                                    style={[styles.segmentBtn, selected && styles.segmentBtnSelected]}
                                >
                                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <Text style={styles.label}>Height (cm)</Text>
                    <TextInput
                        value={heightCm}
                        onChangeText={(v) => setHeightCm(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="100 - 250"
                        placeholderTextColor="#8F9AA6"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                        value={weightKg}
                        onChangeText={(v) => setWeightKg(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="30 - 200"
                        placeholderTextColor="#8F9AA6"
                        style={styles.input}
                    />
                </View>

                <Pressable disabled={!valid || saving} style={[styles.primaryBtn, (!valid || saving) && styles.primaryBtnDisabled]} onPress={onContinue}>
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
    formWrap: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF', padding: 14 },
    label: { color: '#1D3557', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#E9ECEF',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        color: '#1D3557',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    segmentWrap: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    segmentBtn: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    segmentBtnSelected: { borderColor: '#2A9D8F', borderWidth: 2, backgroundColor: '#F2FCFA' },
    segmentText: { fontSize: 13, color: '#6C757D', fontWeight: '600' },
    segmentTextSelected: { color: '#1D3557', fontWeight: '700' },
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

export default OnboardingPersonalDetailsScreen
