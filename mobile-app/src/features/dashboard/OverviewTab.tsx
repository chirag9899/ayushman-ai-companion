import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card } from '../../components/ui/Card'
import { MascotAvatar } from '../../components/MascotAvatar'
import { PresenterOverlay } from '../../components/PresenterOverlay'
import type { TourFocusFrame } from '../../components/PresenterOverlay'
import { tk } from '../../lib/i18n'
import { getTodayReminders } from '../../lib/profile'
import { useAppState } from '../../state/AppState'
import { useNavigation } from '@react-navigation/native'
import type { DashboardTabParamList } from '../../navigation/types'
import type { HealthInsight, WeeklySummary } from '../../features/coach/insights'
import {
  getHealthInsights,
  getWeeklySummary,
  logProteinIntake,
  logWaterIntake,
} from '../../features/coach/memoryStore'

export function OverviewTab() {
  const navigation = useNavigation<BottomTabNavigationProp<DashboardTabParamList>>()
  const {
    profile,
    reminderLogs,
    symptomLogs,
    dailyTip,
    refreshTip,
    demoTourActive,
    demoTourStep,
    demoTourNarrationEnabled,
    showPresenterOverlay,
    goToDemoTourStep,
    finishDemoTour,
  } = useAppState()
  const tabBarHeight = useBottomTabBarHeight()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [insights, setInsights] = useState<HealthInsight[]>([])
  const [tourFocusFrame, setTourFocusFrame] = useState<TourFocusFrame | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Load weekly summary and insights
  useEffect(() => {
    async function loadData() {
      const summary = await getWeeklySummary(profile.id, symptomLogs, reminderLogs, profile)
      const activeInsights = await getHealthInsights(profile.id)
      setWeeklySummary(summary)
      setInsights(activeInsights)
    }
    loadData()
  }, [profile.id, symptomLogs, reminderLogs, profile])

  // Log today's intake when profile updates
  useEffect(() => {
    if (profile.habits.waterIntakeGlasses) {
      logWaterIntake(profile.id, profile.habits.waterIntakeGlasses)
    }
    if (profile.habits.proteinIntakeG) {
      logProteinIntake(profile.id, profile.habits.proteinIntakeG)
    }
  }, [profile.id, profile.habits.waterIntakeGlasses, profile.habits.proteinIntakeG])

  const reminders = getTodayReminders(profile)
  const takenToday = reminderLogs.filter((log) => log.status === 'taken').length
  const pending = Math.max(0, reminders.length - takenToday)

  const proteinTarget = profile.habits.proteinTargetG || 0
  const proteinIntake = profile.habits.proteinIntakeG || 0
  const proteinProgress = proteinTarget > 0 ? Math.min(1, proteinIntake / proteinTarget) : 0

  const hydrationTarget = 8
  const waterGlasses = profile.habits.waterIntakeGlasses || 0
  const hydrationProgress = Math.min(1, waterGlasses / hydrationTarget)

  const allDone = pending === 0 && reminders.length > 0

  // Weekly stats
  const weeklyAdherence = weeklySummary?.adherenceRate || 0
  const weeklySymptoms = weeklySummary?.symptomCount || 0
  const weeklyHydration = weeklySummary?.hydrationAvg || 0

  useEffect(() => {
    if (!demoTourActive || demoTourStep !== 'overview' || !tourFocusFrame) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, tourFocusFrame.y - 60), animated: true })
    }, 140)
    return () => clearTimeout(timer)
  }, [demoTourActive, demoTourStep, tourFocusFrame])

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 16 }]}
      >
      {/* Status Hero */}
      <View
        style={styles.hero}
        onLayout={(event) => setTourFocusFrame(event.nativeEvent.layout)}
      >
        <MascotAvatar mood={allDone ? 'happy' : pending > 0 ? 'alert' : 'thinking'} size={72} />
        <Text style={styles.greeting}>
          {allDone
            ? tt('allDone')
            : pending > 0
              ? `${pending} ${tt('pending')}`
              : tt('startYourDay')}
        </Text>
        <Text style={styles.subGreeting}>
          {reminders.length > 0
            ? `${takenToday}/${reminders.length} ${tt('completed')}`
            : tt('noRemindersSet')}
        </Text>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#e0f2fe' }]}>
          <MaterialCommunityIcons name="water" size={24} color="#0284c7" />
          <Text style={styles.statNumber}>{waterGlasses}/{hydrationTarget}</Text>
          <Text style={styles.statLabel}>{tt('glasses')}</Text>
          <View style={styles.miniProgressTrack}>
            <View style={[styles.miniProgressFill, { width: `${hydrationProgress * 100}%`, backgroundColor: '#0284c7' }]} />
          </View>
        </View>

        <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
          <MaterialCommunityIcons name="food-steak" size={24} color="#16a34a" />
          <Text style={styles.statNumber}>{proteinIntake}g</Text>
          <Text style={styles.statLabel}>{tt('protein')}</Text>
          <View style={styles.miniProgressTrack}>
            <View style={[styles.miniProgressFill, { width: `${proteinProgress * 100}%`, backgroundColor: '#16a34a' }]} />
          </View>
        </View>

        <View style={[styles.statBox, { backgroundColor: allDone ? '#f0fdf4' : pending > 0 ? '#fef2f2' : '#f8fafc' }]}>
          <MaterialCommunityIcons name="pill" size={24} color={allDone ? '#16a34a' : pending > 0 ? '#dc2626' : '#64748b'} />
          <Text style={styles.statNumber}>{takenToday}/{reminders.length}</Text>
          <Text style={styles.statLabel}>{tt('medicines')}</Text>
          <Text style={[styles.statStatus, { color: allDone ? '#16a34a' : pending > 0 ? '#dc2626' : '#64748b' }]}>
            {allDone ? tt('done') : pending > 0 ? `${pending} ${tt('pending')}` : tt('none')}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: '#0f766e' }]}
          onPress={() => navigation.navigate('Reminders')}
        >
          <MaterialCommunityIcons name="pill" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{tt('takeMedicine')}</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
          onPress={() => navigation.navigate('Coach')}
        >
          <MaterialCommunityIcons name="message-text" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{tt('askCoach')}</Text>
        </Pressable>
      </View>

      {/* Weekly Health Summary Card */}
      {weeklySummary && (
        <Card>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#0f766e" />
            <Text style={styles.sectionTitle}>{tt('weeklySummary')}</Text>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>{tt('last7Days')}</Text>
            </View>
          </View>

          <View style={styles.weeklyStatsRow}>
            <View style={styles.weeklyStat}>
              <Text style={[styles.weeklyStatNumber, { color: weeklyAdherence >= 80 ? '#16a34a' : weeklyAdherence >= 50 ? '#f59e0b' : '#dc2626' }]}>
                {weeklyAdherence}%
              </Text>
              <Text style={styles.weeklyStatLabel}>{tt('adherence')}</Text>
            </View>
            <View style={styles.weeklyStatDivider} />
            <View style={styles.weeklyStat}>
              <Text style={[styles.weeklyStatNumber, { color: weeklySymptoms === 0 ? '#16a34a' : '#f59e0b' }]}>
                {weeklySymptoms}
              </Text>
              <Text style={styles.weeklyStatLabel}>{tt('symptoms')}</Text>
            </View>
            <View style={styles.weeklyStatDivider} />
            <View style={styles.weeklyStat}>
              <Text style={[styles.weeklyStatNumber, { color: weeklyHydration >= 6 ? '#16a34a' : '#0284c7' }]}>
                {weeklyHydration}
              </Text>
              <Text style={styles.weeklyStatLabel}>{tt('avgGlasses')}</Text>
            </View>
          </View>

          {/* Top Symptoms This Week */}
          {weeklySummary.topSymptoms.length > 0 && (
            <View style={styles.topSymptomsContainer}>
              <Text style={styles.topSymptomsLabel}>{tt('topSymptomsThisWeek')}:</Text>
              <View style={styles.topSymptomsRow}>
                {weeklySummary.topSymptoms.map((symptom, idx) => (
                  <View key={idx} style={styles.symptomTag}>
                    <Text style={styles.symptomTagText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Health Insights */}
      {insights.length > 0 && (
        <Card>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="brain" size={20} color="#0f766e" />
            <Text style={styles.sectionTitle}>{tt('healthInsights')}</Text>
          </View>
          {insights.slice(0, 3).map((insight) => (
            <View
              key={insight.id}
              style={[
                styles.insightRow,
                {
                  backgroundColor:
                    insight.severity === 'positive'
                      ? '#f0fdf4'
                      : insight.severity === 'warning'
                        ? '#fef2f2'
                        : '#f8fafc',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  insight.severity === 'positive'
                    ? 'check-circle'
                    : insight.severity === 'warning'
                      ? 'alert-circle'
                      : 'information'
                }
                size={18}
                color={
                  insight.severity === 'positive'
                    ? '#16a34a'
                    : insight.severity === 'warning'
                      ? '#dc2626'
                      : '#64748b'
                }
              />
              <View style={styles.insightTextContainer}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Daily Tip Card */}
      <Card>
        <View style={styles.tipHeader}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#0f766e" />
          <Text style={styles.tipTitle}>{tt('todayTip')}</Text>
          <Pressable onPress={refreshTip} style={styles.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={18} color="#64748b" />
          </Pressable>
        </View>
        <Text style={styles.tipText}>{dailyTip}</Text>
      </Card>
      </ScrollView>
      {demoTourActive && demoTourStep === 'overview' && showPresenterOverlay ? (
        <PresenterOverlay
          stepLabel={profile.language === 'hi' ? 'Step 1 of 5' : 'Step 1 of 5'}
          title={profile.language === 'hi' ? 'Overview' : 'Overview'}
          script={
            profile.language === 'hi'
              ? 'यह स्क्रीन personalized health status, adherence और weekly insights दिखाती है। अब reminders flow दिखाते हैं।'
              : 'This screen presents personalized health status, adherence, and weekly insights. Next, we show the reminders flow.'
          }
          ctaLabel={profile.language === 'hi' ? 'Next: Reminders' : 'Next: Reminders'}
          onPressCta={() => {
            goToDemoTourStep('reminders')
            navigation.navigate('Reminders')
          }}
          onPressSkip={finishDemoTour}
          skipLabel={profile.language === 'hi' ? 'Skip demo' : 'Skip demo'}
          undimmedBottomHeight={0}
          stepIndex={1}
          totalSteps={5}
          narrationEnabled={demoTourNarrationEnabled}
          narrationLanguage={profile.language}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef6f2',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f4f5c',
    textAlign: 'center',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6b8793',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  statStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f4f5c',
  },
  weekBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  weekBadgeText: {
    fontSize: 10,
    color: '#0284c7',
    fontWeight: '600',
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  weeklyStat: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyStatNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  weeklyStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  weeklyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  topSymptomsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  topSymptomsLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  topSymptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  symptomTagText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightTextContainer: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  insightDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f4f5c',
  },
  refreshBtn: {
    padding: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
})
