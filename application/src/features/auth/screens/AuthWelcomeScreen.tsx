import React from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootAuthStackParamList } from '../../../navigation/AuthStack'

type Props = NativeStackScreenProps<RootAuthStackParamList, 'Welcome'>

const AuthWelcomeScreen = ({ navigation }: Props) => {
    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <View style={styles.top}>
                    <Image
                        source={require('../../../../assets/onboarding/katori.png')}
                        resizeMode="contain"
                        style={styles.illustration}
                    />
                    <Text style={styles.title}>Bola, log kiya, done.</Text>
                    <Text style={styles.subtitle}>
                        Log your Indian meals just by speaking. No typing. No searching.
                    </Text>
                </View>

                <View>
                    <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.primaryBtnText}>GET STARTED</Text>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
                        <Text style={styles.linkText}>Already have an account? Log in</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAF9F6' },
    container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 28 },
    top: { alignItems: 'center', marginTop: 30 },
    illustration: { width: 190, height: 190 },
    title: { marginTop: 18, fontSize: 30, color: '#1D3557', fontWeight: '800', textAlign: 'center' },
    subtitle: {
        marginTop: 10,
        fontSize: 15,
        lineHeight: 22,
        color: '#6C757D',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    primaryBtn: {
        backgroundColor: '#F4A261',
        borderRadius: 30,
        paddingVertical: 15,
        alignItems: 'center',
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    linkWrap: { marginTop: 14, alignItems: 'center' },
    linkText: { color: '#6C757D', fontSize: 14, fontWeight: '600' },
})

export default AuthWelcomeScreen
