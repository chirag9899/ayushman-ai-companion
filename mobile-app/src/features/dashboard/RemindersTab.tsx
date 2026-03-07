import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/EmptyState'
import { PresenterOverlay } from '../../components/PresenterOverlay'
import type { TourFocusFrame } from '../../components/PresenterOverlay'
import { Toast } from '../../components/ui/Toast'
import { MascotAvatar } from '../../components/MascotAvatar'
import { H3 } from '../../components/Typography'
import { Feedback } from '../../lib/haptics'
import { tk } from '../../lib/i18n'
import { getTodayReminders } from '../../lib/profile'
import { useAppState } from '../../state/AppState'
import { Colors, Spacing, Radius } from '../../styles/designSystem'
import type { DashboardTabParamList } from '../../navigation/types'

const weekdayOptions = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

function formatWeekdays(days?: number[]) {
  if (!days || days.length === 0 || days.length === 7) return 'Everyday'
  const set = new Set(days)
  return weekdayOptions
    .filter((item) => set.has(item.value))
    .map((item) => item.label)
    .join(', ')
}

export function RemindersTab() {
  const navigation = useNavigation<BottomTabNavigationProp<DashboardTabParamList>>()
  const {
    profile,
    reminderLogs,
    activeReminderAlert,
    dismissReminderAlert,
    saveReminderAction,
    upsertMedicationScheduleFromCoach,
    removeMedicationSchedule,
    requestNotificationPermission,
    notificationPermission,
    demoTourActive,
    demoTourStep,
    demoTourNarrationEnabled,
    showPresenterOverlay,
    goToDemoTourStep,
    finishDemoTour,
  } = useAppState()
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [medicineName, setMedicineName] = useState('')
  const [time24h, setTime24h] = useState('09:00')
  const [repeatMode, setRepeatMode] = useState<'daily' | 'custom'>('daily')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [tourFocusFrame, setTourFocusFrame] = useState<TourFocusFrame | null>(null)
  const mainScrollRef = useRef<ScrollView>(null)
  const scrollRef = useRef<ScrollView>(null)
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const reminders = getTodayReminders(profile)
  const reminderMap = new Map(reminderLogs.map((log) => [log.reminderKey, log]))
  const notificationsEnabled = notificationPermission === 'granted'
  const notificationDenied = notificationPermission === 'denied'

  useEffect(() => {
    if (notificationPermission !== 'undetermined') return
    void requestNotificationPermission()
  }, [notificationPermission, requestNotificationPermission])

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS !== 'android') return
      const height = Math.max(0, event.endCoordinates?.height ?? 0)
      setKeyboardHeight(height)
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS !== 'android') return
      setKeyboardHeight(0)
    })
    return () => {
      onShow.remove()
      onHide.remove()
    }
  }, [])

  const medicationRepeatMap = useMemo(() => {
    const map = new Map<string, string>()
    profile.medications.forEach((medication) => {
      const name = medication.name.trim().toLowerCase()
      ;(medication.times || []).forEach((time) => {
        map.set(`${name}@${time}`, formatWeekdays(medication.daysOfWeek))
      })
    })
    return map
  }, [profile.medications])

  useEffect(() => {
    if (!demoTourActive || demoTourStep !== 'reminders' || !tourFocusFrame) return
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: Math.max(0, tourFocusFrame.y - 50), animated: true })
    }, 140)
    return () => clearTimeout(timer)
  }, [demoTourActive, demoTourStep, tourFocusFrame])

  const addSchedule = async () => {
    const name = medicineName.trim()
    const time = time24h.trim()
    const validTime = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(time)
    if (!name || !validTime) {
      setToast({ message: tt('enterValidTime'), tone: 'error' })
      return
    }
    const customDays = repeatMode === 'custom' ? [...selectedWeekdays].sort() : []
    if (repeatMode === 'custom' && customDays.length === 0) {
      setToast({ message: tt('pickOneDay'), tone: 'error' })
      return
    }
    await upsertMedicationScheduleFromCoach(name, time, repeatMode === 'custom' ? customDays : undefined)
    if (!notificationsEnabled) {
      await requestNotificationPermission()
      setToast({ message: tt('reminderSavedNoNotif'), tone: 'success' })
    } else {
      setToast({ message: tt('reminderScheduled'), tone: 'success' })
    }
    setMedicineName('')
    setTime24h('09:00')
    setRepeatMode('daily')
    setSelectedWeekdays([])
    setSheetOpen(false)
  }

  const markTaken = async (medicationName: string, scheduledTime: string) => {
    try {
      Feedback.medicineTaken()
      await saveReminderAction(medicationName, scheduledTime, 'taken')
      setToast({ message: tt('markedAsTaken'), tone: 'success' })
    } catch {
      Feedback.error()
      setToast({ message: tt('couldNotUpdate'), tone: 'error' })
    }
  }

  return (
    <View style={styles.container}>
      {/* Soft background fallback (works without native gradient module) */}
      <View style={styles.bgFallback} />

      <ScrollView
        ref={mainScrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xl }]}
      >
        <Card className="py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[22px] font-extrabold text-[#0f4f5c]">{tt('reminders')}</Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-[#6b8793]">
                {tt('remindersSubtitle')}
              </Text>
            </View>
            <MascotAvatar mood={activeReminderAlert ? 'alert' : 'default'} size={56} />
          </View>
          {notificationDenied ? (
            <Text className="mt-2.5 text-xs text-[#b45309]">
              {tt('notificationsOff')}
            </Text>
          ) : null}
          {notificationDenied ? (
            <Button
              size="sm"
              variant="secondary"
              style={styles.permissionBtn}
              onPress={() => {
                void Linking.openSettings()
              }}
            >
              {tt('openNotificationSettings')}
            </Button>
          ) : null}
        </Card>

        {activeReminderAlert ? (
          <Card>
            <Text className="text-[11px] font-bold uppercase text-[#92400e]">
              {tt('alarmTitle')}
            </Text>
            <Text className="mt-1 text-sm font-bold text-[#0f172a]">
              {activeReminderAlert.medicationName} - {activeReminderAlert.displayTime}
            </Text>
            <Text className="mt-1 text-xs text-[#475569]">{tt('alarmBody')}</Text>
            <View className="mt-3 flex-row gap-2">
              <Button
                style={styles.flexBtn}
                size="sm"
                onPress={() =>
                  void markTaken(activeReminderAlert.medicationName, activeReminderAlert.scheduledTime)
                }
              >
                {tt('taken')}
              </Button>
              <Button
                style={styles.flexBtn}
                size="sm"
                variant="secondary"
                onPress={() => {
                  void saveReminderAction(
                    activeReminderAlert.medicationName,
                    activeReminderAlert.scheduledTime,
                    'snoozed'
                  )
                  dismissReminderAlert()
                  setToast({ message: tt('alarmDismissed'), tone: 'success' })
                }}
              >
                {tt('snooze')}
              </Button>
              <Button
                style={styles.flexBtn}
                size="sm"
                variant="secondary"
                onPress={() => {
                  dismissReminderAlert()
                  setToast({ message: tt('alarmDismissed'), tone: 'success' })
                }}
              >
                {tt('alarmDismiss')}
              </Button>
            </View>
          </Card>
        ) : null}

        <View onLayout={(event) => setTourFocusFrame(event.nativeEvent.layout)}>
        <Card>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: Colors.primary[100] }]}>
              <MaterialCommunityIcons name="pill" size={20} color={Colors.primary[600]} />
            </View>
            <H3 color="primary">{tt('todaysReminders')}</H3>
          </View>

          {reminders.length === 0 ? (
            <EmptyState
              variant="reminders"
              actionLabel={tt('addSchedule')}
              onAction={() => {
                Feedback.buttonPress()
                setSheetOpen(true)
              }}
            />
          ) : (
            reminders.map((reminder) => {
              const log = reminderMap.get(reminder.reminderKey)
              const status = log?.status || 'pending'
              const timeLabel = new Date(reminder.scheduledTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const time24h = reminder.scheduledTime.slice(11, 16)
              const repeatLabel =
                medicationRepeatMap.get(`${reminder.medicationName.trim().toLowerCase()}@${time24h}`) ||
                'Everyday'
              return (
                <View
                  key={reminder.reminderKey}
                  className="mb-3 rounded-2xl border border-[#e6f0f3] bg-[#f8fdff] p-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#dbf7fb]">
                        <MaterialCommunityIcons name="pill" size={16} color="#0f4f5c" />
                      </View>
                      <Text className="text-sm font-bold text-[#0f4f5c]">{reminder.medicationName}</Text>
                    </View>
                    <Badge
                      tone={
                        status === 'taken'
                          ? 'success'
                          : status === 'missed'
                            ? 'danger'
                            : status === 'snoozed'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {status}
                    </Badge>
                  </View>
                  <Text className="mt-1 text-xs text-[#475569]">{timeLabel}</Text>
                  <Text className="mt-1 text-[11px] text-[#64748b]">Repeat: {repeatLabel}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <Button
                      style={styles.flexBtn}
                      size="sm"
                      accessibilityLabel={tt('taken')}
                      onPress={() => void markTaken(reminder.medicationName, reminder.scheduledTime)}
                    >
                      {tt('taken')}
                    </Button>
                    <Button
                      style={styles.flexBtn}
                      size="sm"
                      variant="danger"
                      accessibilityLabel={tt('delete')}
                      onPress={() =>
                        removeMedicationSchedule(reminder.medicationName, time24h)
                      }
                    >
                      {tt('delete')}
                    </Button>
                  </View>
                </View>
              )
            })
          )}
        </Card>
        </View>
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={tt('addSchedule')}
        style={[styles.fab, { bottom: Math.max(8, insets.bottom + 6) }]}
        onPress={() => setSheetOpen(true)}
      >
        <MaterialCommunityIcons name="clock-plus-outline" size={30} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="flex-1 bg-[rgba(15,23,42,0.25)]" onPress={() => setSheetOpen(false)} />
          <View
            className="rounded-t-[26px] bg-white"
            style={[
              { maxHeight: '85%' },
              Platform.OS === 'android' && keyboardHeight > 0
                ? { position: 'absolute', bottom: keyboardHeight - 5, left: 0, right: 0, maxHeight: '60%' }
                : undefined,
            ]}
          >
            <ScrollView
              ref={scrollRef}
              className="px-[18px] pt-[18px]"
              contentContainerStyle={{ gap: 12, paddingBottom: keyboardHeight > 0 ? 40 : 24 + insets.bottom }}
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-1 h-[5px] w-[42px] self-center rounded-full bg-[#dbe5ef]" />
              <Text className="text-center text-[22px] font-bold text-[#0f4f5c]">{tt('addSchedule')}</Text>
              <Input
                value={medicineName}
                placeholder={tt('medicationName')}
                onChangeText={setMedicineName}
              />
              <Input
                value={time24h}
                keyboardType="number-pad"
                placeholder={tt('timePlaceholder')}
                onChangeText={(text) => {
                  // Normalize input: remove non-digits and existing colons, then reformat
                  const raw = text.replace(/[^0-9]/g, '').slice(0, 4)
                  
                  if (raw.length === 0) {
                    setTime24h('')
                    return
                  }
                  
                  // Handle single digit (keep as-is for user to continue typing)
                  if (raw.length === 1) {
                    setTime24h(raw)
                    return
                  }
                  
                  // Format as HH:MM
                  const hours = raw.slice(0, 2)
                  const minutes = raw.slice(2)
                  
                  // Validate and clamp hours
                  let validHours = parseInt(hours, 10)
                  if (validHours > 23) validHours = 23
                  const formattedHours = validHours.toString().padStart(2, '0')
                  
                  // Build result
                  let result = formattedHours
                  if (minutes.length > 0) {
                    // Validate and clamp minutes
                    let validMinutes = parseInt(minutes, 10)
                    if (validMinutes > 59) validMinutes = 59
                    const formattedMinutes = validMinutes.toString().padStart(2, '0')
                    result += ':' + formattedMinutes
                  } else if (raw.length > 2) {
                    // Minutes started but incomplete (e.g., "09:5")
                    result += ':' + minutes
                  }
                  
                  setTime24h(result)
                }}
              />

              <View className="flex-row gap-2">
                <Pressable
                  className={`min-h-[38px] flex-1 items-center justify-center rounded-[10px] border ${
                    repeatMode === 'daily'
                      ? 'border-[#10b981] bg-[#eafaf3]'
                      : 'border-[#dbe3ee] bg-[#f8fafc]'
                  }`}
                  onPress={() => setRepeatMode('daily')}
                >
                  <Text className={`text-xs font-semibold ${repeatMode === 'daily' ? 'text-[#166534]' : 'text-[#475569]'}`}>
                    {tt('everyday')}
                  </Text>
                </Pressable>
                <Pressable
                  className={`min-h-[38px] flex-1 items-center justify-center rounded-[10px] border ${
                    repeatMode === 'custom'
                      ? 'border-[#10b981] bg-[#eafaf3]'
                      : 'border-[#dbe3ee] bg-[#f8fafc]'
                  }`}
                  onPress={() => setRepeatMode('custom')}
                >
                  <Text className={`text-xs font-semibold ${repeatMode === 'custom' ? 'text-[#166534]' : 'text-[#475569]'}`}>
                    {tt('selectDays')}
                  </Text>
                </Pressable>
              </View>

              {repeatMode === 'custom' ? (
                <View className="flex-row flex-wrap gap-2">
                  {weekdayOptions.map((day) => {
                    const active = selectedWeekdays.includes(day.value)
                    return (
                      <Pressable
                        key={day.value}
                        className={`rounded-full border px-2.5 py-1.5 ${
                          active ? 'border-[#10b981] bg-[#eafaf3]' : 'border-[#dbe3ee] bg-[#f8fafc]'
                        }`}
                        onPress={() =>
                          setSelectedWeekdays((prev) =>
                            prev.includes(day.value)
                              ? prev.filter((item) => item !== day.value)
                              : [...prev, day.value]
                          )
                        }
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-[#166534]' : 'text-[#475569]'}`}>{day.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
              <View className="pb-4">
                <Button onPress={() => void addSchedule()}>{tt('saveSchedule')}</Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      {demoTourActive && demoTourStep === 'reminders' && showPresenterOverlay ? (
        <PresenterOverlay
          stepLabel={profile.language === 'hi' ? 'Step 2 of 5' : 'Step 2 of 5'}
          title={profile.language === 'hi' ? 'Reminders' : 'Reminders'}
          script={
            profile.language === 'hi'
              ? 'यहाँ smart medication schedules, adherence status और alarm actions दिखते हैं। अब कोच में commands और AI flow दिखाते हैं।'
              : 'Here we show smart medication schedules, adherence status, and alarm actions. Next, we demonstrate command + AI flow in Coach.'
          }
          backLabel={profile.language === 'hi' ? 'Back: Overview' : 'Back: Overview'}
          onPressBack={() => {
            goToDemoTourStep('overview')
            navigation.navigate('Overview')
          }}
          ctaLabel={profile.language === 'hi' ? 'Next: Coach' : 'Next: Coach'}
          onPressCta={() => {
            goToDemoTourStep('coach')
            navigation.navigate('Coach')
          }}
          onPressSkip={finishDemoTour}
          skipLabel={profile.language === 'hi' ? 'Skip demo' : 'Skip demo'}
          undimmedBottomHeight={0}
          stepIndex={2}
          totalSteps={5}
          narrationEnabled={demoTourNarrationEnabled}
          narrationLanguage={profile.language}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  flexBtn: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 22,
    height: 60,
    width: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
})
