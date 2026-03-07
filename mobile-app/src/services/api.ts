import { env } from '../lib/env'
import type { TipSource, UserProfile } from '../types/profile'

type TipResponse = {
  tip?: string
  source?: TipSource
  generatedAt?: string
  disclaimer?: string
}

export type ApiErrorCode = 'CONFIG' | 'NETWORK' | 'TIMEOUT' | 'HTTP'

export class ApiRequestError extends Error {
  code: ApiErrorCode
  status?: number
  details?: string

  constructor(code: ApiErrorCode, message: string, options?: { status?: number; details?: string }) {
    super(message)
    this.code = code
    this.status = options?.status
    this.details = options?.details
  }
}

function requireApiBaseUrl() {
  if (__DEV__) {
    console.log('[API] EXPO_PUBLIC_API_BASE_URL:', env.apiBaseUrl)
  }
  if (!env.apiBaseUrl) {
    throw new ApiRequestError(
      'CONFIG',
      'Missing EXPO_PUBLIC_API_BASE_URL. Configure backend URL in app environment.'
    )
  }
  return env.apiBaseUrl
}

async function apiFetch(url: string, init: RequestInit, retryCount = 1): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      if (__DEV__) {
        console.log(`[API] Request attempt ${attempt + 1}:`, url)
      }
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      lastError = error
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (__DEV__) {
        console.log('[API] Request failed:', error)
      }
      if (attempt >= retryCount) {
        if (isAbort) {
          throw new ApiRequestError('TIMEOUT', 'Request timed out. Please try again.')
        }
        throw new ApiRequestError('NETWORK', 'Network unavailable. Check internet and retry.')
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }
  throw new ApiRequestError('NETWORK', 'Network unavailable. Check internet and retry.', {
    details: String(lastError),
  })
}

async function throwIfNotOk(response: Response, fallbackMessage: string) {
  if (response.ok) return
  const text = await response.text()
  if (__DEV__) {
    console.log('[API] HTTP Error:', response.status, text.slice(0, 200))
  }
  throw new ApiRequestError('HTTP', text || fallbackMessage, {
    status: response.status,
    details: text || fallbackMessage,
  })
}

export async function syncProfile(profile: UserProfile) {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/profile/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  await throwIfNotOk(response, 'Sync failed')
  return response.json() as Promise<{
    message: string
    syncedProfileId: string
    syncedAt: string
  }>
}

export async function deleteCloudProfile(payload: { id: string; consentAccepted: boolean }) {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/profile/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwIfNotOk(response, 'Delete failed')
  return response.json() as Promise<{
    message: string
    deletedProfileId: string
    deletedAt: string
  }>
}

export async function generateTip(profile: UserProfile): Promise<TipResponse> {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/tips/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  await throwIfNotOk(response, 'Tip fetch failed')
  return response.json() as Promise<TipResponse>
}

type ChatConverseRequest = {
  message: string
  language: string
  profile: {
    demographics?: {
      age?: number
      heightCm?: number
      weightKg?: number
    }
    habits?: {
      dietPattern?: string
      dietType?: string
      mealsPerDay?: number
      proteinTargetG?: number
      proteinIntakeG?: number
      waterIntakeGlasses?: number
      exerciseMinutesPerDay?: number
      substanceUse?: string
    }
    trends?: {
      windowDays?: number
      symptomLogsCount?: number
      averageSymptomSeverity?: number
      topSymptoms?: string[]
      reminderLogsCount?: number
      reminderTakenCount?: number
      reminderSnoozedCount?: number
      reminderMissedCount?: number
      adherenceRate?: number
    }
    memory?: {
      reminderCommandsCount?: number
      imageAnalysesCount?: number
      mostDiscussedSymptoms?: string[]
      lastUserGoal?: string
      updatedAt?: string
    }
    conditions: string[]
    medications: Array<{ name: string; dosage: string }>
    currentSymptoms: string
  }
  history: Array<{ role: 'user' | 'assistant'; text: string }>
}

type CoachResultCard = {
  confidence: 'low' | 'medium' | 'high'
  nextAction: string
  disclaimer: string
}

type ChatConverseResponse = {
  reply: string
  source: 'bedrock' | 'fallback'
  resultCard?: CoachResultCard
  generatedAt: string
}

export async function converseCoach(payload: ChatConverseRequest): Promise<ChatConverseResponse> {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/chat/converse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwIfNotOk(response, 'Chat converse failed')
  return response.json() as Promise<ChatConverseResponse>
}

type AnalyzeImageRequest = {
  imageKey?: string
  imageBase64?: string
  mediaType: string
  question: string
  language: string
}

type AnalyzeImageResponse = {
  analysis: string
  source: 'bedrock' | 'fallback'
  resultCard?: CoachResultCard
  generatedAt: string
}

type CreateImageUploadUrlRequest = {
  mediaType: string
  profileId: string
}

type CreateImageUploadUrlResponse = {
  uploadUrl: string
  imageKey: string
  expiresInSeconds: number
  requiredHeaders: Record<string, string>
}

export async function analyzeCoachImage(payload: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/chat/analyze-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwIfNotOk(response, 'Image analysis failed')
  return response.json() as Promise<AnalyzeImageResponse>
}

export async function createCoachImageUploadUrl(
  payload: CreateImageUploadUrlRequest
): Promise<CreateImageUploadUrlResponse> {
  const apiBaseUrl = requireApiBaseUrl()
  const response = await apiFetch(`${apiBaseUrl}/chat/image-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwIfNotOk(response, 'Create upload URL failed')
  return response.json() as Promise<CreateImageUploadUrlResponse>
}
