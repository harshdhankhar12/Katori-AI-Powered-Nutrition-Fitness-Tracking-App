import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { recipeApi } from '../services/recipeApi'
import type { RecipeCard, RecipeHomeData, RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'RecipeHome'>

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

const mealFilters = ['ALL', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']
const tagFilters = ['all', 'high-protein', 'low-carb', 'veg', 'non-veg']

const RecipeHomeScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [selectedMeal, setSelectedMeal] = useState('ALL')
    const [selectedTag, setSelectedTag] = useState('all')
    const [homeData, setHomeData] = useState<RecipeHomeData>({
        recipes: [],
        for_you: [],
        for_you_reasoning: '',
        popular_this_week: [],
        remaining: { calories: 0, protein: 0 },
    })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await recipeApi.getHome({
                query: query.trim() || undefined,
                mealType: selectedMeal !== 'ALL' ? selectedMeal : undefined,
                tag: selectedTag !== 'all' ? selectedTag : undefined,
            })
            setHomeData(data)
        } catch (error) {
            console.error('Recipe home load error:', error)
        } finally {
            setLoading(false)
        }
    }, [query, selectedMeal, selectedTag])

    useFocusEffect(
        useCallback(() => {
            load()
        }, [load])
    )

    const displayCards = useMemo(() => {
        if (query.trim()) return homeData.recipes
        return homeData.for_you.length ? homeData.for_you : homeData.recipes
    }, [homeData, query])

    const renderRecipeCard = (recipe: RecipeCard) => (
        <Pressable
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
        >
            <View style={styles.recipeBody}>
                <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
                <Text style={styles.recipeSub} numberOfLines={1}>{recipe.description || `${recipe.meal_type} recipe`}</Text>
                <View style={styles.recipeMetaRow}>
                    <Text style={styles.recipeMeta}>{Math.round(recipe.nutrition.calories)} kcal</Text>
                    <Text style={styles.recipeMeta}>{Math.round(recipe.nutrition.protein)}g protein</Text>
                    <Text style={styles.recipeMeta}>{recipe.cook_time_mins} min</Text>
                </View>
            </View>
        </Pressable>
    )

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Recipes</Text>
                    <View style={styles.headerActions}>
                        <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('MacroGapFiller')}>
                            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('SavedRecipes')}>
                            <Ionicons name="heart-outline" size={18} color={colors.primary} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={17} color={colors.muted} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search by name, ingredient, macro"
                        placeholderTextColor={colors.muted}
                        style={styles.searchInput}
                        onSubmitEditing={load}
                    />
                    <Pressable onPress={load} style={styles.searchGo}>
                        <Text style={styles.searchGoText}>Go</Text>
                    </Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {mealFilters.map((item) => {
                        const active = selectedMeal === item
                        return (
                            <Pressable
                                key={item}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setSelectedMeal(item)}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {tagFilters.map((item) => {
                        const active = selectedTag === item
                        return (
                            <Pressable
                                key={item}
                                style={[styles.chip, active && styles.chipActiveSecondary]}
                                onPress={() => setSelectedTag(item)}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActiveSecondary]}>{item}</Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <View style={styles.macroGapCard}>
                    <Text style={styles.macroGapTitle}>You have {homeData.remaining.calories} cal and {homeData.remaining.protein}g protein left</Text>
                    <Text style={styles.macroGapSub}>Open Macro Gap Filler for the best matched recipe.</Text>
                    <Pressable style={styles.macroGapBtn} onPress={() => navigation.navigate('MacroGapFiller')}>
                        <Text style={styles.macroGapBtnText}>Find Best Match</Text>
                    </Pressable>
                </View>

                <View style={styles.sectionHeadRow}>
                    <Text style={styles.sectionTitle}>For You</Text>
                    <Text style={styles.sectionSub}>{homeData.for_you_reasoning || 'Based on your recent logs'}</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <View style={styles.gridWrap}>
                        {displayCards.map((recipe) => renderRecipeCard(recipe))}
                    </View>
                )}

                <View style={styles.sectionHeadRow}>
                    <Text style={styles.sectionTitle}>Popular this week</Text>
                </View>
                <View style={styles.gridWrap}>
                    {homeData.popular_this_week.slice(0, 4).map((recipe) => renderRecipeCard(recipe))}
                </View>

                <Pressable style={styles.fridgeBtn} onPress={() => navigation.navigate('FridgeToPlate')}>
                    <Ionicons name="cube-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.fridgeBtnText}>Fridge-to-Plate</Text>
                </Pressable>

                <Pressable style={styles.createBtn} onPress={() => navigation.navigate('CreateCustomRecipe')}>
                    <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.createBtnText}>Create Custom Recipe</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26, gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: colors.primary, fontSize: 24, fontWeight: '800' },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchWrap: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
    },
    searchInput: { flex: 1, color: colors.primary, marginLeft: 8, paddingVertical: 10 },
    searchGo: {
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#EDF4FF',
    },
    searchGoText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    chip: {
        borderWidth: 1,
        borderColor: '#DCE5F1',
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
    chipActiveSecondary: { backgroundColor: '#FDF1E5', borderColor: '#F4A261' },
    chipText: { color: colors.secondary, fontWeight: '700', fontSize: 12 },
    chipTextActive: { color: '#FFFFFF' },
    chipTextActiveSecondary: { color: '#A85D16' },
    macroGapCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 14,
    },
    macroGapTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
    macroGapSub: { color: colors.secondary, fontSize: 12, marginTop: 4 },
    macroGapBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: colors.accent,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    macroGapBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
    sectionHeadRow: { marginTop: 2 },
    sectionTitle: { color: colors.primary, fontSize: 16, fontWeight: '800' },
    sectionSub: { color: colors.secondary, fontSize: 12, marginTop: 3 },
    loadingWrap: { paddingVertical: 26, alignItems: 'center' },
    gridWrap: { gap: 10 },
    recipeCard: {
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
    },
    recipeBody: { padding: 12 },
    recipeName: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    recipeSub: { color: colors.secondary, fontSize: 12, marginTop: 2 },
    recipeMetaRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
    recipeMeta: { color: '#6F7D8E', fontSize: 12, fontWeight: '700' },
    fridgeBtn: {
        marginTop: 8,
        borderRadius: 999,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 12,
    },
    fridgeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    createBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 12,
    },
    createBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
})

export default RecipeHomeScreen
