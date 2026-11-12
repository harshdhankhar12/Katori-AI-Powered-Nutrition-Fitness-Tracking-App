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
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { recipeApi } from '../services/recipeApi'
import type { MacroGapData, RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'MacroGapFiller'>

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

const MacroGapFillerScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(true)
    const [logging, setLogging] = useState(false)
    const [data, setData] = useState<MacroGapData>({
        remaining: { calories: 0, protein: 0 },
        featured: null,
        alternatives: [],
        reason: '',
    })

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const response = await recipeApi.getMacroGap()
            setData(response)
        } catch (error) {
            console.error('Macro gap load error:', error)
            Alert.alert('Macro Gap', 'Could not load recommendations.')
        } finally {
            setLoading(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            load()
        }, [load])
    )

    const logNow = async () => {
        if (!data.featured) return
        try {
            setLogging(true)
            await recipeApi.logRecipe(data.featured.id, { mealType: data.featured.meal_type, servings: 1 })
            Alert.alert('Logged', 'Matched recipe logged to your meal diary.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ])
        } catch (error) {
            console.error('Macro gap log error:', error)
            Alert.alert('Macro Gap', 'Could not log this recipe right now.')
        } finally {
            setLogging(false)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Macro Gap Filler</Text>
                    <View style={styles.iconBtn} />
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <View style={styles.headerCard}>
                            <Text style={styles.headerCardTitle}>You have {data.remaining.calories} cal and {data.remaining.protein}g protein left</Text>
                            <Text style={styles.headerCardSub}>AI found the closest recipe to fill your macro gap.</Text>
                        </View>

                        {data.featured ? (
                            <View style={styles.featuredCard}>
                                <Text style={styles.featuredName}>{data.featured.name}</Text>
                                <Text style={styles.featuredSub}>{Math.round(data.featured.nutrition.calories)} kcal • {Math.round(data.featured.nutrition.protein)}g protein</Text>

                                <Pressable
                                    style={styles.whyRow}
                                    onPress={() => Alert.alert('Why this?', data.reason || 'Closest match for your remaining macros.')}
                                >
                                    <Ionicons name="help-circle-outline" size={15} color={colors.primary} />
                                    <Text style={styles.whyText}>Why this?</Text>
                                </Pressable>

                                <Pressable style={styles.logBtn} onPress={logNow} disabled={logging}>
                                    {logging ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.logBtnText}>Log Now</Text>}
                                </Pressable>

                                <Pressable
                                    style={styles.altBtn}
                                    onPress={() => {
                                        const fallback = data.alternatives[0]
                                        if (!fallback) return
                                        navigation.navigate('RecipeDetail', { recipeId: fallback.id })
                                    }}
                                >
                                    <Text style={styles.altBtnText}>Not feeling it?</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No close match found right now. Try browsing all recipes.</Text>
                            </View>
                        )}

                        <View style={styles.altSection}>
                            <Text style={styles.altTitle}>Alternative Options</Text>
                            {data.alternatives.map((item) => (
                                <Pressable
                                    key={item.id}
                                    style={styles.altCard}
                                    onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
                                >
                                    <Text style={styles.altName}>{item.name}</Text>
                                    <Text style={styles.altMeta}>{Math.round(item.nutrition.calories)} kcal • {Math.round(item.nutrition.protein)}g protein • {item.cook_time_mins} min</Text>
                                </Pressable>
                            ))}
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
    headerCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
    },
    headerCardTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    headerCardSub: { marginTop: 3, color: colors.secondary, fontSize: 12 },
    featuredCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
    },
    featuredName: { marginTop: 8, color: colors.primary, fontSize: 17, fontWeight: '800' },
    featuredSub: { marginTop: 2, color: colors.secondary, fontSize: 12 },
    whyRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    whyText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    logBtn: {
        marginTop: 12,
        borderRadius: 999,
        backgroundColor: colors.success,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    altBtn: {
        marginTop: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#CFE0F7',
        backgroundColor: '#EDF4FF',
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    altBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    emptyCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 16,
    },
    emptyText: { color: colors.secondary, fontSize: 13 },
    altSection: { marginTop: 4, gap: 8 },
    altTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    altCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 10,
    },
    altName: { color: colors.primary, fontSize: 14, fontWeight: '700' },
    altMeta: { color: colors.secondary, fontSize: 12, marginTop: 3 },
})

export default MacroGapFillerScreen
