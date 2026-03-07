export type AppLanguage = 'en' | 'hi' | 'regional'

export interface UserProfile {
  id: string
  createdAt: string
  language: AppLanguage
  consentAccepted: boolean
  cloudSyncEnabled: boolean
  demographics: {
    age?: number
    heightCm?: number
    weightKg?: number
  }
  habits: {
    dietPattern: string
    dietType?: 'veg' | 'non-veg' | 'eggetarian' | 'vegan'
    mealsPerDay?: number
    proteinTargetG?: number
    proteinIntakeG?: number
    waterIntakeGlasses: number
    exerciseMinutesPerDay: number
    substanceUse: string
  }
  medicalHistory: {
    conditions: string[]
    notes: string
  }
  medications: Array<{
    name: string
    dosage: string
    frequency: 'daily' | 'twice' | 'thrice' | 'custom'
    times: string[]
    daysOfWeek?: number[]
  }>
  currentSymptoms: string
  symptomSeverity: 1 | 2 | 3 | 4 | 5
  readings: {
    bloodSugar?: number
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    weight?: number
    temperature?: number
  }
}

export interface SymptomLog {
  id: string
  profileId: string
  timestamp: string
  symptoms: string
  severity: 1 | 2 | 3 | 4 | 5
  readings: UserProfile['readings']
}

export interface ReminderLog {
  id: string
  profileId: string
  reminderKey: string
  medicationName: string
  scheduledTime: string
  status: 'taken' | 'snoozed' | 'missed'
  snoozedUntil?: string
  timestamp: string
}

export type TipSource = 'bedrock' | 'cache' | 'rule-based-fallback' | 'local-fallback'
