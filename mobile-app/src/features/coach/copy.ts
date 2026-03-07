import type { AppLanguage } from '../../types/profile'

export function coachWelcome(language: AppLanguage) {
  return language === 'hi'
    ? 'मैं आपकी मदद कर सकता हूँ। उदाहरण: "Set reminder for Metformin at 9 pm".'
    : 'I can help with reminders. Example: "Set reminder for Metformin at 9 pm".'
}

export function coachHelper(language: AppLanguage) {
  return language === 'hi'
    ? 'Try: "dolo ka alarm set krdo 10:00 am roj"'
    : 'Try: "Set alarm for Dolo at 10 pm everyday"'
}

export function coachTranscriptionError(language: AppLanguage) {
  return language === 'hi'
    ? 'Voice transcription में दिक्कत आई। कृपया फिर कोशिश करें।'
    : 'Voice transcription failed. Please try again.'
}

export function coachTranscriptionPermissionError(language: AppLanguage) {
  return language === 'hi'
    ? 'माइक और स्पीच अनुमति दें ताकि transcription हो सके।'
    : 'Please allow microphone and speech permissions for transcription.'
}

export function coachTranscriptionStartError(language: AppLanguage) {
  return language === 'hi' ? 'Voice input शुरू नहीं हो पाया।' : 'Could not start voice input.'
}
