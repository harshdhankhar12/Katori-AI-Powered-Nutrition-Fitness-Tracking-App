import React, { useCallback, useMemo, useState } from 'react'
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Pressable,
    Dimensions,
    StatusBar,
    StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LinearGradient from 'react-native-linear-gradient'
import Icon from 'react-native-vector-icons/Ionicons'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import FontAwesome from 'react-native-vector-icons/FontAwesome5'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import api from '../../../services/api'
import { fetchCurrentGoogleFitActivity, isGoogleFitAvailable } from '../../../services/googleFit'
import { useAuthStore } from '../../../store/authStore'
import type { HomeStackParamList } from '../../../navigation/types'

const { width } = Dimensions.get('window')
const IS_SMALL_DEVICE = width < 370

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    success: '#2A9D8F',
    danger: '#E76F51',
    track: '#E7EDF5',
    muted: '#8A9AAC',
    border: '#E6ECF4',
}

type DashboardNavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>

type DashboardSummary = {
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    remaining_calories: number
    remaining_protein: number
    calorie_target: number
    protein_target: number
    carbs_target: number
    fat_target: number
}

type TimelineLog = {
    id: string
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    logged_at: string
    total_calories: number
    total_protein: number
    meal_items: Array<{
        food_name: string
    }>
}

type ActivitySummary = {
    google_fit_synced: boolean
    step_goal: number
    steps_count: number
    calories_from_steps: number
    last_synced_at?: string | null
}

type StreakSummary = {
    current_streak: number
    longest_streak: number
    total_logged_days: number
    active_today: boolean
    last_streak_date?: string | null
}

