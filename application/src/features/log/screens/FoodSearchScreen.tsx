import React, { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import api from '../../../services/api'
import type { LogStackParamList } from '../../../navigation/LogStack'

const rawFoodData = require('../../../utils/food-data.json') as LocalFoodJsonItem[]

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

type NavProp = NativeStackNavigationProp<LogStackParamList, 'FoodSearch'>
type RouteProps = RouteProp<LogStackParamList, 'FoodSearch'>

type FoodItem = {
    id: string
    food_name: string
    calories_per_unit: number
    protein_per_unit: number
    carbs_per_unit: number
    fat_per_unit: number
    default_unit: string
    category?: string
}

type PrefillItem = NonNullable<RouteProps['params']['prefillItems']>[number]

type LocalFoodJsonItem = {
    id: number
    name: string
    also_known_as?: string[]
    category?: string
    food_type?: string
    calories_per_unit: number
    protein_per_unit: number
    carbs_per_unit: number
    fat_per_unit: number
    default_unit: string
    portion_description?: string
}

type SelectedFood = {
    rowId: string
    foodId?: string
    foodName: string
    quantity: string
    unit: string
    isCustom?: boolean
    customNutrition?: {
        caloriesPerUnit: string
        proteinPerUnit: string
        carbsPerUnit: string
        fatPerUnit: string
    }
}

type AiSuggestionItem = {
    food_name: string
    quantity: number
    unit: string
    nutrition_per_unit?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
}

type AiSuggestion = {
    title: string
    meal_type: MealType
    confidence: number
    notes?: string
    items: AiSuggestionItem[]
}

const unitOptions = ['piece', 'katori', 'bowl', 'plate', 'gram']
const { width } = Dimensions.get('window')
const IS_SMALL_DEVICE = width < 370

const colors = {
    background: '#F4F7FB',
    card: '#FFFFFF',
    primary: '#1D3557',
    secondary: '#4A627A',
    accent: '#F4A261',
    success: '#2A9D8F',
    danger: '#E76F51',
    muted: '#8A9AAC',
    border: '#E6ECF4',
}

const LOCAL_SEARCH_LIMIT = 25
const normalizeText = (value: string) => value.trim().toLowerCase()

const mapLocalToFoodItem = (item: LocalFoodJsonItem): FoodItem => ({
    id: `local-${item.id}`,
    food_name: item.name,
    calories_per_unit: item.calories_per_unit,
    protein_per_unit: item.protein_per_unit,
    carbs_per_unit: item.carbs_per_unit,
    fat_per_unit: item.fat_per_unit,
    default_unit: item.default_unit || 'piece',
    category: item.category,
})

const LOCAL_FOOD_ITEMS: FoodItem[] = rawFoodData.map(mapLocalToFoodItem)

const findLocalFoodByName = (foodName: string): FoodItem | undefined => {
    const normalizedName = normalizeText(foodName)
    if (!normalizedName) return undefined

    for (const rawItem of rawFoodData) {
        const candidates = [rawItem.name, ...(rawItem.also_known_as || [])]
        if (candidates.some((candidate) => normalizeText(candidate) === normalizedName)) {
            return mapLocalToFoodItem(rawItem)
        }
    }

    return undefined
}

const hasValidNutrition = (item?: PrefillItem['customNutrition']) => {
    if (!item) return false

    const calories = Number(item.caloriesPerUnit || 0)
    const protein = Number(item.proteinPerUnit || 0)
    const carbs = Number(item.carbsPerUnit || 0)
    const fat = Number(item.fatPerUnit || 0)

    return calories > 0 || protein > 0 || carbs > 0 || fat > 0
}

const searchLocalFoods = (query: string): FoodItem[] => {
    const normalizedQuery = normalizeText(query)
    if (!normalizedQuery) return []

    const startsWithMatches: FoodItem[] = []
    const containsMatches: FoodItem[] = []

    for (const rawItem of rawFoodData) {
        const candidates = [rawItem.name, ...(rawItem.also_known_as || [])]
        const normalizedCandidates = candidates.map((entry) => normalizeText(entry))

        const startsWithHit = normalizedCandidates.some((entry) => entry.startsWith(normalizedQuery))
        const containsHit = normalizedCandidates.some((entry) => entry.includes(normalizedQuery))

        if (!startsWithHit && !containsHit) continue

        const mapped = mapLocalToFoodItem(rawItem)
        if (startsWithHit) {
            startsWithMatches.push(mapped)
        } else {
            containsMatches.push(mapped)
        }

        if (startsWithMatches.length + containsMatches.length >= LOCAL_SEARCH_LIMIT) {
            break
        }
    }

    return [...startsWithMatches, ...containsMatches].slice(0, LOCAL_SEARCH_LIMIT)
}

const mergeFoodLists = (primary: FoodItem[], secondary: FoodItem[]): FoodItem[] => {
    const seen = new Set<string>()
    const merged: FoodItem[] = []

    const add = (item: FoodItem) => {
        const dedupeKey = normalizeText(item.food_name)
        if (seen.has(dedupeKey)) return
        seen.add(dedupeKey)
        merged.push(item)
    }

    primary.forEach(add)
    secondary.forEach(add)
    return merged
}

const FoodSearchScreen = () => {
    const navigation = useNavigation<NavProp>()
    const route = useRoute<RouteProps>()
    const mealType: MealType = route.params.mealType
    const editLog = route.params.editLog
    const prefillItems = route.params.prefillItems || []
    const voiceLoggedAt = route.params.loggedAt
    const isEditMode = Boolean(editLog)

    const [query, setQuery] = useState('')
    const [loadingSearch, setLoadingSearch] = useState(false)
    const [saving, setSaving] = useState(false)
    const [results, setResults] = useState<FoodItem[]>([])
    const [quickPresets, setQuickPresets] = useState<FoodItem[]>([])
    const [selectedItems, setSelectedItems] = useState<SelectedFood[]>([])
    const [customFoodName, setCustomFoodName] = useState('')
    const [customQuantity, setCustomQuantity] = useState('1')
    const [customUnit, setCustomUnit] = useState('piece')
    const [customCalories, setCustomCalories] = useState('')
    const [customProtein, setCustomProtein] = useState('')
    const [customCarbs, setCustomCarbs] = useState('')
    const [customFat, setCustomFat] = useState('')
    const [aiModalVisible, setAiModalVisible] = useState(false)
    const [aiTextInput, setAiTextInput] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
    const [usingAiSuggestionIndex, setUsingAiSuggestionIndex] = useState<number | null>(null)

    const nutritionMap = useMemo(() => {
        const map = new Map<string, FoodItem>()
            ;[...LOCAL_FOOD_ITEMS, ...quickPresets, ...results].forEach((food) => {
                map.set(food.id, food)
            })
        return map
    }, [quickPresets, results])

    useEffect(() => {
        if (!editLog) return

        setSelectedItems(
            editLog.meal_items.map((item) => {
                const safeQty = item.quantity > 0 ? item.quantity : 1
                return {
                    rowId: `${item.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    foodName: item.food_name,
                    quantity: String(item.quantity),
                    unit: item.unit,
                    isCustom: item.is_custom,
                    customNutrition: item.is_custom
                        ? {
                            caloriesPerUnit: String((item.calories / safeQty).toFixed(2)),
                            proteinPerUnit: String((item.protein / safeQty).toFixed(2)),
                            carbsPerUnit: String((item.carbs / safeQty).toFixed(2)),
                            fatPerUnit: String((item.fat / safeQty).toFixed(2)),
                        }
                        : undefined,
                }
            })
        )
    }, [editLog])

    useEffect(() => {
        if (editLog || !prefillItems.length) return

        const resolvedItems = prefillItems.map((item) => {
            const localFood = findLocalFoodByName(item.foodName)
            const hasNutrition = hasValidNutrition(item.customNutrition)

            const resolvedNutrition = hasNutrition
                ? {
                    caloriesPerUnit: String(item.customNutrition?.caloriesPerUnit || 0),
                    proteinPerUnit: String(item.customNutrition?.proteinPerUnit || 0),
                    carbsPerUnit: String(item.customNutrition?.carbsPerUnit || 0),
                    fatPerUnit: String(item.customNutrition?.fatPerUnit || 0),
                }
                : {
                    caloriesPerUnit: '100',
                    proteinPerUnit: '3',
                    carbsPerUnit: '12',
                    fatPerUnit: '4',
                }

            return {
                rowId: `${item.foodName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                foodName: item.foodName,
                quantity: String(item.quantity || 1),
                unit: item.unit || localFood?.default_unit || 'piece',
                foodId: item.foodId,
                isCustom: item.isCustom ?? true,
                customNutrition: resolvedNutrition,
            }
        })

        setSelectedItems(resolvedItems)
    }, [editLog, prefillItems])

    useEffect(() => {
        const fetchQuickPresets = async () => {
            try {
                const response = await api.get('/food/quick-presets')
                const serverPresets = response.data.data || []
                setQuickPresets(mergeFoodLists(serverPresets, LOCAL_FOOD_ITEMS.slice(0, 12)))
            } catch (error) {
                console.error('Quick presets error:', error)
                setQuickPresets(LOCAL_FOOD_ITEMS.slice(0, 12))
            }
        }

        fetchQuickPresets()
    }, [])

    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            const localMatches = searchLocalFoods(query)
            try {
                setLoadingSearch(true)

                if (localMatches.length >= LOCAL_SEARCH_LIMIT) {
                    setResults(localMatches)
                    return
                }

                const response = await api.get('/food/search', { params: { query } })
                const serverMatches = response.data.data || []
                setResults(mergeFoodLists(localMatches, serverMatches).slice(0, LOCAL_SEARCH_LIMIT))
            } catch (error) {
                console.error('Food search error:', error)
                setResults(localMatches)
            } finally {
                setLoadingSearch(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const totalNutrition = useMemo(() => {
        return selectedItems.reduce(
            (acc, item) => {
                const qty = Number(item.quantity) || 0
                const matched = item.foodId ? nutritionMap.get(item.foodId) : undefined
                const customCaloriesPerUnit = Number(item.customNutrition?.caloriesPerUnit || 0)
                const customProteinPerUnit = Number(item.customNutrition?.proteinPerUnit || 0)
                const customCarbsPerUnit = Number(item.customNutrition?.carbsPerUnit || 0)
                const customFatPerUnit = Number(item.customNutrition?.fatPerUnit || 0)

                if (qty <= 0) {
                    return acc
                }

                if (matched) {
                    return {
                        calories: acc.calories + matched.calories_per_unit * qty,
                        protein: acc.protein + matched.protein_per_unit * qty,
                        carbs: acc.carbs + matched.carbs_per_unit * qty,
                        fat: acc.fat + matched.fat_per_unit * qty,
                    }
                }

                if (customCaloriesPerUnit > 0 || customProteinPerUnit > 0 || customCarbsPerUnit > 0 || customFatPerUnit > 0) {
                    return {
                        calories: acc.calories + customCaloriesPerUnit * qty,
                        protein: acc.protein + customProteinPerUnit * qty,
                        carbs: acc.carbs + customCarbsPerUnit * qty,
                        fat: acc.fat + customFatPerUnit * qty,
                    }
                }

                return {
                    calories: acc.calories,
                    protein: acc.protein,
                    carbs: acc.carbs,
                    fat: acc.fat,
                }
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
    }, [selectedItems, quickPresets, results])

    const addFood = (food: FoodItem) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(`${food.food_name} added`, ToastAndroid.SHORT)
        }

        setSelectedItems((prev) => [
            ...prev,
            {
                rowId: `${food.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                foodId: food.id,
                foodName: food.food_name,
                quantity: '1',
                unit: food.default_unit || 'piece',
                isCustom: false,
            },
        ])
    }

    const openAiModal = () => {
        setAiModalVisible(true)
        setAiSuggestions([])
    }

    const closeAiModal = () => {
        setAiModalVisible(false)
        setAiLoading(false)
        setUsingAiSuggestionIndex(null)
    }

    const generateAiSuggestions = async () => {
        const text = aiTextInput.trim()
        if (!text) {
            Alert.alert('Type your meal', 'Please enter meal text before generating suggestions.')
            return
        }

        try {
            setAiLoading(true)
            const response = await api.post('/ai/voice/suggestions', { transcript: text })
            const suggestions = (response.data?.data?.suggestions || []) as AiSuggestion[]
            setAiSuggestions(suggestions)
            if (!suggestions.length) {
                Alert.alert('No suggestions', 'AI could not generate suggestions for this text. Try again with more detail.')
            }
        } catch (error: any) {
            console.error('AI text suggestion error:', error)
            Alert.alert('AI parsing failed', error?.response?.data?.error || 'Unable to generate AI suggestions right now.')
        } finally {
            setAiLoading(false)
        }
    }

    const addAiSuggestionToSelected = async (suggestion: AiSuggestion, index: number) => {
        try {
            setUsingAiSuggestionIndex(index)
            const rows: SelectedFood[] = suggestion.items.map((item) => ({
                rowId: `${item.food_name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                foodName: item.food_name,
                quantity: String(item.quantity || 1),
                unit: item.unit || 'piece',
                isCustom: true,
                customNutrition: {
                    caloriesPerUnit: String(item.nutrition_per_unit?.calories ?? 100),
                    proteinPerUnit: String(item.nutrition_per_unit?.protein ?? 3),
                    carbsPerUnit: String(item.nutrition_per_unit?.carbs ?? 12),
                    fatPerUnit: String(item.nutrition_per_unit?.fat ?? 4),
                },
            }))

            setSelectedItems((prev) => [...prev, ...rows])
            setAiModalVisible(false)
            setAiSuggestions([])
            setAiTextInput('')
            if (Platform.OS === 'android') {
                ToastAndroid.show('AI suggestion added to selected items', ToastAndroid.SHORT)
            }
        } finally {
            setUsingAiSuggestionIndex(null)
        }
    }

    const addCustomFood = () => {
        const normalizedName = customFoodName.trim()
        if (!normalizedName) {
            Alert.alert('Food name needed', 'Enter a custom food name before adding.')
            return
        }

        const qty = Number(customQuantity)
        if (!qty || qty <= 0) {
            Alert.alert('Invalid quantity', 'Quantity should be greater than 0.')
            return
        }

        setSelectedItems((prev) => [
            ...prev,
            {
                rowId: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                foodName: normalizedName,
                quantity: customQuantity,
                unit: customUnit,
                isCustom: true,
                customNutrition: {
                    caloriesPerUnit: customCalories || '0',
                    proteinPerUnit: customProtein || '0',
                    carbsPerUnit: customCarbs || '0',
                    fatPerUnit: customFat || '0',
                },
            },
        ])

        setCustomFoodName('')
        setCustomQuantity('1')
        setCustomCalories('')
        setCustomProtein('')
        setCustomCarbs('')
        setCustomFat('')
    }

    const removeFood = (rowId: string) => {
        setSelectedItems((prev) => prev.filter((item) => item.rowId !== rowId))
    }

    const updateQuantity = (rowId: string, value: string) => {
        const sanitized = value.replace(/[^0-9.]/g, '')
        setSelectedItems((prev) =>
            prev.map((item) => (item.rowId === rowId ? { ...item, quantity: sanitized } : item))
        )
    }

    const updateUnit = (rowId: string, unit: string) => {
        setSelectedItems((prev) =>
            prev.map((item) => (item.rowId === rowId ? { ...item, unit } : item))
        )
    }

    const updateCustomNutrition = (
        rowId: string,
        field: 'caloriesPerUnit' | 'proteinPerUnit' | 'carbsPerUnit' | 'fatPerUnit',
        value: string,
    ) => {
        const sanitized = value.replace(/[^0-9.]/g, '')
        setSelectedItems((prev) =>
            prev.map((item) => {
                if (item.rowId !== rowId || !item.isCustom) return item
                return {
                    ...item,
                    customNutrition: {
                        caloriesPerUnit: item.customNutrition?.caloriesPerUnit || '0',
                        proteinPerUnit: item.customNutrition?.proteinPerUnit || '0',
                        carbsPerUnit: item.customNutrition?.carbsPerUnit || '0',
                        fatPerUnit: item.customNutrition?.fatPerUnit || '0',
                        [field]: sanitized,
                    },
                }
            })
        )
    }

    const saveMeal = async () => {
        if (!selectedItems.length) {
            Alert.alert('No items selected', 'Please add at least one food item before saving.')
            return
        }

        const hasInvalidQty = selectedItems.some((item) => !Number(item.quantity) || Number(item.quantity) <= 0)
        if (hasInvalidQty) {
            Alert.alert('Invalid quantity', 'Each selected item should have quantity greater than 0.')
            return
        }

        try {
            setSaving(true)
            const payload = {
                mealType,
                loggedAt: editLog?.logged_at || voiceLoggedAt,
                items: selectedItems.map((item) => ({
                    foodId: item.foodId,
                    foodName: item.foodName,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    customNutrition: item.isCustom
                        ? {
                            caloriesPerUnit: Number(item.customNutrition?.caloriesPerUnit || 0),
                            proteinPerUnit: Number(item.customNutrition?.proteinPerUnit || 0),
                            carbsPerUnit: Number(item.customNutrition?.carbsPerUnit || 0),
                            fatPerUnit: Number(item.customNutrition?.fatPerUnit || 0),
                        }
                        : undefined,
                })),
            }

            if (editLog?.id) {
                await api.put(`/food/logs/${editLog.id}`, payload)
            } else {
                await api.post('/food/logs', payload)
            }

            Alert.alert(isEditMode ? 'Updated' : 'Saved', isEditMode ? 'Meal updated successfully.' : 'Meal logged successfully.', [
                {
                    text: 'OK',
                    onPress: () => navigation.popToTop(),
                },
            ])
        } catch (error: any) {
            Alert.alert('Save failed', error?.response?.data?.error || 'Unable to save meal right now.')
        } finally {
            setSaving(false)
        }
    }

    const mealTitle = mealType.charAt(0) + mealType.slice(1).toLowerCase()

    return (
        <>
            <SafeAreaView style={styles.screen}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="arrow-back" size={18} color={colors.primary} />
                        </Pressable>
                        <Text style={styles.headerTitle}>{isEditMode ? `Edit ${mealTitle}` : `Log ${mealTitle}`}</Text>
                        <Pressable style={styles.aiMagicBtn} onPress={openAiModal}>
                            <Icon name="sparkles-outline" size={17} color={colors.primary} />
                        </Pressable>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Search Foods</Text>
                        <View style={styles.searchWrap}>
                            <Icon name="search" size={18} color={colors.muted} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search local food list first, then database"
                                placeholderTextColor="#8A9AAC"
                                style={styles.searchInput}
                            />
                        </View>

                        {loadingSearch ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={colors.secondary} />
                                <Text style={styles.loadingText}>Searching foods...</Text>
                            </View>
                        ) : null}

                        {results.length ? (
                            <View style={styles.innerScrollWrap}>
                                <ScrollView
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.searchResultWrap}
                                >
                                    {results.map((food) => (
                                        <Pressable key={food.id} style={styles.resultRow} onPress={() => addFood(food)}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.resultName}>{food.food_name}</Text>
                                                <Text style={styles.resultSub}>
                                                    {food.calories_per_unit} kcal/{food.default_unit}
                                                </Text>
                                            </View>
                                            <Icon name="add-circle" size={20} color={colors.success} />
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Quick Add</Text>
                        <View style={styles.innerScrollWrap}>
                            <ScrollView
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.quickWrap}
                            >
                                {quickPresets.map((food) => (
                                    <Pressable key={food.id} style={styles.quickChip} onPress={() => addFood(food)}>
                                        <Text style={styles.quickChipText}>{food.food_name}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Add Custom Food</Text>
                        <TextInput
                            value={customFoodName}
                            onChangeText={setCustomFoodName}
                            placeholder="Food name"
                            placeholderTextColor="#8A9AAC"
                            style={styles.inputField}
                        />

                        <View style={styles.rowWrap}>
                            <View style={styles.fieldHalf}>
                                <Text style={styles.qtyLabel}>Quantity</Text>
                                <TextInput
                                    value={customQuantity}
                                    onChangeText={(value) => setCustomQuantity(value.replace(/[^0-9.]/g, ''))}
                                    keyboardType="numeric"
                                    style={styles.inputField}
                                />
                            </View>

                            <View style={styles.fieldHalf}>
                                <Text style={styles.qtyLabel}>Unit</Text>
                                <View style={styles.unitChipRow}>
                                    {unitOptions.map((unit) => {
                                        const selected = customUnit === unit
                                        return (
                                            <Pressable
                                                key={unit}
                                                style={[styles.unitChip, selected && styles.unitChipSelected]}
                                                onPress={() => setCustomUnit(unit)}
                                            >
                                                <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>{unit}</Text>
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            </View>
                        </View>

                        <Text style={styles.miniHeading}>Nutrition Per Unit</Text>
                        <View style={styles.nutritionGrid}>
                            <TextInput
                                value={customCalories}
                                onChangeText={(value) => setCustomCalories(value.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholder="Calories per unit"
                                placeholderTextColor="#8A9AAC"
                                style={styles.nutritionInput}
                            />
                            <TextInput
                                value={customProtein}
                                onChangeText={(value) => setCustomProtein(value.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholder="Protein (g) per unit"
                                placeholderTextColor="#8A9AAC"
                                style={styles.nutritionInput}
                            />
                            <TextInput
                                value={customCarbs}
                                onChangeText={(value) => setCustomCarbs(value.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholder="Carbs (g) per unit"
                                placeholderTextColor="#8A9AAC"
                                style={styles.nutritionInput}
                            />
                            <TextInput
                                value={customFat}
                                onChangeText={(value) => setCustomFat(value.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholder="Fat (g) per unit"
                                placeholderTextColor="#8A9AAC"
                                style={styles.nutritionInput}
                            />
                        </View>

                        <Pressable style={styles.customAddBtn} onPress={addCustomFood}>
                            <Icon name="add-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles.customAddText}>Add Custom Food</Text>
                        </Pressable>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Selected Items</Text>
                        {!selectedItems.length ? (
                            <Text style={styles.emptyText}>No food selected yet. Search or quick add above.</Text>
                        ) : (
                            <View style={styles.selectedScrollWrap}>
                                <ScrollView
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                    contentContainerStyle={styles.selectedWrap}
                                >
                                    {selectedItems.map((item) => (
                                        <View key={item.rowId} style={styles.selectedCard}>
                                            <View style={styles.selectedTopRow}>
                                                <Text style={styles.selectedName}>{item.foodName}</Text>
                                                <Pressable onPress={() => removeFood(item.rowId)}>
                                                    <Icon name="trash-outline" size={18} color={colors.danger} />
                                                </Pressable>
                                            </View>

                                            <View style={styles.qtyRow}>
                                                <View style={styles.qtyInputWrap}>
                                                    <Text style={styles.qtyLabel}>Quantity</Text>
                                                    <TextInput
                                                        value={item.quantity}
                                                        onChangeText={(value) => updateQuantity(item.rowId, value)}
                                                        keyboardType="numeric"
                                                        style={styles.qtyInput}
                                                    />
                                                </View>
                                                <View style={styles.unitWrap}>
                                                    <Text style={styles.qtyLabel}>Unit</Text>
                                                    <View style={styles.unitChipRow}>
                                                        {unitOptions.map((unit) => {
                                                            const selected = item.unit === unit
                                                            return (
                                                                <Pressable
                                                                    key={unit}
                                                                    style={[styles.unitChip, selected && styles.unitChipSelected]}
                                                                    onPress={() => updateUnit(item.rowId, unit)}
                                                                >
                                                                    <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>{unit}</Text>
                                                                </Pressable>
                                                            )
                                                        })}
                                                    </View>
                                                </View>
                                            </View>

                                            {item.isCustom ? (
                                                <View style={styles.customNutritionWrap}>
                                                    <Text style={styles.qtyLabel}>Custom Nutrition Per Unit</Text>
                                                    <View style={styles.nutritionGrid}>
                                                        <TextInput
                                                            value={item.customNutrition?.caloriesPerUnit || ''}
                                                            onChangeText={(value) => updateCustomNutrition(item.rowId, 'caloriesPerUnit', value)}
                                                            keyboardType="numeric"
                                                            placeholder="Calories"
                                                            placeholderTextColor="#8A9AAC"
                                                            style={styles.nutritionInput}
                                                        />
                                                        <TextInput
                                                            value={item.customNutrition?.proteinPerUnit || ''}
                                                            onChangeText={(value) => updateCustomNutrition(item.rowId, 'proteinPerUnit', value)}
                                                            keyboardType="numeric"
                                                            placeholder="Protein"
                                                            placeholderTextColor="#8A9AAC"
                                                            style={styles.nutritionInput}
                                                        />
                                                        <TextInput
                                                            value={item.customNutrition?.carbsPerUnit || ''}
                                                            onChangeText={(value) => updateCustomNutrition(item.rowId, 'carbsPerUnit', value)}
                                                            keyboardType="numeric"
                                                            placeholder="Carbs"
                                                            placeholderTextColor="#8A9AAC"
                                                            style={styles.nutritionInput}
                                                        />
                                                        <TextInput
                                                            value={item.customNutrition?.fatPerUnit || ''}
                                                            onChangeText={(value) => updateCustomNutrition(item.rowId, 'fatPerUnit', value)}
                                                            keyboardType="numeric"
                                                            placeholder="Fat"
                                                            placeholderTextColor="#8A9AAC"
                                                            style={styles.nutritionInput}
                                                        />
                                                    </View>
                                                </View>
                                            ) : null}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.totalWrap}>
                            <Text style={styles.totalLabel}>Estimated Nutrition</Text>
                            <Text style={styles.totalValue}>Calories: {Math.round(totalNutrition.calories)} kcal</Text>
                            <Text style={styles.totalSub}>
                                P {Math.round(totalNutrition.protein)}g | C {Math.round(totalNutrition.carbs)}g | F {Math.round(totalNutrition.fat)}g
                            </Text>
                        </View>

                        <Pressable
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={saveMeal}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="save" size={18} color="#FFFFFF" />}
                            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEditMode ? 'Update Meal' : 'Save Meal'}</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>
            <Modal
                visible={aiModalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeAiModal}
            >
                <View style={styles.aiModalOverlay}>
                    <View style={styles.aiModalCard}>
                        <View style={styles.aiModalHeader}>
                            <Text style={styles.aiModalTitle}>AI Meal Input</Text>
                            <Pressable onPress={closeAiModal}>
                                <Icon name="close" size={20} color={colors.secondary} />
                            </Pressable>
                        </View>

                        <Text style={styles.aiModalHint}>Type meal text like: one roti, one katori dal, one bowl rice</Text>
                        <TextInput
                            value={aiTextInput}
                            onChangeText={setAiTextInput}
                            placeholder="Type your meal here..."
                            placeholderTextColor="#8A9AAC"
                            style={styles.aiModalInput}
                            multiline
                        />

                        <Pressable
                            style={[styles.aiGenerateBtn, aiLoading && styles.aiGenerateBtnDisabled]}
                            onPress={generateAiSuggestions}
                            disabled={aiLoading}
                        >
                            {aiLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.aiGenerateBtnText}>Generate with AI</Text>}
                        </Pressable>

                        {aiSuggestions.length ? (
                            <ScrollView style={styles.aiSuggestionList} showsVerticalScrollIndicator={false}>
                                {aiSuggestions.map((suggestion, index) => {
                                    const summary = suggestion.items
                                        .slice(0, 3)
                                        .map((item) => `${item.quantity} ${item.unit} ${item.food_name}`)
                                        .join(', ')
                                    const isAdding = usingAiSuggestionIndex === index

                                    return (
                                        <View key={`${suggestion.title}-${index}`} style={styles.aiSuggestionCard}>
                                            <Text style={styles.aiSuggestionTitle}>{suggestion.title}</Text>
                                            <Text style={styles.aiSuggestionSub}>{summary || 'No items detected'}</Text>
                                            <Pressable
                                                style={[styles.aiUseBtn, isAdding && styles.aiUseBtnDisabled]}
                                                onPress={() => addAiSuggestionToSelected(suggestion, index)}
                                                disabled={usingAiSuggestionIndex !== null}
                                            >
                                                {isAdding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.aiUseBtnText}>Add This Suggestion</Text>}
                                            </Pressable>
                                        </View>
                                    )
                                })}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { padding: IS_SMALL_DEVICE ? 14 : 18, paddingBottom: 28, gap: 12 },
    headerRow: {
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
    aiMagicBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(29,53,87,0.4)',
        justifyContent: 'flex-end',
    },
    aiModalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        maxHeight: '82%',
    },
    aiModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aiModalTitle: {
        color: colors.primary,
        fontSize: 17,
        fontWeight: '800',
    },
    aiModalHint: {
        marginTop: 8,
        color: colors.secondary,
        fontSize: 12,
        lineHeight: 18,
    },
    aiModalInput: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: '#FAFCFF',
        padding: 10,
        minHeight: 90,
        textAlignVertical: 'top',
        color: colors.primary,
    },
    aiGenerateBtn: {
        marginTop: 10,
        backgroundColor: colors.primary,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    aiGenerateBtnDisabled: { opacity: 0.7 },
    aiGenerateBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    aiSuggestionList: {
        marginTop: 12,
    },
    aiSuggestionCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        backgroundColor: '#FBFCFF',
    },
    aiSuggestionTitle: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    aiSuggestionSub: {
        marginTop: 4,
        color: colors.secondary,
        fontSize: 12,
        lineHeight: 18,
    },
    aiUseBtn: {
        marginTop: 8,
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
    },
    aiUseBtnDisabled: { opacity: 0.7 },
    aiUseBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
    card: {
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    sectionTitle: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '700',
        marginBottom: 10,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAFCFF',
        borderRadius: 12,
        paddingHorizontal: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        color: colors.primary,
        marginLeft: 8,
    },
    inputField: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
        color: colors.primary,
        backgroundColor: '#FFFFFF',
    },
    rowWrap: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    fieldHalf: {
        flex: 1,
    },
    miniHeading: {
        color: colors.secondary,
        marginTop: 10,
        marginBottom: 6,
        fontSize: 12,
        fontWeight: '700',
    },
    nutritionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    nutritionInput: {
        width: '48%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: colors.primary,
        backgroundColor: '#FFFFFF',
    },
    customAddBtn: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#C9DAF4',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    customAddText: {
        color: colors.primary,
        fontWeight: '700',
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    loadingText: { marginLeft: 8, color: colors.secondary, fontSize: 13 },
    innerScrollWrap: {
        marginTop: 8,
        maxHeight: 170,
        borderRadius: 12,
    },
    searchResultWrap: { marginTop: 8, gap: 8 },
    resultRow: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFCFF',
    },
    resultName: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    resultSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D9E4F2',
        backgroundColor: '#F2F7FF',
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    quickChipText: { color: colors.secondary, fontWeight: '600', fontSize: 12 },
    emptyText: { color: colors.muted, fontSize: 13 },
    selectedScrollWrap: {
        maxHeight: 300,
        borderRadius: 12,
    },
    selectedWrap: { gap: 10 },
    selectedCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 10,
        backgroundColor: '#FBFCFF',
    },
    selectedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectedName: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    qtyRow: { marginTop: 10, gap: 10 },
    qtyInputWrap: { width: 120 },
    qtyLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
    qtyInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: colors.primary,
        backgroundColor: '#FFFFFF',
    },
    customNutritionWrap: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5ECF8',
        paddingTop: 10,
    },
    unitWrap: { flex: 1 },
    unitChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    unitChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D6DEEA',
        paddingVertical: 5,
        paddingHorizontal: 9,
        backgroundColor: '#FFFFFF',
    },
    unitChipSelected: {
        backgroundColor: '#EAF3FF',
        borderColor: '#91B8F7',
    },
    unitChipText: { fontSize: 11, color: colors.secondary },
    unitChipTextSelected: { color: colors.primary, fontWeight: '700' },
    totalWrap: {
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: '#F2F7FF',
        borderWidth: 1,
        borderColor: '#DCE9FA',
        padding: 12,
    },
    totalLabel: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    totalValue: { color: colors.primary, marginTop: 5, fontSize: 15, fontWeight: '700' },
    totalSub: { color: colors.secondary, marginTop: 3, fontSize: 12 },
    saveBtn: {
        marginTop: 12,
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})

export default FoodSearchScreen
