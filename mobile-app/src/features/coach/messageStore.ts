import CryptoJS from 'crypto-js'
import { storageGetJson, storageRemove, storageSetJson } from '../../lib/storage'
import type { CoachMessage } from './types'

const keyPrefix = 'coach-chat-history:v1:'

type EncryptedChatPayload = {
  mode?: 'encrypted' | 'plain'
  cipherText: string
}

function storageKey(profileId: string) {
  return `${keyPrefix}${profileId}`
}

function passphrase(profileId: string) {
  return `ayushman-coach:${profileId}:local-history`
}

export async function saveCoachMessages(profileId: string, messages: CoachMessage[]) {
  const serialized = JSON.stringify(messages)
  let payload: EncryptedChatPayload
  try {
    const cipherText = CryptoJS.AES.encrypt(serialized, passphrase(profileId)).toString()
    payload = { mode: 'encrypted', cipherText }
  } catch {
    // Fallback to plain payload when secure random is unavailable in current runtime.
    payload = { mode: 'plain', cipherText: serialized }
  }
  await storageSetJson(storageKey(profileId), payload)
}

export async function loadCoachMessages(profileId: string): Promise<CoachMessage[]> {
  const payload = await storageGetJson<EncryptedChatPayload>(storageKey(profileId))
  if (!payload?.cipherText) return []
  try {
    const decrypted =
      payload.mode === 'plain'
        ? payload.cipherText
        : CryptoJS.AES.decrypt(payload.cipherText, passphrase(profileId)).toString(CryptoJS.enc.Utf8)
    if (!decrypted) return []
    const parsed = JSON.parse(decrypted) as Array<Partial<CoachMessage>>
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item, index) => {
        const text = typeof item.text === 'string' ? item.text : ''
        const role = item.role === 'assistant' ? 'assistant' : 'user'
        const createdAt =
          typeof item.createdAt === 'string' && item.createdAt
            ? item.createdAt
            : new Date(Date.now() - (parsed.length - index) * 1000).toISOString()
        if (!text.trim()) return null
        return {
          id: typeof item.id === 'string' && item.id ? item.id : `${Date.now()}-${index}`,
          role,
          text,
          createdAt,
          pinned: Boolean(item.pinned),
          resultCard:
            item.resultCard &&
            typeof item.resultCard === 'object' &&
            (item.resultCard.confidence === 'low' ||
              item.resultCard.confidence === 'medium' ||
              item.resultCard.confidence === 'high') &&
            typeof item.resultCard.nextAction === 'string' &&
            typeof item.resultCard.disclaimer === 'string'
              ? item.resultCard
              : undefined,
        } as CoachMessage
      })
      .filter((item): item is CoachMessage => item !== null)
  } catch {
    return []
  }
}

export async function clearCoachMessages(profileId: string) {
  await storageRemove(storageKey(profileId))
}
