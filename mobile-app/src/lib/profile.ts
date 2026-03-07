import type { ReminderLog, SymptomLog, UserProfile } from '../types/profile'
import { generateSafeId } from './id'

export const defaultMissedDelayMinutes = 30
export const snoozeMinutes = 15

export function createEmptyProfile(): UserProfile {
  return {
    id: generateSafeId(),
    createdAt: new Date().toISOString(),
    language: 'en',
    consentAccepted: false,
    cloudSyncEnabled: false,
    demographics: {},
    habits: {
      dietPattern: '',
      dietType: 'veg',
      mealsPerDay: 3,
      proteinTargetG: 60,
      proteinIntakeG: 0,
      waterIntakeGlasses: 8,
      exerciseMinutesPerDay: 30,
      substanceUse: 'none',
    },
    medicalHistory: {
      conditions: [],
      notes: '',
    },
    medications: [{ name: '', dosage: '', frequency: 'daily', times: ['09:00'] }],
    currentSymptoms: '',
    symptomSeverity: 3,
    readings: {},
  }
}

export function getReminderKey(profileId: string, medicationName: string, scheduledTime: string) {
  return `${profileId}:${medicationName}:${scheduledTime}`
}

export function getTodayReminders(profile: UserProfile) {
  const day = new Date().getDay()
  const today = new Date().toISOString().slice(0, 10)
  return profile.medications.flatMap((medication) =>
    medication.times.flatMap((time) => {
      const medicationName = medication.name.trim()
      if (!medicationName) return []
      if (!time.trim()) return []
      if (Array.isArray(medication.daysOfWeek) && medication.daysOfWeek.length > 0) {
        if (!medication.daysOfWeek.includes(day)) return []
      }
      const scheduledTime = `${today}T${time}:00`
      return {
        reminderKey: getReminderKey(profile.id, medicationName, scheduledTime),
        medicationName,
        scheduledTime,
      }
    })
  )
}

export function sortSymptomLogs(logs: SymptomLog[]) {
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
}

export function sortReminderLogs(logs: ReminderLog[]) {
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
}
