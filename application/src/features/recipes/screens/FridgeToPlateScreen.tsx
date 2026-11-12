import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
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
import type { FridgeIngredient, FridgeGenerateData, RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'FridgeToPlate'>

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

const staples = ['atta', 'dal', 'rice', 'onion', 'tomato', 'jeera', 'turmeric', 'salt', 'chilli']

const FridgeToPlateScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [nameInput, setNameInput] = useState('')
    const [qtyInput, setQtyInput] = useState('1')
    const [unitInput, setUnitInput] = useState('piece')
    const [fridge, setFridge] = useState<FridgeIngredient[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [generated, setGenerated] = useState<FridgeGenerateData | null>(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const items = await recipeApi.getFridge()
            setFridge(items)
            setSelected(items.map((item) => item.ingredient_name))
        } catch (error) {
            console.error('Fridge load error:', error)
            Alert.alert('Fridge', 'Could not load your pantry right now.')
        } finally {
            setLoading(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            load()
        }, [load])
    )

    const selectedSet = useMemo(() => new Set(selected), [selected])

    const toggleIngredient = (name: string) => {
        setSelected((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
    }

    const addIngredient = async (ingredientName: string) => {
        const normalized = ingredientName.trim().toLowerCase()
        if (!normalized) return

        try {
            setSaving(true)
            await recipeApi.upsertFridge({
                ingredient_name: normalized,
                quantity: Math.max(0.1, Number(qtyInput || 1)),
                unit: unitInput.trim().toLowerCase() || 'piece',
            })
            setNameInput('')
            setQtyInput('1')
            setUnitInput('piece')
            await load()
        } catch (error) {
            console.error('Fridge add error:', error)
            Alert.alert('Fridge', 'Could not add this ingredient.')
        } finally {
            setSaving(false)
        }
    }

    const removeIngredient = async (id: string) => {
        try {
            await recipeApi.deleteFridge(id)
            await load()
        } catch (error) {
            console.error('Fridge remove error:', error)
            Alert.alert('Fridge', 'Could not remove this ingredient.')
        }
    }

    const generate = async () => {
        if (!selected.length) {
            Alert.alert('Fridge', 'Select at least one ingredient to generate recipes.')
            return
        }

        try {
            setGenerating(true)
            const data = await recipeApi.generateFromFridge({ ingredients: selected })
            setGenerated(data)
        } catch (error) {
            console.error('Fridge generate error:', error)
            Alert.alert('Fridge', 'Could not generate recipes right now.')
        } finally {
            setGenerating(false)
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
                    <Text style={styles.headerTitle}>Fridge-to-Plate</Text>
                    <View style={styles.iconBtn} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Add Ingredient</Text>
                    <TextInput
                        value={nameInput}
                        onChangeText={setNameInput}
                        placeholder="ingredient name"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                    />
                    <View style={styles.row}>
                        <TextInput
                            value={qtyInput}
                            onChangeText={(value) => setQtyInput(value.replace(/[^0-9.]/g, ''))}
                            keyboardType="numeric"
                            style={[styles.input, { flex: 1 }]}
                            placeholder="qty"
                            placeholderTextColor={colors.muted}
                        />
                        <TextInput
                            value={unitInput}
                            onChangeText={setUnitInput}
                            style={[styles.input, { flex: 1 }]}
                            placeholder="unit"
                            placeholderTextColor={colors.muted}
                        />
                    </View>
                    <Pressable style={styles.addBtn} onPress={() => addIngredient(nameInput)} disabled={saving}>
                        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addBtnText}>Add to Fridge</Text>}
                    </Pressable>

                    <Text style={styles.quickTitle}>Quick add staples</Text>
                    <View style={styles.quickWrap}>
                        {staples.map((item) => (
                            <Pressable key={item} style={styles.quickChip} onPress={() => addIngredient(item)}>
                                <Text style={styles.quickChipText}>{item}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Your Ingredients</Text>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : fridge.length ? (
                        fridge.map((item) => {
                            const active = selectedSet.has(item.ingredient_name)
                            return (
                                <View key={item.id} style={styles.ingredientRow}>
                                    <Pressable style={styles.checkboxWrap} onPress={() => toggleIngredient(item.ingredient_name)}>
                                        <View style={[styles.checkbox, active && styles.checkboxActive]}>
                                            {active ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                                        </View>
                                        <Text style={styles.ingredientText}>{item.ingredient_name} ({item.quantity} {item.unit})</Text>
                                    </Pressable>
                                    <Pressable onPress={() => removeIngredient(item.id)}>
                                        <Ionicons name="trash-outline" size={17} color="#E76F51" />
                                    </Pressable>
                                </View>
                            )
                        })
                    ) : (
                        <Text style={styles.emptyText}>No ingredients added yet.</Text>
                    )}
                </View>

                <Pressable style={styles.generateBtn} onPress={generate} disabled={generating}>
                    {generating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.generateBtnText}>Generate Recipe</Text>}
                </Pressable>

                {generated ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Generated Options</Text>
                        {generated.options.map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.optionCard}
                                onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
                            >
                                <Text style={styles.optionTitle}>{item.name}</Text>
                                <Text style={styles.optionSub}>{item.match_percent}% match • {Math.round(item.nutrition.calories)} kcal • {item.cook_time_mins} min</Text>
                                <Text style={styles.optionMissing}>Missing: {item.missing_items.length ? item.missing_items.join(', ') : 'none'}</Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
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
    card: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
        gap: 8,
    },
    sectionTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
    input: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAFCFF',
        paddingHorizontal: 10,
        paddingVertical: 9,
        color: colors.primary,
    },
    row: { flexDirection: 'row', gap: 8 },
    addBtn: {
        borderRadius: 999,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
    },
    addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    quickTitle: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#DCE5F1',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    quickChipText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F8',
        paddingVertical: 8,
        gap: 8,
    },
    checkboxWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D2DDEB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    ingredientText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    emptyText: { color: colors.muted, fontSize: 12 },
    generateBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    generateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    optionCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E7EDF7',
        backgroundColor: '#FBFDFF',
        padding: 10,
        marginBottom: 8,
    },
    optionTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
    optionSub: { color: colors.secondary, fontSize: 12, marginTop: 2 },
    optionMissing: { color: '#A85D16', fontSize: 11, marginTop: 4 },
})

export default FridgeToPlateScreen
