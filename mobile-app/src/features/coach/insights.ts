import type { ReminderLog, SymptomLog } from '../../types/profile'

export type HealthInsight = {
  id: string
  type: 'correlation' | 'trend' | 'suggestion' | 'alert'
  title: string
  description: string
  severity: 'info' | 'warning' | 'positive'
  createdAt: string
  expiresAt: string
}

export type CorrelationData = {
  symptom: string
  factor: string
  correlation: number // -1 to 1
  confidence: 'low' | 'medium' | 'high'
  sampleSize: number
}

export type WeeklySummary = {
  weekStart: string
  weekEnd: string
  adherenceRate: number
  symptomCount: number
  avgSeverity: number
  topSymptoms: string[]
  hydrationAvg: number
  missedReminders: number
  insights: HealthInsight[]
}

export type ConversationTheme = {
  theme: string
  count: number
  lastDiscussed: string
}

// Calculate correlation between two variables (-1 to 1)
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n === 0) return 0

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

// Detect patterns between symptoms and habits
export function detectCorrelations(
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[],
  waterIntakeHistory: { date: string; glasses: number }[],
  proteinIntakeHistory: { date: string; grams: number }[]
): CorrelationData[] {
  const correlations: CorrelationData[] = []

  // Group data by date
  const dailyData = new Map<
    string,
    { symptoms: SymptomLog[]; water: number; protein: number }
  >()

  // Initialize with symptom dates
  symptomLogs.forEach((log) => {
    const date = new Date(log.timestamp).toISOString().split('T')[0]
    if (!dailyData.has(date)) {
      dailyData.set(date, { symptoms: [], water: 0, protein: 0 })
    }
    dailyData.get(date)!.symptoms.push(log)
  })

  // Add water intake
  waterIntakeHistory.forEach((entry) => {
    const date = entry.date.split('T')[0]
    if (!dailyData.has(date)) {
      dailyData.set(date, { symptoms: [], water: 0, protein: 0 })
    }
    dailyData.get(date)!.water = entry.glasses
  })

  // Add protein intake
  proteinIntakeHistory.forEach((entry) => {
    const date = entry.date.split('T')[0]
    if (!dailyData.has(date)) {
      dailyData.set(date, { symptoms: [], water: 0, protein: 0 })
    }
    dailyData.get(date)!.protein = entry.grams
  })

  // Analyze each symptom type
  const symptomTypes = new Set<string>()
  symptomLogs.forEach((log) => {
    log.symptoms
      .toLowerCase()
      .split(/[,/|]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => symptomTypes.add(s))
  })

  symptomTypes.forEach((symptomType) => {
    const symptomDays: number[] = []
    const waterDays: number[] = []
    const proteinDays: number[] = []

    dailyData.forEach((data) => {
      const hasSymptom = data.symptoms.some((s) =>
        s.symptoms.toLowerCase().includes(symptomType)
      )
      symptomDays.push(hasSymptom ? 1 : 0)
      waterDays.push(data.water)
      proteinDays.push(data.protein)
    })

    // Water correlation
    const waterCorr = calculateCorrelation(symptomDays, waterDays)
    if (Math.abs(waterCorr) > 0.3 && waterDays.length >= 5) {
      correlations.push({
        symptom: symptomType,
        factor: 'water intake',
        correlation: waterCorr,
        confidence: waterDays.length >= 10 ? 'high' : waterDays.length >= 7 ? 'medium' : 'low',
        sampleSize: waterDays.length,
      })
    }

    // Protein correlation
    const proteinCorr = calculateCorrelation(symptomDays, proteinDays)
    if (Math.abs(proteinCorr) > 0.3 && proteinDays.length >= 5) {
      correlations.push({
        symptom: symptomType,
        factor: 'protein intake',
        correlation: proteinCorr,
        confidence: proteinDays.length >= 10 ? 'high' : proteinDays.length >= 7 ? 'medium' : 'low',
        sampleSize: proteinDays.length,
      })
    }
  })

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
}

