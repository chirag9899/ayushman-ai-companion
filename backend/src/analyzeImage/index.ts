import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { bedrockClient, s3Client } from '../lib/aws'
import { buildResultCard } from '../lib/coachResult'
import { json } from '../lib/response'

type AnalyzeImageRequest = {
  imageKey?: string
  imageBase64?: string
  mediaType?: string
  question?: string
  language?: string
}

function normalizedLanguage(language?: string) {
  return language === 'hi' ? 'hi' : 'en'
}

function pickFormat(mediaType?: string): 'png' | 'jpeg' {
  if (mediaType === 'image/png') return 'png'
  return 'jpeg'
}

function fallback(language = 'en') {
  if (normalizedLanguage(language) === 'hi') {
    return 'इमेज विश्लेषण अभी उपलब्ध नहीं है। कृपया स्पष्ट फोटो दें और डॉक्टर से सलाह लें। यह केवल शैक्षणिक मार्गदर्शन है।'
  }
  return 'Image analysis is currently limited. Please share a clear photo and consult a clinician for diagnosis. Educational guidance only.'
}

type VisionIntent = 'pain' | 'skin' | 'general'

function detectVisionIntent(question: string, language: 'en' | 'hi'): VisionIntent {
  const q = question.toLowerCase()
  const painKeywords =
    language === 'hi'
      ? ['दर्द', 'दुख', 'सूजन', 'नस', 'मांसपेशी', 'यहाँ दर्द', 'pain']
      : ['pain', 'hurts', 'ache', 'sore', 'strain', 'swelling', 'tingling', 'numb']
  const skinKeywords =
    language === 'hi'
      ? ['skin', 'त्वचा', 'चेहरा', 'मुंह', 'acne', 'pimple', 'dry', 'oily', 'rash']
      : ['skin', 'face', 'acne', 'pimple', 'oily', 'dry', 'combination', 'sensitive', 'rash']

  if (painKeywords.some((k) => q.includes(k))) return 'pain'
  if (skinKeywords.some((k) => q.includes(k))) return 'skin'
  return 'general'
}

function buildPainPrompt(language: 'en' | 'hi', question: string) {
  if (language === 'hi') {
    return [
      'आप एक सावधान health coach हैं।',
      'यूज़र की बात और फोटो को साथ में पढ़ें। अगर यूज़र ने pain location बताया है (जैसे "यहाँ दर्द"), तो उसी जगह पर केंद्रित जवाब दें।',
      'बहुत सामान्य सलाह (जैसे सिर्फ पानी पीना) तभी दें जब फोटो/सवाल से सीधा संबंध हो।',
      'निदान या बीमारी का पक्का नाम न दें।',
      '',
      'जवाब का फॉर्मेट (छोटा और उपयोगी):',
      '1) Observation (1 line): फोटो में किस हिस्से पर यूज़र इशारा कर रहा है/कहाँ दर्द बताया है।',
      '2) Likely cause possibilities (2-3 bullets): overuse/strain/posture जैसी practical possibilities.',
      '3) What to do now (3 bullets): अगले 24-48 घंटे के स्पष्ट कदम (rest, ice/heat, movement limits, gentle stretch).',
      '4) Red flags (1 line): किन लक्षणों पर तुरंत डॉक्टर/ER जाना चाहिए।',
      '5) Safety note (1 line): Educational guidance only, not medical diagnosis.',
      '',
      `User question: ${question}`,
    ].join('\n')
  }

  return [
    'You are a careful health coach.',
    'Use both the user text and the image together. If user indicates a pain location (e.g., "pain here"), center the answer on that exact area.',
    'Avoid generic filler advice unless directly relevant to image/question.',
    'Do not diagnose or claim certainty.',
    '',
    'Response format (short, practical):',
    '1) Observation (1 line): what body area appears pointed/complained about.',
    '2) Likely possibilities (2-3 bullets): practical causes like strain, overuse, posture.',
    '3) What to do now (3 bullets): clear next 24-48h actions (rest, ice/heat, activity limits, gentle mobility).',
    '4) Red flags (1 line): when to seek urgent care.',
    '5) Safety note (1 line): Educational guidance only, not medical diagnosis.',
    '',
    `User question: ${question}`,
  ].join('\n')
}

