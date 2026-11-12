import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from 'react-native-vector-icons/Ionicons'
import CoachScreen from '../features/dashboard/screens/CoachScreen'
import ProfileScreen from '../features/dashboard/screens/ProfileScreen'
import LogStack from './LogStack'
import HomeStack from './HomeStack'
import RecipeStack from './RecipeStack'

export type DashboardTabParamList = {
    Home: undefined
    Log: undefined
    Recipes: undefined
    Coach: undefined
    Profile: undefined
}

const Tab = createBottomTabNavigator<DashboardTabParamList>()

const getTabIconName = (routeName: keyof DashboardTabParamList, focused: boolean) => {
    if (routeName === 'Home') return focused ? 'home' : 'home-outline'
    if (routeName === 'Log') return focused ? 'add-circle' : 'add-circle-outline'
    if (routeName === 'Recipes') return focused ? 'restaurant' : 'restaurant-outline'
    if (routeName === 'Coach') return focused ? 'barbell' : 'barbell-outline'
    return focused ? 'person' : 'person-outline'
}

const DashboardTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#1D3557',
                tabBarInactiveTintColor: '#26465399',
                tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                        name={getTabIconName(route.name as keyof DashboardTabParamList, focused)}
                        size={size}
                        color={color}
                    />
                ),
                tabBarStyle: {
                    height: 68,
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E8ECEF',
                },
                tabBarLabelStyle: {

                    fontSize: 11,
                    fontWeight: '700',
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Log" component={LogStack} />
            <Tab.Screen name="Recipes" component={RecipeStack} />
            <Tab.Screen name="Coach" component={CoachScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    )
}

export default DashboardTabs
