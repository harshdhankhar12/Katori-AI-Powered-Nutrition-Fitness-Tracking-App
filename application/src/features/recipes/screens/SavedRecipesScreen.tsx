import React, { useCallback, useState } from 'react'
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
import { recipeApi } from '../services/recipeApi'
import type { RecipeStackParamList, SavedRecipesData } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'SavedRecipes'>

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

const SavedRecipesScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(true)
    const [gridMode, setGridMode] = useState(false)
    const [data, setData] = useState<SavedRecipesData>({ favorites: [], custom_recipes: [] })

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const response = await recipeApi.getSaved()
            setData(response)
        } catch (error) {
            console.error('Saved recipe load error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            load()
        }, [load])
    )

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Saved Recipes</Text>
                    <Pressable style={styles.iconBtn} onPress={() => setGridMode((prev) => !prev)}>
                        <Ionicons name={gridMode ? 'list-outline' : 'grid-outline'} size={18} color={colors.primary} />
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Favorites</Text>
                            {data.favorites.length ? (
                                <View style={gridMode ? styles.gridWrap : styles.listWrap}>
                                    {data.favorites.map((item) => (
                                        <Pressable
                                            key={item.id}
                                            style={[styles.recipeCard, gridMode && styles.recipeCardGrid]}
                                            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
                                        >
                                            <View style={styles.recipeBody}>
                                                <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
                                                <Text style={styles.recipeSub}>{Math.round(item.nutrition.calories)} kcal • {Math.round(item.nutrition.protein)}g protein</Text>
                                                <Text style={styles.recipeTimes}>Logged {item.times_logged} times</Text>
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>No saved recipes yet.</Text>
                            )}
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Custom Recipes</Text>
                            {data.custom_recipes.length ? (
                                data.custom_recipes.map((item) => (
                                    <Pressable
                                        key={item.id}
                                        style={styles.customRow}
                                        onPress={() => navigation.navigate('RecipeDetail', { customRecipeId: item.id })}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.customTitle}>{item.name}</Text>
                                            <Text style={styles.customSub}>{item.goal_mode} • {Math.round(item.nutrition.calories || 0)} kcal</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No custom recipes yet. Use Goal-Morph and apply once.</Text>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26, gap: 10 },
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
    loadingWrap: { paddingVertical: 80, alignItems: 'center' },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
    },
    sectionTitle: { color: colors.primary, fontSize: 15, fontWeight: '800', marginBottom: 8 },
    listWrap: { gap: 8 },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recipeCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E7EDF7',
        backgroundColor: '#FBFDFF',
    },
    recipeCardGrid: { width: '48%' },
    recipeBody: { padding: 10 },
    recipeName: { color: colors.primary, fontSize: 13, fontWeight: '800' },
    recipeSub: { color: colors.secondary, fontSize: 11, marginTop: 2 },
    recipeTimes: { color: '#A85D16', fontSize: 11, marginTop: 4, fontWeight: '700' },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F8',
        paddingVertical: 10,
        gap: 8,
    },
    customTitle: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    customSub: { color: colors.secondary, fontSize: 11, marginTop: 2 },
    emptyText: { color: colors.muted, fontSize: 12 },
})

export default SavedRecipesScreen
