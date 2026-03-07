import CryptoJS from 'crypto-js'
import { storageGetJson, storageSetJson } from '../../lib/storage'
import type { ReminderLog, SymptomLog } from '../../types/profile'
import type { ConversationTheme, CorrelationData, HealthInsight, WeeklySummary } from './insights'
import {
  detectCorrelations,
  extractConversationThemes,
  generateWeeklySummary,
  suggestSmartReminders,
} from './insights'

const memoryKeyPrefix = 'coach-memory:v2:'
const insightsKeyPrefix = 'coach-insights:v1:'
const weeklySummaryKeyPrefix = 'coach-weekly:v1:'
const waterLogKeyPrefix = 'water-log:v1:'
const proteinLogKeyPrefix = 'protein-log:v1:'

type EncryptedPayload = {
  mode?: 'encrypted' | 'plain'
  cipherText: string
}

// Expanded memory with conversation themes and correlations
export type CoachMemory = {
  reminderCommandsCount: number
  imageAnalysesCount: number
  mostDiscussedSymptoms: string[]
  lastUserGoal?: string
  conversationThemes: ConversationTheme[]
  topCorrelations: CorrelationData[]
  smartReminderSuggestions: { timeOfDay: string; missedCount: number; suggestion: string }[]
  updatedAt: string
}

function passphrase(profileId: string) {
  return `ayushman-coach:${profileId}:local-memory`
}

function storageKey(profileId: string) {
  return `${memoryKeyPrefix}${profileId}`
}

function insightsStorageKey(profileId: string) {
  return `${insightsKeyPrefix}${profileId}`
}

function weeklySummaryKey(profileId: string) {
  return `${weeklySummaryKeyPrefix}${profileId}`
}

function waterLogKey(profileId: string) {
  return `${waterLogKeyPrefix}${profileId}`
}

function proteinLogKey(profileId: string) {
  return `${proteinLogKeyPrefix}${profileId}`
}

function createEmptyMemory(): CoachMemory {
  return {
    reminderCommandsCount: 0,
    imageAnalysesCount: 0,
    mostDiscussedSymptoms: [],
    conversationThemes: [],
    topCorrelations: [],
    smartReminderSuggestions: [],
    updatedAt: new Date().toISOString(),
  }
}

async function saveMemory(profileId: string, memory: CoachMemory) {
  const serialized = JSON.stringify(memory)
  let payload: EncryptedPayload
  try {
    const cipherText = CryptoJS.AES.encrypt(serialized, passphrase(profileId)).toString()
    payload = { mode: 'encrypted', cipherText }
  } catch {
    payload = { mode: 'plain', cipherText: serialized }
  }
  await storageSetJson(storageKey(profileId), payload)
}

export async function loadCoachMemory(profileId: string): Promise<CoachMemory> {
  const payload = await storageGetJson<EncryptedPayload>(storageKey(profileId))
  if (!payload?.cipherText) return createEmptyMemory()
  try {
    const decrypted =
      payload.mode === 'plain'
        ? payload.cipherText
        : CryptoJS.AES.decrypt(payload.cipherText, passphrase(profileId)).toString(CryptoJS.enc.Utf8)
    if (!decrypted) return createEmptyMemory()
    const parsed = JSON.parse(decrypted) as Partial<CoachMemory>
    return {
      reminderCommandsCount:
        typeof parsed.reminderCommandsCount === 'number' ? parsed.reminderCommandsCount : 0,
      imageAnalysesCount: typeof parsed.imageAnalysesCount === 'number' ? parsed.imageAnalysesCount : 0,
      mostDiscussedSymptoms: Array.isArray(parsed.mostDiscussedSymptoms)
        ? parsed.mostDiscussedSymptoms.filter((item) => typeof item === 'string').slice(0, 5)
        : [],
      lastUserGoal: typeof parsed.lastUserGoal === 'string' ? parsed.lastUserGoal : undefined,
      conversationThemes: Array.isArray(parsed.conversationThemes)
        ? parsed.conversationThemes.slice(0, 10)
        : [],
      topCorrelations: Array.isArray(parsed.topCorrelations) ? parsed.topCorrelations.slice(0, 5) : [],
      smartReminderSuggestions: Array.isArray(parsed.smartReminderSuggestions)
        ? parsed.smartReminderSuggestions.slice(0, 3)
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return createEmptyMemory()
  }
}

// Log daily water intake
export async function logWaterIntake(profileId: string, glasses: number) {
  const today = new Date().toISOString().split('T')[0]
  const key = waterLogKey(profileId)
  const history = await storageGetJson<{ date: string; glasses: number }[]>(key) || []

  const existingIndex = history.findIndex((h) => h.date.startsWith(today))
  if (existingIndex >= 0) {
    history[existingIndex].glasses = glasses
  } else {
    history.push({ date: new Date().toISOString(), glasses })
  }

  // Keep only last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const filtered = history.filter((h) => h.date > cutoff)

  await storageSetJson(key, filtered)
}

// Log daily protein intake
export async function logProteinIntake(profileId: string, grams: number) {
  const today = new Date().toISOString().split('T')[0]
  const key = proteinLogKey(profileId)
  const history = await storageGetJson<{ date: string; grams: number }[]>(key) || []

  const existingIndex = history.findIndex((h) => h.date.startsWith(today))
  if (existingIndex >= 0) {
    history[existingIndex].grams = grams
  } else {
    history.push({ date: new Date().toISOString(), grams })
  }

  // Keep only last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const filtered = history.filter((h) => h.date > cutoff)

  await storageSetJson(key, filtered)
}

// Get water intake history
export async function getWaterIntakeHistory(profileId: string): Promise<{ date: string; glasses: number }[]> {
  return (await storageGetJson<{ date: string; glasses: number }[]>(waterLogKey(profileId))) || []
}

// Get protein intake history
export async function getProteinIntakeHistory(profileId: string): Promise<{ date: string; grams: number }[]> {
  return (await storageGetJson<{ date: string; grams: number }[]>(proteinLogKey(profileId))) || []
}

// Get or generate weekly summary
export async function getWeeklySummary(
  profileId: string,
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[],
  profile: { habits: { proteinTargetG?: number } }
): Promise<WeeklySummary> {
  const key = weeklySummaryKey(profileId)
  const existing = await storageGetJson<WeeklySummary>(key)

  // Check if we need to regenerate (older than 1 day)
  if (existing) {
    const lastUpdate = new Date(existing.weekEnd)
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceUpdate < 24) {
      return existing
    }
  }

  const waterHistory = await getWaterIntakeHistory(profileId)
  const summary = generateWeeklySummary(symptomLogs, reminderLogs, waterHistory, profile)

  await storageSetJson(key, summary)
  return summary
}

