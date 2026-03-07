export type CoachRole = 'user' | 'assistant'

export type CoachResultCard = {
  confidence: 'low' | 'medium' | 'high'
  nextAction: string
  disclaimer: string
}

export type CoachMessage = {
  id: string
  role: CoachRole
  text: string
  createdAt: string
  pinned?: boolean
  resultCard?: CoachResultCard
}