const DashboardHomeScreen = () => {
    const navigation = useNavigation<DashboardNavProp>()
    const user = useAuthStore((state) => state.user)
    const [summary, setSummary] = useState<DashboardSummary>({
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        remaining_calories: 0,
        remaining_protein: 0,
        calorie_target: 2100,
        protein_target: 75,
        carbs_target: 260,
        fat_target: 70,
    })
    const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
        google_fit_synced: false,
        step_goal: 10000,
        steps_count: 0,
        calories_from_steps: 0,
        last_synced_at: null,
    })
    const [timeline, setTimeline] = useState<TimelineLog[]>([])
    const [streakSummary, setStreakSummary] = useState<StreakSummary>({
        current_streak: 0,
        longest_streak: 0,
        total_logged_days: 0,
        active_today: false,
        last_streak_date: null,
    })

    const macroData = useMemo(
        () => [
            { name: 'Calories', value: summary.total_calories, target: summary.calorie_target, unit: 'kcal', icon: '🔥', color: colors.accent },
            { name: 'Protein', value: summary.total_protein, target: summary.protein_target, unit: 'g', icon: '💪', color: colors.success },
            { name: 'Carbs', value: summary.total_carbs, target: summary.carbs_target, unit: 'g', icon: '🍚', color: '#F1B44C' },
            { name: 'Fats', value: summary.total_fat, target: summary.fat_target, unit: 'g', icon: '🥑', color: colors.danger },
        ],
        [summary]
    )

    useFocusEffect(
        useCallback(() => {
            const fetchDashboardData = async () => {
                try {
                    const [summaryRes, logsRes, activityRes, streakRes] = await Promise.all([
                        api.get('/food/dashboard-summary'),
                        api.get('/food/daily-logs'),
                        api.get('/user/activity-summary'),
                        api.get('/user/streak-summary'),
                    ])
                    setSummary(summaryRes.data.data)
                    setTimeline(logsRes.data.data || [])
                    const serverActivity = activityRes.data.data as ActivitySummary
                    setStreakSummary(streakRes.data.data as StreakSummary)

                    // Always try a foreground refresh when Home loads so DB gets latest activity.
                    if (isGoogleFitAvailable) {
                        try {
                            const deviceActivity = await fetchCurrentGoogleFitActivity()
                            const hasFreshDeviceData =
                                deviceActivity.steps > 0 ||
                                deviceActivity.caloriesBurned > 0 ||
                                serverActivity.google_fit_synced

                            if (deviceActivity.connected && hasFreshDeviceData) {
                                const syncResponse = await api.post('/user/activity-sync', {
                                    google_fit_connected: true,
                                    steps_count: deviceActivity.steps,
                                    calories_from_steps: deviceActivity.caloriesBurned,
                                })

                                setActivitySummary(syncResponse.data.data)
                                return
                            }
                        } catch (syncError) {
                            console.error('Google Fit refresh error:', syncError)
                        }
                    }

                    setActivitySummary(serverActivity)
                } catch (error) {
                    console.error('Dashboard data fetch error:', error)
                }
            }

            fetchDashboardData()
        }, [])
    )

    const caloriePercentage = macroData[0].target > 0 ? (macroData[0].value / macroData[0].target) * 100 : 0
    const stepPercentage = activitySummary.step_goal > 0 ? (activitySummary.steps_count / activitySummary.step_goal) * 100 : 0
    const calorieTarget = Math.round(summary.calorie_target || 0)
    const caloriesEaten = Math.round(summary.total_calories || 0)
    const remainingCalories = Math.max(calorieTarget - caloriesEaten, 0)
    const overCalories = Math.max(caloriesEaten - calorieTarget, 0)
    const isOverCalorieTarget = overCalories > 0
    const firstName = (user?.profile?.full_name || user?.name || 'there').split(' ')[0]
    const goalLabel = user?.profile?.goal_type === 'LOSE'
        ? 'Lose Weight'
        : user?.profile?.goal_type === 'GAIN'
            ? 'Gain Muscle'
            : user?.profile?.goal_type === 'MAINTAIN'
                ? 'Maintain Weight'
                : 'Transform'

    const formatDate = () => {
        const now = new Date()
        return now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
    }

    const formatLastSync = () => {
        if (!activitySummary.last_synced_at) {
            return 'Last sync unavailable'
        }

        const timestamp = new Date(activitySummary.last_synced_at)
        if (Number.isNaN(timestamp.getTime())) {
            return 'Synced recently'
        }

        return `Last synced ${timestamp.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
        })}`
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.container}>
                    <View style={styles.topRow}>
                        <View>
                            <Text style={styles.dateText}>{formatDate()}</Text>
                            <Text style={styles.headingText}>Nutrition Dashboard</Text>
                        </View>
                        <View style={styles.topActions}>
                            <TouchableOpacity
                                style={styles.streakBtn}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('StreakHistory')}
                                accessibilityRole="button"
                                accessibilityLabel="Open streak history"
                            >
                                <Icon name="flame-outline" size={15} color={colors.accent} />
                                <Text style={styles.streakBtnText}>{streakSummary.current_streak}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.avatarWrap}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('Settings')}
                                accessibilityRole="button"
                                accessibilityLabel="Open settings"
                            >
                                <Icon name="settings-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <LinearGradient
                        colors={['#1D3557', '#274B75']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.welcomeCard}
                    >
                        <Text style={styles.welcomeTitle}>Namaste, {firstName}</Text>
                        <Text style={styles.welcomeSubtitle}>Goal: {goalLabel}</Text>

                        <View style={styles.goalPill}>
                            <Icon name="trending-up" size={14} color={colors.primary} />
                            <Text style={styles.goalPillText}>
                                {isOverCalorieTarget
                                    ? `Over target by ${overCalories} kcal`
                                    : `${Math.round(caloriePercentage)}% daily goal complete`}
                            </Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.metricsRow}>
                        <View style={[styles.metricCard, styles.metricGap]}>
                            <View style={styles.metricLabelRow}>
                                <Text style={styles.metricLabel}>Remaining Calories</Text>
                                <Pressable
                                    style={styles.infoBadge}
                                    onPress={() => navigation.navigate('RemainingCaloriesInfo', {
                                        targetCalories: calorieTarget,
                                        eatenCalories: caloriesEaten,
                                        remainingCalories,
                                    })}
                                    accessibilityRole="button"
                                    accessibilityLabel="How remaining calories are calculated"
                                >
                                    <Icon name="help" size={11} color={colors.primary} />
                                </Pressable>
                            </View>
                            <Text style={[styles.metricValue, isOverCalorieTarget && styles.metricValueOver]}>
                                {isOverCalorieTarget ? overCalories : remainingCalories}
                            </Text>
                            <Text style={styles.metricCaption}>
                                {isOverCalorieTarget ? 'kcal over target today' : 'kcal left today'}
                            </Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Protein Remaining</Text>
                            <Text style={styles.metricValue}>{Math.max(Math.round(summary.remaining_protein), 0)}g</Text>
                            <Text style={styles.metricCaption}>to hit target</Text>
                        </View>
                    </View>

                    <View style={styles.stepsCard}>
                        <View style={styles.stepsTop}>
                            <View style={styles.stepsIconWrap}>
                                <MaterialIcon name="walk" size={24} color={colors.accent} />
                            </View>
                            <View style={styles.stepsTextWrap}>
                                <View style={styles.stepsLabelRow}>
                                    <Text style={styles.stepsLabel}>Daily Activity</Text>
                                    <Pressable
                                        style={styles.infoBadge}
                                        onPress={() => navigation.navigate('ActivityInfo', {
                                            steps: activitySummary.steps_count,
                                            stepGoal: activitySummary.step_goal,
                                            caloriesFromSteps: Math.round(activitySummary.calories_from_steps),
                                        })}
                                        accessibilityRole="button"
                                        accessibilityLabel="How daily activity is calculated"
                                    >
                                        <Icon name="help" size={11} color={colors.primary} />
                                    </Pressable>
                                </View>
                                <Text style={styles.stepsValue}>
                                    {activitySummary.steps_count.toLocaleString()} / {activitySummary.step_goal.toLocaleString()} steps
                                </Text>
                                <Text style={styles.stepsSyncText}>{formatLastSync()}</Text>
                            </View>
                            <Text style={styles.burnedText}>+{Math.round(activitySummary.calories_from_steps)} cal</Text>
                        </View>

                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.min(stepPercentage, 100)}%` }]} />
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Text style={styles.sectionTitle}>Macro Progress</Text>
                                <Pressable
                                    style={styles.infoBadge}
                                    onPress={() => navigation.navigate('MacroInfo', {
                                        protein: Math.round(summary.total_protein),
                                        proteinTarget: Math.round(summary.protein_target),
                                        carbs: Math.round(summary.total_carbs),
                                        carbsTarget: Math.round(summary.carbs_target),
                                        fats: Math.round(summary.total_fat),
                                        fatsTarget: Math.round(summary.fat_target),
                                        calories: Math.round(summary.total_calories),
                                        caloriesTarget: Math.round(summary.calorie_target),
                                    })}
                                    accessibilityRole="button"
                                    accessibilityLabel="How macro progress is calculated"
                                >
                                    <Icon name="help" size={11} color={colors.primary} />
                                </Pressable>
                            </View>
                            <Text style={[styles.sectionTag, isOverCalorieTarget && styles.sectionTagOver]}>
                                {isOverCalorieTarget ? `${overCalories} kcal over` : `${Math.round(caloriePercentage)}% done`}
                            </Text>
                        </View>

                        {macroData.map((macro) => {
                            const percentage = (macro.value / macro.target) * 100
                            const macroOver = macro.name === 'Calories' ? Math.max(Math.round(macro.value - macro.target), 0) : 0
                            return (
                                <View key={macro.name} style={styles.macroItem}>
                                    <View style={styles.macroRowTop}>
                                        <Text style={styles.macroName}>{macro.icon} {macro.name}</Text>
                                        <Text style={styles.macroValue}>
                                            {macro.value} / {macro.target} {macro.unit}
                                            {macroOver > 0 ? `  (+${macroOver} over)` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.macroTrack}>
                                        <View
                                            style={[
                                                styles.macroFill,
                                                {
                                                    width: `${Math.min(percentage, 100)}%`,
                                                    backgroundColor: macro.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            )
                        })}
                    </View>

                    <TouchableOpacity style={styles.logButton} activeOpacity={0.9} onPress={() => (navigation as any).navigate('Log')}>
                        <Icon name="mic" size={20} color="#FFFFFF" />
                        <Text style={styles.logButtonText}>Log Your Meal</Text>
                    </TouchableOpacity>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Meal Timeline</Text>
                        <View style={styles.timelineList}>
                            {timeline.length ? timeline.map((item) => (
                                <View key={item.id} style={styles.timelineCard}>
                                    <View style={styles.timelineLeft}>
                                        <View
                                            style={[
                                                styles.mealIconWrap,
                                                {
                                                    backgroundColor:
                                                        item.meal_type === 'BREAKFAST' ? '#FFF2E6' :
                                                            item.meal_type === 'LUNCH' ? '#E8F7F3' : '#FDEDEA',
                                                },
                                            ]}
                                        >
                                            <FontAwesome
                                                name={item.meal_type === 'BREAKFAST' ? 'egg' : item.meal_type === 'LUNCH' ? 'utensils' : 'coffee'}
                                                size={18}
                                                color={
                                                    item.meal_type === 'BREAKFAST' ? colors.accent :
                                                        item.meal_type === 'LUNCH' ? colors.success : colors.danger
                                                }
                                            />
                                        </View>
                                        <View style={styles.timelineTextWrap}>
                                            <Text style={styles.timelineMeal}>{item.meal_type}</Text>
                                            <Text style={styles.timelineDetails}>
                                                {item.meal_items.slice(0, 3).map((food) => food.food_name).join(', ') || 'No items'}
                                            </Text>
                                            <Text style={styles.timelineTime}>
                                                {new Date(item.logged_at).toLocaleTimeString('en-IN', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.timelineRight}>
                                        <Text style={styles.timelineCalories}>{Math.round(item.total_calories)} kcal</Text>
                                        <Text style={styles.timelineProtein}>{Math.round(item.total_protein)}g protein</Text>
                                    </View>
                                </View>
                            )) : (
                                <Text style={styles.timelineDetails}>No meals logged today. Tap Log Your Meal to start.</Text>
                            )}
                        </View>
                    </View>
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
    scrollContent: {
        paddingBottom: 110,
    },
    container: {
        paddingHorizontal: IS_SMALL_DEVICE ? 14 : 18,
        paddingTop: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    dateText: {
        fontSize: 13,
        color: colors.muted,
        fontWeight: '500',
    },
    headingText: {
        marginTop: 2,
        fontSize: IS_SMALL_DEVICE ? 20 : 22,
        fontWeight: '700',
        color: colors.primary,
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    streakBtn: {
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFF4E8',
        borderWidth: 1,
        borderColor: '#F7D8BA',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 12,
    },
    streakBtnText: {
        color: '#A85D16',
        fontSize: 14,
        fontWeight: '800',
    },
    avatarWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E8EFF8',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeCard: {
        borderRadius: 24,
        padding: IS_SMALL_DEVICE ? 16 : 20,
        marginBottom: 14,
        shadowColor: '#173152',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 5,
    },
    welcomeTitle: {
        fontSize: IS_SMALL_DEVICE ? 22 : 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    welcomeSubtitle: {
        marginTop: 5,
        fontSize: 14,
        color: 'rgba(255,255,255,0.86)',
    },
    goalPill: {
        marginTop: 14,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FAD8B6',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 30,
    },
    goalPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    metricsRow: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    metricCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: IS_SMALL_DEVICE ? 12 : 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metricGap: {
        marginRight: 10,
    },
    metricLabel: {
        fontSize: 12,
        color: colors.muted,
        fontWeight: '500',
    },
    metricLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricValue: {
        fontSize: IS_SMALL_DEVICE ? 22 : 24,
        fontWeight: '700',
        color: colors.primary,
        marginTop: 4,
    },
    metricCaption: {
        fontSize: 12,
        color: colors.secondary,
        marginTop: 2,
    },
    metricValueOver: {
        color: colors.danger,
    },
    stepsCard: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: IS_SMALL_DEVICE ? 12 : 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
    },
    stepsTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepsIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFF2E6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepsTextWrap: {
        flex: 1,
        marginLeft: 10,
    },
    stepsLabel: {
        fontSize: 12,
        color: colors.muted,
    },
    stepsLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    stepsValue: {
        marginTop: 2,
        fontSize: IS_SMALL_DEVICE ? 14 : 15,
        fontWeight: '700',
        color: colors.primary,
    },
    stepsSyncText: {
        marginTop: 2,
        fontSize: 11,
        color: colors.muted,
    },
    burnedText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.success,
    },
    progressTrack: {
        marginTop: 12,
        height: 7,
        backgroundColor: colors.track,
        borderRadius: 7,
        overflow: 'hidden',
    },
    progressFill: {
        height: 7,
        backgroundColor: colors.success,
        borderRadius: 7,
    },
    sectionCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: IS_SMALL_DEVICE ? 14 : 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: IS_SMALL_DEVICE ? 17 : 18,
        fontWeight: '700',
        color: colors.primary,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTag: {
        fontSize: 12,
        color: colors.accent,
        fontWeight: '700',
    },
    sectionTagOver: {
        color: colors.danger,
    },
    infoBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#E7EDF7',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    macroItem: {
        marginBottom: 12,
    },
    macroRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 7,
    },
    macroName: {
        fontSize: 14,
        color: colors.secondary,
        fontWeight: '600',
    },
    macroValue: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '700',
    },
    macroTrack: {
        height: 9,
        backgroundColor: colors.track,
        borderRadius: 8,
        overflow: 'hidden',
    },
    macroFill: {
        height: 9,
        borderRadius: 8,
    },
    logButton: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        paddingVertical: 15,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
    logButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    timelineList: {
        marginTop: 12,
        gap: 10,
    },
    timelineCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FBFCFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 11,
    },
    timelineLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 8,
    },
    mealIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineTextWrap: {
        marginLeft: 10,
        flex: 1,
    },
    timelineMeal: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    timelineDetails: {
        marginTop: 2,
        fontSize: 12,
        color: colors.secondary,
    },
    timelineTime: {
        marginTop: 2,
        fontSize: 11,
        color: colors.muted,
    },
    timelineRight: {
        alignItems: 'flex-end',
        minWidth: IS_SMALL_DEVICE ? 74 : 84,
    },
    timelineCalories: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.accent,
    },
    timelineProtein: {
        marginTop: 3,
        fontSize: 11,
        color: colors.success,
    },
})

export default DashboardHomeScreen