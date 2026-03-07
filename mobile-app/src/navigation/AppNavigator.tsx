import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StyleSheet, Text, View } from 'react-native'
import { DashboardTabs } from '../features/dashboard/DashboardTabs'
import { LandingScreen } from '../features/landing/LandingScreen'
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen'
import { ProviderHandoffScreen } from '../features/reports/ProviderHandoffScreen'
import { SyntheticEvaluationScreen } from '../features/reports/SyntheticEvaluationScreen'
import { MascotAvatar } from '../components/MascotAvatar'
import { tk } from '../lib/i18n'
import { useAppState } from '../state/AppState'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  const { profile } = useAppState()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const hasCompletedOnboarding = Boolean(
    profile.consentAccepted &&
      profile.demographics.age &&
      profile.demographics.heightCm &&
      profile.demographics.weightKg
  )

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={hasCompletedOnboarding ? 'onboarding-complete' : 'onboarding-pending'}
        initialRouteName={hasCompletedOnboarding ? 'Dashboard' : 'Landing'}
        screenOptions={{
          headerStyle: { backgroundColor: '#ebf1ff' },
          headerTintColor: '#2f3d86',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#ebf1ff' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ title: tt('appName') }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardTabs}
          options={{
            headerTitle: () => (
              <View>
                <Text style={styles.headerTitle}>{tt('appName')}</Text>
              </View>
            ),
            headerRight: () => <MascotAvatar mood="happy" size={36} />,
          }}
        />
        <Stack.Screen
          name="SyntheticEvaluation"
          component={SyntheticEvaluationScreen}
          options={{ title: 'Synthetic Evaluation' }}
        />
        <Stack.Screen
          name="ProviderHandoff"
          component={ProviderHandoffScreen}
          options={{ title: 'Provider Handoff' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2f3d86',
  },
})
