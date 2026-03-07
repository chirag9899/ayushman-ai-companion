import { useRef, useState } from 'react'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import type { AppLanguage } from '../../types/profile'
import {
  coachTranscriptionError,
  coachTranscriptionPermissionError,
  coachTranscriptionStartError,
} from './copy'

type Args = {
  language: AppLanguage
  onTranscript: (text: string) => void
  onAssistantMessage: (text: string) => void
}

export function useCoachTranscription({ language, onTranscript, onAssistantMessage }: Args) {
  const [isListening, setIsListening] = useState(false)
  const lastFinalTranscriptRef = useRef('')

  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results?.[0]?.transcript?.trim()
    if (!best) return
    if (!event.isFinal) return
    if (best === lastFinalTranscriptRef.current) return
    lastFinalTranscriptRef.current = best
    onTranscript(best)
  })

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false)
  })

  useSpeechRecognitionEvent('error', () => {
    setIsListening(false)
    onAssistantMessage(coachTranscriptionError(language))
  })

  const toggleListening = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop()
      setIsListening(false)
      return
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!permission.granted) {
        onAssistantMessage(coachTranscriptionPermissionError(language))
        return
      }
      lastFinalTranscriptRef.current = ''
      setIsListening(true)
      ExpoSpeechRecognitionModule.start({
        lang: language === 'hi' ? 'hi-IN' : 'en-IN',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        addsPunctuation: true,
      })
    } catch {
      setIsListening(false)
      onAssistantMessage(coachTranscriptionStartError(language))
    }
  }

  return { isListening, toggleListening }
}