// Generate weekly health summary
export function generateWeeklySummary(
  symptomLogs: SymptomLog[],
  reminderLogs: ReminderLog[],
  waterIntakeHistory: { date: string; glasses: number }[],
  profile: { habits: { proteinTargetG?: number } }
): WeeklySummary {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Filter to last 7 days
  const weekSymptoms = symptomLogs.filter(
    (log) => new Date(log.timestamp) >= weekStart
  )
  const weekReminders = reminderLogs.filter(
    (log) => new Date(log.timestamp) >= weekStart
  )
  const weekWater = waterIntakeHistory.filter(
    (entry) => new Date(entry.date) >= weekStart
  )

  // Calculate metrics
  const adherenceRate =
    weekReminders.length > 0
      ? Math.round(
          (weekReminders.filter((r) => r.status === 'taken').length / weekReminders.length) * 100
        )
      : 0

  const avgSeverity =
    weekSymptoms.length > 0
      ? Number(
          (
            weekSymptoms.reduce((sum, s) => sum + s.severity, 0) / weekSymptoms.length
          ).toFixed(1)
        )
      : 0

  const hydrationAvg =
    weekWater.length > 0
      ? Math.round(weekWater.reduce((sum, w) => sum + w.glasses, 0) / weekWater.length)
      : 0

  // Top symptoms
  const symptomCounts = new Map<string, number>()
  weekSymptoms.forEach((log) => {
    log.symptoms
      .toLowerCase()
      .split(/[,/|]/g)
      .map((s) => s.trim())
      .forEach((s) => {
        symptomCounts.set(s, (symptomCounts.get(s) || 0) + 1)
      })
  })
  const topSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s)

  const missedReminders = weekReminders.filter((r) => r.status === 'missed').length

  // Generate insights
  const insights: HealthInsight[] = []

  if (adherenceRate < 70) {
    insights.push({
      id: `adherence-${now.toISOString()}`,
      type: 'alert',
      title: 'Medicine Adherence Low',
      description: `You took only ${adherenceRate}% of medicines this week. Consider setting backup reminders.`,
      severity: 'warning',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  if (hydrationAvg < 5) {
    insights.push({
      id: `hydration-${now.toISOString()}`,
      type: 'suggestion',
      title: 'Hydration Needs Attention',
      description: `Average ${hydrationAvg} glasses/day. Try keeping a water bottle visible.`,
      severity: 'info',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  if (weekSymptoms.length === 0 && adherenceRate >= 90) {
    insights.push({
      id: `great-week-${now.toISOString()}`,
      type: 'trend',
      title: 'Great Week!',
      description: 'No symptoms logged and excellent medicine adherence. Keep it up!',
      severity: 'positive',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: now.toISOString(),
    adherenceRate,
    symptomCount: weekSymptoms.length,
    avgSeverity,
    topSymptoms,
    hydrationAvg,
    missedReminders,
    insights,
  }
}

// Extract conversation themes from chat text
export function extractConversationThemes(text: string, existingThemes: ConversationTheme[]): ConversationTheme[] {
  const themes: { keywords: string[]; theme: string }[] = [
    { keywords: ['headache', 'sar dard', 'सर दर्द'], theme: 'headaches' },
    { keywords: ['stomach', 'pet', 'पेट', 'digestion'], theme: 'digestion' },
    { keywords: ['sleep', 'neend', 'नींद', 'insomnia'], theme: 'sleep' },
    { keywords: ['stress', 'tension', 'टेंशन', 'anxiety'], theme: 'mental health' },
    { keywords: ['pain', 'dard', 'दर्द'], theme: 'pain management' },
    { keywords: ['diet', 'food', 'khana', 'खाना', 'nutrition'], theme: 'nutrition' },
    { keywords: ['exercise', 'workout', 'walk', 'running'], theme: 'exercise' },
    { keywords: ['sugar', 'diabetes', 'blood sugar'], theme: 'blood sugar' },
    { keywords: ['bp', 'blood pressure', 'pressure'], theme: 'blood pressure' },
  ]

  const lowerText = text.toLowerCase()
  const now = new Date().toISOString()

  const updatedThemes = [...existingThemes]

  themes.forEach(({ keywords, theme }) => {
    if (keywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      const existing = updatedThemes.find((t) => t.theme === theme)
      if (existing) {
        existing.count++
        existing.lastDiscussed = now
      } else {
        updatedThemes.push({ theme, count: 1, lastDiscussed: now })
      }
    }
  })

  return updatedThemes.sort((a, b) => b.count - a.count).slice(0, 10)
}

// Smart reminder suggestions based on missed patterns
export function suggestSmartReminders(reminderLogs: ReminderLog[]): {
  timeOfDay: string
  missedCount: number
  suggestion: string
}[] {
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentLogs = reminderLogs.filter((log) => new Date(log.timestamp) >= monthAgo)

  // Group by hour of day
  const hourlyMisses = new Map<number, number>()
  recentLogs
    .filter((log) => log.status === 'missed')
    .forEach((log) => {
      const hour = new Date(log.timestamp).getHours()
      hourlyMisses.set(hour, (hourlyMisses.get(hour) || 0) + 1)
    })

  const suggestions: { timeOfDay: string; missedCount: number; suggestion: string }[] = []

  hourlyMisses.forEach((count, hour) => {
    if (count >= 2) {
      let timeOfDay = 'Evening'
      if (hour >= 5 && hour < 12) timeOfDay = 'Morning'
      else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon'
      else if (hour >= 17 && hour < 21) timeOfDay = 'Evening'
      else timeOfDay = 'Night'

      suggestions.push({
        timeOfDay,
        missedCount: count,
        suggestion: `You've missed ${count} ${timeOfDay.toLowerCase()} reminders. Consider adding a backup alarm or linking it to a daily habit.`,
      })
    }
  })

  return suggestions.sort((a, b) => b.missedCount - a.missedCount).slice(0, 3)
}
