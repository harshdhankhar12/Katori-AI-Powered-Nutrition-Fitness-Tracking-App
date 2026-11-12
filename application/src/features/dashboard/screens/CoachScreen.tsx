import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Ionicons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { DashboardTabParamList } from '../../../navigation/DashboardTabs'
import { useAuthStore } from '../../../store/authStore'
import { coachApi } from '../services/coachApi'
import type { CoachAction, CoachMessage, CoachMode } from '../types/coach'

type NavProp = BottomTabNavigationProp<DashboardTabParamList>

const CACHE_KEY = 'coach-chat-cache-v1'

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

const modeOptions: Array<{ value: CoachMode; label: string }> = [
    { value: 'FAT_LOSS', label: 'Fat Loss' },
    { value: 'MUSCLE_GAIN', label: 'Muscle Gain' },
    { value: 'MAINTAIN', label: 'Maintain' },
    { value: 'INDIAN_HOME_STYLE', label: 'Indian Home' },
]

const starterPrompts = [
    'What should I eat now to hit protein target?',
    'Give me a quick dinner plan under 500 calories.',
    'I have cravings right now, what should I do?',
]

const createLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const splitBoldSegments = (line: string) => {
    const output: Array<{ text: string; bold: boolean }> = []
    const matcher = /\*\*(.*?)\*\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while (true) {
        match = matcher.exec(line)
        if (!match) break
        if (match.index > lastIndex) {
            output.push({ text: line.slice(lastIndex, match.index), bold: false })
        }
        output.push({ text: match[1], bold: true })
        lastIndex = matcher.lastIndex
    }

    if (lastIndex < line.length) {
        output.push({ text: line.slice(lastIndex), bold: false })
    }

    return output.length ? output : [{ text: line, bold: false }]
}

const FormattedCoachText = ({ text, style }: { text: string; style: any }) => {
    const lines = text.split('\n')

    return (
        <View style={styles.formattedWrap}>
            {lines.map((rawLine, index) => {
                const line = rawLine.trimEnd()
                if (!line) {
                    return <View key={`space-${index}`} style={styles.emptyLine} />
                }

                const isBullet = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)
                const cleanLine = isBullet ? line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '') : line
                const parts = splitBoldSegments(cleanLine)

                if (isBullet) {
                    return (
                        <View key={`bullet-${index}`} style={styles.bulletRow}>
                            <Text style={[style, styles.bulletDot]}>•</Text>
                            <Text style={[style, styles.bulletText]}>
                                {parts.map((part, partIndex) => (
                                    <Text key={`part-${index}-${partIndex}`} style={part.bold ? styles.boldText : undefined}>
                                        {part.text}
                                    </Text>
                                ))}
                            </Text>
                        </View>
                    )
                }

                return (
                    <Text key={`line-${index}`} style={style}>
                        {parts.map((part, partIndex) => (
                            <Text key={`part-${index}-${partIndex}`} style={part.bold ? styles.boldText : undefined}>
                                {part.text}
                            </Text>
                        ))}
                    </Text>
                )
            })}
        </View>
    )
}

