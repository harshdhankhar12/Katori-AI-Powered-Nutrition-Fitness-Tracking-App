import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import api from '../../../services/api'
import type { LogStackParamList } from '../../../navigation/LogStack'

type LogNavProp = NativeStackNavigationProp<LogStackParamList, 'LogHome'>

type DailyLog = {
    id: string
    meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    logged_at: string
    total_calories: number
    total_protein: number
    meal_items: Array<{
        id: string
        food_name: string
        quantity: number
        unit: string
        calories: number
        protein: number
        carbs: number
        fat: number
        is_custom: boolean
    }>
}

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

const LogFirstMealScreen = () => {
    const navigation = useNavigation<LogNavProp>()
    const [logs, setLogs] = useState<DailyLog[]>([])
    const [loading, setLoading] = useState(false)

    const fetchDailyLogs = useCallback(async () => {
        try {
            setLoading(true)
            const response = await api.get('/food/daily-logs')
            setLogs(response.data.data || [])
        } catch (error) {
            console.error('Daily logs fetch error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            fetchDailyLogs()
        }, [fetchDailyLogs])
    )

    const todayCalories = logs.reduce((sum, item) => sum + item.total_calories, 0)

    const deleteLog = async (logId: string) => {
        try {
            await api.delete(`/food/logs/${logId}`)
            setLogs((prev) => prev.filter((item) => item.id !== logId))
        } catch (error) {
            Alert.alert('Delete failed', 'Unable to delete this meal right now.')
        }
    }

    const confirmDelete = (logId: string) => {
        Alert.alert('Delete meal?', 'This will remove the meal from today timeline and summary.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteLog(logId) },
        ])
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Manual Food Logging</Text>
                    <Text style={styles.heroSubtitle}>
                        Build your daily nutrition journal by selecting meal type, searching food database, and adding quantity.
                    </Text>

                    <View style={styles.ctaRow}>
                        <Pressable style={styles.ctaButtonPrimary} onPress={() => navigation.navigate('MealTypeSelection')}>
                            <Icon name="add-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.ctaTextPrimary}>Manual Log</Text>
                        </Pressable>

                        <Pressable style={styles.ctaButtonSecondary} onPress={() => navigation.navigate('VoiceLog')}>
                            <Icon name="mic" size={18} color={colors.primary} />
                            <Text style={styles.ctaTextSecondary}>Voice Log</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Today Logged</Text>
                    <Text style={styles.summaryValue}>{Math.round(todayCalories)} kcal</Text>
                    <Text style={styles.summarySub}>{logs.length} meal entries today</Text>
                </View>

                <View style={styles.timelineCard}>
                    <Text style={styles.timelineTitle}>Today Timeline</Text>

                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="small" color={colors.secondary} />
                        </View>
                    ) : logs.length ? (
                        <View style={styles.listWrap}>
                            {logs.map((log) => {
                                const logTime = new Date(log.logged_at).toLocaleTimeString('en-IN', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })
                                const itemText = log.meal_items
                                    .slice(0, 3)
                                    .map((item) => `${item.quantity} ${item.unit} ${item.food_name}`)
                                    .join(', ')

                                return (
                                    <View key={log.id} style={styles.logItem}>
                                        <View style={styles.logRowTop}>
                                            <Text style={styles.logMeal}>{log.meal_type}</Text>
                                            <Text style={styles.logCals}>{Math.round(log.total_calories)} kcal</Text>
                                        </View>
                                        <Text style={styles.logDetails}>{itemText || 'No items available'}</Text>
                                        <View style={styles.logFooterRow}>
                                            <Text style={styles.logTime}>{logTime}</Text>
                                            <View style={styles.logActionsRow}>
                                                <Pressable
                                                    style={styles.actionBtn}
                                                    onPress={() =>
                                                        navigation.navigate('FoodSearch', {
                                                            mealType: log.meal_type,
                                                            editLog: {
                                                                id: log.id,
                                                                logged_at: log.logged_at,
                                                                meal_items: log.meal_items,
                                                            },
                                                        })
                                                    }
                                                >
                                                    <Icon name="create-outline" size={16} color={colors.primary} />
                                                </Pressable>
                                                <Pressable style={styles.actionBtn} onPress={() => confirmDelete(log.id)}>
                                                    <Icon name="trash-outline" size={16} color={colors.danger} />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                )
                            })}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No meals logged yet. Tap Log Your Meal to get started.</Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { padding: 18, gap: 12, paddingBottom: 28 },
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
    },
    heroSubtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: colors.secondary,
    },
    ctaRow: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 10,
    },
    ctaButtonPrimary: {
        flex: 1,
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    ctaButtonSecondary: {
        flex: 1,
        borderRadius: 999,
        backgroundColor: '#EEF5FF',
        borderWidth: 1,
        borderColor: '#D8E5F6',
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    ctaTextPrimary: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    ctaTextSecondary: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 15,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    summaryLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    summaryValue: { fontSize: 28, color: colors.primary, fontWeight: '700', marginTop: 3 },
    summarySub: { fontSize: 12, color: colors.secondary, marginTop: 4 },
    timelineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    timelineTitle: { fontSize: 16, color: colors.primary, fontWeight: '700', marginBottom: 8 },
    loadingWrap: { paddingVertical: 16, alignItems: 'center' },
    listWrap: { gap: 8 },
    logItem: {
        backgroundColor: '#F8FAFE',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
    },
    logRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logMeal: { fontSize: 13, color: colors.primary, fontWeight: '700' },
    logCals: { fontSize: 13, color: colors.accent, fontWeight: '700' },
    logDetails: { marginTop: 4, color: colors.secondary, fontSize: 12 },
    logFooterRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logTime: { marginTop: 3, color: colors.muted, fontSize: 11 },
    logActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: { color: colors.muted, fontSize: 13, paddingVertical: 8 },
})

export default LogFirstMealScreen
