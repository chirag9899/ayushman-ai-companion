import type { ReminderLog, SymptomLog, UserProfile } from '../types/profile'
import { storageClearAll, storageGetJson, storageListByPrefix, storageRemove, storageSetJson } from './storage'
import { generateSafeId } from './id'

const profilePrefix = 'profiles:'
const symptomPrefix = 'symptomLogs:'
const reminderPrefix = 'reminderLogs:'

export const db = {
  async putProfile(profile: UserProfile) {
    await storageSetJson(`${profilePrefix}${profile.id}`, profile)
  },

  async listProfiles() {
    const profiles = await storageListByPrefix<UserProfile>(profilePrefix)
    return profiles.map((item) => item.value)
  },

  async getLatestProfile() {
    const profiles = await this.listProfiles()
    return profiles.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null
  },

  async addSymptomLog(log: SymptomLog) {
    await storageSetJson(`${symptomPrefix}${log.id}`, log)
  },

  async listSymptomLogsByProfile(profileId: string) {
    const logs = await storageListByPrefix<SymptomLog>(symptomPrefix)
    return logs
      .map((item) => item.value)
      .filter((item) => item.profileId === profileId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  },

  async addReminderLog(log: ReminderLog) {
    await storageSetJson(`${reminderPrefix}${log.id}`, log)
  },

  async listReminderLogsByProfile(profileId: string) {
    const logs = await storageListByPrefix<ReminderLog>(reminderPrefix)
    return logs
      .map((item) => item.value)
      .filter((item) => item.profileId === profileId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  },

  async findReminderLogByReminderKey(reminderKey: string) {
    const logs = await storageListByPrefix<ReminderLog>(reminderPrefix)
    const found = logs.map((item) => item.value).find((item) => item.reminderKey === reminderKey)
    return found ?? null
  },

  async updateReminderLogByReminderKey(
    reminderKey: string,
    updates: Partial<ReminderLog>
  ) {
    const logs = await storageListByPrefix<ReminderLog>(reminderPrefix)
    const found = logs.find((item) => item.value.reminderKey === reminderKey)
    if (!found) return null
    const next = { ...found.value, ...updates }
    await storageSetJson(found.key, next)
    return next
  },

  async removeReminderLog(id: string) {
    await storageRemove(`${reminderPrefix}${id}`)
  },

  async generateId() {
    return generateSafeId()
  },

  async clearAll() {
    await storageClearAll()
  },

  async getQueueLength() {
    const queue = await storageGetJson<Array<unknown>>('offline-request-queue')
    return queue?.length ?? 0
  },
}
