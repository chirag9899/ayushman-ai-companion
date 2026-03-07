import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PresenterOverlay } from '../../components/PresenterOverlay'
import type { TourFocusFrame } from '../../components/PresenterOverlay'
import { useAppState } from '../../state/AppState'
import { buildDoctorHandoffSnapshot, buildDoctorHandoffSummary } from './handoffSummary'

export function ProviderHandoffScreen() {
  const {
    profile,
    symptomLogs,
    reminderLogs,
    demoTourActive,
    demoTourStep,
    demoTourNarrationEnabled,
    showPresenterOverlay,
    goToDemoTourStep,
    finishDemoTour,
  } = useAppState()
  const navigation = useNavigation<any>()
  const [windowDays, setWindowDays] = useState<7 | 30>(7)
  const [tourFocusFrame, setTourFocusFrame] = useState<TourFocusFrame | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const isHindi = profile.language === 'hi'

  const snapshot = useMemo(
    () =>
      buildDoctorHandoffSnapshot({
        profile,
        symptomLogs,
        reminderLogs,
        windowDays,
      }),
    [profile, reminderLogs, symptomLogs, windowDays]
  )

  const summaryText = useMemo(
    () =>
      buildDoctorHandoffSummary({
        profile,
        symptomLogs,
        reminderLogs,
        windowDays,
      }),
    [profile, reminderLogs, symptomLogs, windowDays]
  )

  const exportSummary = async () => {
    if (!(await Sharing.isAvailableAsync())) return
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
    if (!baseDir) return
    const fileUri = `${baseDir}provider-handoff-${windowDays}d-${Date.now()}.txt`
    await FileSystem.writeAsStringAsync(fileUri, summaryText, {
      encoding: FileSystem.EncodingType.UTF8,
    })
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: isHindi
        ? `डॉक्टर हैंडऑफ सारांश (${windowDays} दिन)`
        : `Provider handoff summary (${windowDays} days)`,
    })
  }

  const topSymptoms = snapshot.topSymptoms
    .map(([symptom, count]) => `${symptom} (${count})`)
    .join(', ')

  useEffect(() => {
    if (!demoTourActive || demoTourStep !== 'provider' || !tourFocusFrame) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, tourFocusFrame.y - 40), animated: true })
    }, 140)
    return () => clearTimeout(timer)
  }, [demoTourActive, demoTourStep, tourFocusFrame])

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <View onLayout={(event) => setTourFocusFrame(event.nativeEvent.layout)}>
      <Card title={isHindi ? 'Provider Handoff Mode' : 'Provider Handoff Mode'}>
        <Text style={styles.subtitle}>
          {isHindi
            ? 'डॉक्टर/क्लिनिशियन के लिए कॉम्पैक्ट समरी, रिस्क फ्लैग्स और टाइमलाइन।'
            : 'Compact clinician-ready summary with risk flags, adherence, and timeline.'}
        </Text>
        <View style={styles.row}>
          <Button
            variant={windowDays === 7 ? 'primary' : 'secondary'}
            style={styles.flexButton}
            onPress={() => setWindowDays(7)}
          >
            Last 7 days
          </Button>
          <Button
            variant={windowDays === 30 ? 'primary' : 'secondary'}
            style={styles.flexButton}
            onPress={() => setWindowDays(30)}
          >
            Last 30 days
          </Button>
        </View>
      </Card>
      </View>

      <Card title={isHindi ? 'Patient Snapshot' : 'Patient Snapshot'}>
        <Text style={styles.line}>Patient ID: {profile.id}</Text>
        <Text style={styles.line}>
          Conditions:{' '}
          {profile.medicalHistory.conditions.length > 0
            ? profile.medicalHistory.conditions.join(', ')
            : 'None listed'}
        </Text>
        <Text style={styles.line}>
          Current symptoms: {profile.currentSymptoms.trim() || 'Not specified'}
        </Text>
        <Text style={styles.line}>
          Top symptom patterns: {topSymptoms || 'No repeated pattern'}
        </Text>
      </Card>

      <Card title={isHindi ? 'Risk & Adherence' : 'Risk & Adherence'}>
        <Text style={styles.line}>Adherence: {snapshot.reminderStats.adherencePct ?? 'n/a'}%</Text>
        <Text style={styles.line}>
          Reminder actions: {snapshot.reminderStats.totalActions} (taken {snapshot.reminderStats.taken},
          snoozed {snapshot.reminderStats.snoozed}, missed {snapshot.reminderStats.missed})
        </Text>
        <Text style={styles.line}>
          Avg severity: {snapshot.averageSeverity ?? 'n/a'} / 5 from {snapshot.scopedSymptoms.length} logs
        </Text>
        {snapshot.redFlags.length > 0 ? (
          <View style={styles.flagsBox}>
            <Text style={styles.flagsTitle}>{isHindi ? 'Red flags' : 'Red flags'}</Text>
            {snapshot.redFlags.map((flag, index) => (
              <Text key={`${flag}-${index}`} style={styles.flagItem}>
                - {flag}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.line}>No major red flags detected in this window.</Text>
        )}
      </Card>

      <Card title={isHindi ? 'Latest Readings' : 'Latest Readings'}>
        <Text style={styles.line}>
          Blood sugar:{' '}
          {typeof snapshot.latestReadings.bloodSugar === 'number'
            ? `${snapshot.latestReadings.bloodSugar} mg/dL`
            : 'n/a'}
        </Text>
        <Text style={styles.line}>
          Blood pressure:{' '}
          {typeof snapshot.latestReadings.bloodPressureSystolic === 'number' &&
          typeof snapshot.latestReadings.bloodPressureDiastolic === 'number'
            ? `${snapshot.latestReadings.bloodPressureSystolic}/${snapshot.latestReadings.bloodPressureDiastolic} mmHg`
            : 'n/a'}
        </Text>
        <Text style={styles.line}>
          Weight:{' '}
          {typeof snapshot.latestReadings.weight === 'number'
            ? `${snapshot.latestReadings.weight} kg`
            : 'n/a'}
        </Text>
        <Text style={styles.line}>
          Temperature:{' '}
          {typeof snapshot.latestReadings.temperature === 'number'
            ? `${snapshot.latestReadings.temperature} C`
            : 'n/a'}
        </Text>
      </Card>

      <Card title={isHindi ? 'Timeline' : 'Timeline'}>
        <Text style={styles.timeline}>{snapshot.timeline || 'No events available.'}</Text>
      </Card>

      <Card title={isHindi ? 'Share for consult' : 'Share for consult'}>
        <Text style={styles.subtitle}>
          {isHindi
            ? 'एक टैप में डॉक्टर-फ्रेंडली हैंडऑफ समरी शेयर करें।'
            : 'Share a doctor-friendly handoff summary in one tap.'}
        </Text>
        <View style={styles.spacer} />
        <Button onPress={() => void exportSummary()}>
          {isHindi ? 'हैंडऑफ समरी एक्सपोर्ट करें' : 'Export handoff summary'}
        </Button>
      </Card>
      </ScrollView>
      {demoTourActive && demoTourStep === 'provider' && showPresenterOverlay ? (
        <PresenterOverlay
          stepLabel={isHindi ? 'Step 4 of 5' : 'Step 4 of 5'}
          title={isHindi ? 'Provider Handoff' : 'Provider Handoff'}
          script={
            isHindi
              ? 'यहां clinician-ready summary, red flags और adherence दिखते हैं। अब evaluation scorecard दिखाते हैं।'
              : 'This view shows clinician-ready summary, red flags, and adherence. Next, show the evaluation scorecard.'
          }
          backLabel={isHindi ? 'Back: Coach' : 'Back: Coach'}
          onPressBack={() => {
            goToDemoTourStep('coach')
            navigation.navigate('Dashboard', { screen: 'Coach' })
          }}
          ctaLabel={isHindi ? 'Next: Synthetic Evaluation' : 'Next: Synthetic Evaluation'}
          onPressCta={() => {
            goToDemoTourStep('evaluation')
            navigation.navigate('SyntheticEvaluation')
          }}
          onPressSkip={finishDemoTour}
          skipLabel={isHindi ? 'Skip demo' : 'Skip demo'}
          stepIndex={4}
          totalSteps={5}
          narrationEnabled={demoTourNarrationEnabled}
          narrationLanguage={profile.language}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef6f2' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#5f7580' },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  flexButton: { flex: 1 },
  line: { fontSize: 13, lineHeight: 20, color: '#1f3d35', marginBottom: 4 },
  flagsBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0c2c2',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  flagsTitle: { fontSize: 12, fontWeight: '700', color: '#a42323', marginBottom: 4 },
  flagItem: { fontSize: 12, lineHeight: 18, color: '#7a1a1a' },
  timeline: { fontSize: 12, lineHeight: 19, color: '#35505a' },
  spacer: { height: 10 },
})

