import AsyncStorage from '@react-native-async-storage/async-storage'
import notifee, {
  AlarmType,
  AndroidImportance as NotifeeAndroidImportance,
  AuthorizationStatus as NotifeeAuthorizationStatus,
  EventType as NotifeeEventType,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { NativeModules, Platform } from 'react-native'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { db } from '../lib/db'
import { env } from '../lib/env'
import { generateSafeId } from '../lib/id'
import { tk } from '../lib/i18n'
import { clearQueue, enqueueRequest, flushQueuedRequests, getQueueLength } from '../lib/offlineQueue'
import { createEmptyProfile, getReminderKey, getTodayReminders, snoozeMinutes } from '../lib/profile'
import {
  clearLocalPrivacyArtifacts,
  decryptProfileFromStorage,
  decryptReminderLogFromStorage,
  decryptSymptomLogFromStorage,
  encryptProfileForStorage,
  encryptReminderLogForStorage,
  encryptSymptomLogForStorage,
} from '../lib/privacy'
import { deleteCloudProfile, generateTip, syncProfile } from '../services/api'
import type { ReminderLog, SymptomLog, TipSource, UserProfile } from '../types/profile'

type ActiveReminderAlert = {
  reminderKey: string
  medicationName: string
  scheduledTime: string
  displayTime: string
}

type DemoTourStep = 'idle' | 'overview' | 'reminders' | 'coach' | 'provider' | 'evaluation'
const demoTourSequence: DemoTourStep[] = ['overview', 'reminders', 'coach', 'provider', 'evaluation']

type AppStateValue = {
  profile: UserProfile
  setProfile: (next: UserProfile) => void
  symptomLogs: SymptomLog[]
  reminderLogs: ReminderLog[]
  dailyTip: string
  dailyTipSource: TipSource
  dailyTipGeneratedAt: string
  queuedRequestCount: number
  activeReminderAlert: ActiveReminderAlert | null
  notificationPermission: Notifications.PermissionStatus | 'undetermined'
  notificationsMode: 'dev-client' | 'expo-go-limited'
  scheduledNotificationCount: number
  lastReminderRebuildAt: string
  saveMessage: string
  refreshTip: () => Promise<void>
  saveProfile: () => Promise<void>
  quickAddSymptomLog: (symptoms: string, severity: 1 | 2 | 3 | 4 | 5) => Promise<void>
  saveReminderAction: (
    medicationName: string,
    scheduledTime: string,
    status: ReminderLog['status']
  ) => Promise<void>
  dismissReminderAlert: () => void
  requestNotificationPermission: () => Promise<void>
  addMedication: () => Promise<void>
  upsertMedicationScheduleFromCoach: (
    medicationName: string,
    time24h: string,
    daysOfWeek?: number[]
  ) => Promise<{ medicationName: string; time24h: string }>
  removeMedicationSchedule: (medicationName: string, time24h: string) => Promise<void>
  updateMedication: (
    index: number,
    field: 'name' | 'dosage' | 'frequency' | 'times' | 'daysOfWeek',
    value: string | string[] | number[]
  ) => Promise<void>
  deleteMedication: (index: number) => Promise<void>
  clearAllLocalData: () => Promise<void>
  loadDemoScenario: () => Promise<void>
  demoTourLocked: boolean
  demoTourActive: boolean
  demoTourStep: DemoTourStep
  demoTourNarrationEnabled: boolean
  showPresenterOverlay: boolean
  startDemoTour: (startStep?: Exclude<DemoTourStep, 'idle'>) => void
  stopDemoTour: () => void
  finishDemoTour: () => void
  nextDemoTourStep: () => DemoTourStep
  prevDemoTourStep: () => DemoTourStep
  goToDemoTourStep: (step: DemoTourStep) => DemoTourStep
  setDemoTourStep: (step: DemoTourStep) => void
  setDemoTourNarrationEnabled: (enabled: boolean) => void
  setShowPresenterOverlay: (visible: boolean) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)
const scheduledReminderIdsStorageKey = 'scheduled-reminder-notification-ids-v1'
const notificationPromptedStorageKey = 'notifications-first-prompted-v1'
const reminderNotificationChannelId = 'medication-reminders-v2'
const reminderNotificationSound = 'ringing_an_old_phone_on_an_alarm_clock'
const reminderNotificationCategoryId = 'medication-actions'
const actionTaken = 'mark-taken'
const actionDismiss = 'mark-dismiss'
const reminderVibrationPattern = [300, 900] as const

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function parseTimeToHourMinute(value: string): { hour: number; minute: number } | null {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

function nextTimestampForTime(hour: number, minute: number, weekday?: number): number {
  const now = new Date()
  const target = new Date(now)
  target.setSeconds(0, 0)
  target.setHours(hour, minute, 0, 0)

  if (typeof weekday === 'number') {
    const today = now.getDay()
    let delta = (weekday - today + 7) % 7
    if (delta === 0 && target.getTime() <= now.getTime()) {
      delta = 7
    }
    target.setDate(now.getDate() + delta)
    return target.getTime()
  }

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  return target.getTime()
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const isExpoGo = Constants.appOwnership === 'expo'
  const canUseExpoNotifications = !isExpoGo
  const hasNotifeeNativeModule = Boolean(
    (NativeModules as { NotifeeApiModule?: unknown }).NotifeeApiModule
  )
  const useNativeAlarmScheduling =
    Platform.OS === 'android' && canUseExpoNotifications && hasNotifeeNativeModule
  const [profile, setProfileState] = useState<UserProfile>(createEmptyProfile)
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [dailyTip, setDailyTip] = useState('')
  const [dailyTipSource, setDailyTipSource] = useState<TipSource>('local-fallback')
  const [dailyTipGeneratedAt, setDailyTipGeneratedAt] = useState('')
  const [queuedRequestCount, setQueuedRequestCount] = useState(0)
  const [activeReminderAlert, setActiveReminderAlert] = useState<ActiveReminderAlert | null>(null)
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | 'undetermined'>('undetermined')
  const [scheduledNotificationCount, setScheduledNotificationCount] = useState(0)
  const [lastReminderRebuildAt, setLastReminderRebuildAt] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [demoTourActive, setDemoTourActive] = useState(false)
  const [demoTourStep, setDemoTourStepState] = useState<DemoTourStep>('idle')
  const [demoTourNarrationEnabled, setDemoTourNarrationEnabledState] = useState(false)
  const [showPresenterOverlay, setShowPresenterOverlayState] = useState(true)
  const lastScheduleSignatureRef = useRef('')
  const foregroundHandledReminderKeysRef = useRef<Set<string>>(new Set())
  const profileRef = useRef<UserProfile>(profile)
  const hasCompletedOnboarding = Boolean(
    profile.consentAccepted &&
      profile.demographics.age &&
      profile.demographics.heightCm &&
      profile.demographics.weightKg
  )

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const ensureNotificationInfrastructure = useCallback(async () => {
    if (!canUseExpoNotifications) return

    if (useNativeAlarmScheduling) {
      await notifee.createChannel({
        id: reminderNotificationChannelId,
        name: 'Medication reminders',
        importance: NotifeeAndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [...reminderVibrationPattern],
        sound: reminderNotificationSound,
        lights: true,
      })
    } else if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(reminderNotificationChannelId, {
        name: 'Medication reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [...reminderVibrationPattern],
        lightColor: '#2f54ff',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      })
    }

    await Notifications.setNotificationCategoryAsync(reminderNotificationCategoryId, [
      {
        identifier: actionTaken,
        buttonTitle: 'Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: actionDismiss,
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: true },
      },
    ])
  }, [canUseExpoNotifications, useNativeAlarmScheduling])

  const loadDashboardData = useCallback(async (profileId: string) => {
    const logs = await db.listSymptomLogsByProfile(profileId)
    const reminders = await db.listReminderLogsByProfile(profileId)
    const decryptedLogs = await Promise.all(logs.map((log) => decryptSymptomLogFromStorage(log)))
    const decryptedReminders = await Promise.all(
      reminders.map((reminder) => decryptReminderLogFromStorage(reminder))
    )
    setSymptomLogs(decryptedLogs)
    setReminderLogs(decryptedReminders)
  }, [])

  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next)
  }, [])

  const refreshTip = useCallback(async () => {
    const fallback = tk(profile.language, 'defaultTipFallback')
    try {
      if (!profile.consentAccepted || !profile.cloudSyncEnabled) {
        setDailyTip(fallback)
        setDailyTipSource('local-fallback')
        setDailyTipGeneratedAt(new Date().toISOString())
        return
      }
      const data = await generateTip(profile)
      setDailyTip(data.tip || fallback)
      setDailyTipSource(data.source || 'local-fallback')
      setDailyTipGeneratedAt(data.generatedAt || new Date().toISOString())
    } catch {
      try {
        if (env.apiBaseUrl) {
          await enqueueRequest(`${env.apiBaseUrl}/tips/generate`, 'POST', profile)
        }
      } catch {
        // Ignore queue failure.
      }
      setDailyTip(fallback)
      setDailyTipSource('local-fallback')
      setDailyTipGeneratedAt(new Date().toISOString())
    }
  }, [profile])

  const persistProfileLocally = useCallback(async (nextProfile: UserProfile) => {
    const encryptedProfile = await encryptProfileForStorage(nextProfile)
    await db.putProfile(encryptedProfile)
  }, [])

  const saveProfile = useCallback(async () => {
    const withUpdatedAt = {
      ...profile,
      createdAt: profile.createdAt || new Date().toISOString(),
    }
    await persistProfileLocally(withUpdatedAt)
    if (withUpdatedAt.consentAccepted && withUpdatedAt.cloudSyncEnabled) {
      try {
        await syncProfile(withUpdatedAt)
        setSaveMessage('Profile saved and synced.')
      } catch {
        if (env.apiBaseUrl) {
          await enqueueRequest(`${env.apiBaseUrl}/profile/sync`, 'POST', withUpdatedAt)
        }
        setSaveMessage('Profile saved. Sync queued.')
      }
    } else {
      setSaveMessage('Profile saved locally.')
    }
    setProfileState(withUpdatedAt)
    await loadDashboardData(withUpdatedAt.id)
    await refreshTip()
  }, [loadDashboardData, persistProfileLocally, profile, refreshTip])

  const quickAddSymptomLog = useCallback(
    async (symptoms: string, severity: 1 | 2 | 3 | 4 | 5) => {
      const clean = symptoms.trim()
      if (!clean) return
      const encryptedSymptomLog = await encryptSymptomLogForStorage({
        id: generateSafeId(),
        profileId: profile.id,
        timestamp: new Date().toISOString(),
        symptoms: clean,
        severity,
        readings: {},
      })
      await db.addSymptomLog(encryptedSymptomLog)
      await loadDashboardData(profile.id)
      setProfileState((prev) => ({
        ...prev,
        currentSymptoms: clean,
        symptomSeverity: severity,
      }))
    },
    [loadDashboardData, profile.id]
  )

  const commitReminderAction = useCallback(
    async (medicationName: string, scheduledTime: string, status: ReminderLog['status']) => {
      const reminderKey = getReminderKey(profile.id, medicationName, scheduledTime)
      if (activeReminderAlert?.reminderKey === reminderKey) {
        setActiveReminderAlert(null)
      }
      const existing = await db.findReminderLogByReminderKey(reminderKey)
      if (existing) {
        await db.updateReminderLogByReminderKey(reminderKey, {
          status,
          timestamp: new Date().toISOString(),
          snoozedUntil:
            status === 'snoozed'
              ? new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString()
              : undefined,
        })
      } else {
        const encrypted = await encryptReminderLogForStorage({
          id: generateSafeId(),
          profileId: profile.id,
          reminderKey,
          medicationName,
          scheduledTime,
          status,
          snoozedUntil:
            status === 'snoozed'
              ? new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString()
              : undefined,
          timestamp: new Date().toISOString(),
        })
        await db.addReminderLog(encrypted)
      }
      if (
        canUseExpoNotifications &&
        notificationPermission === 'granted' &&
        status === 'snoozed'
      ) {
        try {
          const snoozeDate = new Date(Date.now() + snoozeMinutes * 60 * 1000)
          const hhmm = new Date(scheduledTime).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          if (useNativeAlarmScheduling) {
            const trigger: TimestampTrigger = {
              type: TriggerType.TIMESTAMP,
              timestamp: snoozeDate.getTime(),
              alarmManager: {
                type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
              },
            }
            await notifee.createTriggerNotification(
              {
                id: `snooze-${profile.id}-${medicationName}-${hhmm}-${Date.now()}`,
                title: 'Snoozed reminder',
                body: `Time to take ${medicationName}.`,
                data: {
                  type: 'medication-reminder',
                  medicationName,
                  time: hhmm,
                },
                android: {
                  channelId: reminderNotificationChannelId,
                  sound: reminderNotificationSound,
                  loopSound: true,
                  importance: NotifeeAndroidImportance.HIGH,
                  vibrationPattern: [...reminderVibrationPattern],
                  lightUpScreen: true,
                  autoCancel: true,
                  ongoing: false,
                  pressAction: { id: 'default' },
                  actions: [
                    { title: 'Taken', pressAction: { id: actionTaken } },
                    { title: 'Dismiss', pressAction: { id: actionDismiss } },
                  ],
                },
              },
              trigger
            )
          } else {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Snoozed reminder',
                body: `Time to take ${medicationName}.`,
                sound: true,
                vibrate: [0, 900, 350, 900],
                autoDismiss: true,
                sticky: false,
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: reminderNotificationCategoryId,
                data: {
                  type: 'medication-reminder',
                  medicationName,
                  time: hhmm,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: snoozeDate,
                channelId: reminderNotificationChannelId,
              },
            })
          }
        } catch {
          // Best-effort snooze re-notification.
        }
      }
      await loadDashboardData(profile.id)
    },
    [
      activeReminderAlert?.reminderKey,
      canUseExpoNotifications,
      loadDashboardData,
      notificationPermission,
      profile.id,
    ]
  )

  const saveReminderAction = useCallback(
    async (medicationName: string, scheduledTime: string, status: ReminderLog['status']) => {
      await commitReminderAction(medicationName, scheduledTime, status)
    },
    [commitReminderAction]
  )

  const requestNotificationPermission = useCallback(async () => {
    if (!canUseExpoNotifications) {
      setSaveMessage(
        'Expo Go has limited notification support. Use a development build for full local notification behavior.'
      )
      setNotificationPermission('undetermined')
      return
    }
    try {
      if (Platform.OS === 'android' && canUseExpoNotifications && !hasNotifeeNativeModule) {
        setSaveMessage(
          'Native alarm module not found in this build. Using standard reminders until you reinstall latest dev build.'
        )
      }
      if (useNativeAlarmScheduling) {
        const settings = await notifee.requestPermission()
        const granted =
          settings.authorizationStatus === NotifeeAuthorizationStatus.AUTHORIZED ||
          settings.authorizationStatus === NotifeeAuthorizationStatus.PROVISIONAL
        setNotificationPermission(
          granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED
        )
        if (granted) {
          await ensureNotificationInfrastructure()
          setSaveMessage('Notifications enabled for medicine alarms.')
        } else {
          setSaveMessage('Notifications are off. Enable them from phone settings for alarms.')
        }
        return
      }
      const settings = await Notifications.requestPermissionsAsync()
      setNotificationPermission(settings.status)
      if (settings.status === 'granted') {
        await ensureNotificationInfrastructure()
        setSaveMessage('Notifications enabled for medicine alarms.')
      } else {
        setSaveMessage('Notifications are off. Enable them from phone settings for alarms.')
      }
    } catch {
      setSaveMessage('Could not request notification permission on this client.')
    }
  }, [canUseExpoNotifications, ensureNotificationInfrastructure, useNativeAlarmScheduling])

  useEffect(() => {
    if (!canUseExpoNotifications) return
    if (!hasCompletedOnboarding) return
    if (notificationPermission !== 'undetermined') return
    void (async () => {
      const prompted = await AsyncStorage.getItem(notificationPromptedStorageKey)
      if (prompted === '1') return
      await AsyncStorage.setItem(notificationPromptedStorageKey, '1')
      await requestNotificationPermission()
    })()
  }, [
    canUseExpoNotifications,
    hasCompletedOnboarding,
    notificationPermission,
    requestNotificationPermission,
  ])

  const rescheduleMedicationNotifications = useCallback(
    async (nextProfile: UserProfile) => {
      if (!canUseExpoNotifications || notificationPermission !== 'granted') return
      await ensureNotificationInfrastructure()

      const scheduleItems = nextProfile.medications.flatMap((medication) =>
        (medication.times || [])
          .map((time) => {
            const parsed = parseTimeToHourMinute(time)
            if (!parsed) return null
            const daysOfWeek =
              Array.isArray(medication.daysOfWeek) && medication.daysOfWeek.length > 0
                ? [...new Set(medication.daysOfWeek.filter((day) => day >= 0 && day <= 6))].sort()
                : undefined
            return {
              medicationName: medication.name.trim() || 'your medicine',
              time: `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`,
              hour: parsed.hour,
              minute: parsed.minute,
              daysOfWeek,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      )

      const signature = JSON.stringify(
        scheduleItems
          .map(
            (item) =>
              `${item.medicationName.toLowerCase()}@${item.time}#${(item.daysOfWeek || []).join(',') || 'daily'}`
          )
          .sort()
      )
      if (signature === lastScheduleSignatureRef.current) return

      const previousIdsRaw = await AsyncStorage.getItem(scheduledReminderIdsStorageKey)
      const previousIds = previousIdsRaw ? (JSON.parse(previousIdsRaw) as string[]) : []
      if (previousIds.length > 0) {
        await Promise.all(
          previousIds.map(async (id) => {
            try {
              if (useNativeAlarmScheduling) {
                await notifee.cancelTriggerNotification(id)
              } else {
                await Notifications.cancelScheduledNotificationAsync(id)
              }
            } catch {
              // Best-effort cleanup.
            }
          })
        )
      }

      const nextIds: string[] = []
      for (const item of scheduleItems) {
        const days = item.daysOfWeek && item.daysOfWeek.length > 0 ? item.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
        if (useNativeAlarmScheduling) {
          if (days.length === 7) {
            const firstAt = nextTimestampForTime(item.hour, item.minute)
            const id = await notifee.createTriggerNotification(
              {
                id: `med-${nextProfile.id}-${item.medicationName}-${item.time}-daily`,
                title: 'Medicine reminder',
                body: `Time to take ${item.medicationName}.`,
                data: {
                  type: 'medication-reminder',
                  medicationName: item.medicationName,
                  time: item.time,
                },
                android: {
                  channelId: reminderNotificationChannelId,
                  sound: reminderNotificationSound,
                  loopSound: true,
                  importance: NotifeeAndroidImportance.HIGH,
                  vibrationPattern: [...reminderVibrationPattern],
                  lightUpScreen: true,
                  autoCancel: true,
                  ongoing: false,
                  pressAction: { id: 'default' },
                  actions: [
                    { title: 'Taken', pressAction: { id: actionTaken } },
                    { title: 'Dismiss', pressAction: { id: actionDismiss } },
                  ],
                },
              },
              {
                type: TriggerType.TIMESTAMP,
                timestamp: firstAt,
                repeatFrequency: RepeatFrequency.DAILY,
                alarmManager: {
                  type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
                },
              }
            )
            nextIds.push(id)
            continue
          }

          for (const day of days) {
            const firstAt = nextTimestampForTime(item.hour, item.minute, day)
            const id = await notifee.createTriggerNotification(
              {
                id: `med-${nextProfile.id}-${item.medicationName}-${item.time}-d${day}`,
                title: 'Medicine reminder',
                body: `Time to take ${item.medicationName}.`,
                data: {
                  type: 'medication-reminder',
                  medicationName: item.medicationName,
                  time: item.time,
                  dayOfWeek: String(day),
                },
                android: {
                  channelId: reminderNotificationChannelId,
                  sound: reminderNotificationSound,
                  loopSound: true,
                  importance: NotifeeAndroidImportance.HIGH,
                  vibrationPattern: [...reminderVibrationPattern],
                  lightUpScreen: true,
                  autoCancel: true,
                  ongoing: false,
                  pressAction: { id: 'default' },
                  actions: [
                    { title: 'Taken', pressAction: { id: actionTaken } },
                    { title: 'Dismiss', pressAction: { id: actionDismiss } },
                  ],
                },
              },
              {
                type: TriggerType.TIMESTAMP,
                timestamp: firstAt,
                repeatFrequency: RepeatFrequency.WEEKLY,
                alarmManager: {
                  type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
                },
              }
            )
            nextIds.push(id)
          }
          continue
        }

        if (days.length === 7) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medicine reminder',
              body: `Time to take ${item.medicationName}.`,
              sound: true,
              vibrate: [0, 900, 350, 900],
              autoDismiss: true,
              sticky: false,
              priority: Notifications.AndroidNotificationPriority.MAX,
              categoryIdentifier: reminderNotificationCategoryId,
              data: {
                type: 'medication-reminder',
                medicationName: item.medicationName,
                time: item.time,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: item.hour,
              minute: item.minute,
              channelId: reminderNotificationChannelId,
            },
          })
          nextIds.push(id)
          continue
        }

        for (const day of days) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medicine reminder',
              body: `Time to take ${item.medicationName}.`,
              sound: true,
              vibrate: [0, 900, 350, 900],
              autoDismiss: true,
              sticky: false,
              priority: Notifications.AndroidNotificationPriority.MAX,
              categoryIdentifier: reminderNotificationCategoryId,
              data: {
                type: 'medication-reminder',
                medicationName: item.medicationName,
                time: item.time,
                dayOfWeek: day,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: day + 1,
              hour: item.hour,
              minute: item.minute,
              channelId: reminderNotificationChannelId,
            },
          })
          nextIds.push(id)
        }
      }

      await AsyncStorage.setItem(scheduledReminderIdsStorageKey, JSON.stringify(nextIds))
      lastScheduleSignatureRef.current = signature
      setScheduledNotificationCount(nextIds.length)
      setLastReminderRebuildAt(new Date().toISOString())
    },
    [
      canUseExpoNotifications,
      ensureNotificationInfrastructure,
      notificationPermission,
      useNativeAlarmScheduling,
    ]
  )

  const addMedication = useCallback(async () => {
    const next: UserProfile = {
      ...profile,
      medications: [
        ...profile.medications,
        { name: '', dosage: '', frequency: 'daily', times: ['09:00'] },
      ],
    }
    setProfileState(next)
    await persistProfileLocally(next)
  }, [persistProfileLocally, profile])

  const upsertMedicationScheduleFromCoach = useCallback(
    async (medicationName: string, time24h: string, daysOfWeek?: number[]) => {
      const name = medicationName.trim()
      const time = time24h.trim()
      if (!name || !time) {
        throw new Error('Medication name and time are required.')
      }
      const normalizedDays =
        Array.isArray(daysOfWeek) && daysOfWeek.length > 0
          ? [...new Set(daysOfWeek.filter((day) => day >= 0 && day <= 6))].sort()
          : undefined

      const existingIndex = profile.medications.findIndex(
        (item) => item.name.trim().toLowerCase() === name.toLowerCase()
      )

      let nextMedications = [...profile.medications]
      if (existingIndex >= 0) {
        const existing = nextMedications[existingIndex]
        const mergedTimes = Array.from(new Set([...(existing.times || []), time])).sort()
        nextMedications[existingIndex] = {
          ...existing,
          times: mergedTimes,
          frequency: 'daily',
          daysOfWeek: normalizedDays,
        }
      } else {
        nextMedications.push({
          name,
          dosage: '',
          frequency: 'daily',
          times: [time],
          daysOfWeek: normalizedDays,
        })
      }

      if (
        nextMedications.length > 1 &&
        !nextMedications[0].name.trim() &&
        !nextMedications[0].dosage.trim()
      ) {
        nextMedications = nextMedications.slice(1)
      }

      const next: UserProfile = {
        ...profile,
        medications: nextMedications,
      }
      setProfileState(next)
      await persistProfileLocally(next)

      if (next.consentAccepted && next.cloudSyncEnabled) {
        try {
          await syncProfile(next)
        } catch {
          if (env.apiBaseUrl) {
            await enqueueRequest(`${env.apiBaseUrl}/profile/sync`, 'POST', next)
          }
        }
      }

      return { medicationName: name, time24h: time }
    },
    [persistProfileLocally, profile]
  )

  const removeMedicationSchedule = useCallback(
    async (medicationName: string, time24h: string) => {
      const name = medicationName.trim().toLowerCase()
      const time = time24h.trim()
      if (!name || !time) return

      const nextMedications = profile.medications
        .map((medication) => {
          if (medication.name.trim().toLowerCase() !== name) return medication
          const nextTimes = (medication.times || []).filter((item) => item !== time)
          return { ...medication, times: nextTimes }
        })
        .filter((medication) => (medication.times || []).length > 0)

      const next: UserProfile = {
        ...profile,
        medications: nextMedications,
      }
      setProfileState(next)
      await persistProfileLocally(next)

      if (next.consentAccepted && next.cloudSyncEnabled) {
        try {
          await syncProfile(next)
        } catch {
          if (env.apiBaseUrl) {
            await enqueueRequest(`${env.apiBaseUrl}/profile/sync`, 'POST', next)
          }
        }
      }
    },
    [persistProfileLocally, profile]
  )

  const updateMedication = useCallback(
    async (
      index: number,
      field: 'name' | 'dosage' | 'frequency' | 'times' | 'daysOfWeek',
      value: string | string[] | number[]
    ) => {
      const next: UserProfile = {
        ...profile,
        medications: profile.medications.map((medication, medicationIndex) =>
          medicationIndex === index ? { ...medication, [field]: value } : medication
        ),
      }
      setProfileState(next)
      await persistProfileLocally(next)
    },
    [persistProfileLocally, profile]
  )

  const deleteMedication = useCallback(
    async (index: number) => {
      const nextMedications = profile.medications.filter((_, medicationIndex) => medicationIndex !== index)
      const next: UserProfile = {
        ...profile,
        medications:
          nextMedications.length === 0
            ? [{ name: '', dosage: '', frequency: 'daily', times: ['09:00'] }]
            : nextMedications,
      }
      setProfileState(next)
      await persistProfileLocally(next)
    },
    [persistProfileLocally, profile]
  )

  const clearAllLocalData = useCallback(async () => {
    if (profile.consentAccepted && profile.cloudSyncEnabled) {
      try {
        await deleteCloudProfile({ id: profile.id, consentAccepted: true })
      } catch {
        // Cloud delete is best-effort.
      }
    }
    await db.clearAll()
    await clearQueue()
    await clearLocalPrivacyArtifacts()
    await AsyncStorage.removeItem(notificationPromptedStorageKey)
    if (useNativeAlarmScheduling) {
      try {
        await notifee.cancelTriggerNotifications()
      } catch {
        // Best-effort cleanup.
      }
    }
    const fresh = createEmptyProfile()
    setProfileState(fresh)
    setSymptomLogs([])
    setReminderLogs([])
    setDailyTip('')
    setDailyTipSource('local-fallback')
    setDailyTipGeneratedAt('')
    setActiveReminderAlert(null)
    setScheduledNotificationCount(0)
    setLastReminderRebuildAt('')
    setSaveMessage('Local data cleared.')
    setDemoTourActive(false)
    setDemoTourStepState('idle')
  }, [profile.cloudSyncEnabled, profile.consentAccepted, profile.id, useNativeAlarmScheduling])

  const loadDemoScenario = useCallback(async () => {
    const now = Date.now()
    const toIso = (daysAgo: number, hour: number, minute: number) => {
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      date.setHours(hour, minute, 0, 0)
      return date.toISOString()
    }

    const demoProfile: UserProfile = {
      ...createEmptyProfile(),
      id: generateSafeId(),
      createdAt: new Date(now).toISOString(),
      language: profile.language,
      consentAccepted: true,
      cloudSyncEnabled: false,
      demographics: { age: 52, heightCm: 168, weightKg: 74 },
      habits: {
        dietPattern: 'Balanced Indian meals',
        dietType: 'veg',
        mealsPerDay: 3,
        proteinTargetG: 70,
        proteinIntakeG: 58,
        waterIntakeGlasses: 6,
        exerciseMinutesPerDay: 25,
        substanceUse: 'none',
      },
      medicalHistory: {
        conditions: ['diabetes', 'hypertension'],
        notes: 'Demo patient profile for hackathon walkthrough.',
      },
      medications: [
        { name: 'Metformin', dosage: '500 mg', frequency: 'daily', times: ['09:00', '21:00'] },
        { name: 'Amlodipine', dosage: '5 mg', frequency: 'daily', times: ['08:00'] },
      ],
      currentSymptoms: 'Mild fatigue and occasional headache',
      symptomSeverity: 2,
      readings: {
        bloodSugar: 168,
        bloodPressureSystolic: 142,
        bloodPressureDiastolic: 92,
        weight: 74,
        temperature: 98.4,
      },
    }

    const demoSymptomLogs: SymptomLog[] = [
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(6, 9, 30),
        symptoms: 'Mild fatigue',
        severity: 2,
        readings: { bloodSugar: 172, bloodPressureSystolic: 146, bloodPressureDiastolic: 94 },
      },
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(5, 20, 20),
        symptoms: 'Headache after work',
        severity: 3,
        readings: { bloodSugar: 188 },
      },
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(4, 8, 45),
        symptoms: 'Low energy morning',
        severity: 2,
        readings: { bloodPressureSystolic: 140, bloodPressureDiastolic: 90 },
      },
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(3, 21, 5),
        symptoms: 'Missed evening walk, stress',
        severity: 3,
        readings: { bloodSugar: 201 },
      },
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(2, 9, 10),
        symptoms: 'Felt better after hydration',
        severity: 2,
        readings: { bloodSugar: 165 },
      },
      {
        id: generateSafeId(),
        profileId: demoProfile.id,
        timestamp: toIso(1, 19, 55),
        symptoms: 'Light headache',
        severity: 2,
        readings: { bloodPressureSystolic: 138, bloodPressureDiastolic: 88 },
      },
    ]

    const scheduleIso = (daysAgo: number, hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      d.setHours(h, m, 0, 0)
      return d.toISOString()
    }

    const reminderRows: Array<{
      medicationName: string
      scheduledTime: string
      status: ReminderLog['status']
      timestamp: string
    }> = [
      { medicationName: 'Metformin', scheduledTime: scheduleIso(3, '09:00'), status: 'taken', timestamp: scheduleIso(3, '09:07') },
      { medicationName: 'Amlodipine', scheduledTime: scheduleIso(3, '08:00'), status: 'missed', timestamp: scheduleIso(3, '08:30') },
      { medicationName: 'Metformin', scheduledTime: scheduleIso(2, '21:00'), status: 'snoozed', timestamp: scheduleIso(2, '21:05') },
      { medicationName: 'Metformin', scheduledTime: scheduleIso(1, '09:00'), status: 'taken', timestamp: scheduleIso(1, '09:03') },
      { medicationName: 'Amlodipine', scheduledTime: scheduleIso(1, '08:00'), status: 'taken', timestamp: scheduleIso(1, '08:02') },
    ]
    const demoReminderLogs: ReminderLog[] = reminderRows.map((row) => ({
      id: generateSafeId(),
      profileId: demoProfile.id,
      reminderKey: getReminderKey(demoProfile.id, row.medicationName, row.scheduledTime),
      medicationName: row.medicationName,
      scheduledTime: row.scheduledTime,
      status: row.status,
      timestamp: row.timestamp,
      snoozedUntil: row.status === 'snoozed' ? new Date(new Date(row.timestamp).getTime() + 15 * 60 * 1000).toISOString() : undefined,
    }))

    await db.clearAll()
    await clearQueue()
    await clearLocalPrivacyArtifacts()

    await db.putProfile(await encryptProfileForStorage(demoProfile))
    for (const symptom of demoSymptomLogs) {
      await db.addSymptomLog(await encryptSymptomLogForStorage(symptom))
    }
    for (const reminder of demoReminderLogs) {
      await db.addReminderLog(await encryptReminderLogForStorage(reminder))
    }

    setProfileState(demoProfile)
    await loadDashboardData(demoProfile.id)
    setDailyTip(
      profile.language === 'hi'
        ? 'डेमो मोड सक्रिय है। पहले Provider Handoff और Synthetic Evaluation दिखाएं।'
        : 'Demo mode is active. Start with Provider Handoff and Synthetic Evaluation.'
    )
    setDailyTipSource('local-fallback')
    setDailyTipGeneratedAt(new Date().toISOString())
    setSaveMessage(
      profile.language === 'hi'
        ? 'डेमो डेटा लोड हो गया।'
        : 'Demo data loaded successfully.'
    )
  }, [loadDashboardData, profile.language])

  const demoTourLocked = demoTourActive && demoTourStep !== 'idle'

  const startDemoTour = useCallback((startStep: Exclude<DemoTourStep, 'idle'> = 'overview') => {
    setDemoTourActive(true)
    setShowPresenterOverlayState(true)
    setDemoTourStepState(demoTourSequence.includes(startStep) ? startStep : 'overview')
  }, [])

  const stopDemoTour = useCallback(() => {
    setDemoTourActive(false)
    setDemoTourStepState('idle')
  }, [])

  const finishDemoTour = useCallback(() => {
    setDemoTourActive(false)
    setDemoTourStepState('idle')
  }, [])

  const goToDemoTourStep = useCallback((step: DemoTourStep) => {
    let nextStep: DemoTourStep = 'idle'
    if (step === 'idle') {
      setDemoTourActive(false)
      setDemoTourStepState('idle')
      nextStep = 'idle'
      return nextStep
    }
    nextStep = demoTourSequence.includes(step) ? step : 'overview'
    setDemoTourActive(true)
    setDemoTourStepState(nextStep)
    return nextStep
  }, [])

  const nextDemoTourStep = useCallback(() => {
    let nextStep: DemoTourStep = 'idle'
    setDemoTourStepState((current) => {
      if (!demoTourActive || current === 'idle') {
        nextStep = 'overview'
        return 'overview'
      }
      const index = demoTourSequence.indexOf(current)
      if (index === -1 || index >= demoTourSequence.length - 1) {
        nextStep = 'idle'
        return 'idle'
      }
      nextStep = demoTourSequence[index + 1]
      return nextStep
    })
    if (nextStep === 'idle') {
      setDemoTourActive(false)
    } else {
      setDemoTourActive(true)
    }
    return nextStep
  }, [demoTourActive])

  const prevDemoTourStep = useCallback(() => {
    let prevStep: DemoTourStep = 'idle'
    setDemoTourStepState((current) => {
      if (!demoTourActive || current === 'idle') {
        prevStep = 'overview'
        return 'overview'
      }
      const index = demoTourSequence.indexOf(current)
      if (index <= 0) {
        prevStep = demoTourSequence[0]
        return demoTourSequence[0]
      }
      prevStep = demoTourSequence[index - 1]
      return prevStep
    })
    setDemoTourActive(true)
    return prevStep
  }, [demoTourActive])

  const setDemoTourStep = useCallback((step: DemoTourStep) => {
    if (step === 'idle') {
      setDemoTourActive(false)
      setDemoTourStepState('idle')
      return
    }
    setDemoTourActive(true)
    setDemoTourStepState(demoTourSequence.includes(step) ? step : 'overview')
  }, [])

  const setDemoTourNarrationEnabled = useCallback((enabled: boolean) => {
    setDemoTourNarrationEnabledState(enabled)
  }, [])

  const setShowPresenterOverlay = useCallback((visible: boolean) => {
    setShowPresenterOverlayState(visible)
  }, [])

  useEffect(() => {
    void (async () => {
      const latest = await db.getLatestProfile()
      if (latest) {
        const decrypted = await decryptProfileFromStorage(latest)
        setProfileState(decrypted)
        await loadDashboardData(decrypted.id)
      }
      setQueuedRequestCount(await getQueueLength())
      if (canUseExpoNotifications) {
        if (useNativeAlarmScheduling) {
          const settings = await notifee.getNotificationSettings()
          const granted =
            settings.authorizationStatus === NotifeeAuthorizationStatus.AUTHORIZED ||
            settings.authorizationStatus === NotifeeAuthorizationStatus.PROVISIONAL
          setNotificationPermission(
            granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED
          )
          if (granted) {
            await ensureNotificationInfrastructure()
            const scheduledIds = await notifee.getTriggerNotificationIds()
            setScheduledNotificationCount(scheduledIds.length)
          } else {
            setScheduledNotificationCount(0)
          }
        } else {
          const settings = await Notifications.getPermissionsAsync()
          setNotificationPermission(settings.status)
          if (settings.status === 'granted') {
            await ensureNotificationInfrastructure()
            const scheduled = await Notifications.getAllScheduledNotificationsAsync()
            setScheduledNotificationCount(scheduled.length)
          } else {
            setScheduledNotificationCount(0)
          }
        }
      } else {
        setNotificationPermission('undetermined')
        setScheduledNotificationCount(0)
      }
      await flushQueuedRequests()
      setQueuedRequestCount(await getQueueLength())
    })()
  }, [
    canUseExpoNotifications,
    ensureNotificationInfrastructure,
    loadDashboardData,
    useNativeAlarmScheduling,
  ])

  useEffect(() => {
    if (!canUseExpoNotifications || notificationPermission !== 'granted') return
    void (async () => {
      const savedIdsRaw = await AsyncStorage.getItem(scheduledReminderIdsStorageKey)
      const savedIds = savedIdsRaw ? (JSON.parse(savedIdsRaw) as string[]) : []
      const liveIds = useNativeAlarmScheduling
        ? await notifee.getTriggerNotificationIds()
        : (await Notifications.getAllScheduledNotificationsAsync()).map((item) => item.identifier)
      setScheduledNotificationCount(liveIds.length)
      const scheduledIds = new Set(liveIds)
      const allPresent = savedIds.length > 0 && savedIds.every((id) => scheduledIds.has(id))
      if (!allPresent) {
        await rescheduleMedicationNotifications(profileRef.current)
      }
    })()
  }, [
    canUseExpoNotifications,
    notificationPermission,
    rescheduleMedicationNotifications,
    useNativeAlarmScheduling,
  ])

  useEffect(() => {
    if (!canUseExpoNotifications || useNativeAlarmScheduling) return
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {
        // Best-effort clear of acted notification.
      })
      const data = (response.notification.request.content.data || {}) as {
        medicationName?: string
        time?: string
      }
      const actionId = response.actionIdentifier
      const medicationName = data.medicationName || ''
      const time = data.time || ''
      if (!medicationName || !time) return

      const reminders = getTodayReminders(profileRef.current)
      const matching = reminders.find((item) => {
        const dt = new Date(item.scheduledTime)
        const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
        return (
          item.medicationName.trim().toLowerCase() === medicationName.trim().toLowerCase() &&
          hhmm === time
        )
      })
      if (!matching) return

      if (actionId === actionTaken) {
        void commitReminderAction(medicationName, matching.scheduledTime, 'taken')
      } else if (actionId === actionDismiss) {
        setActiveReminderAlert(null)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [canUseExpoNotifications, commitReminderAction, useNativeAlarmScheduling])

  useEffect(() => {
    if (!canUseExpoNotifications || !useNativeAlarmScheduling) return

    const unsubscribe = notifee.onForegroundEvent((event) => {
      if (event.type !== NotifeeEventType.ACTION_PRESS && event.type !== NotifeeEventType.PRESS) return
      if (event.detail.notification?.id) {
        void notifee.cancelNotification(event.detail.notification.id).catch(() => {
          // Best-effort clear of acted notification.
        })
      }
      const data = (event.detail.notification?.data || {}) as {
        medicationName?: string
        time?: string
      }
      const medicationName = data.medicationName || ''
      const time = data.time || ''
      if (!medicationName || !time) return

      const reminders = getTodayReminders(profileRef.current)
      const matching = reminders.find((item) => {
        const dt = new Date(item.scheduledTime)
        const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
        return (
          item.medicationName.trim().toLowerCase() === medicationName.trim().toLowerCase() &&
          hhmm === time
        )
      })
      if (!matching) return

      const actionId = event.detail.pressAction?.id || ''
      if (actionId === actionTaken) {
        void commitReminderAction(medicationName, matching.scheduledTime, 'taken')
      } else if (actionId === actionDismiss) {
        setActiveReminderAlert(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [canUseExpoNotifications, commitReminderAction, useNativeAlarmScheduling])

  useEffect(() => {
    if (!canUseExpoNotifications || notificationPermission !== 'granted') return
    void rescheduleMedicationNotifications(profile)
  }, [
    canUseExpoNotifications,
    notificationPermission,
    profile,
    profile.medications,
    rescheduleMedicationNotifications,
  ])

  useEffect(() => {
    foregroundHandledReminderKeysRef.current.clear()
  }, [profile.id])

  useEffect(() => {
    const reminders = getTodayReminders(profile)
    const reminderStatuses = new Map(reminderLogs.map((log) => [log.reminderKey, log.status]))
    const now = Date.now()
    reminders.forEach((reminder) => {
      if (reminderStatuses.has(reminder.reminderKey)) return
      const dueMs = new Date(reminder.scheduledTime).getTime()
      const diff = dueMs - now
      if (diff <= 0 && diff >= -10 * 60 * 1000) {
        if (foregroundHandledReminderKeysRef.current.has(reminder.reminderKey)) return
        foregroundHandledReminderKeysRef.current.add(reminder.reminderKey)
        setActiveReminderAlert({
          reminderKey: reminder.reminderKey,
          medicationName: reminder.medicationName,
          scheduledTime: reminder.scheduledTime,
          displayTime: new Date(reminder.scheduledTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    })
  }, [canUseExpoNotifications, profile, reminderLogs])

  const value = useMemo<AppStateValue>(
    () => ({
      profile,
      setProfile,
      symptomLogs,
      reminderLogs,
      dailyTip: dailyTip || tk(profile.language, 'defaultTipFallback'),
      dailyTipSource,
      dailyTipGeneratedAt,
      queuedRequestCount,
      activeReminderAlert,
      notificationPermission,
      notificationsMode: canUseExpoNotifications ? 'dev-client' : 'expo-go-limited',
      scheduledNotificationCount,
      lastReminderRebuildAt,
      saveMessage,
      refreshTip,
      saveProfile,
      quickAddSymptomLog,
      saveReminderAction,
      dismissReminderAlert: () => setActiveReminderAlert(null),
      requestNotificationPermission,
      addMedication,
      upsertMedicationScheduleFromCoach,
      removeMedicationSchedule,
      updateMedication,
      deleteMedication,
      clearAllLocalData,
      loadDemoScenario,
      demoTourLocked,
      demoTourActive,
      demoTourStep,
      demoTourNarrationEnabled,
      showPresenterOverlay,
      startDemoTour,
      stopDemoTour,
      finishDemoTour,
      nextDemoTourStep,
      prevDemoTourStep,
      goToDemoTourStep,
      setDemoTourStep,
      setDemoTourNarrationEnabled,
      setShowPresenterOverlay,
    }),
    [
      activeReminderAlert,
      addMedication,
      upsertMedicationScheduleFromCoach,
      removeMedicationSchedule,
      dailyTip,
      dailyTipGeneratedAt,
      dailyTipSource,
      deleteMedication,
      notificationPermission,
      canUseExpoNotifications,
      scheduledNotificationCount,
      lastReminderRebuildAt,
      profile,
      quickAddSymptomLog,
      queuedRequestCount,
      refreshTip,
      reminderLogs,
      requestNotificationPermission,
      saveMessage,
      saveProfile,
      saveReminderAction,
      setProfile,
      symptomLogs,
      updateMedication,
      clearAllLocalData,
      loadDemoScenario,
      demoTourLocked,
      demoTourActive,
      demoTourStep,
      demoTourNarrationEnabled,
      showPresenterOverlay,
      startDemoTour,
      stopDemoTour,
      finishDemoTour,
      nextDemoTourStep,
      prevDemoTourStep,
      goToDemoTourStep,
      setDemoTourStep,
      setDemoTourNarrationEnabled,
      setShowPresenterOverlay,
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