function buildSkinPrompt(language: 'en' | 'hi', question: string) {
  if (language === 'hi') {
    return [
      'आप एक सावधान health coach हैं।',
      'यह स्किन-फोकस्ड प्रश्न है (जैसे skin type, acne, dryness)।',
      'सिर्फ फोटो में जो दिख रहा है उसी आधार पर जवाब दें। जो स्पष्ट न दिखे, उसे "clear नहीं है" बोलें।',
      'अगर चेहरा/त्वचा स्पष्ट नहीं दिख रही है, तो सिर्फ RETAKE_GUIDE दें (स्किन type अनुमान न करें)।',
      'पक्का diagnosis न दें।',
      '',
      'अगर फोटो स्पष्ट नहीं है, यह फॉर्मेट दें:',
      'RETAKE_GUIDE',
      '- Natural light में फ्रंट फेस फोटो लें',
      '- चेहरा कैमरे के करीब और बिना फ़िल्टर रखें',
      '- चेहरा साफ हो, बहुत blur/shadow न हो',
      '- Safety note: Educational guidance only, not medical diagnosis.',
      '',
      'अगर फोटो स्पष्ट है, यह फॉर्मेट दें:',
      '1) Observation (1 line): skin texture/shine/visible concerns.',
      '2) Best-fit skin type estimate (1 line): oily/dry/combination/sensitive + confidence (low/medium/high).',
      '3) What to do now (3 bullets): cleanser, moisturizer, sunscreen/products.',
      '4) Avoid (2 bullets): क्या न करें।',
      '5) Red flags (1 line): कब dermatologist को दिखाना चाहिए।',
      '6) Safety note (1 line): Educational guidance only, not medical diagnosis.',
      '',
      `User question: ${question}`,
    ].join('\n')
  }

  return [
    'You are a careful health coach.',
    'This is a skin-focused question (e.g., skin type, acne, dryness).',
    'Ground your answer only in visible cues from the image; if unclear, explicitly say uncertain.',
    'If face/skin is not clearly visible, return only RETAKE_GUIDE (do not estimate skin type).',
    'Do not diagnose.',
    '',
    'If image clarity is insufficient, output this format:',
    'RETAKE_GUIDE',
    '- Take a front-face photo in natural light',
    '- Keep face close to camera, no filter/beauty mode',
    '- Keep image sharp with minimal shadow',
    '- Safety note: Educational guidance only, not medical diagnosis.',
    '',
    'If image is clear, output this format:',
    '1) Observation (1 line): visible skin texture/shine/concerns.',
    '2) Best-fit skin type estimate (1 line): oily/dry/combination/sensitive + confidence (low/medium/high).',
    '3) What to do now (3 bullets): practical routine (cleanser, moisturizer, sunscreen/products).',
    '4) Avoid (2 bullets): what to avoid right now.',
    '5) Red flags (1 line): when to see a dermatologist.',
    '6) Safety note (1 line): Educational guidance only, not medical diagnosis.',
    '',
    `User question: ${question}`,
  ].join('\n')
}

function buildGeneralPrompt(language: 'en' | 'hi', question: string) {
  if (language === 'hi') {
    return [
      'आप एक सावधान health coach हैं।',
      'यूज़र की फोटो + सवाल को जोड़कर practical guidance दें, generic सलाह न दें।',
      'निदान न करें।',
      '',
      'जवाब का फॉर्मेट:',
      '1) Observation (1 line)',
      '2) Practical possibilities (2 bullets)',
      '3) What to do now (3 bullets)',
      '4) Red flags (1 line)',
      '5) Safety note (1 line): Educational guidance only, not medical diagnosis.',
      '',
      `User question: ${question}`,
    ].join('\n')
  }
  return [
    'You are a careful health coach.',
    'Use the image + question together and avoid generic filler.',
    'Do not diagnose.',
    '',
    'Response format:',
    '1) Observation (1 line)',
    '2) Practical possibilities (2 bullets)',
    '3) What to do now (3 bullets)',
    '4) Red flags (1 line)',
    '5) Safety note (1 line): Educational guidance only, not medical diagnosis.',
    '',
    `User question: ${question}`,
  ].join('\n')
}

function buildVisionPrompt(language: 'en' | 'hi', question: string) {
  const intent = detectVisionIntent(question, language)
  if (intent === 'pain') return buildPainPrompt(language, question)
  if (intent === 'skin') return buildSkinPrompt(language, question)
  return buildGeneralPrompt(language, question)
}

