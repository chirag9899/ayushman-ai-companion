import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { MascotAvatar } from '../../components/MascotAvatar'
import { tk } from '../../lib/i18n'
import { useAppState } from '../../state/AppState'
import * as Notifications from 'expo-notifications'
import type { RootStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>

export function OnboardingScreen({ navigation }: Props) {
  const { profile, setProfile, saveProfile, saveMessage } = useAppState()
  const insets = useSafeAreaInsets()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const [attemptedSave, setAttemptedSave] = useState(false)

  const bmiValue = useMemo(() => {
    const heightCm = profile.demographics.heightCm
    const weightKg = profile.demographics.weightKg
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null
    const heightM = heightCm / 100
    if (heightM <= 0) return null
    return Number((weightKg / (heightM * heightM)).toFixed(1))
  }, [profile.demographics.heightCm, profile.demographics.weightKg])

  const bmiStatus = useMemo(() => {
    if (bmiValue == null) return ''
    if (bmiValue < 18.5) return 'Underweight'
    if (bmiValue < 25) return 'Normal'
    if (bmiValue < 30) return 'Overweight'
    return 'Obesity'
  }, [bmiValue])

  const validationIssues = useMemo(() => {
    const issues: string[] = []
    if (!profile.consentAccepted) issues.push('Accept consent to continue.')
    if (!profile.demographics.age) issues.push('Add age.')
    if (!profile.demographics.heightCm) issues.push('Add height.')
    if (!profile.demographics.weightKg) issues.push('Add weight.')
    if ((profile.demographics.age || 0) > 120) issues.push('Age looks invalid.')
    if ((profile.demographics.heightCm || 0) > 250) issues.push('Height looks invalid.')
    if ((profile.demographics.weightKg || 0) > 350) issues.push('Weight looks invalid.')
    return issues
  }, [
    profile.consentAccepted,
    profile.demographics.age,
    profile.demographics.heightCm,
    profile.demographics.weightKg,
  ])
  const canSaveProfile = validationIssues.length === 0

  const onSave = async () => {
    if (!canSaveProfile) {
      setAttemptedSave(true)
      return
    }
    setAttemptedSave(false)
    await saveProfile()
    // Request notification permission for alarms
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') {
      console.log('[Onboarding] Notification permission not granted')
    }
    navigation.replace('Dashboard')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#eef6f2]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
    >
      <ScrollView
        className="flex-1 bg-[#eef6f2]"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
      >
        <Card>
          <View className="flex-row items-center justify-between gap-2.5">
            <View className="flex-1">
              <Text className="text-[22px] font-extrabold text-[#0f4f5c]">{tt('appName')}</Text>
              <Text className="mt-2 text-[13px] text-[#6b8793]">Complete once, then use dashboard daily.</Text>
            </View>
            <MascotAvatar mood="happy" size={56} />
          </View>
        </Card>
        <View className="rounded-xl border border-[#d7eadf] bg-[#edf9f2] px-3 py-2">
          <Text className="text-xs font-semibold text-[#166534]">Step 1/1: Body basics</Text>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#d1fae5]">
            <View className="h-full w-full rounded-full bg-[#14b8a6]" />
          </View>
        </View>

        <Card title="Body basics (BMI first)">
          <Text className="mb-1 text-xs text-[#6b8793]">Age</Text>
          <Input
            value={profile.demographics.age ? String(profile.demographics.age) : ''}
            keyboardType="number-pad"
            placeholder="e.g. 30"
            onChangeText={(value) => {
              const next = Number(value.replace(/[^\d]/g, ''))
              setProfile({
                ...profile,
                demographics: {
                  ...profile.demographics,
                  age: Number.isFinite(next) && next > 0 ? next : undefined,
                },
              })
            }}
          />
          {attemptedSave && !profile.demographics.age ? (
            <Text className="mt-1 text-[11px] text-[#b42318]">Age is required.</Text>
          ) : null}
          <Text className="mb-1 mt-2.5 text-xs text-[#6b8793]">Height (cm)</Text>
          <Input
            value={profile.demographics.heightCm ? String(profile.demographics.heightCm) : ''}
            keyboardType="decimal-pad"
            placeholder="e.g. 170"
            onChangeText={(value) => {
              const normalized = value.replace(/[^0-9.]/g, '')
              const next = Number(normalized)
              setProfile({
                ...profile,
                demographics: {
                  ...profile.demographics,
                  heightCm: Number.isFinite(next) && next > 0 ? next : undefined,
                },
              })
            }}
          />
          {attemptedSave && !profile.demographics.heightCm ? (
            <Text className="mt-1 text-[11px] text-[#b42318]">Height is required.</Text>
          ) : null}
          <Text className="mb-1 mt-2.5 text-xs text-[#6b8793]">Weight (kg)</Text>
          <Input
            value={profile.demographics.weightKg ? String(profile.demographics.weightKg) : ''}
            keyboardType="decimal-pad"
            placeholder="e.g. 68"
            onChangeText={(value) => {
              const normalized = value.replace(/[^0-9.]/g, '')
              const next = Number(normalized)
              setProfile({
                ...profile,
                demographics: {
                  ...profile.demographics,
                  weightKg: Number.isFinite(next) && next > 0 ? next : undefined,
                },
              })
            }}
          />
          {attemptedSave && !profile.demographics.weightKg ? (
            <Text className="mt-1 text-[11px] text-[#b42318]">Weight is required.</Text>
          ) : null}
          <Pressable
            className="mt-2.5 flex-row items-center gap-2"
            onPress={() =>
              setProfile({
                ...profile,
                consentAccepted: !profile.consentAccepted,
                cloudSyncEnabled: !profile.consentAccepted ? profile.cloudSyncEnabled : false,
              })
            }
          >
            <MaterialCommunityIcons
              name={profile.consentAccepted ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={profile.consentAccepted ? '#14b8a6' : '#6b8793'}
            />
            <Text className="flex-1 text-[13px] font-semibold text-[#334155]">
              I accept terms and educational-only guidance.
            </Text>
          </Pressable>
          {attemptedSave && !profile.consentAccepted ? (
            <Text className="mb-1 mt-1.5 text-xs font-semibold text-[#b42318]">Accept consent to continue.</Text>
          ) : null}
          <View className="mt-2.5 rounded-xl border border-[#d9e1ff] bg-[#f5f7ff] px-2.5 py-2">
            <Text className="text-[11px] font-bold text-[#2f3d86]">BMI</Text>
            <Text className="mt-0.5 text-[13px] font-semibold text-[#334155]">
              {bmiValue != null ? `${bmiValue} (${bmiStatus})` : 'Add height + weight to calculate'}
            </Text>
          </View>
        </Card>

        {saveMessage ? <Text className="text-center text-xs text-[#475569]">{saveMessage}</Text> : null}
      </ScrollView>
      <View
        className="border-t border-[#d7eadf] bg-[#eef6f2] px-4 pt-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
      >
        <Button style={styles.flexButton} onPress={onSave}>
          {profile.language === 'hi' ? 'चलिए शुरू करें' : "Let's start"}
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
})
