import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { bedrockClient } from '../lib/aws'
import { buildResultCard } from '../lib/coachResult'
import { json } from '../lib/response'

type ChatRequest = {
  message?: string
  language?: string
  profile?: {
    demographics?: {
      age?: number
      heightCm?: number
      weightKg?: number
    }
    habits?: {
      dietPattern?: string
      dietType?: string
      mealsPerDay?: number
      proteinTargetG?: number
      proteinIntakeG?: number
      waterIntakeGlasses?: number
      exerciseMinutesPerDay?: number
      substanceUse?: string
    }
    trends?: {
      windowDays?: number
      symptomLogsCount?: number
      averageSymptomSeverity?: number
      topSymptoms?: string[]
      reminderLogsCount?: number
      reminderTakenCount?: number
      reminderSnoozedCount?: number
      reminderMissedCount?: number
      adherenceRate?: number
    }
    memory?: {
      reminderCommandsCount?: number
      imageAnalysesCount?: number
      mostDiscussedSymptoms?: string[]
      lastUserGoal?: string
      updatedAt?: string
      conversationThemes?: Array<{ theme: string; count: number; lastDiscussed?: string }>
      topCorrelations?: Array<{ symptom: string; factor: string; correlation: number; confidence: string; sampleSize: number }>
      smartReminderSuggestions?: Array<{ timeOfDay: string; missedCount: number; suggestion: string }>
    }
    conditions?: string[]
    medications?: Array<{ name?: string; dosage?: string }>
    currentSymptoms?: string
  }
  history?: Array<{ role?: 'user' | 'assistant'; text?: string }>
}

function normalizedLanguage(language?: string) {
  return language === 'hi' ? 'hi' : 'en'
}

function buildProfileContext(payload: ChatRequest) {
  const age = payload.profile?.demographics?.age
  const heightCm = payload.profile?.demographics?.heightCm
  const weightKg = payload.profile?.demographics?.weightKg
  const bmi =
    typeof heightCm === 'number' &&
    typeof weightKg === 'number' &&
    Number.isFinite(heightCm) &&
    Number.isFinite(weightKg) &&
    heightCm > 0
      ? Number((weightKg / ((heightCm / 100) * (heightCm / 100))).toFixed(1))
      : undefined
  const dietPattern = payload.profile?.habits?.dietPattern?.trim()
  const dietType = payload.profile?.habits?.dietType?.trim()
  const mealsPerDay = payload.profile?.habits?.mealsPerDay
  const proteinTargetG = payload.profile?.habits?.proteinTargetG
  const proteinIntakeG = payload.profile?.habits?.proteinIntakeG
  const waterIntakeGlasses = payload.profile?.habits?.waterIntakeGlasses
  const exerciseMinutesPerDay = payload.profile?.habits?.exerciseMinutesPerDay
  const substanceUse = payload.profile?.habits?.substanceUse?.trim()
  const trendWindowDays = payload.profile?.trends?.windowDays
  const symptomLogsCount = payload.profile?.trends?.symptomLogsCount
  const averageSymptomSeverity = payload.profile?.trends?.averageSymptomSeverity
  const topSymptoms = payload.profile?.trends?.topSymptoms || []
  const reminderLogsCount = payload.profile?.trends?.reminderLogsCount
  const reminderTakenCount = payload.profile?.trends?.reminderTakenCount
  const reminderSnoozedCount = payload.profile?.trends?.reminderSnoozedCount
  const reminderMissedCount = payload.profile?.trends?.reminderMissedCount
  const adherenceRate = payload.profile?.trends?.adherenceRate
  const reminderCommandsCount = payload.profile?.memory?.reminderCommandsCount
  const imageAnalysesCount = payload.profile?.memory?.imageAnalysesCount
  const mostDiscussedSymptoms = payload.profile?.memory?.mostDiscussedSymptoms || []
  const lastUserGoal = payload.profile?.memory?.lastUserGoal?.trim()
  const memoryUpdatedAt = payload.profile?.memory?.updatedAt
  const conditions = payload.profile?.conditions?.filter(Boolean) || []
  const medications = payload.profile?.medications?.filter((med) => (med?.name || '').trim().length > 0) || []
  const symptoms = payload.profile?.currentSymptoms?.trim() || 'not provided'

  return [
    `Age: ${typeof age === 'number' ? age : 'not provided'}`,
    `Height (cm): ${typeof heightCm === 'number' ? heightCm : 'not provided'}`,
    `Weight (kg): ${typeof weightKg === 'number' ? weightKg : 'not provided'}`,
    `BMI: ${typeof bmi === 'number' ? bmi : 'not available'}`,
    `Diet pattern: ${dietPattern || 'not provided'}`,
    `Diet type: ${dietType || 'not provided'}`,
    `Meals/day: ${typeof mealsPerDay === 'number' ? mealsPerDay : 'not provided'}`,
    `Protein target (g/day): ${typeof proteinTargetG === 'number' ? proteinTargetG : 'not provided'}`,
    `Protein intake (g/day): ${typeof proteinIntakeG === 'number' ? proteinIntakeG : 'not provided'}`,
    `Hydration (glasses/day): ${typeof waterIntakeGlasses === 'number' ? waterIntakeGlasses : 'not provided'}`,
    `Exercise (minutes/day): ${typeof exerciseMinutesPerDay === 'number' ? exerciseMinutesPerDay : 'not provided'}`,
    `Substance use: ${substanceUse || 'not provided'}`,
    `Trend window (days): ${typeof trendWindowDays === 'number' ? trendWindowDays : 'not provided'}`,
    `Symptom logs in window: ${typeof symptomLogsCount === 'number' ? symptomLogsCount : 'not provided'}`,
    `Average symptom severity (1-5): ${typeof averageSymptomSeverity === 'number' ? averageSymptomSeverity : 'not provided'}`,
    `Top symptom patterns: ${topSymptoms.join(', ') || 'none available'}`,
    `Reminder logs in window: ${typeof reminderLogsCount === 'number' ? reminderLogsCount : 'not provided'}`,
    `Reminder taken count: ${typeof reminderTakenCount === 'number' ? reminderTakenCount : 'not provided'}`,
    `Reminder snoozed count: ${typeof reminderSnoozedCount === 'number' ? reminderSnoozedCount : 'not provided'}`,
    `Reminder missed count: ${typeof reminderMissedCount === 'number' ? reminderMissedCount : 'not provided'}`,
    `Adherence rate (%): ${typeof adherenceRate === 'number' ? adherenceRate : 'not provided'}`,
    `Coach memory reminder command count: ${typeof reminderCommandsCount === 'number' ? reminderCommandsCount : 'not available'}`,
    `Coach memory image analysis count: ${typeof imageAnalysesCount === 'number' ? imageAnalysesCount : 'not available'}`,
    `Coach memory discussed symptoms: ${mostDiscussedSymptoms.join(', ') || 'none available'}`,
    `Coach memory last user goal: ${lastUserGoal || 'not available'}`,
    `Coach memory last updated at: ${memoryUpdatedAt || 'not available'}`,
    `Conditions: ${conditions.join(', ') || 'none provided'}`,
    `Medications: ${medications.map((med) => `${med.name || 'Unnamed'} (${med.dosage || 'dosage n/a'})`).join(', ') || 'none provided'}`,
    `Current symptoms: ${symptoms}`,
  ].join('\n')
}

