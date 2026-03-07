import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'
import { Input } from '../../components/ui/Input'
import { NavHint } from '../../components/ui/NavHint'
import { PresenterOverlay } from '../../components/PresenterOverlay'
import type { TourFocusFrame } from '../../components/PresenterOverlay'
import { TypingIndicator } from '../../components/ui/TypingIndicator'
import { executeCoachCommand } from '../coach/actions'
import { coachHelper, coachWelcome } from '../coach/copy'
import { loadCoachMessages, saveCoachMessages } from '../coach/messageStore'
import { archiveCoachSession } from '../coach/sessionStore'
import {
  requestCoachImageAnalysis,
  requestCoachReply,
  uploadCoachImageAndGetKey,
} from '../coach/service'
import type { CoachMessage, CoachResultCard } from '../coach/types'
import { useCoachTranscription } from '../coach/useCoachTranscription'
import { ApiRequestError } from '../../services/api'
import { useAppState } from '../../state/AppState'
import { tk } from '../../lib/i18n'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { DashboardTabParamList } from '../../navigation/types'

const ENCRYPTED_IMAGE_MARKER = '__ENCRYPTED_IMAGE__'

function createMessage(
  role: CoachMessage['role'],
  text: string,
  resultCard?: CoachResultCard
): CoachMessage {
  const now = Date.now()
  return { id: `${now}-${role}`, role, text, createdAt: new Date(now).toISOString(), resultCard }
}

