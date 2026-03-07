import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tk } from '../../lib/i18n'
import { useAppState } from '../../state/AppState'
import type { DashboardTabParamList } from '../../navigation/types'
import { OverviewTab } from './OverviewTab'
import { RemindersTab } from './RemindersTab'
import { SettingsTab } from './SettingsTab'
import { HistoryTab } from './HistoryTab'
import { CoachTab } from './CoachTab'

const Tab = createBottomTabNavigator<DashboardTabParamList>()

export function DashboardTabs() {
  const { profile } = useAppState()
  const insets = useSafeAreaInsets()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarActiveTintColor: '#0f766e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarShowLabel: false,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          shadowOpacity: 0.05,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          marginHorizontal: 4,
          paddingVertical: 4,
          borderRadius: 12,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarActiveBackgroundColor: 'transparent',
        sceneStyle: {
          paddingBottom: 56 + Math.max(insets.bottom, 8),
          backgroundColor: '#eef6f2',
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewTab}
        options={{
          title: tt('overview'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "view-dashboard" : "view-dashboard-outline"}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersTab}
        options={{
          title: tt('reminders'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "pill" : "pill"}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryTab}
        options={{
          title: tt('history'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "history" : "history"}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachTab}
        options={{
          title: tt('coach'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "message-text" : "message-text-outline"}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          title: tt('settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "cog" : "cog-outline"}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