function fallbackReply(language = 'en') {
  if (normalizedLanguage(language) === 'hi') {
    return 'मैं अभी सीमित मोड में हूँ। कृपया दवा समय, पानी, और लक्षण ट्रैकिंग नियमित रखें। यह केवल शैक्षणिक मार्गदर्शन है, चिकित्सकीय निदान नहीं।'
  }
  return 'I am in fallback mode right now. Keep medicine timing, hydration, and symptom tracking consistent. Educational guidance only, not medical diagnosis.'
}

function enforceSafetyReply(reply: string, language: 'en' | 'hi') {
  let next = reply.trim()
  const lower = next.toLowerCase()
  const diagnosisStyle =
    lower.includes('you have ') ||
    lower.includes('this is definitely') ||
    lower.includes('diagnosis:')

  if (diagnosisStyle) {
    next =
      language === 'hi'
        ? `मैं निदान नहीं कर सकता/सकती, पर संभावित देखभाल कदम बता सकता/सकती हूँ.\n${next}`
        : `I cannot provide a diagnosis, but I can share possible care steps.\n${next}`
  }

  const educationLine =
    language === 'hi'
      ? 'सुरक्षा नोट: यह शैक्षणिक मार्गदर्शन है, चिकित्सकीय निदान नहीं।'
      : 'Safety note: Educational guidance only, not medical diagnosis.'
  if (!next.includes(educationLine)) {
    next = `${next}\n${educationLine}`
  }

  const urgentCareLine =
    language === 'hi'
      ? 'आपात स्थिति में (सीने में तेज दर्द, सांस लेने में कठिनाई, बेहोशी, रक्तस्राव, तेजी से बिगड़ते लक्षण) तुरंत इमरजेंसी में जाएं।'
      : 'Seek urgent in-person care now for severe chest pain, breathing difficulty, fainting, bleeding, or rapidly worsening symptoms.'
  if (!next.includes(urgentCareLine)) {
    next = `${next}\n${urgentCareLine}`
  }

  return next
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: ChatRequest = event?.body ? JSON.parse(event.body) : {}
    const message = payload.message?.trim()
    const language = normalizedLanguage(payload.language)

    if (!message) {
      return json(400, { message: 'message is required.' })
    }

    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0'
    const profileContext = buildProfileContext(payload)
    const history = (payload.history || [])
      .slice(-6)
      .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.text || ''}`)
      .join('\n')

    const prompt = [
      'You are Ayushman health coach for chronic care support.',
      language === 'hi'
        ? 'Reply in simple Hindi words when possible.'
        : 'Reply in simple English.',
      'Never provide diagnosis. Keep answer practical and short (max 4 lines).',
      'Use trend + memory context to personalize suggestions and keep continuity with user goals.',
      'If user asks medication schedule setup, give short acknowledgement and suggested confirmation text.',
      '',
      'User profile context:',
      profileContext,
      '',
      history ? `Recent chat:\n${history}` : '',
      '',
      `User message: ${message}`,
      '',
      'Include one-line safety note: Educational guidance only, not medical diagnosis.',
    ].join('\n')

    try {
      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId,
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: {
            maxTokens: 700,
            temperature: 0.3,
          },
        })
      )

      const contentBlocks = response.output?.message?.content ?? []
      const firstTextBlock = contentBlocks.find(
        (block) => typeof block?.text === 'string' && block.text.trim().length > 0
      )
      const reply = firstTextBlock?.text?.trim()
      const resultCard = buildResultCard(language, message)

      if (!reply) {
        return json(200, {
          reply: fallbackReply(language),
          source: 'fallback',
          resultCard,
          generatedAt: new Date().toISOString(),
        })
      }

      return json(200, {
        reply: enforceSafetyReply(reply, language),
        source: 'bedrock',
        resultCard,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error)
      console.error('Chat converse Bedrock failed, using fallback.', {
        modelId,
        error: errorDetails,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      return json(200, {
        reply: fallbackReply(language),
        source: 'fallback',
        error: errorDetails,
        resultCard: buildResultCard(language, message),
        generatedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    return json(400, {
      message: 'Invalid request body.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
