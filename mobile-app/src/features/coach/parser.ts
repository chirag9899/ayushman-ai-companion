export type ReminderIntent = {
  medicationName: string
  time24h: string
}

function to24Hour(hour: number, minute: number, meridian?: string) {
  let h = hour
  if (meridian === 'pm' && h < 12) h += 12
  if (meridian === 'am' && h === 12) h = 0
  if (h < 0 || h > 23 || minute < 0 || minute > 59) return null
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function extractTime(text: string) {
  const compact = text.toLowerCase().replace(/\s+/g, ' ')
  const clockMatch = compact.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (clockMatch) {
    const hour = Number(clockMatch[1])
    const minute = Number(clockMatch[2] ?? '0')
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const meridian = clockMatch[3]?.toLowerCase()
      const parsed = to24Hour(hour, minute, meridian)
      if (parsed) return parsed
    }
  }

  const bajeMatch = compact.match(/(\d{1,2})(?::(\d{2}))?\s*baje/)
  if (bajeMatch) {
    const hour = Number(bajeMatch[1])
    const minute = Number(bajeMatch[2] ?? '0')
    if (!Number.isNaN(hour) && !Number.isNaN(minute) && hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  return null
}

function extractMedicineName(text: string) {
  const forPattern = text.match(/\bfor\s+([a-z0-9][a-z0-9\s-]{1,40})/i)
  if (forPattern?.[1]) return forPattern[1].trim()
  const kaAlarmPattern = text.match(
    /([a-zA-Z0-9][a-zA-Z0-9\s-]{1,40})\s+ka\s+(?:alarm|alarms|reminder)/i
  )
  if (kaAlarmPattern?.[1]) return kaAlarmPattern[1].trim()
  const kiDawaiPattern = text.match(/([a-zA-Z0-9][a-zA-Z0-9\s-]{1,40})\s+ki\s+dawai/i)
  if (kiDawaiPattern?.[1]) return kiDawaiPattern[1].trim()
  const aroundAlarmPattern = text.match(
    /\b(?:alarm|reminder|notification)\s+([a-z0-9][a-z0-9\s-]{1,40})\s+(?:at|@)/i
  )
  if (aroundAlarmPattern?.[1]) return aroundAlarmPattern[1].trim()
  const leadingPattern = text.match(
    /(?:set|setup|add)\s+([a-zA-Z0-9][a-zA-Z0-9\s-]{1,30})\s+(?:alarm|reminder)/i
  )
  if (leadingPattern?.[1]) return leadingPattern[1].trim()
  return 'Medicine'
}

export function parseReminderIntent(text: string): ReminderIntent | null {
  const normalized = text.trim().toLowerCase()
  const hasActionWord =
    /(set|add|setup|create|lagao|laga do|lga do|kar do|krdo|kardo|bna do|banao)/i.test(
      normalized
    )
  const hasReminderWord =
    /(alarm|alarms|alaram|alram|reminder|notification|yaad|dawai|medicine|meds)/i.test(
      normalized
    )
  if (!hasReminderWord && !hasActionWord) return null

  const time24h = extractTime(normalized)
  if (!time24h) return null

  const medicationName = extractMedicineName(text)
    .replace(/\b(roj|daily|everyday|every day|har din)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return { medicationName, time24h }
}
