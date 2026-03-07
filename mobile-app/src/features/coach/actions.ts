import type { AppLanguage } from '../../types/profile'
import { parseReminderIntent } from './parser'

type UpsertReminderFromCoach = (
  medicationName: string,
  time24h: string
) => Promise<{ medicationName: string; time24h: string }>

export async function executeCoachCommand(
  text: string,
  language: AppLanguage,
  upsertMedicationScheduleFromCoach: UpsertReminderFromCoach
) {
  const parsed = parseReminderIntent(text)
  if (!parsed) {
    return { handled: false as const }
  }

  try {
    const result = await upsertMedicationScheduleFromCoach(parsed.medicationName, parsed.time24h)
    const reply =
      language === 'hi'
        ? `${result.medicationName} के लिए रोज़ ${result.time24h} पर रिमाइंडर सेट कर दिया।`
        : `Done. I set a daily reminder for ${result.medicationName} at ${result.time24h}.`
    return { handled: true as const, reply }
  } catch {
    const reply =
      language === 'hi'
        ? 'रिमाइंडर सेट नहीं हो पाया। एक बार फिर कोशिश करें।'
        : 'I could not set that reminder. Please try again.'
    return { handled: true as const, reply }
  }
}
