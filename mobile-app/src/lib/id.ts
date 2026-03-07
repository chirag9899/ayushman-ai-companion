import * as Crypto from 'expo-crypto'

export function generateSafeId() {
  try {
    return Crypto.randomUUID()
  } catch {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 10)
    return `local-${ts}-${rand}`
  }
}
