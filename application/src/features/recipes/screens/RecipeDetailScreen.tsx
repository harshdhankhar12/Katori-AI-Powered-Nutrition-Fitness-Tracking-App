import React, { useCallback, useState } from 'react'
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
import type { RecipeDetail, RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'RecipeDetail'>
type RouteProps = RouteProp<RecipeStackParamList, 'RecipeDetail'>

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

const RecipeDetailScreen = () => {
    const navigation = useNavigation<NavProp>()
    const route = useRoute<RouteProps>()
    const recipeId = route.params.recipeId
    const customRecipeId = route.params.customRecipeId
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [logging, setLogging] = useState(false)
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const data = customRecipeId
                ? await recipeApi.getCustomDetail(customRecipeId)
                : await recipeApi.getDetail(String(recipeId || ''))
            setRecipe(data)
        } catch (error) {
            console.error('Recipe detail load error:', error)
            Alert.alert('Recipe', 'Could not load recipe details.')
        } finally {
            setLoading(false)
        }
    }, [customRecipeId, recipeId])

    useFocusEffect(
        useCallback(() => {
            load()
        }, [load])
    )

    const onToggleFavorite = async () => {
        if (!recipeId || customRecipeId || !recipe) return
        try {
            setSaving(true)
            if (recipe.is_favorite) {
                await recipeApi.unsaveRecipe(recipeId)
                setRecipe({ ...recipe, is_favorite: false })
            } else {
                await recipeApi.saveRecipe(recipeId, true)
                setRecipe({ ...recipe, is_favorite: true })
            }
        } catch (error) {
            console.error('Recipe favorite error:', error)
            Alert.alert('Recipe', 'Could not update favorite right now.')
        } finally {
            setSaving(false)
        }
    }

    const onLogMeal = async () => {
        if (!recipe) return
        try {
            setLogging(true)
            if (customRecipeId) {
                await recipeApi.logCustomRecipe(customRecipeId, { mealType: recipe.meal_type, servings: 1 })
            } else if (recipeId) {
                await recipeApi.logRecipe(recipeId, { mealType: recipe.meal_type, servings: 1 })
            }
            Alert.alert('Logged', 'Recipe meal added to your food log.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ])
        } catch (error) {
            console.error('Recipe log error:', error)
            Alert.alert('Recipe', 'Could not log this meal right now.')
        } finally {
            setLogging(false)
        }
    }

    if (loading || !recipe) {
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
                    <Pressable style={styles.iconBtn} onPress={onToggleFavorite} disabled={saving || Boolean(customRecipeId)}>
                        <Ionicons
                            name={recipe.is_favorite ? 'heart' : 'heart-outline'}
                            size={18}
                            color={recipe.is_favorite ? '#E76F51' : colors.primary}
                        />
                    </Pressable>
                </View>

                <Text style={styles.title}>{recipe.name}</Text>
                <Text style={styles.sub}>{recipe.description || `${recipe.meal_type} recipe`}</Text>

                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.round(recipe.nutrition.calories)} kcal</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.round(recipe.nutrition.protein)}g protein</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.round(recipe.nutrition.carbs)}g carbs</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeText}>{Math.round(recipe.nutrition.fat)}g fat</Text></View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoText}>{recipe.cook_time_mins} min</Text>
                    <Text style={styles.infoText}>{recipe.difficulty}</Text>
                    <Text style={styles.infoText}>{recipe.meal_type}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {recipe.ingredients.map((item, index) => (
                        <View key={`${item.ingredient_name}-${index}`} style={styles.rowBetween}>
                            <Text style={styles.rowText}>{item.ingredient_name}</Text>
                            <Text style={styles.rowTextMuted}>{item.quantity} {item.unit}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    {recipe.instructions.map((item, index) => (
                        <View key={`${item.step_number}-${index}`} style={styles.stepRow}>
                            <View style={styles.stepNo}><Text style={styles.stepNoText}>{item.step_number}</Text></View>
                            <Text style={styles.stepText}>{item.instruction}</Text>
                        </View>
                    ))}
                </View>

                {!customRecipeId ? (
                    <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => recipeId && navigation.navigate('GoalMorphPanel', { recipeId })}
                    >
                        <Ionicons name="options-outline" size={16} color={colors.primary} />
                        <Text style={styles.secondaryBtnText}>Goal-Morphing Toggle</Text>
                    </Pressable>
                ) : null}

                <Pressable style={styles.primaryBtn} onPress={onLogMeal} disabled={logging}>
                    {logging ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Log This Meal</Text>}
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
    title: { color: colors.primary, fontSize: 22, fontWeight: '800' },
    sub: { color: colors.secondary, fontSize: 13 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#DCE5F1',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    badgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    infoRow: { flexDirection: 'row', gap: 10 },
    infoText: { color: '#6E7D8F', fontSize: 12, fontWeight: '700' },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
        gap: 8,
    },
    sectionTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    rowTextMuted: { color: colors.secondary, fontSize: 13 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    stepNo: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EDF4FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNoText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
    stepText: { flex: 1, color: colors.secondary, fontSize: 13, lineHeight: 19 },
    secondaryBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#CFE0F7',
        backgroundColor: '#EDF4FF',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 7,
        paddingVertical: 12,
    },
    secondaryBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    primaryBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
})

export default RecipeDetailScreen
