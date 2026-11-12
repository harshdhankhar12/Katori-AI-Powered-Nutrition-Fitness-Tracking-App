import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'

type FormulaMode = 'AUTO' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'CUSTOM'

type PersonalizationData = {
    formula: FormulaMode
    step_goal: number
    calorie_target: number
    protein_target: number
    carbs_target: number
    fat_target: number
    dietary_preference: 'VEG' | 'NON_VEG'
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

const formulaOptions: Array<{ value: FormulaMode; title: string; subtitle: string }> = [
    { value: 'AUTO', title: 'Balanced Auto', subtitle: 'Standard split based on your calories' },
    { value: 'HIGH_PROTEIN', title: 'High Protein', subtitle: 'More protein for muscle retention' },
    { value: 'LOW_CARB', title: 'Low Carb', subtitle: 'Lower carbs with higher fat ratio' },
    { value: 'CUSTOM', title: 'Custom Targets', subtitle: 'Set your own macro numbers' },
]

const toIntString = (value: number) => String(Math.round(value))

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, '')

const PersonalizationScreen = () => {
    const getUserProfile = useAuthStore((state) => state.getUserProfile)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<PersonalizationData>({
        formula: 'AUTO',
        step_goal: 10000,
        calorie_target: 2100,
        protein_target: 100,
        carbs_target: 260,
        fat_target: 70,
        dietary_preference: 'NON_VEG',
    })

    const [stepGoalInput, setStepGoalInput] = useState('10000')
    const [calorieInput, setCalorieInput] = useState('2100')
    const [proteinInput, setProteinInput] = useState('100')
    const [carbsInput, setCarbsInput] = useState('260')
    const [fatInput, setFatInput] = useState('70')

    const syncInputs = (next: PersonalizationData) => {
        setStepGoalInput(toIntString(next.step_goal))
        setCalorieInput(toIntString(next.calorie_target))
        setProteinInput(toIntString(next.protein_target))
        setCarbsInput(toIntString(next.carbs_target))
        setFatInput(toIntString(next.fat_target))
    }

    const loadPersonalization = useCallback(async () => {
        setLoading(true)
        try {
            const response = await api.get('/user/personalization')
            const data = response.data.data as PersonalizationData
            const normalized: PersonalizationData = {
                formula: data.formula || 'AUTO',
                step_goal: Number(data.step_goal || 10000),
                calorie_target: Number(data.calorie_target || 2100),
                protein_target: Number(data.protein_target || 100),
                carbs_target: Number(data.carbs_target || 260),
                fat_target: Number(data.fat_target || 70),
                dietary_preference: data.dietary_preference === 'VEG' ? 'VEG' : 'NON_VEG',
            }
            setForm(normalized)
            syncInputs(normalized)
        } catch (error) {
            console.error('Load personalization error:', error)
            Alert.alert('Personalization', 'Could not load your personalization settings.')
        } finally {
            setLoading(false)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            loadPersonalization()
        }, [loadPersonalization]),
    )

    const preview = useMemo(() => {
        const calories = Number(calorieInput || 0)
        const protein = Number(proteinInput || 0)
        const carbs = Number(carbsInput || 0)
        const fat = Number(fatInput || 0)

        const macroCalories = protein * 4 + carbs * 4 + fat * 9
        const difference = calories - macroCalories

        return {
            macroCalories,
            difference,
        }
    }, [calorieInput, proteinInput, carbsInput, fatInput])

    const handleSave = async () => {
        const payload: PersonalizationData = {
            formula: form.formula,
            step_goal: Number(stepGoalInput || 0),
            calorie_target: Number(calorieInput || 0),
            protein_target: Number(proteinInput || 0),
            carbs_target: Number(carbsInput || 0),
            fat_target: Number(fatInput || 0),
            dietary_preference: form.dietary_preference,
        }

        if (!payload.step_goal || payload.step_goal < 3000 || payload.step_goal > 30000) {
            Alert.alert('Invalid step goal', 'Step goal should be between 3000 and 30000.')
            return
        }

        if (!payload.calorie_target || payload.calorie_target < 1200 || payload.calorie_target > 5000) {
            Alert.alert('Invalid calorie target', 'Calories should be between 1200 and 5000.')
            return
        }

        if (payload.formula === 'CUSTOM') {
            if (!payload.protein_target || !payload.carbs_target || !payload.fat_target) {
                Alert.alert('Invalid macros', 'For custom mode, all macros are required.')
                return
            }
        }

        setSaving(true)
        try {
            const response = await api.put('/user/personalization', payload)
            const saved = response.data.data as PersonalizationData
            setForm(saved)
            syncInputs(saved)
            await getUserProfile()
            Alert.alert('Saved', 'Your personalization has been updated.')
        } catch (error) {
            console.error('Save personalization error:', error)
            Alert.alert('Personalization', 'Could not save changes. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const updateFormula = (formula: FormulaMode) => {
        setForm((prev) => ({ ...prev, formula }))
    }

    const customMode = form.formula === 'CUSTOM'

    if (loading) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading personalization...</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerCard}>
                    <Text style={styles.eyebrow}>Nutrition Engine</Text>
                    <Text style={styles.title}>Personalization</Text>
                    <Text style={styles.subtitle}>
                        Tune your step and nutrition targets. This will update your dashboard goals in real-time.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Dietary Preference</Text>
                    <View style={styles.preferenceRow}>
                        <Pressable
                            style={[
                                styles.preferenceChip,
                                form.dietary_preference === 'VEG' && styles.preferenceChipActive,
                            ]}
                            onPress={() => setForm((prev) => ({ ...prev, dietary_preference: 'VEG' }))}
                        >
                            <Text
                                style={[
                                    styles.preferenceChipText,
                                    form.dietary_preference === 'VEG' && styles.preferenceChipTextActive,
                                ]}
                            >
                                Veg
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.preferenceChip,
                                form.dietary_preference === 'NON_VEG' && styles.preferenceChipActive,
                            ]}
                            onPress={() => setForm((prev) => ({ ...prev, dietary_preference: 'NON_VEG' }))}
                        >
                            <Text
                                style={[
                                    styles.preferenceChipText,
                                    form.dietary_preference === 'NON_VEG' && styles.preferenceChipTextActive,
                                ]}
                            >
                                Non-Veg
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={styles.preferenceHint}>
                        If Veg is selected, non-veg foods are hidden from search and quick presets.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Target Formula</Text>
                    {formulaOptions.map((option) => {
                        const active = form.formula === option.value
                        return (
                            <Pressable
                                key={option.value}
                                style={[styles.optionRow, active && styles.optionRowActive]}
                                onPress={() => updateFormula(option.value)}
                            >
                                <View style={styles.optionTextWrap}>
                                    <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{option.title}</Text>
                                    <Text style={[styles.optionSubtitle, active && styles.optionSubtitleActive]}>{option.subtitle}</Text>
                                </View>
                                <Ionicons
                                    name={active ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={active ? colors.primary : colors.muted}
                                />
                            </Pressable>
                        )
                    })}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Daily Activity Goal</Text>
                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>Step Goal</Text>
                        <TextInput
                            value={stepGoalInput}
                            onChangeText={(text) => setStepGoalInput(onlyDigits(text))}
                            keyboardType="numeric"
                            style={styles.input}
                            placeholder="10000"
                            placeholderTextColor={colors.muted}
                        />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Macro Targets</Text>
                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>Calories (kcal)</Text>
                        <TextInput
                            value={calorieInput}
                            onChangeText={(text) => setCalorieInput(onlyDigits(text))}
                            keyboardType="numeric"
                            style={styles.input}
                            placeholder="2100"
                            placeholderTextColor={colors.muted}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.inputCol}>
                            <Text style={styles.inputLabel}>Protein (g)</Text>
                            <TextInput
                                value={proteinInput}
                                onChangeText={(text) => setProteinInput(onlyDigits(text))}
                                keyboardType="numeric"
                                style={[styles.input, !customMode && styles.readonlyInput]}
                                editable={customMode}
                                placeholder="100"
                                placeholderTextColor={colors.muted}
                            />
                        </View>
                        <View style={styles.inputCol}>
                            <Text style={styles.inputLabel}>Carbs (g)</Text>
                            <TextInput
                                value={carbsInput}
                                onChangeText={(text) => setCarbsInput(onlyDigits(text))}
                                keyboardType="numeric"
                                style={[styles.input, !customMode && styles.readonlyInput]}
                                editable={customMode}
                                placeholder="260"
                                placeholderTextColor={colors.muted}
                            />
                        </View>
                    </View>

                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>Fat (g)</Text>
                        <TextInput
                            value={fatInput}
                            onChangeText={(text) => setFatInput(onlyDigits(text))}
                            keyboardType="numeric"
                            style={[styles.input, !customMode && styles.readonlyInput]}
                            editable={customMode}
                            placeholder="70"
                            placeholderTextColor={colors.muted}
                        />
                    </View>

                    <View style={styles.previewBox}>
                        <Text style={styles.previewTitle}>Live Check</Text>
                        <Text style={styles.previewText}>Macro calories: {Math.round(preview.macroCalories)} kcal</Text>
                        <Text style={styles.previewText}>Difference: {Math.round(preview.difference)} kcal</Text>
                    </View>
                </View>

                <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Personalization'}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 18,
        paddingBottom: 40,
        gap: 14,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: colors.secondary,
        fontSize: 15,
        fontWeight: '500',
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.secondary,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.primary,
    },
    preferenceRow: {
        flexDirection: 'row',
        gap: 10,
    },
    preferenceChip: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    preferenceChipActive: {
        borderColor: colors.primary,
        backgroundColor: '#F0F5FB',
    },
    preferenceChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.secondary,
    },
    preferenceChipTextActive: {
        color: colors.primary,
    },
    preferenceHint: {
        fontSize: 12,
        color: colors.secondary,
        lineHeight: 18,
    },
    optionRow: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    optionRowActive: {
        borderColor: colors.primary,
        backgroundColor: '#F0F5FB',
    },
    optionTextWrap: {
        flex: 1,
        gap: 3,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    optionTitleActive: {
        color: colors.primary,
    },
    optionSubtitle: {
        fontSize: 13,
        color: colors.secondary,
    },
    optionSubtitleActive: {
        color: colors.primary,
    },
    inputBlock: {
        gap: 6,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputCol: {
        flex: 1,
        gap: 6,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.secondary,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.primary,
        backgroundColor: '#FFFFFF',
    },
    readonlyInput: {
        backgroundColor: '#F7F9FC',
        color: colors.muted,
    },
    previewBox: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAFCFF',
        padding: 12,
        gap: 4,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    previewText: {
        fontSize: 13,
        color: colors.secondary,
    },
    saveButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
})

export default PersonalizationScreen
