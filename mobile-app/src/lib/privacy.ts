import * as Crypto from 'expo-crypto'
import type { ReminderLog, SymptomLog, UserProfile } from '../types/profile'

type IntegrityWrapped<T> = T & { _integrity?: string }

async function withIntegrity<T extends object>(value: T): Promise<IntegrityWrapped<T>> {
  const payload = JSON.stringify(value)
  const checksum = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload
  )
  return {
    ...value,
    _integrity: checksum,
  }
}

async function withoutIntegrity<T extends object>(value: IntegrityWrapped<T>): Promise<T> {
  const { _integrity: _ignored, ...plain } = value
  return plain as T
}

export async function encryptProfileForStorage(profile: UserProfile) {
  return withIntegrity(profile)
}

export async function decryptProfileFromStorage(profile: IntegrityWrapped<UserProfile>) {
  return withoutIntegrity(profile)
}

export async function encryptSymptomLogForStorage(log: SymptomLog) {
  return withIntegrity(log)
}

export async function decryptSymptomLogFromStorage(log: IntegrityWrapped<SymptomLog>) {
  return withoutIntegrity(log)
}

export async function encryptReminderLogForStorage(log: ReminderLog) {
  return withIntegrity(log)
}

export async function decryptReminderLogFromStorage(log: IntegrityWrapped<ReminderLog>) {
  return withoutIntegrity(log)
}

export async function clearLocalPrivacyArtifacts() {
  // No separate key storage in this mobile adapter yet.
}
