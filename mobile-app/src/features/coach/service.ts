import { analyzeCoachImage, converseCoach, createCoachImageUploadUrl } from '../../services/api'
import type { AppLanguage, ReminderLog, SymptomLog, UserProfile } from '../../types/profile'
import type { CoachMessage } from './types'
import {
  incrementCoachImageAnalysisCount,
  loadCoachMemory,
  updateCoachMemoryFromUserMessage,
} from './memoryStore'

type CoachTrendContext = {
  windowDays: number
  symptomLogsCount: number
  averageSymptomSeverity?: number
  topSymptoms: string[]
  reminderLogsCount: number
  reminderTakenCount: number
  reminderSnoozedCount: number
  reminderMissedCount: number
  adherenceRate?: number
}

function buildTrendContext(symptomLogs: SymptomLog[], reminderLogs: ReminderLog[]): CoachTrendContext {
  const now = Date.now()
  const windowDays = 7
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const windowStart = now - windowMs

  const recentSymptoms = symptomLogs.filter((item) => new Date(item.timestamp).getTime() >= windowStart)
  const averageSymptomSeverity =
    recentSymptoms.length > 0
      ? Number(
          (
            recentSymptoms.reduce((total, item) => total + item.severity, 0) / recentSymptoms.length
          ).toFixed(1)
        )
      : undefined

  const topSymptomMap = new Map<string, number>()
  recentSymptoms.forEach((item) => {
    const normalized = item.symptoms.trim().toLowerCase()
    if (!normalized) return
    topSymptomMap.set(normalized, (topSymptomMap.get(normalized) || 0) + 1)
  })
  const topSymptoms = [...topSymptomMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([symptom]) => symptom)

  const recentReminders = reminderLogs.filter((item) => new Date(item.timestamp).getTime() >= windowStart)
  const reminderTakenCount = recentReminders.filter((item) => item.status === 'taken').length
  const reminderSnoozedCount = recentReminders.filter((item) => item.status === 'snoozed').length
  const reminderMissedCount = recentReminders.filter((item) => item.status === 'missed').length
  const adherenceRate =
    recentReminders.length > 0
      ? Number(((reminderTakenCount / recentReminders.length) * 100).toFixed(1))
      : undefined

  return {
    windowDays,
    symptomLogsCount: recentSymptoms.length,
    averageSymptomSeverity,
    topSymptoms,
    reminderLogsCount: recentReminders.length,
    reminderTakenCount,
    reminderSnoozedCount,
    reminderMissedCount,
    adherenceRate,
  }
}

export async function requestCoachReply(
  profile: UserProfile,
  text: string,
  messages: CoachMessage[],
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[]
) {
  const memory = await updateCoachMemoryFromUserMessage(profile.id, text, symptomLogs, reminderLogs)
  const trends = buildTrendContext(symptomLogs, reminderLogs)
  return converseCoach({
    message: text,
    language: profile.language,
    profile: {
      demographics: profile.demographics,
      habits: profile.habits,
      trends,
      memory,
      conditions: profile.medicalHistory.conditions,
      medications: profile.medications.map((item) => ({ name: item.name, dosage: item.dosage })),
      currentSymptoms: profile.currentSymptoms,
    },
    history: messages.slice(-6).map((item) => ({ role: item.role, text: item.text })),
  })
}

export async function uploadCoachImageAndGetKey(profileId: string, imageUri: string, mediaType: string) {
  const upload = await createCoachImageUploadUrl({ mediaType, profileId })
  const local = await fetch(imageUri)
  const blob = await local.blob()
  const putResponse = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: upload.requiredHeaders,
    body: blob,
  })
  if (!putResponse.ok) {
    throw new Error('Image upload failed')
  }
  return upload.imageKey
}

export async function requestCoachImageAnalysis(
  profileId: string,
  language: AppLanguage,
  imageKey: string,
  imageBase64: string | undefined,
  mediaType: string,
  question: string
) {
  await incrementCoachImageAnalysisCount(profileId)
  return analyzeCoachImage({
    imageKey,
    imageBase64,
    mediaType,
    question,
    language,
  })
}

export async function buildCoachDebugSnapshot(
  profile: UserProfile,
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[],
  messages: CoachMessage[]
) {
  const memory = await loadCoachMemory(profile.id)
  return {
    profile: {
      demographics: profile.demographics,
      habits: profile.habits,
      conditions: profile.medicalHistory.conditions,
      medications: profile.medications.map((item) => ({ name: item.name, dosage: item.dosage })),
      currentSymptoms: profile.currentSymptoms,
      trends: buildTrendContext(symptomLogs, reminderLogs),
      memory,
    },
    history: messages.slice(-6).map((item) => ({ role: item.role, text: item.text })),
  }
}