// Save active insights
export async function saveHealthInsights(profileId: string, insights: HealthInsight[]) {
  await storageSetJson(insightsStorageKey(profileId), insights)
}

// Get active insights
export async function getHealthInsights(profileId: string): Promise<HealthInsight[]> {
  const insights = await storageGetJson<HealthInsight[]>(insightsStorageKey(profileId))
  if (!insights) return []

  // Filter out expired insights
  const now = new Date().toISOString()
  return insights.filter((i) => i.expiresAt > now)
}

function detectReminderCommand(text: string) {
  const lower = text.toLowerCase()
  return (
    lower.includes('alarm') ||
    lower.includes('reminder') ||
    lower.includes('schedule') ||
    lower.includes('medicine') ||
    lower.includes('दवा') ||
    lower.includes('अलार्म') ||
    lower.includes('रिमाइंडर')
  )
}

function inferGoal(text: string) {
  const clean = text.trim()
  if (!clean) return undefined
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean
}

function symptomTermsFromLogs(symptomLogs: SymptomLog[]) {
  const now = Date.now()
  const windowStart = now - 14 * 24 * 60 * 60 * 1000
  const counts = new Map<string, number>()
  symptomLogs.forEach((item) => {
    if (new Date(item.timestamp).getTime() < windowStart) return
    const chunks = item.symptoms
      .toLowerCase()
      .split(/[,/|]/g)
      .map((part) => part.trim())
      .filter(Boolean)
    chunks.forEach((term) => counts.set(term, (counts.get(term) || 0) + 1))
  })
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term)
}

export async function updateCoachMemoryFromUserMessage(
  profileId: string,
  text: string,
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[]
): Promise<CoachMemory> {
  const current = await loadCoachMemory(profileId)

  // Extract conversation themes
  const updatedThemes = extractConversationThemes(text, current.conversationThemes)

  // Get intake histories for correlations
  const waterHistory = await getWaterIntakeHistory(profileId)
  const proteinHistory = await getProteinIntakeHistory(profileId)

  // Detect correlations
  const correlations = detectCorrelations(symptomLogs, reminderLogs, waterHistory, proteinHistory)

  // Get smart reminder suggestions
  const suggestions = suggestSmartReminders(reminderLogs)

  const next: CoachMemory = {
    ...current,
    reminderCommandsCount: current.reminderCommandsCount + (detectReminderCommand(text) ? 1 : 0),
    mostDiscussedSymptoms: symptomTermsFromLogs(symptomLogs),
    lastUserGoal: inferGoal(text) || current.lastUserGoal,
    conversationThemes: updatedThemes,
    topCorrelations: correlations.slice(0, 5),
    smartReminderSuggestions: suggestions.slice(0, 3),
    updatedAt: new Date().toISOString(),
  }

  await saveMemory(profileId, next)
  return next
}

export async function incrementCoachImageAnalysisCount(profileId: string): Promise<CoachMemory> {
  const current = await loadCoachMemory(profileId)
  const next: CoachMemory = {
    ...current,
    imageAnalysesCount: current.imageAnalysesCount + 1,
    updatedAt: new Date().toISOString(),
  }
  await saveMemory(profileId, next)
  return next
}
