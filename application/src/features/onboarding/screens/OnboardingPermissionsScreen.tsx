import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'

const OnboardingPermissionsScreen = () => {
    const [micGranted, setMicGranted] = useState(false)
    const [saving, setSaving] = useState(false)
    const getUserProfile = useAuthStore((state) => state.getUserProfile)

    const checkMicrophonePermission = async () => {
        if (Platform.OS !== 'android') {
            return
        }

        try {
            const allowed = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
            setMicGranted(allowed)
        } catch (error) {
            console.warn('Microphone permission check error:', error)
            setMicGranted(false)
        }
    }

    useEffect(() => {
        checkMicrophonePermission()
    }, [])

    const requestMicrophonePermission = async () => {
        if (Platform.OS !== 'android') {
            setMicGranted(true)
            return
        }

        try {
            const alreadyAllowed = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
            if (alreadyAllowed) {
                setMicGranted(true)
                return
            }

            const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
                title: 'Microphone Permission Required',
                message: 'Allow microphone access so you can log meals with your voice.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'Allow',
            })

            const allowed = result === PermissionsAndroid.RESULTS.GRANTED
            setMicGranted(allowed)

            if (!allowed) {
                Alert.alert('Microphone not allowed', 'You can still continue and enable it later from app settings.')
            }
        } catch (error) {
            console.warn('Microphone permission request error:', error)
            Alert.alert('Permission failed', 'Could not request microphone permission right now.')
        }
    }

    const completeOnboarding = async () => {
        try {
            setSaving(true)
            await api.post('/user/onboarding', {
                step: 5,
                completed: true,
                mic_granted: micGranted,
            })
            await getUserProfile()
        } catch (error: any) {
            Alert.alert('Unable to finish onboarding', error?.response?.data?.error || 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const PermissionCard = ({
        emoji,
        title,
        desc,
        allowed,
        onPress,
        cta,
    }: {
        emoji: string
        title: string
        desc: string
        allowed: boolean
        onPress: () => void
        cta: string
    }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardDesc}>{desc}</Text>
                </View>
            </View>
            <Pressable style={[styles.cardBtn, allowed && styles.cardBtnAllowed]} onPress={onPress}>
                <Text style={[styles.cardBtnText, allowed && styles.cardBtnTextAllowed]}>{allowed ? 'ALLOWED' : cta}</Text>
            </Pressable>
        </View>
    )

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.progressText}>5 of 5</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '100%' }]} />
                </View>

                <Text style={styles.title}>We need a few permissions</Text>

                <View style={styles.cardsWrap}>
                    <PermissionCard
                        emoji="🎤"
                        title="Microphone"
                        desc="To log meals by voice"
                        allowed={micGranted}
                        cta="ALLOW"
                        onPress={requestMicrophonePermission}
                    />
                </View>

                <Pressable style={styles.primaryBtn} onPress={completeOnboarding} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>FINISH</Text>}
                </Pressable>

                <Pressable onPress={completeOnboarding} disabled={saving} style={styles.skipWrap}>
                    <Text style={styles.skipText}>SKIP FOR NOW</Text>
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
        padding: 12,
    },
    cardTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    cardEmoji: { fontSize: 22 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1D3557' },
    cardDesc: { marginTop: 2, fontSize: 13, color: '#6C757D' },
    cardBtn: {
        marginTop: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        alignItems: 'center',
    },
    cardBtnAllowed: { backgroundColor: '#2A9D8F', borderColor: '#2A9D8F' },
    cardBtnText: { color: '#1D3557', fontSize: 12, fontWeight: '800' },
    cardBtnTextAllowed: { color: '#FFFFFF' },
    primaryBtn: {
        marginTop: 'auto',
        backgroundColor: '#F4A261',
        borderRadius: 30,
        paddingVertical: 15,
        alignItems: 'center',
    },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
    skipWrap: { marginTop: 14, alignItems: 'center' },
    skipText: { color: '#ADB5BD', fontWeight: '700', fontSize: 13 },
})

export default OnboardingPermissionsScreen
