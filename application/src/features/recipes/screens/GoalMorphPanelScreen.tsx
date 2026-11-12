import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { recipeApi } from '../services/recipeApi'
import type { MorphResult, RecipeDetail, RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'GoalMorphPanel'>
type RouteProps = RouteProp<RecipeStackParamList, 'GoalMorphPanel'>

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

const modeList: Array<{ key: 'WEIGHT_LOSS' | 'LEAN' | 'BULK'; label: string }> = [
    { key: 'WEIGHT_LOSS', label: 'Weight Loss' },
    { key: 'LEAN', label: 'Lean' },
    { key: 'BULK', label: 'Bulk' },
]

const GoalMorphPanelScreen = () => {
    const navigation = useNavigation<NavProp>()
    const route = useRoute<RouteProps>()
    const recipeId = route.params.recipeId

    const [base, setBase] = useState<RecipeDetail | null>(null)
    const [mode, setMode] = useState<'WEIGHT_LOSS' | 'LEAN' | 'BULK'>('LEAN')
    const [portion, setPortion] = useState(1)
    const [loading, setLoading] = useState(true)
    const [morphing, setMorphing] = useState(false)
    const [applying, setApplying] = useState(false)
    const [result, setResult] = useState<MorphResult | null>(null)

    const loadRecipe = useCallback(async () => {
        try {
            setLoading(true)
            const data = await recipeApi.getDetail(recipeId)
            setBase(data)
        } catch (error) {
            console.error('Goal morph base load error:', error)
            Alert.alert('Goal Morph', 'Could not load recipe details.')
        } finally {
            setLoading(false)
        }
    }, [recipeId])

    useFocusEffect(
        useCallback(() => {
            loadRecipe()
        }, [loadRecipe])
    )

    const runMorph = useCallback(async () => {
        try {
            setMorphing(true)
            const data = await recipeApi.morphRecipe(recipeId, {
                goalMode: mode,
                portionMultiplier: portion,
                persist: false,
            })
            setResult(data)
        } catch (error) {
            console.error('Goal morph error:', error)
            Alert.alert('Goal Morph', 'Could not apply this morph mode right now.')
        } finally {
            setMorphing(false)
        }
    }, [mode, portion, recipeId])

    const onApplyAndLog = async () => {
        try {
            setApplying(true)
            const applied = await recipeApi.morphRecipe(recipeId, {
                goalMode: mode,
                portionMultiplier: portion,
                persist: true,
            })
            setResult(applied)
            if (!applied.custom_recipe_id) {
                throw new Error('Custom recipe was not created')
            }
            await recipeApi.logCustomRecipe(applied.custom_recipe_id, {
                mealType: base?.meal_type || 'LUNCH',
                servings: 1,
            })
            Alert.alert('Logged', 'Custom morphed recipe logged to your meals.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ])
        } catch (error) {
            console.error('Apply and log error:', error)
            Alert.alert('Goal Morph', 'Could not log morphed recipe right now.')
        } finally {
            setApplying(false)
        }
    }

    const previewNutrition = useMemo(() => {
        if (result) return result.modified
        if (!base) return { calories: 0, protein: 0, carbs: 0, fat: 0, servings: 1 }
        return base.nutrition
    }, [base, result])

    if (loading || !base) {
        return (
            <SafeAreaView style={styles.screen}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Goal-Morph</Text>
                    <View style={styles.iconBtn} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.recipeName}>{base.name}</Text>
                    <Text style={styles.recipeSub}>Adjust this recipe to your goal and portion.</Text>

                    <View style={styles.modeRow}>
                        {modeList.map((item) => {
                            const active = mode === item.key
                            return (
                                <Pressable
                                    key={item.key}
                                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                                    onPress={() => setMode(item.key)}
                                >
                                    <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>{item.label}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <View style={styles.portionWrap}>
                        <Text style={styles.portionLabel}>Portion Size</Text>
                        <View style={styles.portionRow}>
                            <Pressable
                                style={styles.portionBtn}
                                onPress={() => setPortion((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                            >
                                <Ionicons name="remove" size={16} color={colors.primary} />
                            </Pressable>
                            <Text style={styles.portionValue}>{portion.toFixed(1)}x</Text>
                            <Pressable
                                style={styles.portionBtn}
                                onPress={() => setPortion((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))))}
                            >
                                <Ionicons name="add" size={16} color={colors.primary} />
                            </Pressable>
                        </View>
                    </View>

                    <Pressable style={styles.morphBtn} onPress={runMorph} disabled={morphing}>
                        {morphing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.morphBtnText}>Recalculate</Text>}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Live Macro Comparison</Text>
                    <View style={styles.compareRow}>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareLabel}>Original</Text>
                            <Text style={styles.compareText}>{Math.round(base.nutrition.calories)} kcal</Text>
                            <Text style={styles.compareText}>P {Math.round(base.nutrition.protein)}g</Text>
                            <Text style={styles.compareText}>C {Math.round(base.nutrition.carbs)}g</Text>
                            <Text style={styles.compareText}>F {Math.round(base.nutrition.fat)}g</Text>
                        </View>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareLabel}>Modified</Text>
                            <Text style={styles.compareText}>{Math.round(previewNutrition.calories)} kcal</Text>
                            <Text style={styles.compareText}>P {Math.round(previewNutrition.protein)}g</Text>
                            <Text style={styles.compareText}>C {Math.round(previewNutrition.carbs)}g</Text>
                            <Text style={styles.compareText}>F {Math.round(previewNutrition.fat)}g</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Ingredient Changes</Text>
                    {(result?.ingredient_changes || []).length ? (
                        result!.ingredient_changes.map((item, index) => (
                            <View key={`${item.ingredient_name}-${index}`} style={styles.changeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.changeTitle}>{item.ingredient_name}</Text>
                                    <Text style={styles.changeSub}>{item.quantity} {item.unit}</Text>
                                </View>
                                <Text style={styles.changeReason}>{item.substitution || 'Adjusted'}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Tap Recalculate to see substitutions and quantity updates.</Text>
                    )}
                </View>

                <Pressable style={styles.applyBtn} onPress={onApplyAndLog} disabled={applying || morphing}>
                    {applying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyBtnText}>Apply & Log</Text>}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30, gap: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { color: colors.primary, fontSize: 18, fontWeight: '800' },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
        gap: 10,
    },
    recipeName: { color: colors.primary, fontSize: 16, fontWeight: '800' },
    recipeSub: { color: colors.secondary, fontSize: 12 },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    modeBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#DCE5F1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
    },
    modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeBtnText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    modeBtnTextActive: { color: '#FFFFFF' },
    portionWrap: { gap: 6 },
    portionLabel: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    portionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    portionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: '#DCE5F1',
        backgroundColor: '#F4F8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    portionValue: { color: colors.primary, fontSize: 18, fontWeight: '800', minWidth: 56, textAlign: 'center' },
    morphBtn: {
        marginTop: 4,
        borderRadius: 999,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
    },
    morphBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    sectionTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    compareRow: { flexDirection: 'row', gap: 12 },
    compareCol: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E7EDF7',
        backgroundColor: '#FBFDFF',
        padding: 10,
    },
    compareLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
    compareText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F8',
        paddingVertical: 8,
        gap: 8,
    },
    changeTitle: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    changeSub: { color: colors.secondary, fontSize: 12 },
    changeReason: { color: '#A85D16', fontSize: 11, fontWeight: '700', textAlign: 'right', maxWidth: 140 },
    emptyText: { color: colors.muted, fontSize: 12 },
    applyBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    applyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})

export default GoalMorphPanelScreen
