import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/Ionicons'
import type { LogStackParamList } from '../../../navigation/LogStack'

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

type NavProp = NativeStackNavigationProp<LogStackParamList, 'MealTypeSelection'>

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    border: '#E6ECF4',
    muted: '#8A9AAC',
}

const meals: Array<{ key: MealType; title: string; subtitle: string; icon: string }> = [
    { key: 'BREAKFAST', title: 'Breakfast', subtitle: 'Start with balanced energy', icon: 'sunny' },
    { key: 'LUNCH', title: 'Lunch', subtitle: 'Main meal for sustained fuel', icon: 'restaurant' },
    { key: 'DINNER', title: 'Dinner', subtitle: 'Keep it lighter and protein-rich', icon: 'moon' },
    { key: 'SNACK', title: 'Snack', subtitle: 'Small hunger control meal', icon: 'cafe' },
]

const MealTypeSelectionScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [selectedMeal, setSelectedMeal] = useState<MealType>('LUNCH')

    const selectedLabel = useMemo(
        () => meals.find((item) => item.key === selectedMeal)?.title || 'Lunch',
        [selectedMeal]
    )

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="arrow-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Select Meal Type</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Manual Food Logging</Text>
                    <Text style={styles.heroSubtitle}>
                        Choose the meal you are about to log. You can search foods and add quantities on the next screen.
                    </Text>
                </View>

                <View style={styles.listWrap}>
                    {meals.map((meal) => {
                        const selected = selectedMeal === meal.key
                        return (
                            <Pressable
                                key={meal.key}
                                onPress={() => setSelectedMeal(meal.key)}
                                style={[styles.mealCard, selected && styles.mealCardSelected]}
                            >
                                <View style={[styles.mealIconWrap, selected && styles.mealIconWrapSelected]}>
                                    <Icon name={meal.icon} size={20} color={selected ? '#FFFFFF' : colors.primary} />
                                </View>
                                <View style={styles.mealTextWrap}>
                                    <Text style={[styles.mealTitle, selected && styles.mealTitleSelected]}>{meal.title}</Text>
                                    <Text style={[styles.mealSubtitle, selected && styles.mealSubtitleSelected]}>{meal.subtitle}</Text>
                                </View>
                                {selected ? <Icon name="checkmark-circle" size={20} color="#2A9D8F" /> : null}
                            </Pressable>
                        )
                    })}
                </View>

                <Pressable
                    style={styles.ctaButton}
                    onPress={() => navigation.navigate('FoodSearch', { mealType: selectedMeal })}
                >
                    <Icon name="arrow-forward" size={18} color="#FFFFFF" />
                    <Text style={styles.ctaText}>Continue with {selectedLabel}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { padding: 18, paddingBottom: 30 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
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
    placeholder: { width: 36, height: 36 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 14,
    },
    heroTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
    heroSubtitle: { fontSize: 13, color: colors.secondary, marginTop: 6, lineHeight: 19 },
    listWrap: { gap: 10, marginBottom: 18 },
    mealCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mealCardSelected: {
        borderColor: '#8AB4F8',
        backgroundColor: '#F1F7FF',
    },
    mealIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF3FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mealIconWrapSelected: { backgroundColor: colors.primary },
    mealTextWrap: { flex: 1, marginLeft: 10 },
    mealTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
    mealTitleSelected: { color: colors.primary },
    mealSubtitle: { fontSize: 12, color: colors.muted, marginTop: 3 },
    mealSubtitleSelected: { color: colors.secondary },
    ctaButton: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
})

export default MealTypeSelectionScreen
