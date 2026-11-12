import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { useAuthStore } from '../../../store/authStore'

const ProfileScreen = () => {
    const user = useAuthStore((state) => state.user)
    const getUserProfile = useAuthStore((state) => state.getUserProfile)
    const logout = useAuthStore((state) => state.logout)
    const [loading, setLoading] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            await getUserProfile()
        } finally {
            setLoading(false)
        }
    }, [getUserProfile])

    useFocusEffect(
        useCallback(() => {
            refresh()
        }, [refresh])
    )

    const initials = useMemo(() => {
        if (!user?.name) return 'U'
        return user.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
    }, [user?.name])

    const calories = Math.round(user?.profile?.daily_calorie_target || 0)
    const protein = Math.round(user?.profile?.daily_protein_target || 0)
    const carbs = Math.round(user?.profile?.daily_carbs_target || 0)
    const fat = Math.round(user?.profile?.daily_fat_target || 0)
    const bmr = Math.round(user?.profile?.bmr_calories || 0)

    const handleLogout = async () => {
        try {
            setLoggingOut(true)
            await logout()
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <Pressable style={styles.refreshBtn} onPress={refresh} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color="#1D3557" /> : <Text style={styles.refreshText}>Refresh</Text>}
                    </Pressable>
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.nameText}>{user?.name || 'User'}</Text>
                    <Text style={styles.emailText}>{user?.email || '-'}</Text>
                    <View style={styles.badgeRow}>
                        <Text style={styles.badge}>{user?.email_verified ? 'Email Verified' : 'Email Pending'}</Text>
                        <Text style={styles.badge}>{user?.is_onboarded ? 'Onboarded' : 'Onboarding Pending'}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Body Details</Text>
                    <View style={styles.gridRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Age</Text>
                            <Text style={styles.metricValue}>{user?.profile?.age ?? '-'}</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Gender</Text>
                            <Text style={styles.metricValue}>{user?.profile?.gender || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Height</Text>
                            <Text style={styles.metricValue}>{user?.profile?.height_cm ? `${Math.round(user.profile.height_cm)} cm` : '-'}</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Weight</Text>
                            <Text style={styles.metricValue}>{user?.profile?.weight_kg ? `${Math.round(user.profile.weight_kg)} kg` : '-'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Nutrition Targets</Text>
                    <View style={styles.gridRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Daily Calories</Text>
                            <Text style={styles.metricValue}>{calories || '-'}</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>BMR</Text>
                            <Text style={styles.metricValue}>{bmr || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Protein</Text>
                            <Text style={styles.metricValue}>{protein ? `${protein}g` : '-'}</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Carbs / Fat</Text>
                            <Text style={styles.metricValue}>{carbs && fat ? `${carbs}g / ${fat}g` : '-'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Preferences</Text>
                    <Text style={styles.prefLine}>Activity: {user?.profile?.activity_level || '-'}</Text>
                    <Text style={styles.prefLine}>Goal: {user?.profile?.goal_type || '-'}</Text>
                    <Text style={styles.prefLine}>Katori Size: {user?.user_pref?.katori_size_ml ? `${user.user_pref.katori_size_ml} ml` : '-'}</Text>
                    <Text style={styles.prefLine}>Roti Thickness: {user?.user_pref?.roti_thickness || '-'}</Text>
                    <Text style={styles.prefLine}>Google Fit: {user?.user_pref?.google_fit_synced ? 'Connected' : 'Not Connected'}</Text>
                    <Text style={styles.prefLine}>Microphone: {user?.user_pref?.mic_permission ? 'Allowed' : 'Not Allowed'}</Text>
                    <Text style={styles.prefLine}>Notifications: {user?.user_pref?.notification_enabled ? 'Enabled' : 'Disabled'}</Text>
                </View>

                <Pressable style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
                    {loggingOut ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.logoutText}>Logout</Text>}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F4F7FB' },
    container: { padding: 16, paddingBottom: 30, gap: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: '#1D3557', fontSize: 24, fontWeight: '800' },
    refreshBtn: {
        minWidth: 74,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: '#D7E2EF',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshText: { color: '#1D3557', fontWeight: '700', fontSize: 12 },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E6ECF4',
        padding: 16,
        alignItems: 'center',
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#1D3557', fontSize: 22, fontWeight: '800' },
    nameText: { marginTop: 10, color: '#1D3557', fontSize: 20, fontWeight: '800' },
    emailText: { marginTop: 4, color: '#6C757D', fontSize: 13 },
    badgeRow: { marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    badge: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D7E2EF',
        backgroundColor: '#F8FBFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 11,
        fontWeight: '700',
        color: '#4A627A',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E6ECF4',
        padding: 14,
    },
    cardTitle: { color: '#1D3557', fontSize: 16, fontWeight: '800', marginBottom: 10 },
    gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    metricBox: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E7EEF7',
        backgroundColor: '#FBFDFF',
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    metricLabel: { color: '#8A9AAC', fontSize: 11, fontWeight: '600' },
    metricValue: { color: '#1D3557', fontSize: 15, fontWeight: '700', marginTop: 3 },
    prefLine: { color: '#4A627A', fontSize: 14, marginBottom: 6 },
    logoutBtn: {
        marginTop: 4,
        borderRadius: 999,
        backgroundColor: '#E76F51',
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})

export default ProfileScreen
