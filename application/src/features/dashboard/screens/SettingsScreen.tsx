import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import api from '../../../services/api'
import {
    connectGoogleFit,
    disconnectGoogleFit,
    getGoogleFitAvailabilityMessage,
    isGoogleFitAvailable,
} from '../../../services/googleFit'
import { useAuthStore } from '../../../store/authStore'
import type { HomeStackParamList } from '../../../navigation/types'

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    success: '#2A9D8F',
    danger: '#E76F51',
    muted: '#8A9AAC',
    border: '#E6ECF4',
}

type RowProps = {
    icon: string
    iconColor: string
    title: string
    subtitle: string
    rightLabel?: string
}

const SettingRow = ({ icon, iconColor, title, subtitle, rightLabel }: RowProps) => {
    return (
        <View style={styles.rowCard}>
            <View style={[styles.rowIconWrap, { backgroundColor: `${iconColor}14` }]}>
                <Ionicons name={icon as never} size={18} color={iconColor} />
            </View>
            <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            {rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
        </View>
    )
}

type ActivitySummary = {
    google_fit_synced: boolean
    step_goal: number
    steps_count: number
    calories_from_steps: number
    last_synced_at?: string | null
}

type SettingsNavProp = NativeStackNavigationProp<HomeStackParamList, 'Settings'>

const SettingsScreen = () => {
    const navigation = useNavigation<SettingsNavProp>()
    const getUserProfile = useAuthStore((state) => state.getUserProfile)
    const user = useAuthStore((state) => state.user)
    const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
        google_fit_synced: Boolean(user?.user_pref?.google_fit_synced),
        step_goal: 10000,
        steps_count: 0,
        calories_from_steps: 0,
        last_synced_at: null,
    })
    const [loadingSummary, setLoadingSummary] = useState(false)
    const [syncing, setSyncing] = useState(false)

    const loadSummary = useCallback(async () => {
        setLoadingSummary(true)
        try {
            const response = await api.get('/user/activity-summary')
            setActivitySummary(response.data.data)
        } catch (error) {
            console.error('Activity summary fetch error:', error)
        } finally {
            setLoadingSummary(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            loadSummary()
        }, [loadSummary])
    )

    const handleConnectGoogleFit = async () => {
        setSyncing(true)
        try {
            const fitResult = await connectGoogleFit()
            const syncResponse = await api.post('/user/activity-sync', {
                google_fit_connected: fitResult.connected,
                steps_count: fitResult.steps,
                calories_from_steps: fitResult.caloriesBurned,
            })
            setActivitySummary(syncResponse.data.data)
            await getUserProfile()
            Alert.alert('Google Fit connected', 'Your steps and active calories are now syncing.')
        } catch (error) {
            console.error('Google Fit connect error:', error)
            Alert.alert(
                'Google Fit connection failed',
                error instanceof Error
                    ? error.message
                    : 'Could not connect to Google Fit. Please try again and allow permissions.'
            )
        } finally {
            setSyncing(false)
        }
    }

    const handleDisconnectGoogleFit = async () => {
        setSyncing(true)
        try {
            await disconnectGoogleFit()
            await api.post('/user/activity-sync', {
                google_fit_connected: false,
            })
            await getUserProfile()
            await loadSummary()
            Alert.alert('Google Fit disconnected', 'Sync access has been removed from this device.')
        } catch (error) {
            console.error('Google Fit disconnect error:', error)
            Alert.alert('Google Fit', 'Could not disconnect Google Fit right now.')
        } finally {
            setSyncing(false)
        }
    }

    const connected = Boolean(activitySummary.google_fit_synced)
    const availabilityMessage = getGoogleFitAvailabilityMessage()
    const canUseGoogleFit = isGoogleFitAvailable
    const fitStatusLabel = connected ? 'Connected' : canUseGoogleFit ? 'Not connected' : 'Unavailable'

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <View style={styles.headerTopRow}>
                        <View>
                            <Text style={styles.headerEyebrow}>Account & Preferences</Text>
                            <Text style={styles.headerTitle}>Settings</Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                            <Text style={styles.headerBadgeText}>Secure</Text>
                        </View>
                    </View>

                    <Text style={styles.headerCopy}>
                        Keep your Katori experience connected, personalized, and ready for smarter nutrition tracking.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Integrations</Text>
                    <View style={styles.integrationCard}>
                        <SettingRow
                            icon="fitness-outline"
                            iconColor={colors.success}
                            title="Google Fit"
                            subtitle={
                                connected
                                    ? 'Syncing steps, active calories, and workout data'
                                    : availabilityMessage || 'Connect Google Fit to power the home activity cards'
                            }
                            rightLabel={loadingSummary ? 'Loading' : fitStatusLabel}
                        />
                        <View style={styles.integrationStats}>
                            <View style={styles.integrationStat}>
                                <Text style={styles.integrationStatValue}>{activitySummary.steps_count.toLocaleString()}</Text>
                                <Text style={styles.integrationStatLabel}>Steps today</Text>
                            </View>
                            <View style={styles.integrationStat}>
                                <Text style={styles.integrationStatValue}>{Math.round(activitySummary.calories_from_steps)}</Text>
                                <Text style={styles.integrationStatLabel}>Active calories</Text>
                            </View>
                            <View style={styles.integrationStat}>
                                <Text style={styles.integrationStatValue}>{activitySummary.step_goal.toLocaleString()}</Text>
                                <Text style={styles.integrationStatLabel}>Daily goal</Text>
                            </View>
                        </View>
                        <Pressable
                            style={[
                                styles.syncButton,
                                connected ? styles.syncButtonSecondary : styles.syncButtonPrimary,
                                !canUseGoogleFit && styles.syncButtonDisabled,
                            ]}
                            onPress={connected ? handleDisconnectGoogleFit : handleConnectGoogleFit}
                            disabled={syncing || loadingSummary || (!canUseGoogleFit && !connected)}
                        >
                            <Text style={styles.syncButtonText}>
                                {syncing ? 'Working...' : connected ? 'Disconnect Google Fit' : 'Connect Google Fit'}
                            </Text>
                        </Pressable>
                    </View>
                    <SettingRow
                        icon="phone-portrait-outline"
                        iconColor={colors.primary}
                        title="Health Platform"
                        subtitle="Apple Health sync is prepared for future support"
                        rightLabel="Coming soon"
                    />
                    <SettingRow
                        icon="cloud-outline"
                        iconColor={colors.accent}
                        title="Cloud Backup"
                        subtitle="Keep profile and meal logs synced across devices"
                        rightLabel="Enabled"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Controls</Text>
                    <Pressable onPress={() => navigation.navigate('Personalization')}>
                        <SettingRow
                            icon="options-outline"
                            iconColor={colors.success}
                            title="Personalization"
                            subtitle="Edit step goal, macro targets, and formula mode"
                            rightLabel="Open"
                        />
                    </Pressable>
                    <SettingRow
                        icon="mic-outline"
                        iconColor={colors.primary}
                        title="Voice Logging"
                        subtitle="Fast meal logging using speech input"
                        rightLabel="On"
                    />
                    <SettingRow
                        icon="notifications-outline"
                        iconColor={colors.danger}
                        title="Reminders"
                        subtitle="Meal alerts and daily check-in prompts"
                        rightLabel="On"
                    />
                    <SettingRow
                        icon="language-outline"
                        iconColor={colors.secondary}
                        title="Language"
                        subtitle="Interface language and regional preferences"
                        rightLabel="English"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data & Privacy</Text>
                    <SettingRow
                        icon="document-text-outline"
                        iconColor={colors.primary}
                        title="Nutrition Data"
                        subtitle="Export your logged meals and summary reports"
                    />
                    <SettingRow
                        icon="lock-closed-outline"
                        iconColor={colors.success}
                        title="Privacy Controls"
                        subtitle="Manage permissions and data access"
                    />
                    <SettingRow
                        icon="help-circle-outline"
                        iconColor={colors.accent}
                        title="Help & Support"
                        subtitle="FAQs, feedback, and account assistance"
                    />
                </View>

                <View style={styles.footerCard}>
                    <Text style={styles.footerTitle}>Katori Pro Setup</Text>
                    <Text style={styles.footerText}>
                        This space can later host subscription, theme, notification, and device sync options.
                    </Text>
                    <Pressable style={styles.footerButton}>
                        <Text style={styles.footerButtonText}>Manage account</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 28,
        gap: 12,
    },
    headerCard: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        padding: 18,
        shadowColor: '#173152',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 5,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerEyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.72)',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    headerTitle: {
        marginTop: 4,
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F7FBFF',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    headerBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.success,
    },
    headerCopy: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 19,
        color: 'rgba(255,255,255,0.88)',
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    integrationCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingBottom: 12,
        marginBottom: 10,
        backgroundColor: '#FBFCFF',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 10,
    },
    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEF3F8',
    },
    rowIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowTextWrap: {
        flex: 1,
        marginLeft: 12,
        paddingRight: 10,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    rowSubtitle: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 17,
        color: colors.secondary,
    },
    rightLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
    },
    integrationStats: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
        marginBottom: 12,
    },
    integrationStat: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    integrationStatValue: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
    },
    integrationStatLabel: {
        marginTop: 3,
        fontSize: 11,
        fontWeight: '600',
        color: colors.secondary,
    },
    syncButton: {
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    syncButtonPrimary: {
        backgroundColor: colors.success,
    },
    syncButtonSecondary: {
        backgroundColor: colors.danger,
    },
    syncButtonDisabled: {
        backgroundColor: colors.muted,
    },
    syncButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    footerCard: {
        backgroundColor: '#FBFCFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    footerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
    },
    footerText: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: colors.secondary,
    },
    footerButton: {
        marginTop: 12,
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 11,
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
})

export default SettingsScreen