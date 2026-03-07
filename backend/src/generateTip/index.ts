import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { bedrockClient, ddbDocClient } from '../lib/aws'
import { json } from '../lib/response'

type TipRequest = {
  id?: string
  language?: string
  conditions?: string[]
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
  medicalHistory?: {
    conditions?: string[]
  }
}

function normalizedLanguage(language?: string) {
  return language === 'hi' ? 'hi' : 'en'
}

function pickRuleBasedTip(conditions: string[] = [], language = 'en') {
  const isHindi = normalizedLanguage(language) === 'hi'
  if (conditions.includes('diabetes')) {
    return isHindi
      ? 'रोटी/चावल कम मात्रा में लें, दाल-सब्जी ज्यादा लें, मीठा और मीठे पेय कम करें।'
      : 'Prefer high-fiber meals like dal and vegetables, and avoid sugary drinks.'
  }

  if (conditions.includes('hypertension')) {
    return isHindi
      ? 'नमक कम करें और रोज़ कम से कम 30 मिनट चलें।'
      : 'Reduce salt intake and include regular walking for at least 30 minutes daily.'
  }

  return isHindi
    ? 'पानी पर्याप्त पिएं, दवा समय पर लें और रोज़ लक्षण लिखें।'
    : 'Drink enough water, follow medicine timing, and keep a daily symptom log.'
}

function buildPrompt(payload: TipRequest, conditions: string[]) {
  const habits = payload.habits || {}
  const language = normalizedLanguage(payload.language)
  const languageInstruction =
    language === 'hi'
      ? 'Write in simple Hindi (common everyday words), short and clear, max 1 sentence.'
      : 'Write in simple English, short and clear, max 1 sentence.'

  return [
    'Generate one short, practical chronic-care tip for an Indian patient.',
    `Language: ${language}`,
    `Conditions: ${conditions.join(', ') || 'not specified'}`,
    `Diet pattern: ${habits.dietPattern || 'not specified'}`,
    `Diet type: ${habits.dietType || 'not specified'}`,
    `Meals/day: ${habits.mealsPerDay || 'not specified'}`,
    `Protein target: ${habits.proteinTargetG || 'not specified'} g/day`,
    `Protein intake: ${habits.proteinIntakeG || 'not specified'} g/day`,
    `Water intake: ${habits.waterIntakeGlasses || 'not specified'} glasses/day`,
    `Exercise: ${habits.exerciseMinutesPerDay || 'not specified'} mins/day`,
    `Substance use: ${habits.substanceUse || 'not specified'}`,
    languageInstruction,
    'Rules: Keep it educational, non-diagnostic, and easy to understand.',
    'Output only the tip sentence.',
  ].join('\n')
}

async function getCachedTip(cacheKey: string) {
  const tipsTable = process.env.TIPS_TABLE
  if (!tipsTable) return null

  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: tipsTable,
      Key: {
        pk: `tip#${cacheKey}`,
        sk: 'latest',
      },
    })
  )

  return (result.Item?.tip as string | undefined) ?? null
}

async function cacheTip(cacheKey: string, tip: string, source: string) {
  const tipsTable = process.env.TIPS_TABLE
  if (!tipsTable) return

  await ddbDocClient.send(
    new PutCommand({
      TableName: tipsTable,
      Item: {
        pk: `tip#${cacheKey}`,
        sk: 'latest',
        tip,
        source,
        updatedAt: new Date().toISOString(),
      },
    })
  )
}

async function generateBedrockTip(payload: TipRequest, conditions: string[]) {
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0'

  const prompt = buildPrompt(payload, conditions)

  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 800,
      temperature: 0.3,
    },
  })

  const response = await bedrockClient.send(command)
  const contentBlocks = response.output?.message?.content ?? []
  const firstTextBlock = contentBlocks.find(
    (block) => typeof block?.text === 'string' && block.text.trim().length > 0
  )
  let tip = firstTextBlock?.text?.trim()

  if (!tip) {
    const reasoningTexts = contentBlocks
      .map((block) => (block as { reasoningContent?: { reasoningText?: { text?: string } } }).reasoningContent?.reasoningText?.text)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

    const lastReasoning = reasoningTexts[reasoningTexts.length - 1] || ''
    const quotedMatches = [...lastReasoning.matchAll(/["“]([^"”]+)[”"]/g)]
    const lastQuoted = quotedMatches[quotedMatches.length - 1]?.[1]?.trim()
    tip = lastQuoted && lastQuoted.length > 0 ? lastQuoted : undefined
  }

  if (!tip) {
    throw new Error('Empty response from Bedrock model.')
  }

  return tip
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: TipRequest = event?.body ? JSON.parse(event.body) : {}
    const profileId = payload.id || 'anonymous'
    const language = normalizedLanguage(payload.language)
    const conditions =
      payload.conditions ?? payload.medicalHistory?.conditions ?? []
    const cacheKey = `${profileId}:${language}:${[...conditions].sort().join('|') || 'general'}`
    const cachedTip = await getCachedTip(cacheKey)

    if (cachedTip) {
      return json(200, {
        tip: cachedTip,
        disclaimer:
          'This is educational guidance only and is not a medical diagnosis.',
        source: 'cache',
        generatedAt: new Date().toISOString(),
      })
    }

    let tip = ''
    let source = 'bedrock'

    try {
      tip = await generateBedrockTip(payload, conditions)
    } catch (error) {
      console.error('Bedrock tip generation failed, using rule-based fallback.', {
        modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0',
        bedrockRegion: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-south-1',
        error: error instanceof Error ? error.message : String(error),
      })
      tip = pickRuleBasedTip(conditions, language)
      source = 'rule-based-fallback'
    }

    await cacheTip(cacheKey, tip, source)

    return json(200, {
      tip,
      disclaimer:
        'This is educational guidance only and is not a medical diagnosis.',
      source,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return json(400, {
      message: 'Invalid request body.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
