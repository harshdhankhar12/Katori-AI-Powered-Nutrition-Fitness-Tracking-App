module.exports = {
    project: {
        ios: {},
        android: {},
    },
    dependencies: {
        '@react-native-voice/voice': {
            platforms: {
                android: {
                    sourceDir: '../node_modules/@react-native-voice/voice/android',
                    packageImportPath: 'import com.wenkesj.voice.VoicePackage;',
                    packageInstance: 'new VoicePackage()',
                },
                ios: {},
            },
        },
    },
};
