import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import type { HomeStackParamList } from '../../../navigation/types'
import api from '../../../services/api'

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'StreakHistory'>

type StreakEntry = {
    date: string
    has_log: boolean
}

type StreakHistoryData = {
    current_streak: number
    longest_streak: number
    total_logged_days: number
    active_today: boolean
    range_start: string
    range_end: string
    entries: StreakEntry[]
}

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    success: '#2A9D8F',
    muted: '#8A9AAC',
    border: '#E6ECF4',
}

const dayKey = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const StreakHistoryScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<StreakHistoryData>({
        current_streak: 0,
        longest_streak: 0,
        total_logged_days: 0,
        active_today: false,
        range_start: new Date().toISOString(),
        range_end: new Date().toISOString(),
        entries: [],
    })

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                setLoading(true)
                try {
                    const response = await api.get('/user/streak-history', { params: { days: 180 } })
                    setHistory(response.data.data)
                } catch (error) {
                    console.error('Streak history load error:', error)
                } finally {
                    setLoading(false)
                }
            }

            load()
        }, [])
    )

    const streakDaySet = useMemo(() => {
        const set = new Set<string>()
        history.entries.forEach((entry) => {
            if (!entry.has_log) return
            const date = new Date(entry.date)
            if (Number.isNaN(date.getTime())) return
            set.add(dayKey(date))
        })
        return set
    }, [history.entries])

    const recentDays = useMemo(() => {
        const list: Array<{ key: string; label: string; active: boolean; today: boolean }> = []
        const now = new Date()

        for (let index = 34; index >= 0; index -= 1) {
            const value = new Date(now)
            value.setDate(now.getDate() - index)
            const key = dayKey(value)
            list.push({
                key,
                label: String(value.getDate()),
                active: streakDaySet.has(key),
                today: index === 0,
            })
        }

        return list
    }, [streakDaySet])

    const sortedEntries = useMemo(() => {
        return [...history.entries]
            .filter((entry) => entry.has_log)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [history.entries])

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            <View style={styles.headerRow}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={18} color={colors.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Streak History</Text>
                <View style={styles.backBtn} />
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroCard}>
                        <Text style={styles.heroLabel}>Current Streak</Text>
                        <Text style={styles.heroValue}>{history.current_streak} days</Text>
                        <Text style={styles.heroSub}>
                            {history.active_today ? 'You logged meals today' : 'Log your first meal today to keep the streak alive'}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, styles.statGap]}>
                            <Text style={styles.statLabel}>Longest</Text>
                            <Text style={styles.statValue}>{history.longest_streak}</Text>
                            <Text style={styles.statSub}>days</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Total Logged</Text>
                            <Text style={styles.statValue}>{history.total_logged_days}</Text>
                            <Text style={styles.statSub}>days</Text>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Last 35 Days</Text>
                        <View style={styles.gridWrap}>
                            {recentDays.map((day) => (
                                <View
                                    key={day.key}
                                    style={[
                                        styles.dayCell,
                                        day.active && styles.dayCellActive,
                                        day.today && styles.dayCellToday,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayCellText,
                                            day.active && styles.dayCellTextActive,
                                            day.today && styles.dayCellTextToday,
                                        ]}
                                    >
                                        {day.label}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Logged Days</Text>
                        {sortedEntries.length ? (
                            sortedEntries.map((entry) => {
                                const date = new Date(entry.date)
                                const label = Number.isNaN(date.getTime())
                                    ? '-'
                                    : date.toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })

                                return (
                                    <View key={entry.date} style={styles.historyRow}>
                                        <View style={styles.historyDot} />
                                        <Text style={styles.historyText}>{label}</Text>
                                    </View>
                                )
                            })
                        ) : (
                            <Text style={styles.emptyText}>No streak days yet. Start by logging your first meal.</Text>
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
        fontWeight: '700',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 30,
        gap: 12,
    },
    heroCard: {
        backgroundColor: '#1D3557',
        borderRadius: 20,
        padding: 18,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 12,
        fontWeight: '600',
    },
    heroValue: {
        marginTop: 4,
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
    },
    heroSub: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.84)',
        fontSize: 13,
    },
    statsRow: {
        flexDirection: 'row',
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 14,
    },
    statGap: { marginRight: 10 },
    statLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    statValue: {
        marginTop: 3,
        color: colors.primary,
        fontSize: 24,
        fontWeight: '800',
    },
    statSub: {
        color: colors.secondary,
        fontSize: 12,
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 14,
    },
    sectionTitle: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    gridWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    dayCell: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F7FAFF',
    },
    dayCellActive: {
        backgroundColor: '#FDEAD7',
        borderColor: '#F4A261',
    },
    dayCellToday: {
        borderColor: colors.primary,
    },
    dayCellText: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '600',
    },
    dayCellTextActive: {
        color: '#A85D16',
    },
    dayCellTextToday: {
        color: colors.primary,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F8',
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 10,
    },
    historyText: {
        color: colors.secondary,
        fontSize: 13,
        fontWeight: '600',
    },
    emptyText: {
        color: colors.muted,
        fontSize: 13,
    },
})

export default StreakHistoryScreen
