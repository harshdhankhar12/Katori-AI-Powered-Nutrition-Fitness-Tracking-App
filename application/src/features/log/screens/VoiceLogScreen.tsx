import React, { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/Ionicons'
import Voice from '@react-native-voice/voice'
import api from '../../../services/api'
import type { LogStackParamList } from '../../../navigation/LogStack'

type NavProp = NativeStackNavigationProp<LogStackParamList, 'VoiceLog'>
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

type VoiceSuggestionItem = {
    food_id?: string
    food_name: string
    quantity: number
    unit: string
    nutrition_per_unit?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    modifiers?: {
        type?: string | null
        size?: string | null
        thickness?: string | null
    }
}

type VoiceSuggestion = {
    title: string
    meal_type: MealType
    confidence: number
    notes?: string
    items: VoiceSuggestionItem[]
}

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

const VoiceLogScreen = () => {
    const navigation = useNavigation<NavProp>()
    const isFocused = useIsFocused()
    const [isListening, setIsListening] = useState(false)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [transcript, setTranscript] = useState('')
    const [partialTranscript, setPartialTranscript] = useState('')
    const [lastError, setLastError] = useState('')
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const [voiceDraftId, setVoiceDraftId] = useState<string | null>(null)
    const [suggestions, setSuggestions] = useState<VoiceSuggestion[]>([])
    const [editableSuggestions, setEditableSuggestions] = useState<VoiceSuggestion[]>([])
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [usingSuggestionIndex, setUsingSuggestionIndex] = useState<number | null>(null)

    const samplePhrases = [
        'Breakfast two boiled eggs and one bowl of oats with a banana',
        'Lunch one katori rice one katori dal and mixed veg sabji',
        'Dinner two rotis paneer curry and cucumber salad',
    ]

    const startVoiceWithAutoPermission = async (locale: string) => {
        if (Platform.OS === 'android') {
            await Voice.start(locale, { REQUEST_PERMISSIONS_AUTO: true })
            return
        }

        await Voice.start(locale)
    }

    useEffect(() => {
        Voice.onSpeechStart = () => setIsListening(true)
        Voice.onSpeechEnd = () => setIsListening(false)
        Voice.onSpeechError = (event) => {
            setIsListening(false)
            const message = event?.error?.message || 'Could not capture speech.'
            setLastError(String(message))
        }
        Voice.onSpeechResults = (event) => {
            const value = event.value?.[0] || ''
            setTranscript(value)
        }
        Voice.onSpeechPartialResults = (event) => {
            const value = event.value?.[0] || ''
            setPartialTranscript(value)
        }

        return () => {
            Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => undefined)
        }
    }, [])

    useEffect(() => {
        if (!isListening) {
            setElapsedSeconds(0)
            return
        }

        const timer = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [isListening])

    const displayedTranscript = transcript || partialTranscript

    const startListening = async () => {
        try {
            if (!isFocused) {
                Alert.alert('Please wait', 'Screen is still opening. Tap the mic again in a moment.')
                return
            }

            setLastError('')
            setTranscript('')
            setPartialTranscript('')
            try {
                await startVoiceWithAutoPermission('en-IN')
            } catch {
                await startVoiceWithAutoPermission('en-US')
            }
            setIsListening(true)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.error('Voice start error:', error)

            if (message.includes('not attached to an Activity')) {
                setLastError('Please wait for the screen to fully open, then tap mic again.')
                setTimeout(() => {
                    setLastError('')
                }, 2000)
                return
            }

            if (message.toLowerCase().includes('permission')) {
                Alert.alert('Microphone required', 'Please allow microphone permission to continue voice logging.')
                return
            }

            setLastError('Speech recognition could not start on this device.')
            Alert.alert('Voice input failed', 'Speech recognition could not start. Check device speech services and try again.')
        }
    }

    const stopListening = async () => {
        try {
            await Voice.stop()
        } catch (error) {
            console.error('Voice stop error:', error)
        }
    }

    const clearAll = () => {
        setTranscript('')
        setPartialTranscript('')
        setSuggestions([])
        setVoiceDraftId(null)
        setSelectedIndex(null)
        setLastError('')
    }

    const generateSuggestions = async () => {
        if (!displayedTranscript.trim()) {
            Alert.alert('No transcript', 'Speak something first and then generate suggestions.')
            return
        }

        try {
            setLoadingSuggestions(true)
            const response = await api.post('/ai/voice/suggestions', {
                transcript: displayedTranscript.trim(),
            })

            const data = response.data.data
            setVoiceDraftId(data.voice_log_raw_id)
            setSuggestions(data.suggestions || [])
            setEditableSuggestions((data.suggestions || []).map((suggestion: VoiceSuggestion) => ({
                ...suggestion,
                items: suggestion.items.map((item) => ({ ...item })),
            })))
            setSelectedIndex(data.suggestions?.length ? 0 : null)
            setEditingIndex(null)
        } catch (error: any) {
            console.error('Voice suggestion error:', error)
            Alert.alert('Voice parsing failed', error?.response?.data?.error || 'Unable to generate suggestions right now.')
        } finally {
            setLoadingSuggestions(false)
        }
    }

    const selectedSuggestion = useMemo(() => {
        if (selectedIndex === null) return null
        return editableSuggestions[selectedIndex] || null
    }, [selectedIndex, editableSuggestions])

    const updateSuggestionItem = (
        suggestionIndex: number,
        itemIndex: number,
        field: 'food_name' | 'quantity' | 'unit',
        value: string,
    ) => {
        setEditableSuggestions((prev) =>
            prev.map((suggestion, sIndex) => {
                if (sIndex !== suggestionIndex) return suggestion

                return {
                    ...suggestion,
                    items: suggestion.items.map((item, iIndex) => {
                        if (iIndex !== itemIndex) return item

                        if (field === 'quantity') {
                            const qty = Number(value.replace(/[^0-9.]/g, ''))
                            return {
                                ...item,
                                quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
                            }
                        }

                        return {
                            ...item,
                            [field]: value,
                        }
                    }),
                }
            })
        )
    }

    const addSuggestionItem = (suggestionIndex: number) => {
        setEditableSuggestions((prev) =>
            prev.map((suggestion, index) => {
                if (index !== suggestionIndex) return suggestion

                return {
                    ...suggestion,
                    items: [
                        ...suggestion.items,
                        {
                            food_name: 'new item',
                            quantity: 1,
                            unit: 'piece',
                        },
                    ],
                }
            })
        )
    }

    const useSuggestion = async (index: number) => {
        const suggestion = editableSuggestions[index]
        if (!suggestion) return

        try {
            setUsingSuggestionIndex(index)
            if (voiceDraftId) {
                await api.post('/ai/voice/suggestions/confirm', {
                    voice_log_raw_id: voiceDraftId,
                    selected_index: index,
                })
            }

            setSelectedIndex(index)
            navigation.navigate('FoodSearch', {
                mealType: suggestion.meal_type,
                loggedAt: new Date().toISOString(),
                prefillItems: suggestion.items.map((item) => ({
                    foodId: item.food_id,
                    foodName: item.food_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    isCustom: !item.food_id,
                    customNutrition: item.nutrition_per_unit
                        ? {
                            caloriesPerUnit: Number(item.nutrition_per_unit.calories || 0),
                            proteinPerUnit: Number(item.nutrition_per_unit.protein || 0),
                            carbsPerUnit: Number(item.nutrition_per_unit.carbs || 0),
                            fatPerUnit: Number(item.nutrition_per_unit.fat || 0),
                        }
                        : undefined,
                })),
            })
        } catch (error) {
            console.error('Voice confirm error:', error)
            Alert.alert('Could not continue', 'Please try again.')
        } finally {
            setUsingSuggestionIndex(null)
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="arrow-back" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Voice Log</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Speak your meal</Text>
                    <Text style={styles.heroSubtitle}>
                        Record your food in Hinglish or English. We will turn it into 3 reviewable suggestions before saving anything.
                    </Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Microphone</Text>
                        <Text style={[styles.sectionTag, isListening && styles.sectionTagLive]}>
                            {isListening ? `Live ${elapsedSeconds}s` : 'Idle'}
                        </Text>
                    </View>

                    <View style={styles.micWrap}>
                        <Pressable
                            style={[styles.micButton, isListening && styles.micButtonActive]}
                            onPress={isListening ? stopListening : startListening}
                        >
                            <Icon name={isListening ? 'stop' : 'mic'} size={22} color="#FFFFFF" />
                        </Pressable>
                        <View style={styles.liveDotsRow}>
                            <View style={[styles.liveDot, isListening && elapsedSeconds % 2 === 0 && styles.liveDotActive]} />
                            <View style={[styles.liveDot, isListening && elapsedSeconds % 3 === 0 && styles.liveDotActive]} />
                            <View style={[styles.liveDot, isListening && elapsedSeconds % 2 !== 0 && styles.liveDotActive]} />
                        </View>
                        <Text style={styles.micHint}>
                            {isListening ? 'Speak naturally. Tap stop when done.' : 'Tap the mic and speak your meal.'}
                        </Text>
                    </View>

                    {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

                    <View style={styles.transcriptBox}>
                        <Text style={styles.transcriptLabel}>Transcript</Text>
                        <Text style={styles.transcriptText}>{displayedTranscript || 'Your spoken text will appear here.'}</Text>
                    </View>

                    <Pressable style={styles.generateBtn} onPress={generateSuggestions} disabled={loadingSuggestions}>
                        {loadingSuggestions ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Icon name="sparkles" size={18} color="#FFFFFF" />
                                <Text style={styles.generateText}>Review Meal Options</Text>
                            </>
                        )}
                    </Pressable>

                    <Pressable style={styles.clearBtn} onPress={clearAll}>
                        <Icon name="refresh" size={14} color={colors.secondary} />
                        <Text style={styles.clearBtnText}>Reset voice draft</Text>
                    </Pressable>

                    {editableSuggestions.length ? (
                        <View style={styles.reviewBlock}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Review Suggestions</Text>
                                <Text style={styles.sectionTag}>{editableSuggestions.length} options</Text>
                            </View>

                            <View style={styles.suggestionList}>
                                {editableSuggestions.map((suggestion, index) => {
                                    const selected = selectedIndex === index
                                    const summary = suggestion.items
                                        .slice(0, 3)
                                        .map((item) => `${item.quantity} ${item.unit} ${item.food_name}`)
                                        .join(', ')

                                    const isUsing = usingSuggestionIndex === index
                                    const isEditing = editingIndex === index

                                    return (
                                        <Pressable
                                            key={`${suggestion.title}-${index}`}
                                            style={[styles.suggestionCard, selected && styles.suggestionCardSelected]}
                                            onPress={() => setSelectedIndex(index)}
                                        >
                                            <View style={styles.suggestionTopRow}>
                                                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                                                <Text style={styles.suggestionMeal}>{suggestion.meal_type}</Text>
                                            </View>
                                            <Text style={styles.suggestionNotes}>{suggestion.notes}</Text>
                                            <Text style={styles.suggestionSummary}>{summary || 'No items detected'}</Text>

                                            {isEditing ? (
                                                <View style={styles.editPanel}>
                                                    {suggestion.items.map((item, itemIndex) => (
                                                        <View key={`${index}-${itemIndex}`} style={styles.editRow}>
                                                            <TextInput
                                                                style={[styles.editInput, styles.editNameInput]}
                                                                value={item.food_name}
                                                                onChangeText={(value) => updateSuggestionItem(index, itemIndex, 'food_name', value)}
                                                                placeholder="Food"
                                                            />
                                                            <TextInput
                                                                style={styles.editInput}
                                                                value={String(item.quantity)}
                                                                onChangeText={(value) => updateSuggestionItem(index, itemIndex, 'quantity', value)}
                                                                keyboardType="numeric"
                                                                placeholder="Qty"
                                                            />
                                                            <TextInput
                                                                style={styles.editInput}
                                                                value={item.unit}
                                                                onChangeText={(value) => updateSuggestionItem(index, itemIndex, 'unit', value)}
                                                                placeholder="Unit"
                                                            />
                                                        </View>
                                                    ))}

                                                    <Pressable style={styles.addItemBtn} onPress={() => addSuggestionItem(index)}>
                                                        <Icon name="add" size={14} color={colors.primary} />
                                                        <Text style={styles.addItemText}>Add item</Text>
                                                    </Pressable>
                                                </View>
                                            ) : null}

                                            <View style={styles.suggestionFooter}>
                                                <Text style={styles.confidenceText}>{Math.round(Number(suggestion.confidence) * 100)}% match</Text>
                                                <View style={styles.suggestionActionRow}>
                                                    <Pressable
                                                        style={styles.editBtn}
                                                        onPress={() => setEditingIndex((prev) => (prev === index ? null : index))}
                                                    >
                                                        <Icon name="create-outline" size={14} color={colors.primary} />
                                                        <Text style={styles.editBtnText}>{isEditing ? 'Done' : 'Edit'}</Text>
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.useBtn, isUsing && styles.useBtnDisabled]}
                                                        onPress={() => useSuggestion(index)}
                                                        disabled={usingSuggestionIndex !== null}
                                                    >
                                                        {isUsing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.useBtnText}>Use this</Text>}
                                                    </Pressable>
                                                </View>
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </View>

                            {selectedSuggestion ? (
                                <Text style={styles.helperText}>
                                    Selected {selectedSuggestion.title.toLowerCase()} for {selectedSuggestion.meal_type.toLowerCase()}.
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sample Phrases</Text>
                        <Text style={styles.sectionTag}>Tap to use</Text>
                    </View>
                    <View style={styles.sampleList}>
                        {samplePhrases.map((phrase) => (
                            <Pressable
                                key={phrase}
                                style={styles.sampleChip}
                                onPress={() => {
                                    setTranscript(phrase)
                                    setPartialTranscript('')
                                    setSuggestions([])
                                    setSelectedIndex(null)
                                }}
                            >
                                <Icon name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                                <Text style={styles.sampleText}>{phrase}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.footerCard}>
                    <View style={styles.footerIconWrap}>
                        <Icon name="shield-checkmark" size={18} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.footerTitle}>Review before save</Text>
                        <Text style={styles.footerText}>
                            AI suggestions are stored as a draft first. Nothing enters your meal database until you choose a suggestion and continue.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { padding: 18, paddingBottom: 28 },
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
        backgroundColor: colors.primary,
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    heroSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)' },
    card: {
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 14,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
    sectionTag: { fontSize: 11, fontWeight: '800', color: colors.accent },
    sectionTagLive: { color: colors.danger },
    micWrap: { alignItems: 'center', marginBottom: 12 },
    micButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.accent,
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 4,
    },
    micButtonActive: {
        backgroundColor: colors.danger,
    },
    liveDotsRow: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#D5DEEA',
    },
    liveDotActive: {
        backgroundColor: colors.danger,
    },
    micHint: { marginTop: 10, color: colors.secondary, fontSize: 12, textAlign: 'center' },
    errorText: { marginBottom: 10, color: colors.danger, fontSize: 12, fontWeight: '600' },
    transcriptBox: {
        backgroundColor: '#FBFCFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        marginBottom: 12,
    },
    transcriptLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginBottom: 6, textTransform: 'uppercase' },
    transcriptText: { fontSize: 14, lineHeight: 20, color: colors.primary, fontWeight: '600' },
    generateBtn: {
        backgroundColor: colors.primary,
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    generateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    clearBtn: {
        marginTop: 10,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#F3F7FC',
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearBtnText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    reviewBlock: { marginTop: 12 },
    sampleList: {
        gap: 8,
    },
    sampleChip: {
        borderRadius: 12,
        backgroundColor: '#F6FAFF',
        borderWidth: 1,
        borderColor: '#DBE8F8',
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sampleText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        color: colors.secondary,
        fontWeight: '600',
    },
    suggestionList: { gap: 10 },
    suggestionCard: {
        backgroundColor: '#FBFCFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
    },
    suggestionCardSelected: {
        borderColor: '#9ABBF5',
        backgroundColor: '#F1F7FF',
    },
    suggestionTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    suggestionTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, flex: 1 },
    suggestionMeal: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.success,
        backgroundColor: '#EAF8F4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    suggestionNotes: { marginTop: 6, fontSize: 12, color: colors.secondary, lineHeight: 18 },
    suggestionSummary: { marginTop: 6, fontSize: 13, color: colors.primary, fontWeight: '700' },
    suggestionFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    confidenceText: { fontSize: 12, color: colors.muted, fontWeight: '700' },
    suggestionActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#C8D7ED',
        backgroundColor: '#EEF5FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    useBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    useBtnDisabled: { opacity: 0.7 },
    useBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    editPanel: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#DFE8F5',
        paddingTop: 10,
        gap: 8,
    },
    editRow: { flexDirection: 'row', gap: 8 },
    editInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D6E0EE',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 7,
        color: colors.primary,
        fontSize: 12,
    },
    editNameInput: { flex: 1.8 },
    addItemBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#C8D7ED',
        backgroundColor: '#EEF5FF',
    },
    addItemText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    helperText: { marginTop: 10, fontSize: 12, color: colors.muted },
    footerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    footerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EAF8F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerTitle: { fontSize: 15, fontWeight: '800', color: colors.primary },
    footerText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.secondary },
})

export default VoiceLogScreen
