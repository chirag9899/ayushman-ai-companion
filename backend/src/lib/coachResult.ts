type CoachCardConfidence = 'low' | 'medium' | 'high'

export type CoachResultCard = {
  confidence: CoachCardConfidence
  nextAction: string
  disclaimer: string
}

function hasAny(text: string, needles: string[]) {
  const lower = text.toLowerCase()
  return needles.some((needle) => lower.includes(needle))
}

export function buildResultCard(language: 'en' | 'hi', userText: string): CoachResultCard {
  const urgentSignals = [
    'chest pain',
    'breathless',
    'breathing',
    'severe pain',
    'faint',
    'bleeding',
    'high fever',
    'बेहोश',
    'सांस',
    'तेज बुखार',
    'सीने में दर्द',
  ]
  const likelyUrgent = hasAny(userText, urgentSignals)
  const confidence: CoachCardConfidence = likelyUrgent ? 'low' : 'medium'

  if (language === 'hi') {
    return {
      confidence,
      nextAction: likelyUrgent
        ? 'अगर लक्षण गंभीर हों तो तुरंत नजदीकी डॉक्टर/इमरजेंसी से संपर्क करें।'
        : 'अगले 24 घंटे में लक्षण और दवा पालन ट्रैक करें, जरूरत हो तो डॉक्टर से सलाह लें।',
      disclaimer: 'यह शैक्षणिक मार्गदर्शन है, चिकित्सकीय निदान नहीं।',
    }
  }

  return {
    confidence,
    nextAction: likelyUrgent
      ? 'If symptoms are severe or worsening, seek urgent in-person medical care now.'
      : 'Track symptoms and medicine adherence for 24 hours, then follow up with a clinician if needed.',
    disclaimer: 'Educational guidance only, not medical diagnosis.',
  }
}
