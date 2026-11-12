import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootAuthStackParamList } from '../../../navigation/AuthStack'

type Props = NativeStackScreenProps<RootAuthStackParamList, 'Splash'>

const AuthSplashScreen = ({ navigation }: Props) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            navigation.replace('Welcome')
        }, 2000)

        return () => clearTimeout(timer)
    }, [navigation])

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.center}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>K</Text>
                </View>
                <Text style={styles.title}>Katori</Text>
                <Text style={styles.tagline}>Snap your meal. Know your next.</Text>
                <ActivityIndicator size="small" color="#1D3557" style={styles.loader} />
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAF9F6' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    logoCircle: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: '#F4A261',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
    title: { marginTop: 14, fontSize: 30, fontWeight: '800', color: '#1D3557' },
    tagline: { marginTop: 8, fontSize: 14, color: '#6C757D', textAlign: 'center' },
    loader: { marginTop: 18 },
})

export default AuthSplashScreen
