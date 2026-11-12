declare module '@react-native-voice/voice' {
    type SpeechResultsEvent = { value?: string[] }
    type SpeechPartialResultsEvent = { value?: string[] }
    type SpeechErrorEvent = { error?: { code?: string | number; message?: string } }

    interface VoiceModule {
        onSpeechStart?: (() => void) | null
        onSpeechEnd?: (() => void) | null
        onSpeechError?: ((event: SpeechErrorEvent) => void) | null
        onSpeechResults?: ((event: SpeechResultsEvent) => void) | null
        onSpeechPartialResults?: ((event: SpeechPartialResultsEvent) => void) | null
        start(locale: string, options?: { REQUEST_PERMISSIONS_AUTO?: boolean }): Promise<void>
        stop(): Promise<void>
        cancel(): Promise<void>
        destroy(): Promise<void>
        removeAllListeners(): void
    }

    const Voice: VoiceModule
    export default Voice
}
