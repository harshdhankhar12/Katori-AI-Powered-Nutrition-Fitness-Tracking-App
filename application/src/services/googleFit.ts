import { NativeModules, Platform, PermissionsAndroid } from 'react-native'
import GoogleFit, { Scopes } from 'react-native-google-fit'
import { GOOGLE_CLIENT_ID } from '../config/env'
import type { AuthorizeResponse } from 'react-native-google-fit'

export type FitSyncResult = {
    connected: boolean
    steps: number
    caloriesBurned: number
}

const startOfTodayIso = () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return startOfDay.toISOString()
}

const endOfTodayIso = () => new Date().toISOString()

const extractSteps = (samples: Array<{ steps: Array<{ value: number }> }>) => {
    return samples.reduce((total, sample) => {
        const sampleSteps = sample.steps.reduce((sampleTotal, step) => sampleTotal + Number(step.value || 0), 0)
        return total + sampleSteps
    }, 0)
}

const extractCalories = (samples: Array<{ calorie: number }>) => {
    return samples.reduce((total, sample) => total + Number(sample.calorie || 0), 0)
}

const hasGoogleFitNativeModule = Boolean(NativeModules?.RNGoogleFit)

export const isGoogleFitAvailable = Platform.OS === 'android' && hasGoogleFitNativeModule

export const getGoogleFitAvailabilityMessage = () => {
    if (Platform.OS !== 'android') {
        return 'Google Fit is only available on Android for this build.'
    }

    if (!hasGoogleFitNativeModule) {
        return 'Google Fit native module is unavailable. Rebuild Android app after install and ensure Google Play Services is present.'
    }

    return null
}

const ensureGoogleFitReady = () => {
    const unavailableMessage = getGoogleFitAvailabilityMessage()
    if (unavailableMessage) {
        throw new Error(unavailableMessage)
    }
}

const getActivityPermissionName = () => {
    const isAndroid10OrNewer = Platform.OS === 'android' && Platform.Version >= 29
    return isAndroid10OrNewer
        ? PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
        : PermissionsAndroid.PERMISSIONS.BODY_SENSORS
}

const hasActivityRecognitionPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true
    }

    return PermissionsAndroid.check(getActivityPermissionName())
}

const requestActivityRecognitionPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true
    }

    try {
        const permission = getActivityPermissionName()

        const alreadyGranted = await PermissionsAndroid.check(permission)
        if (alreadyGranted) {
            return true
        }

        const result = await PermissionsAndroid.request(permission, {
            title: 'Fitness Permission Required',
            message: 'Allow physical activity access so Katori can read steps and active calories from Google Fit.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
        })

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
            return true
        }

        return result === PermissionsAndroid.RESULTS.GRANTED
    } catch (err) {
        console.warn('Activity recognition permission error:', err)
        return false
    }
}

export const connectGoogleFit = async (): Promise<FitSyncResult> => {
    ensureGoogleFitReady()

    if (!GOOGLE_CLIENT_ID) {
        throw new Error('Missing GOOGLE_CLIENT_ID in config/.env')
    }

    const hasPermission = await requestActivityRecognitionPermission()
    if (!hasPermission) {
        throw new Error('Activity recognition permission denied. Cannot access Google Fit data.')
    }

    const authResult = (await GoogleFit.authorize({
        scopes: [
            Scopes.FITNESS_ACTIVITY_READ,
            Scopes.FITNESS_ACTIVITY_WRITE,
            Scopes.FITNESS_BODY_READ,
            Scopes.FITNESS_BODY_WRITE,
        ],
    })) as AuthorizeResponse

    if (!authResult.success) {
        throw new Error(authResult.message || 'Google Fit authorization was cancelled.')
    }

    const [stepSamples, calorieSamples] = await Promise.all([
        GoogleFit.getDailyStepCountSamples({
            startDate: startOfTodayIso(),
            endDate: endOfTodayIso(),
        }),
        GoogleFit.getDailyCalorieSamples({
            startDate: startOfTodayIso(),
            endDate: endOfTodayIso(),
        }),
    ])

    return {
        connected: true,
        steps: extractSteps(stepSamples),
        caloriesBurned: Math.round(extractCalories(calorieSamples)),
    }
}

export const disconnectGoogleFit = async () => {
    if (!isGoogleFitAvailable) return
    await GoogleFit.disconnect()
}

export const fetchCurrentGoogleFitActivity = async (): Promise<FitSyncResult> => {
    if (!isGoogleFitAvailable) {
        return {
            connected: false,
            steps: 0,
            caloriesBurned: 0,
        }
    }

    try {
        // Silent check only. Do not request permission during background refresh.
        const hasPermission = await hasActivityRecognitionPermission()
        if (!hasPermission) {
            return {
                connected: false,
                steps: 0,
                caloriesBurned: 0,
            }
        }

        const authResult = (await GoogleFit.authorize({
            scopes: [
                Scopes.FITNESS_ACTIVITY_READ,
                Scopes.FITNESS_BODY_READ,
            ],
        })) as AuthorizeResponse

        if (!authResult.success) {
            return {
                connected: false,
                steps: 0,
                caloriesBurned: 0,
            }
        }

        const [stepSamples, calorieSamples] = await Promise.all([
            GoogleFit.getDailyStepCountSamples({
                startDate: startOfTodayIso(),
                endDate: endOfTodayIso(),
            }),
            GoogleFit.getDailyCalorieSamples({
                startDate: startOfTodayIso(),
                endDate: endOfTodayIso(),
            }),
        ])

        return {
            connected: true,
            steps: extractSteps(stepSamples),
            caloriesBurned: Math.round(extractCalories(calorieSamples)),
        }
    } catch {
        return {
            connected: false,
            steps: 0,
            caloriesBurned: 0,
        }
    }
}
