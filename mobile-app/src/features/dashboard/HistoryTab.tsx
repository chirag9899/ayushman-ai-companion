import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Card } from '../../components/ui/Card'
import { NavHint } from '../../components/ui/NavHint'
import { HeroHeader } from '../../components/ui/HeroHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Toast } from '../../components/ui/Toast'
import { deleteCoachSession, loadCoachSessions, type CoachSession } from '../coach/sessionStore'
import { saveCoachMessages } from '../coach/messageStore'
import type { DashboardTabParamList } from '../../navigation/types'
import { useAppState } from '../../state/AppState'
import { Input } from '../../components/ui/Input'
import { tk } from '../../lib/i18n'

function prettyTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function compactPreview(text: string) {
  const cleaned = text
    .replace('__ENCRYPTED_IMAGE__', '[image]')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  return cleaned.length > 72 ? `${cleaned.slice(0, 72)}...` : cleaned
}

export function HistoryTab() {
  const { profile } = useAppState()
  const tabBarHeight = useBottomTabBarHeight()
  const navigation = useNavigation<BottomTabNavigationProp<DashboardTabParamList>>()
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)

  const refreshSessions = async () => {
    const stored = await loadCoachSessions(profile.id)
    setSessions(stored)
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const stored = await loadCoachSessions(profile.id)
      if (!active) return
      setSessions(stored)
    })()
    return () => {
      active = false
    }
  }, [profile.id])

  useFocusEffect(
    useCallback(() => {
      void refreshSessions()
    }, [profile.id])
  )

  const filteredSessions = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return sessions
    return sessions.filter((session) => {
      const lastMessage = session.messages[session.messages.length - 1]?.text || ''
      return (
        session.title.toLowerCase().includes(value) ||
        lastMessage.toLowerCase().includes(value)
      )
    })
  }, [query, sessions])

  const onNewChat = async () => {
    await saveCoachMessages(profile.id, [])
    setToast({ message: tt('newChatOpened'), tone: 'success' })
    navigation.navigate('Coach')
  }

  const openSessionInCoach = async (session: CoachSession) => {
    await saveCoachMessages(profile.id, session.messages)
    setToast({ message: tt('sessionOpened'), tone: 'success' })
    navigation.navigate('Coach')
  }

  const onSessionLongPress = (session: CoachSession) => {
    Alert.alert(tt('sessionOptions'), tt('chooseAction'), [
      { text: tt('cancel'), style: 'cancel' },
      { text: tt('restore'), onPress: () => void openSessionInCoach(session) },
      {
        text: tt('delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteCoachSession(profile.id, session.id)
            await refreshSessions()
            setToast({ message: tt('sessionDeleted'), tone: 'success' })
          })()
        },
      },
    ])
  }

  return (
    <ScrollView
      className="flex-1 bg-[#eef6f2]"
      contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: tabBarHeight + 12 }}
    >
      <Card className="py-4">
        <HeroHeader
          title={tt('history')}
          subtitle={tt('historySubtitle')}
          mood="default"
        />
        <View className="mt-2 flex-row items-center gap-2">
          <View className="flex-1">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={tt('searchChats')}
            />
          </View>
          <Pressable
            onPress={() => void onNewChat()}
            className="h-11 w-11 items-center justify-center rounded-xl border border-[#d8e5dc] bg-white"
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#0f766e" />
          </Pressable>
        </View>
      </Card>

      <Card title={tt('coachSessions')}>
        {filteredSessions.length === 0 ? (
          <EmptyState
            icon="chat-outline"
            title={sessions.length === 0 ? tt('noHistoryTitle') : tt('noMatchingChats')}
            subtitle={sessions.length === 0 ? tt('noHistorySubtitle') : tt('tryDifferentSearch')}
          />
        ) : (
          filteredSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => void openSessionInCoach(session)}
              onLongPress={() => onSessionLongPress(session)}
              className="mb-2 rounded-xl border border-[#e6f0f3] bg-[#f8fdff] p-3"
            >
              <Text className="text-sm font-bold text-[#0f4f5c]">{session.title}</Text>
              <Text className="mt-1 text-xs text-[#64748b]">
                {prettyTime(session.createdAt)} | {session.messages.length} messages
              </Text>
              <Text className="mt-1 text-[12px] text-[#335a67]">
                {compactPreview(session.messages[session.messages.length - 1]?.text || '')}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ScrollView>
  )
}
