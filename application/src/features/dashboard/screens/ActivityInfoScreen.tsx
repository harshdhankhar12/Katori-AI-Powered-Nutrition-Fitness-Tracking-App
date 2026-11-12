import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, type RouteProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../../navigation/types'

type ScreenRoute = RouteProp<HomeStackParamList, 'ActivityInfo'>

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    success: '#2A9D8F',
    border: '#E6ECF4',
}

const ActivityInfoScreen = () => {
    const route = useRoute<ScreenRoute>()
    const { steps, stepGoal, caloriesFromSteps } = route.params
    const progress = stepGoal > 0 ? Math.min(Math.round((steps / stepGoal) * 100), 100) : 0

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Transparency</Text>
                    <Text style={styles.title}>Daily Activity</Text>
                    <Text style={styles.subtitle}>This is how your activity block and step progress are calculated.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Formula</Text>
                    <Text style={styles.formula}>Progress % = (Steps / Step Goal) x 100</Text>
                    <Text style={styles.formula}>Activity Calories = calories reported by Google Fit for today</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Your Numbers Today</Text>
                    <View style={styles.row}><Text style={styles.label}>Steps</Text><Text style={styles.value}>{steps.toLocaleString()}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Step Goal</Text><Text style={styles.value}>{stepGoal.toLocaleString()}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Progress</Text><Text style={styles.value}>{progress}%</Text></View>
                    <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Activity Calories</Text><Text style={styles.totalValue}>+{caloriesFromSteps} kcal</Text></View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>What This Means</Text>
                    <Text style={styles.note}>Step count comes from Google Fit sync. If sync is off, the app shows the latest saved value from your account.</Text>
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
    eyebrow: { color: colors.success, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
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
    totalValue: { color: colors.success, fontSize: 16, fontWeight: '700' },
    note: { color: colors.secondary, fontSize: 14, lineHeight: 22 },
})

export default ActivityInfoScreen
