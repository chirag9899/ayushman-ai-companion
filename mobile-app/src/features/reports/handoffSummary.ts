import type { ReminderLog, SymptomLog, UserProfile } from '../../types/profile'

type SummaryWindowDays = 7 | 30

type BuildSummaryInput = {
  profile: UserProfile
  symptomLogs: SymptomLog[]
  reminderLogs: ReminderLog[]
  windowDays: SummaryWindowDays
}

export type DoctorHandoffSnapshot = {
  windowDays: SummaryWindowDays
  generatedAt: string
  scopedSymptoms: SymptomLog[]
  scopedReminders: ReminderLog[]
  topSymptoms: Array<[string, number]>
  latestReadings: UserProfile['readings']
  reminderStats: {
    taken: number
    snoozed: number
    missed: number
    totalActions: number
    adherencePct?: number
  }
  redFlags: string[]
  timeline: string
  averageSeverity?: number
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getWindowStart(windowDays: SummaryWindowDays) {
  return Date.now() - windowDays * 24 * 60 * 60 * 1000
}

function getTopSymptoms(symptomLogs: SymptomLog[]) {
  const counts = new Map<string, number>()
  for (const log of symptomLogs) {
    const key = log.symptoms.trim().toLowerCase()
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
}

function getLatestReadings(symptomLogs: SymptomLog[], profile: UserProfile) {
  const logsWithReadings = symptomLogs
    .filter(
      (log) =>
        typeof log.readings.bloodSugar === 'number' ||
        typeof log.readings.bloodPressureSystolic === 'number' ||
        typeof log.readings.bloodPressureDiastolic === 'number' ||
        typeof log.readings.weight === 'number' ||
        typeof log.readings.temperature === 'number'
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (logsWithReadings.length > 0) {
    return logsWithReadings[0].readings
  }
  return profile.readings
}

function buildMedicationSchedule(profile: UserProfile) {
  const dayLabel: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  }

  const lines = profile.medications
    .map((med) => {
      const name = med.name.trim()
      if (!name) return null
      const dosage = med.dosage.trim() || 'dosage n/a'
      const times = med.times.filter(Boolean).join(', ') || 'time n/a'
      const days =
        Array.isArray(med.daysOfWeek) && med.daysOfWeek.length > 0
          ? med.daysOfWeek.map((day) => dayLabel[day] || String(day)).join(', ')
          : 'Daily'
      return `- ${name} (${dosage}) at ${times} | ${days}`
    })
    .filter((item): item is string => Boolean(item))

  return lines.length > 0 ? lines.join('\n') : '- No active medications listed'
}

function buildReminderStats(reminderLogs: ReminderLog[]) {
  const taken = reminderLogs.filter((log) => log.status === 'taken').length
  const snoozed = reminderLogs.filter((log) => log.status === 'snoozed').length
  const missed = reminderLogs.filter((log) => log.status === 'missed').length
  const totalActions = reminderLogs.length
  const adherencePct =
    totalActions > 0 ? Number(((taken / totalActions) * 100).toFixed(1)) : undefined
  return { taken, snoozed, missed, totalActions, adherencePct }
}

function buildRedFlags(symptomLogs: SymptomLog[], reminderLogs: ReminderLog[]) {
  const flags: string[] = []
  const severeCount = symptomLogs.filter((log) => log.severity >= 4).length
  if (severeCount >= 2) {
    flags.push(`Repeated high symptom severity entries (${severeCount} times with severity >= 4).`)
  }

  const extremeSugar = symptomLogs.find((log) => {
    const value = log.readings.bloodSugar
    return typeof value === 'number' && (value < 70 || value > 250)
  })
  if (extremeSugar) {
    flags.push(
      `Out-of-range blood sugar observed at ${formatDateTime(extremeSugar.timestamp)}.`
    )
  }

  const criticalBp = symptomLogs.find((log) => {
    const sys = log.readings.bloodPressureSystolic
    const dia = log.readings.bloodPressureDiastolic
    return (
      (typeof sys === 'number' && sys >= 180) ||
      (typeof dia === 'number' && dia >= 120)
    )
  })
  if (criticalBp) {
    flags.push(`Very high blood pressure reading observed at ${formatDateTime(criticalBp.timestamp)}.`)
  }

  const recentMissed = reminderLogs
    .filter((log) => log.status === 'missed')
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  if (recentMissed.length >= 3) {
    flags.push(`Medication adherence risk: ${recentMissed.length} missed reminders in this period.`)
  }

  return flags
}

function buildTimeline(symptomLogs: SymptomLog[], reminderLogs: ReminderLog[]) {
  const symptomEvents = symptomLogs.map((log) => ({
    at: log.timestamp,
    line: `${formatDateTime(log.timestamp)} | Symptom: "${log.symptoms}" | severity ${log.severity}/5`,
  }))
  const reminderEvents = reminderLogs.map((log) => ({
    at: log.timestamp,
    line: `${formatDateTime(log.timestamp)} | Reminder ${log.status}: ${log.medicationName} (scheduled ${formatDateTime(log.scheduledTime)})`,
  }))
  return [...symptomEvents, ...reminderEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12)
    .map((item) => `- ${item.line}`)
    .join('\n')
}

export function buildDoctorHandoffSummary({
  profile,
  symptomLogs,
  reminderLogs,
  windowDays,
}: BuildSummaryInput) {
  const snapshot = buildDoctorHandoffSnapshot({
    profile,
    symptomLogs,
    reminderLogs,
    windowDays,
  })

  const { scopedSymptoms, topSymptoms, latestReadings, reminderStats, redFlags, timeline, averageSeverity } =
    snapshot
  const age = profile.demographics.age
  const currentSymptoms = profile.currentSymptoms.trim() || 'Not specified'
  const conditions =
    profile.medicalHistory.conditions.length > 0
      ? profile.medicalHistory.conditions.join(', ')
      : 'None listed'
  const topSymptomText =
    topSymptoms.length > 0
      ? topSymptoms.map(([name, count]) => `${name} (${count})`).join(', ')
      : 'No repeated symptom pattern detected'

  return [
    'AYUSHMAN AI COMPANION - CLINICAL HANDOFF SUMMARY',
    `Generated at: ${formatDateTime(snapshot.generatedAt)}`,
    `Coverage window: Last ${windowDays} days`,
    '',
    '--- SUBJECTIVE ---',
    `Patient ID: ${profile.id}`,
    `Age: ${typeof age === 'number' ? age : 'Not provided'}`,
    `Known conditions: ${conditions}`,
    `Current symptoms: ${currentSymptoms}`,
    `Top reported symptom themes: ${topSymptomText}`,
    '',
    '--- OBJECTIVE ---',
    `Symptom entries: ${scopedSymptoms.length}`,
    `Average symptom severity (1-5): ${typeof averageSeverity === 'number' ? averageSeverity : 'n/a'}`,
    `Medication reminder actions: ${reminderStats.totalActions} (taken ${reminderStats.taken}, snoozed ${reminderStats.snoozed}, missed ${reminderStats.missed})`,
    `Adherence estimate: ${typeof reminderStats.adherencePct === 'number' ? `${reminderStats.adherencePct}%` : 'n/a'}`,
    `Latest blood sugar: ${typeof latestReadings.bloodSugar === 'number' ? `${latestReadings.bloodSugar} mg/dL` : 'n/a'}`,
    `Latest blood pressure: ${
      typeof latestReadings.bloodPressureSystolic === 'number' &&
      typeof latestReadings.bloodPressureDiastolic === 'number'
        ? `${latestReadings.bloodPressureSystolic}/${latestReadings.bloodPressureDiastolic} mmHg`
        : 'n/a'
    }`,
    `Latest weight: ${typeof latestReadings.weight === 'number' ? `${latestReadings.weight} kg` : 'n/a'}`,
    `Latest temperature: ${
      typeof latestReadings.temperature === 'number' ? `${latestReadings.temperature} C` : 'n/a'
    }`,
    '',
    'Medication schedule snapshot:',
    buildMedicationSchedule(profile),
    '',
    '--- ASSESSMENT (AI-ASSISTED, NON-DIAGNOSTIC) ---',
    redFlags.length > 0
      ? `Red flags observed:\n${redFlags.map((flag) => `- ${flag}`).join('\n')}`
      : '- No major red flags detected from available logs.',
    '- This summary is generated from user-entered logs and reminder interactions.',
    '- Use this as supportive context, not as a standalone diagnosis.',
    '',
    '--- PLAN / FOLLOW-UP SUGGESTIONS ---',
    '- Review medication adherence barriers if missed reminders are frequent.',
    '- Reassess symptom severity trend if average severity is rising.',
    '- Validate abnormal vitals with clinical-grade measurements.',
    '- If severe/worsening symptoms are present, advise urgent in-person care.',
    '',
    '--- RECENT TIMELINE (Most recent first) ---',
    timeline || '- No symptom/reminder events available in this window.',
    '',
    'Limitations: Synthetic/public-data prototype context. User-entered data may be incomplete or inaccurate.',
  ].join('\n')
}

export function buildDoctorHandoffSnapshot({
  profile,
  symptomLogs,
  reminderLogs,
  windowDays,
}: BuildSummaryInput): DoctorHandoffSnapshot {
  const windowStart = getWindowStart(windowDays)
  const scopedSymptoms = symptomLogs
    .filter((log) => new Date(log.timestamp).getTime() >= windowStart)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const scopedReminders = reminderLogs
    .filter((log) => new Date(log.timestamp).getTime() >= windowStart)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const topSymptoms = getTopSymptoms(scopedSymptoms)
  const latestReadings = getLatestReadings(scopedSymptoms, profile)
  const reminderStats = buildReminderStats(scopedReminders)
  const redFlags = buildRedFlags(scopedSymptoms, scopedReminders)
  const timeline = buildTimeline(scopedSymptoms, scopedReminders)
  const averageSeverity =
    scopedSymptoms.length > 0
      ? Number(
          (
            scopedSymptoms.reduce((sum, item) => sum + item.severity, 0) / scopedSymptoms.length
          ).toFixed(1)
        )
      : undefined

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    scopedSymptoms,
    scopedReminders,
    topSymptoms,
    latestReadings,
    reminderStats,
    redFlags,
    timeline,
    averageSeverity,
  }
}

