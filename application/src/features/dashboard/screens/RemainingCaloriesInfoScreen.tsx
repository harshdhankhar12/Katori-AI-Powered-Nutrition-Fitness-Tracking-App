import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, type RouteProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../../navigation/types'

type ScreenRoute = RouteProp<HomeStackParamList, 'RemainingCaloriesInfo'>

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    border: '#E6ECF4',
}

const RemainingCaloriesInfoScreen = () => {
    const route = useRoute<ScreenRoute>()
    const { targetCalories, eatenCalories, remainingCalories } = route.params
    const overCalories = Math.max(eatenCalories - targetCalories, 0)
    const isOverTarget = overCalories > 0

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Transparency</Text>
                    <Text style={styles.title}>Remaining Calories</Text>
                    <Text style={styles.subtitle}>This is how we calculate what is left for your day.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Formula</Text>
                    <Text style={styles.formula}>Remaining = Daily Target - Calories Eaten</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Your Numbers Today</Text>
                    <View style={styles.row}><Text style={styles.label}>Daily Target</Text><Text style={styles.value}>{targetCalories} kcal</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Calories Eaten</Text><Text style={styles.value}>{eatenCalories} kcal</Text></View>
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>{isOverTarget ? 'Over Target By' : 'Remaining'}</Text>
                        <Text style={[styles.totalValue, isOverTarget && styles.overValue]}>
                            {isOverTarget ? `${overCalories} kcal` : `${remainingCalories} kcal`}
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>What This Means</Text>
                    <Text style={styles.note}>
                        {isOverTarget
                            ? 'You have consumed more than your daily target today. This is shown as an over-target amount.'
                            : 'When you log meals, remaining calories go down. Activity calories are tracked separately in the Daily Activity card and do not increase this value.'}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 18, paddingBottom: 36, gap: 14 },
    heroCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
    title: { color: colors.primary, fontSize: 24, fontWeight: '700' },
    subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 20 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    sectionTitle: { color: colors.primary, fontSize: 16, fontWeight: '700' },
    formula: { color: colors.secondary, fontSize: 14, lineHeight: 22, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: colors.secondary, fontSize: 14 },
    value: { color: colors.primary, fontSize: 14, fontWeight: '700' },
    totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2 },
    totalLabel: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    totalValue: { color: colors.accent, fontSize: 16, fontWeight: '700' },
    overValue: { color: '#E76F51' },
    note: { color: colors.secondary, fontSize: 14, lineHeight: 22 },
})

export default RemainingCaloriesInfoScreen
