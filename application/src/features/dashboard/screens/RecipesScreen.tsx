import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const RecipesScreen = () => {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-[28px] font-extrabold text-secondary">Recipes</Text>
                <Text className="mt-2 text-center text-main">Recipe Architect suggestions will appear here.</Text>
            </View>
        </SafeAreaView>
    )
}

export default RecipesScreen