function dayLabel(iso: string, language: 'en' | 'hi') {
  const date = new Date(iso)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return language === 'hi' ? 'आज' : 'Today'
  if (diffDays === 1) return language === 'hi' ? 'कल' : 'Yesterday'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function getCoachErrorMessage(error: unknown, language: 'en' | 'hi') {
  if (error instanceof ApiRequestError) {
    if (error.code === 'CONFIG') {
      return language === 'hi'
        ? 'AI बैकएंड सेट नहीं है। API URL कॉन्फिगर करें।'
        : 'AI backend is not configured yet. Please configure API URL.'
    }
    if (error.code === 'TIMEOUT') {
      return language === 'hi'
        ? 'AI जवाब में देर हो रही है। नेटवर्क जांचकर दोबारा कोशिश करें।'
        : 'AI timed out. Check connection and retry.'
    }
    if (error.code === 'NETWORK') {
      return language === 'hi'
        ? 'इंटरनेट कनेक्शन नहीं मिल रहा। फिर कोशिश करें।'
        : 'Network unavailable. Please retry.'
    }
  }
  return language === 'hi'
    ? 'अभी AI जवाब उपलब्ध नहीं है। फिर से कोशिश करें।'
    : 'AI response is unavailable right now. Please retry.'
}

function confidenceLabel(level: CoachResultCard['confidence'], language: 'en' | 'hi') {
  if (language === 'hi') {
    if (level === 'high') return 'उच्च'
    if (level === 'medium') return 'मध्यम'
    return 'कम'
  }
  if (level === 'high') return 'High'
  if (level === 'medium') return 'Medium'
  return 'Low'
}

export function CoachTab() {
  const navigation = useNavigation<BottomTabNavigationProp<DashboardTabParamList>>()
  const {
    profile,
    symptomLogs,
    reminderLogs,
    upsertMedicationScheduleFromCoach,
    demoTourActive,
    demoTourStep,
    demoTourNarrationEnabled,
    showPresenterOverlay,
    goToDemoTourStep,
    finishDemoTour,
  } = useAppState()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [pendingImage, setPendingImage] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [tourFocusFrame, setTourFocusFrame] = useState<TourFocusFrame | null>(null)
  const welcomeMessage = useMemo(
    () => createMessage('assistant', coachWelcome(profile.language)),
    [profile.language]
  )
  const [messages, setMessages] = useState<CoachMessage[]>([welcomeMessage])
  const scrollRef = useRef<ScrollView>(null)
  const helperText = useMemo(() => coachHelper(profile.language), [profile.language])
  const pushAssistantMessage = (text: string) =>
    setMessages((prev) => [...prev, createMessage('assistant', text)])

  const { isListening, toggleListening } = useCoachTranscription({
    language: profile.language,
    onTranscript: (best) => setInput((prev) => (prev ? `${prev} ${best}`.trim() : best)),
    onAssistantMessage: pushAssistantMessage,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      const stored = await loadCoachMessages(profile.id)
      if (!active) return
      setMessages(stored.length > 0 ? stored : [welcomeMessage])
      setIsHydrated(true)
    })()
    return () => {
      active = false
    }
  }, [profile.id, welcomeMessage])

  useEffect(() => {
    if (!isHydrated) return
    void saveCoachMessages(profile.id, messages)
  }, [isHydrated, messages, profile.id])

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const stored = await loadCoachMessages(profile.id)
        if (stored.length > 0) {
          setMessages(stored)
        }
      })()
    }, [profile.id])
  )

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS !== 'android') return
      const height = Math.max(0, event.endCoordinates?.height ?? 0)
      setKeyboardHeight(height)
      // Scroll to bottom when keyboard opens
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS !== 'android') return
      setKeyboardHeight(0)
    })
    return () => {
      onShow.remove()
      onHide.remove()
    }
  }, [])

  const onPickImage = async () => {
    if (isSending || isAnalyzingImage) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) return
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      })
      if (!picked.canceled && picked.assets?.[0]?.uri) {
        setPendingImage(picked.assets[0])
      }
    } catch {
      // Ignore pick failure UI noise.
    }
  }

  const onSend = async () => {
    const text = input.trim()
    const imageAsset = pendingImage
    if ((!text && !imageAsset) || isSending) return
    setIsSending(true)
    setInput('')
    setPendingImage(null)

    const baseImageText =
      text ||
      (profile.language === 'hi'
        ? 'इमेज भेजी है, कृपया विश्लेषण करें।'
        : 'I shared an image. Please analyze it.')
    const userText = imageAsset ? `${baseImageText}\n${ENCRYPTED_IMAGE_MARKER}` : text
    const userMessage = createMessage('user', userText)
    setMessages((prev) => [...prev, userMessage])

    if (imageAsset) {
      setIsAnalyzingImage(true)
      try {
        const question =
          text ||
          (profile.language === 'hi'
            ? 'इस इमेज से स्वास्थ्य के लिए क्या ध्यान रखना चाहिए?'
            : 'What should I pay attention to in this image for health?')
        const mediaType = imageAsset.mimeType?.startsWith('image/') ? imageAsset.mimeType : 'image/jpeg'
        let imageKey = ''
        let imageBase64Fallback: string | undefined = imageAsset.base64 || undefined
        try {
          imageKey = await uploadCoachImageAndGetKey(profile.id, imageAsset.uri, mediaType)
          imageBase64Fallback = undefined
        } catch {
          if (!imageBase64Fallback) throw new Error('Image upload failed')
        }
        const response = await requestCoachImageAnalysis(
          profile.id,
          profile.language,
          imageKey,
          imageBase64Fallback,
          mediaType,
          question
        )
        setMessages((prev) => [...prev, createMessage('assistant', response.analysis, response.resultCard)])
      } catch (error) {
        const errorMessage = error instanceof Error && error.message === 'Image upload failed'
          ? (profile.language === 'hi'
              ? 'इमेज अपलोड नहीं हो सकी। नेटवर्क चेक करें या छोटी इमेज लें।'
              : 'Image upload failed. Check connection or try a smaller image.')
          : getCoachErrorMessage(error, profile.language === 'hi' ? 'hi' : 'en')
        setMessages((prev) => [
          ...prev,
          createMessage('assistant', errorMessage),
        ])
      } finally {
        setIsAnalyzingImage(false)
        setIsSending(false)
      }
      return
    }

    const actionResult = await executeCoachCommand(text, profile.language, upsertMedicationScheduleFromCoach)
    if (actionResult.handled) {
      setMessages((prev) => [...prev, createMessage('assistant', actionResult.reply)])
      setIsSending(false)
      return
    }

    try {
      const response = await requestCoachReply(profile, text, [...messages, userMessage], symptomLogs, reminderLogs)
      if (__DEV__) {
        console.log('[Coach] AI Response source:', response.source)
      }
      setMessages((prev) => [...prev, createMessage('assistant', response.reply, response.resultCard)])
    } catch (error) {
      if (__DEV__) {
        console.log('[Coach] AI Error:', error)
      }
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', getCoachErrorMessage(error, profile.language === 'hi' ? 'hi' : 'en')),
      ])
    } finally {
      setIsSending(false)
    }
  }

  const onNewChat = () => {
    Alert.alert(
      profile.language === 'hi' ? 'नई चैट शुरू करें?' : 'Start new chat?',
      profile.language === 'hi'
        ? 'मौजूदा चैट हिस्ट्री History में सेव होकर नई चैट शुरू होगी।'
        : 'Current chat will be saved in History and a new chat will start.',
      [
        { text: profile.language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: profile.language === 'hi' ? 'नई चैट' : 'New chat',
          onPress: () => {
            void (async () => {
              await archiveCoachSession(profile.id, messages)
              setMessages([welcomeMessage])
              setInput('')
              setPendingImage(null)
            })()
          },
        },
      ]
    )
  }

  const onBubbleLongPress = (message: CoachMessage) => {
    const isHindi = profile.language === 'hi'
    Alert.alert(
      isHindi ? 'मैसेज विकल्प' : 'Message options',
      isHindi ? 'क्या करना है?' : 'Choose an action',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        { text: isHindi ? 'कॉपी' : 'Copy', onPress: () => void Clipboard.setStringAsync(message.text) },
      ]
    )
  }

  return (
    <View className="flex-1 bg-[#eef6f2]">
      <View className="flex-row items-center justify-between gap-2 px-4 py-2">
          <Text className="text-[22px] font-extrabold text-[#0f4f5c]">
            {profile.language === 'hi' ? 'कोच' : 'Coach'}
          </Text>
          <Pressable
            onPress={onNewChat}
            className="flex-row items-center gap-1 rounded-full border border-[#d8e5dc] bg-white px-3 py-1.5"
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#334155" />
            <Text className="text-xs font-bold text-[#334155]">
              {profile.language === 'hi' ? 'नई चैट' : 'New chat'}
            </Text>
          </Pressable>
        </View>
        <View className="mx-4 mb-1 rounded-xl border border-[#d5e7de] bg-[#f3faf6] px-3 py-2">
          <Text className="text-[11px] leading-4 text-[#315c4f]">
            {profile.language === 'hi'
              ? 'केवल शैक्षणिक मार्गदर्शन। यह चिकित्सकीय निदान नहीं है।'
              : 'Educational guidance only. This is not a medical diagnosis.'}
          </Text>
        </View>
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-[#eef6f2]"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 30 : 20 }]}
        >
          <View className="gap-1">
            {messages.map((message, index) => {
              const prev = messages[index - 1]
              const lang = profile.language === 'hi' ? 'hi' : 'en'
              const hasEncryptedImage = message.text.includes(ENCRYPTED_IMAGE_MARKER)
              const visibleText = message.text.replace(`\n${ENCRYPTED_IMAGE_MARKER}`, '').trim()
              const showDayHeader =
                !prev || dayLabel(prev.createdAt, lang) !== dayLabel(message.createdAt, lang)
              return (
                <View key={message.id}>
                  {showDayHeader ? (
                    <View className="my-1 items-center">
                      <Text className="rounded-full bg-[#e5f7ef] px-2.5 py-1 text-[11px] text-[#527366]">
                        {dayLabel(message.createdAt, lang)}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable
                    onLongPress={() => onBubbleLongPress(message)}
                    style={[
                      styles.bubble,
                      message.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    {hasEncryptedImage ? (
                      <View
                        className={`mb-1.5 flex-row items-center gap-1.5 rounded-[10px] border px-2.5 py-2 ${
                          message.role === 'assistant'
                            ? 'border-[#d5e4dd] bg-[#eef8f3]'
                            : 'border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.16)]'
                        }`}
                      >
                        <MaterialCommunityIcons
                          name="image-lock-outline"
                          size={14}
                          color={message.role === 'assistant' ? '#335a67' : '#ecfeff'}
                        />
                        <Text
                          style={[
                            { fontSize: 11, fontWeight: '600' },
                            message.role === 'assistant'
                              ? styles.assistantBubbleText
                              : styles.userBubbleText,
                          ]}
                        >
                          {profile.language === 'hi' ? 'एन्क्रिप्टेड इमेज अटैच है' : 'Encrypted image attached'}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.bubbleText,
                        message.role === 'assistant' ? styles.assistantBubbleText : styles.userBubbleText,
                      ]}
                    >
                      {visibleText}
                    </Text>
                    <Text
                      style={[
                        styles.timeText,
                        message.role === 'assistant' ? styles.assistantTimeText : styles.userTimeText,
                      ]}
                    >
                      {timeLabel(message.createdAt)}
                    </Text>
                    {message.role === 'assistant' && message.resultCard ? (
                      <View style={styles.resultCard}>
                        <Text style={styles.resultCardTitle}>
                          {profile.language === 'hi' ? 'सुरक्षा सारांश' : 'Safety summary'}
                        </Text>
                        <Text style={styles.resultCardLine}>
                          {profile.language === 'hi' ? 'विश्वास' : 'Confidence'}:{' '}
                          {confidenceLabel(message.resultCard.confidence, profile.language === 'hi' ? 'hi' : 'en')}
                        </Text>
                        <Text style={styles.resultCardLine}>
                          {profile.language === 'hi' ? 'अगला कदम' : 'Next action'}:{' '}
                          {message.resultCard.nextAction}
                        </Text>
                        <Text style={styles.resultCardDisclaimer}>{message.resultCard.disclaimer}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              )
            })}
            {isAnalyzingImage ? (
              <TypingIndicator text={profile.language === 'hi' ? 'इमेज देख रहा हूँ...' : 'Analyzing image...'} />
            ) : isSending ? (
              <TypingIndicator text={tt('typingText')} />
            ) : null}
          </View>
          <Text className="mt-1 text-xs text-[#5f7f72]">{helperText}</Text>
        </ScrollView>

        <View
          className="border-t border-[#d8e5dc] bg-[#f8fcfa]"
          style={[
            { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
            Platform.OS === 'android' && keyboardHeight > 0
              ? { position: 'absolute', bottom: keyboardHeight - 50, left: 0, right: 0 }
              : undefined,
          ]}
          onLayout={(event) => setTourFocusFrame(event.nativeEvent.layout)}
        >
          {pendingImage ? (
            <Pressable
              onPress={() => setPendingImage(null)}
              className="mb-1.5 self-start"
              accessibilityRole="button"
              accessibilityLabel={profile.language === 'hi' ? 'इमेज हटाएं' : 'Remove image'}
            >
              <View className="rounded-[12px] border border-[#d4deee] bg-white p-1">
                <Image source={{ uri: pendingImage.uri }} style={styles.pendingImagePreview} resizeMode="cover" />
                <View className="absolute right-0.5 top-0.5 rounded-full bg-[rgba(15,23,42,0.72)] p-0.5">
                  <MaterialCommunityIcons name="close" size={12} color="#ffffff" />
                </View>
              </View>
            </Pressable>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-[#d8e5dc] bg-white"
              onPress={() => void onPickImage()}
              disabled={isSending || isAnalyzingImage}
            >
              <MaterialCommunityIcons name="image-plus-outline" size={20} color="#334155" />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-[#d8e5dc] bg-white"
              onPress={toggleListening}
              disabled={isSending}
            >
              <MaterialCommunityIcons
                name={isListening ? 'microphone' : 'microphone-outline'}
                size={20}
                color={isListening ? '#0f766e' : '#334155'}
              />
            </Pressable>
            <View className="flex-1">
              <Input
                value={input}
                placeholder={profile.language === 'hi' ? 'मैसेज लिखें...' : 'Type your message...'}
                onChangeText={setInput}
                className="py-2"
              />
            </View>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-[#14b8a6]"
              onPress={() => void onSend()}
              disabled={isSending}
            >
              <MaterialCommunityIcons
                name={isSending ? 'timer-sand' : 'send'}
                size={18}
                color={isSending ? '#ccfbf1' : '#ffffff'}
              />
            </Pressable>
          </View>
        </View>
        {demoTourActive && demoTourStep === 'coach' && showPresenterOverlay ? (
          <PresenterOverlay
            stepLabel={profile.language === 'hi' ? 'Step 3 of 5' : 'Step 3 of 5'}
            title={profile.language === 'hi' ? 'Coach' : 'Coach'}
            script={
              profile.language === 'hi'
                ? 'यहाँ user text, image और Hindi commands से AI सहायता मिलती है, और safety summary दिखती है। अब clinician handoff पर चलते हैं।'
                : 'This is the AI assistant for text, image, and Hindi commands with safety summary. Next, we move to clinician handoff.'
            }
            backLabel={profile.language === 'hi' ? 'Back: Reminders' : 'Back: Reminders'}
            onPressBack={() => {
              goToDemoTourStep('reminders')
              navigation.navigate('Reminders')
            }}
            ctaLabel={profile.language === 'hi' ? 'Next: Provider Handoff' : 'Next: Provider Handoff'}
            onPressCta={() => {
              goToDemoTourStep('provider')
              ;(navigation as any).navigate('ProviderHandoff')
            }}
            onPressSkip={finishDemoTour}
            skipLabel={profile.language === 'hi' ? 'Skip demo' : 'Skip demo'}
            undimmedBottomHeight={0}
            stepIndex={3}
            totalSteps={5}
            narrationEnabled={demoTourNarrationEnabled}
            narrationLanguage={profile.language}
          />
        ) : null}
      </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  bubble: { maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e5dc',
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#14b8a6' },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  timeText: { marginTop: 6, fontSize: 10 },
  assistantBubbleText: { color: '#1f3d35' },
  userBubbleText: { color: '#ffffff' },
  assistantTimeText: { color: '#6a7f75' },
  userTimeText: { color: '#d1fae5' },
  pendingImagePreview: { width: 56, height: 56, borderRadius: 10 },
  resultCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cfe4dc',
    backgroundColor: '#f4fbf8',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  resultCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f4f43',
    marginBottom: 3,
  },
  resultCardLine: {
    fontSize: 11,
    lineHeight: 16,
    color: '#2f5f53',
  },
  resultCardDisclaimer: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: '#4f746a',
  },
})