const CoachScreen = () => {
    const navigation = useNavigation<NavProp>()
    const user = useAuthStore((state) => state.user)
    const listRef = useRef<FlatList<CoachMessage> | null>(null)

    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [messages, setMessages] = useState<CoachMessage[]>([])
    const [input, setInput] = useState('')
    const [mode, setMode] = useState<CoachMode>('MAINTAIN')
    const [todayCheckin, setTodayCheckin] = useState<null | {
        hunger_level: number
        energy_level: number
        cravings_note?: string
        checkin_date: string
    }>(null)

    const [hunger, setHunger] = useState(3)
    const [energy, setEnergy] = useState(3)
    const [cravings, setCravings] = useState('')

    const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
    const [typingChars, setTypingChars] = useState(0)

    const welcomeMessage = useMemo<CoachMessage>(() => ({
        id: 'coach-welcome',
        role: 'assistant',
        content: `Hi ${((user?.profile?.full_name || user?.name || 'there').split(' ')[0])}.\n\n**Coach is ready.**\n- Tell me what you ate today\n- Ask for quick meal fixes\n- I will keep it short and practical`,
        created_at: new Date().toISOString(),
    }), [user])

    const scrollToBottom = () => {
        setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true })
        }, 40)
    }

    useEffect(() => {
        const hydrate = async () => {
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY)
                if (cached) {
                    const parsed = JSON.parse(cached) as {
                        mode?: CoachMode
                        messages?: CoachMessage[]
                        todayCheckin?: any
                    }
                    if (parsed.mode) setMode(parsed.mode)
                    if (Array.isArray(parsed.messages) && parsed.messages.length) {
                        setMessages(parsed.messages)
                    }
                    if (parsed.todayCheckin) setTodayCheckin(parsed.todayCheckin)
                }
            } catch {
                // ignore local cache parsing issues
            }

            try {
                const response = await coachApi.getHistory()
                setMode(response.mode)
                setTodayCheckin(response.today_checkin)
                setMessages(response.messages.length ? response.messages : [welcomeMessage])
            } catch (error) {
                console.error('Coach history load error:', error)
                setMessages((prev) => (prev.length ? prev : [welcomeMessage]))
            } finally {
                setLoading(false)
                scrollToBottom()
            }
        }

        hydrate()
    }, [welcomeMessage])

    useEffect(() => {
        AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                mode,
                messages: messages.slice(-80),
                todayCheckin,
            }),
        ).catch(() => undefined)
    }, [messages, mode, todayCheckin])

    useEffect(() => {
        if (!typingMessageId) return

        const active = messages.find((item) => item.id === typingMessageId)
        if (!active) {
            setTypingMessageId(null)
            setTypingChars(0)
            return
        }

        const targetLength = active.content.length
        if (typingChars >= targetLength) {
            setTypingMessageId(null)
            setTypingChars(0)
            return
        }

        const timer = setTimeout(() => {
            setTypingChars((prev) => Math.min(prev + 3, targetLength))
            scrollToBottom()
        }, 16)

        return () => clearTimeout(timer)
    }, [messages, typingChars, typingMessageId])

    const onSaveMode = async (nextMode: CoachMode) => {
        setMode(nextMode)
        try {
            await coachApi.setMode(nextMode)
        } catch (error) {
            console.error('Coach mode update error:', error)
            Alert.alert('Coach', 'Could not update mode right now.')
        }
    }

    const onSubmitCheckin = async () => {
        try {
            const saved = await coachApi.saveCheckin({
                hunger_level: hunger,
                energy_level: energy,
                cravings_note: cravings.trim() || undefined,
            })

            setTodayCheckin(saved)
            Alert.alert('Saved', 'Daily check-in recorded for better coaching.')
        } catch (error) {
            console.error('Coach check-in error:', error)
            Alert.alert('Coach', 'Could not save check-in right now.')
        }
    }

    const sendMessage = async (value?: string) => {
        const finalText = String(value ?? input).trim()
        if (!finalText || sending) return

        const optimisticUserMessage: CoachMessage = {
            id: createLocalId(),
            role: 'user',
            content: finalText,
            created_at: new Date().toISOString(),
        }

        setInput('')
        setMessages((prev) => [...prev, optimisticUserMessage])
        setSending(true)
        scrollToBottom()

        try {
            const response = await coachApi.sendMessage({ message: finalText, mode })
            const assistant = response.assistant_message

            setMode(response.mode)
            setMessages((prev) => [...prev, assistant])
            setTypingMessageId(assistant.id)
            setTypingChars(0)
        } catch (error) {
            console.error('Coach send message error:', error)
            const fallbackMessage: CoachMessage = {
                id: createLocalId(),
                role: 'assistant',
                content: '**Coach is reconnecting.**\n\n- Please retry once\n- If network is off, reconnect and send again',
                created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, fallbackMessage])
        } finally {
            setSending(false)
            scrollToBottom()
        }
    }

    const onActionPress = (action: CoachAction) => {
        if (action.type === 'OPEN_RECIPES') {
            navigation.navigate('Recipes')
            return
        }

        if (action.type === 'OPEN_MACRO_GAP') {
            navigation.navigate('Recipes' as never, { screen: 'MacroGapFiller' } as never)
            return
        }

        if (action.type === 'OPEN_LOG_MEAL') {
            navigation.navigate('Log')
            return
        }

        navigation.navigate('Log' as never, { screen: 'VoiceLog' } as never)
    }

    const renderActionCards = (actions?: CoachAction[]) => {
        if (!actions?.length) return null

        return (
            <View style={styles.actionWrap}>
                {actions.map((action, index) => (
                    <Pressable key={`${action.type}-${index}`} style={styles.actionCard} onPress={() => onActionPress(action)}>
                        <Text style={styles.actionTitle}>{action.title}</Text>
                        {!!action.subtitle && <Text style={styles.actionSub}>{action.subtitle}</Text>}
                    </Pressable>
                ))}
            </View>
        )
    }

    const renderMessageItem = ({ item }: { item: CoachMessage }) => {
        const mine = item.role === 'user'
        const isTyping = !mine && typingMessageId === item.id
        const visibleContent = isTyping ? item.content.slice(0, typingChars) : item.content

        return (
            <View style={styles.messageRow}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleCoach]}>
                    <FormattedCoachText text={visibleContent} style={[mine ? styles.userText : styles.coachText, mine && styles.userTextRight]} />
                    {isTyping && <Text style={styles.typingDots}>...</Text>}
                    {!mine && !isTyping && renderActionCards(item.actions)}
                </View>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={styles.flex}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Coach</Text>
                        <Text style={styles.headerSub}>Context-aware AI nutrition chat</Text>
                    </View>

                    <View style={styles.modeRow}>
                        {modeOptions.map((item) => {
                            const active = mode === item.value
                            return (
                                <Pressable
                                    key={item.value}
                                    style={[styles.modeChip, active && styles.modeChipActive]}
                                    onPress={() => onSaveMode(item.value)}
                                >
                                    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{item.label}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    {!todayCheckin && (
                        <View style={styles.checkinCard}>
                            <Text style={styles.checkinTitle}>Daily Check-in</Text>
                            <Text style={styles.checkinSub}>How are hunger and energy today?</Text>

                            <View style={styles.metricBlock}>
                                <Text style={styles.metricLabel}>Hunger</Text>
                                <View style={styles.metricOptions}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <Pressable
                                            key={`hunger-${value}`}
                                            style={[styles.metricChip, hunger === value && styles.metricChipActive]}
                                            onPress={() => setHunger(value)}
                                        >
                                            <Text style={[styles.metricChipText, hunger === value && styles.metricChipTextActive]}>{value}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.metricBlock}>
                                <Text style={styles.metricLabel}>Energy</Text>
                                <View style={styles.metricOptions}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <Pressable
                                            key={`energy-${value}`}
                                            style={[styles.metricChip, energy === value && styles.metricChipActive]}
                                            onPress={() => setEnergy(value)}
                                        >
                                            <Text style={[styles.metricChipText, energy === value && styles.metricChipTextActive]}>{value}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <TextInput
                                value={cravings}
                                onChangeText={setCravings}
                                placeholder="Cravings note (optional)"
                                placeholderTextColor={colors.muted}
                                style={styles.checkinInput}
                            />

                            <Pressable style={styles.checkinBtn} onPress={onSubmitCheckin}>
                                <Text style={styles.checkinBtnText}>Save Check-in</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.promptRow}>
                        {starterPrompts.map((prompt) => (
                            <Pressable key={prompt} style={styles.promptChip} onPress={() => sendMessage(prompt)}>
                                <Text style={styles.promptChipText} numberOfLines={1}>{prompt}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessageItem}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={10}
                            windowSize={7}
                            maxToRenderPerBatch={8}
                            onContentSizeChange={scrollToBottom}
                        />
                    )}

                    <View style={styles.composerWrap}>
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask Coach anything about your meals..."
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                            multiline
                        />

                        <Pressable style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]} onPress={() => sendMessage()} disabled={sending || !input.trim()}>
                            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="send" size={16} color="#FFFFFF" />}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 10 },
    headerTitle: { color: colors.primary, fontSize: 22, fontWeight: '800' },
    headerSub: { color: colors.secondary, fontSize: 12, marginTop: 2 },
    modeRow: { paddingHorizontal: 12, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    modeChip: {
        borderWidth: 1,
        borderColor: '#CFE0F7',
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    modeChipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
    modeChipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    modeChipTextActive: { color: '#FFFFFF' },
    checkinCard: {
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: 12,
        gap: 8,
    },
    checkinTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
    checkinSub: { color: colors.secondary, fontSize: 12 },
    metricBlock: { gap: 6 },
    metricLabel: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
    metricOptions: { flexDirection: 'row', gap: 7 },
    metricChip: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D5DFEC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricChipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
    metricChipText: { color: colors.primary, fontWeight: '700' },
    metricChipTextActive: { color: '#FFFFFF' },
    checkinInput: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAFCFF',
        paddingHorizontal: 10,
        paddingVertical: 9,
        color: colors.primary,
    },
    checkinBtn: {
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    checkinBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    promptRow: { paddingHorizontal: 12, marginTop: 10, flexDirection: 'row', gap: 8 },
    promptChip: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#DAE4F2',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    promptChipText: { color: colors.secondary, fontSize: 11, fontWeight: '700' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 10 },
    messageRow: { width: '100%' },
    bubble: {
        width: '100%',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    bubbleMine: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
    bubbleCoach: { backgroundColor: '#FFFFFF', borderColor: colors.border },
    userText: { color: '#FFFFFF', fontSize: 13, lineHeight: 19 },
    userTextRight: { textAlign: 'right' },
    coachText: { color: colors.primary, fontSize: 13, lineHeight: 19 },
    formattedWrap: { gap: 4 },
    emptyLine: { height: 6 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    bulletDot: { marginTop: 1 },
    bulletText: { flex: 1 },
    boldText: { fontWeight: '800' },
    typingDots: { marginTop: 3, color: colors.muted, fontWeight: '800' },
    actionWrap: { marginTop: 9, gap: 6 },
    actionCard: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D8E5F7',
        backgroundColor: '#EFF5FF',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    actionTitle: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    actionSub: { color: colors.secondary, fontSize: 11, marginTop: 2 },
    composerWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#FFFFFF',
    },
    input: {
        flex: 1,
        maxHeight: 110,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E2F1',
        backgroundColor: '#FAFCFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: colors.primary,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#9CB4C9' },
})

export default CoachScreen