function normalizeVisionOutput(analysis: string, intent: VisionIntent, language: 'en' | 'hi') {
  if (intent !== 'skin') return analysis
  if (!analysis.includes('RETAKE_GUIDE')) return analysis

  if (language === 'hi') {
    return [
      'फोटो से स्किन स्पष्ट नहीं दिख रही है। सही विश्लेषण के लिए फोटो दोबारा लें:',
      '- Natural light में फ्रंट फेस फोटो लें',
      '- चेहरा कैमरे के करीब रखें और filter/beauty mode बंद रखें',
      '- फोटो sharp हो, shadow कम हो',
      'Safety note: Educational guidance only, not medical diagnosis.',
    ].join('\n')
  }

  return [
    'Skin is not clearly visible in this image. Please retake for accurate analysis:',
    '- Use natural light with a front-face photo',
    '- Keep face close to camera, no filter/beauty mode',
    '- Keep image sharp with minimal shadow',
    'Safety note: Educational guidance only, not medical diagnosis.',
  ].join('\n')
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: AnalyzeImageRequest = event?.body ? JSON.parse(event.body) : {}
    const imageKey = payload.imageKey?.trim() || ''
    const imageBase64 = payload.imageBase64?.trim() || ''
    const language = normalizedLanguage(payload.language)
    const question =
      payload.question?.trim() ||
      (language === 'hi'
        ? 'इस इमेज से सामान्य स्वास्थ्य संबंधित क्या ध्यान रखना चाहिए?'
        : 'What practical health-related observations can be made from this image?')

    if (!imageKey && !imageBase64) {
      return json(400, { message: 'imageKey or imageBase64 is required.' })
    }

    const modelId =
      process.env.BEDROCK_VISION_MODEL_ID ||
      'amazon.nova-lite-v1:0'

    let imageBytes = Buffer.alloc(0)
    if (imageKey) {
      const uploadsBucket = process.env.CHAT_UPLOADS_BUCKET
      if (!uploadsBucket) {
        return json(500, { message: 'Missing CHAT_UPLOADS_BUCKET environment variable.' })
      }
      const objectResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: uploadsBucket,
          Key: imageKey,
        })
      )
      const bytes = await objectResponse.Body?.transformToByteArray()
      imageBytes = bytes ? Buffer.from(bytes) : Buffer.alloc(0)
    } else {
      imageBytes = Buffer.from(imageBase64, 'base64')
    }
    if (!imageBytes.length) {
      return json(400, { message: 'Invalid image payload.' })
    }

    const format = pickFormat(payload.mediaType)
    const intent = detectVisionIntent(question, language)
    const prompt = buildVisionPrompt(language, question)

    try {
      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId,
          messages: [
            {
              role: 'user',
              content: [
                { text: prompt },
                {
                  image: {
                    format,
                    source: { bytes: imageBytes },
                  },
                },
              ],
            },
          ],
          inferenceConfig: {
            maxTokens: 900,
            temperature: 0.2,
          },
        } as any)
      )

      const contentBlocks = response.output?.message?.content ?? []
      const firstTextBlock = contentBlocks.find(
        (block) => typeof block?.text === 'string' && block.text.trim().length > 0
      )
      const analysis = firstTextBlock?.text?.trim()

      if (!analysis) {
        return json(200, {
          analysis: fallback(language),
          source: 'fallback',
          resultCard: buildResultCard(language, question),
          generatedAt: new Date().toISOString(),
        })
      }

      if (imageKey && process.env.CHAT_UPLOADS_BUCKET) {
        void s3Client
          .send(new DeleteObjectCommand({ Bucket: process.env.CHAT_UPLOADS_BUCKET, Key: imageKey }))
          .catch(() => undefined)
      }

      return json(200, {
        analysis: normalizeVisionOutput(analysis, intent, language),
        source: 'bedrock',
        resultCard: buildResultCard(language, question),
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error)
      console.error('Image analyze Bedrock failed, using fallback.', {
        modelId,
        error: errorDetails,
        errorName: error instanceof Error ? error.name : 'Unknown',
        intent,
        language,
      })
      return json(200, {
        analysis: fallback(language),
        source: 'fallback',
        error: errorDetails,
        resultCard: buildResultCard(language, question),
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
