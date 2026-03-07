import { storageGetJson, storageSetJson } from '../../lib/storage'
import type { CoachMessage } from './types'

const keyPrefix = 'coach-chat-sessions:v1:'
const maxSessions = 20
const encryptedImageMarker = '__ENCRYPTED_IMAGE__'

export type CoachSession = {
  id: string
  createdAt: string
  title: string
  messages: CoachMessage[]
}

function storageKey(profileId: string) {
  return `${keyPrefix}${profileId}`
}

function buildSessionTitle(messages: CoachMessage[]) {
  const firstUser = messages.find((item) => item.role === 'user' && item.text.trim())
  if (!firstUser) return 'New chat'
  const text = firstUser.text
    .replace(encryptedImageMarker, '')
    .trim()
    .replace(/\s+/g, ' ')
  return text.length > 46 ? `${text.slice(0, 46)}...` : text
}

export async function loadCoachSessions(profileId: string): Promise<CoachSession[]> {
  const sessions = await storageGetJson<CoachSession[]>(storageKey(profileId))
  if (!Array.isArray(sessions)) return []
  return sessions
    .filter((item) => Array.isArray(item.messages) && item.messages.length > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function archiveCoachSession(profileId: string, messages: CoachMessage[]) {
  const cleanMessages = messages.filter((item) => item.text.trim())
  const meaningful = cleanMessages.filter((item) => item.role === 'user').length > 0
  if (!meaningful) return
  const existing = await loadCoachSessions(profileId)
  const nextSession: CoachSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    title: buildSessionTitle(cleanMessages),
    messages: cleanMessages,
  }
  const trimmed = [nextSession, ...existing].slice(0, maxSessions)
  await storageSetJson(storageKey(profileId), trimmed)
}

export async function deleteCoachSession(profileId: string, sessionId: string) {
  const existing = await loadCoachSessions(profileId)
  const next = existing.filter((item) => item.id !== sessionId)
  await storageSetJson(storageKey(profileId), next)
}
