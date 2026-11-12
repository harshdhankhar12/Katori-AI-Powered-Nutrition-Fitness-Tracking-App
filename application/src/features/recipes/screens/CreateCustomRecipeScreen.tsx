import React, { useState } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { launchImageLibrary, type Asset } from 'react-native-image-picker'
import { recipeApi } from '../services/recipeApi'
import type { RecipeStackParamList } from '../types'

type NavProp = NativeStackNavigationProp<RecipeStackParamList, 'CreateCustomRecipe'>

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

const mealOptions: Array<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'> = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']
const dietOptions: Array<'VEG' | 'NON_VEG'> = ['VEG', 'NON_VEG']
const MAX_PHOTOS = 5

type SelectedPhoto = {
    id: string
    fileName: string
    mimeType: string
    dataBase64: string
}

const CreateCustomRecipeScreen = () => {
    const navigation = useNavigation<NavProp>()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('DINNER')
    const [dietary, setDietary] = useState<'VEG' | 'NON_VEG'>('NON_VEG')
    const [servings, setServings] = useState('1')
    const [cuisineStyle, setCuisineStyle] = useState('indian')
    const [ingredientsInput, setIngredientsInput] = useState('')
    const [cookingGoal, setCookingGoal] = useState('high protein balanced meal')
    const [cookingStyle, setCookingStyle] = useState('home style quick')
    const [maxCookTime, setMaxCookTime] = useState('30')
    const [photos, setPhotos] = useState<SelectedPhoto[]>([])

    const mapAssetToPhoto = (asset: Asset, index: number): SelectedPhoto | null => {
        if (!asset.base64 || !asset.type) return null
        return {
            id: `${Date.now()}-${index}-${asset.fileName || 'photo'}`,
            fileName: asset.fileName || `photo-${index + 1}.jpg`,
            mimeType: asset.type,
            dataBase64: asset.base64,
        }
    }

    const onPickPhotos = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Photo limit', `You can upload up to ${MAX_PHOTOS} photos.`)
            return
        }

        const remaining = MAX_PHOTOS - photos.length
        const response = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: remaining,
            includeBase64: true,
            quality: 0.8,
        })

        if (response.didCancel) return
        if (response.errorCode) {
            Alert.alert('Photo upload', response.errorMessage || 'Could not access gallery.')
            return
        }

        const selected = (response.assets || [])
            .map((asset, index) => mapAssetToPhoto(asset, index))
            .filter((item): item is SelectedPhoto => Boolean(item))

        if (!selected.length) {
            Alert.alert('Photo upload', 'Selected photos could not be processed. Please try again.')
            return
        }

        setPhotos((prev) => [...prev, ...selected].slice(0, MAX_PHOTOS))
    }

    const removePhoto = (id: string) => {
        setPhotos((prev) => prev.filter((item) => item.id !== id))
    }

    const onGenerate = async () => {
        if (!ingredientsInput.trim()) {
            Alert.alert('Custom Recipe', 'Please enter ingredients or dish details first.')
            return
        }

        try {
            setLoading(true)
            const result = await recipeApi.generateCustomRecipe({
                title: title.trim() || undefined,
                meal_type: mealType,
                dietary_preference: dietary,
                servings: Math.max(1, Number(servings || 1)),
                cuisine_style: cuisineStyle.trim() || undefined,
                ingredients_input: ingredientsInput.trim(),
                cooking_goal: cookingGoal.trim() || undefined,
                cooking_style: cookingStyle.trim() || undefined,
                max_cook_time_mins: Math.max(10, Number(maxCookTime || 30)),
                photos: photos.map((item) => ({
                    mime_type: item.mimeType,
                    data_base64: item.dataBase64,
                })),
            })

            Alert.alert('Created', `${result.preview.name} is ready.`, [
                {
                    text: 'Open Recipe',
                    onPress: () => navigation.replace('RecipeDetail', { customRecipeId: result.custom_recipe_id }),
                },
            ])
        } catch (error) {
            console.error('Generate custom recipe error:', error)
            Alert.alert('Custom Recipe', 'Could not generate recipe right now. Try with clearer details.')
        } finally {
            setLoading(false)
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
                    <Text style={styles.headerTitle}>Create Custom Recipe</Text>
                    <View style={styles.iconBtn} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Recipe Input</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="dish name (optional)"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                    />

                    <TextInput
                        value={ingredientsInput}
                        onChangeText={setIngredientsInput}
                        placeholder="ingredients or idea (e.g. paneer, onion, tomato, less oil, no cream)"
                        placeholderTextColor={colors.muted}
                        style={[styles.input, styles.textArea]}
                        multiline
                    />

                    <View style={styles.photoBlock}>
                        <View style={styles.photoHeadRow}>
                            <Text style={styles.photoTitle}>Reference Photos ({photos.length}/{MAX_PHOTOS})</Text>
                            <Pressable style={styles.photoPickBtn} onPress={onPickPhotos}>
                                <Ionicons name="images-outline" size={14} color={colors.primary} />
                                <Text style={styles.photoPickBtnText}>Upload</Text>
                            </Pressable>
                        </View>
                        {photos.length ? (
                            photos.map((item) => (
                                <View key={item.id} style={styles.photoRow}>
                                    <Text numberOfLines={1} style={styles.photoName}>{item.fileName}</Text>
                                    <Pressable onPress={() => removePhoto(item.id)}>
                                        <Ionicons name="close-circle" size={17} color="#E76F51" />
                                    </Pressable>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.photoHelp}>Upload up to 5 gallery photos for better Gemini recipe generation.</Text>
                        )}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <Text style={styles.label}>Meal Type</Text>
                    <View style={styles.optionRow}>
                        {mealOptions.map((item) => {
                            const active = mealType === item
                            return (
                                <Pressable key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setMealType(item)}>
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <Text style={styles.label}>Diet</Text>
                    <View style={styles.optionRow}>
                        {dietOptions.map((item) => {
                            const active = dietary === item
                            return (
                                <Pressable key={item} style={[styles.chip, active && styles.chipActiveSecondary]} onPress={() => setDietary(item)}>
                                    <Text style={[styles.chipText, active && styles.chipTextActiveSecondary]}>{item}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <View style={styles.rowTwo}>
                        <TextInput
                            value={servings}
                            onChangeText={(value) => setServings(value.replace(/[^0-9.]/g, ''))}
                            keyboardType="numeric"
                            placeholder="servings"
                            placeholderTextColor={colors.muted}
                            style={[styles.input, { flex: 1 }]}
                        />
                        <TextInput
                            value={maxCookTime}
                            onChangeText={(value) => setMaxCookTime(value.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="max cook time"
                            placeholderTextColor={colors.muted}
                            style={[styles.input, { flex: 1 }]}
                        />
                    </View>

                    <TextInput
                        value={cuisineStyle}
                        onChangeText={setCuisineStyle}
                        placeholder="cuisine style"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                    />

                    <TextInput
                        value={cookingGoal}
                        onChangeText={setCookingGoal}
                        placeholder="goal (e.g. low carb high protein)"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                    />

                    <TextInput
                        value={cookingStyle}
                        onChangeText={setCookingStyle}
                        placeholder="cooking style (e.g. quick tawa style)"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                    />
                </View>

                <Pressable style={styles.generateBtn} onPress={onGenerate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.generateBtnText}>Generate With AI</Text>}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 10 },
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
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    photoBlock: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAFCFF',
        padding: 10,
        gap: 8,
    },
    photoHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    photoTitle: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    photoPickBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#CFE0F7',
        backgroundColor: '#EDF4FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    photoPickBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    photoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E9EFF8',
        paddingBottom: 6,
        gap: 8,
    },
    photoName: { flex: 1, color: colors.secondary, fontSize: 12, fontWeight: '600' },
    photoHelp: { color: colors.secondary, fontSize: 12 },
    label: { color: colors.secondary, fontSize: 12, fontWeight: '700', marginTop: 4 },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    chipText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#FFFFFF' },
    chipTextActiveSecondary: { color: '#A85D16' },
    rowTwo: { flexDirection: 'row', gap: 8 },
    generateBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        marginTop: 4,
    },
    generateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})

export default CreateCustomRecipeScreen
