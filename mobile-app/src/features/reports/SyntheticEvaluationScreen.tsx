import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PresenterOverlay } from '../../components/PresenterOverlay'
import type { TourFocusFrame } from '../../components/PresenterOverlay'
import { converseCoach } from '../../services/api'
import { useAppState } from '../../state/AppState'
import { evaluateCaseResponse, summarizeEvaluations, type CaseEvaluation } from './evaluation'
import { syntheticCases } from './syntheticCases'

const concurrency = 3

type CaseRunResult = {
  caseId: string
  prompt: string
  score: number
  passed: boolean
  notes: string
  source: 'bedrock' | 'fallback' | 'error'
}

export function SyntheticEvaluationScreen() {
  const {
    profile,
    demoTourActive,
    demoTourStep,
    showPresenterOverlay,
    demoTourNarrationEnabled,
    goToDemoTourStep,
    finishDemoTour,
  } = useAppState()
  const navigation = useNavigation<any>()
  const isHindi = profile.language === 'hi'
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [caseResults, setCaseResults] = useState<CaseRunResult[]>([])
  const [summaryResults, setSummaryResults] = useState<CaseEvaluation[]>([])
  const [runAt, setRunAt] = useState<string | null>(null)
  const [errorText, setErrorText] = useState('')
  const [tourFocusFrame, setTourFocusFrame] = useState<TourFocusFrame | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const summary = useMemo(() => summarizeEvaluations(summaryResults), [summaryResults])

  useEffect(() => {
    if (!demoTourActive || demoTourStep !== 'evaluation' || !tourFocusFrame) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, tourFocusFrame.y - 40), animated: true })
    }, 140)
    return () => clearTimeout(timer)
  }, [demoTourActive, demoTourStep, tourFocusFrame])

  const runEvaluation = async () => {
    setRunning(true)
    setProgress(0)
    setCaseResults([])
    setSummaryResults([])
    setErrorText('')
    const total = syntheticCases.length
    let done = 0

    const nextResults: CaseRunResult[] = []
    const nextEval: CaseEvaluation[] = []

    const worker = async (startIndex: number) => {
      for (let index = startIndex; index < total; index += concurrency) {
        const testCase = syntheticCases[index]
        try {
          const response = await converseCoach({
            message: testCase.prompt,
            language: testCase.language,
            profile: {
              demographics: profile.demographics,
              habits: profile.habits,
              conditions: profile.medicalHistory.conditions,
              medications: profile.medications.map((item) => ({ name: item.name, dosage: item.dosage })),
              currentSymptoms: profile.currentSymptoms,
            },
            history: [],
          })

          const evalResult = evaluateCaseResponse(testCase, response.reply, response.resultCard)
          nextEval.push(evalResult)
          nextResults.push({
            caseId: testCase.id,
            prompt: testCase.prompt,
            score: evalResult.score,
            passed: evalResult.passed,
            notes: evalResult.notes,
            source: response.source,
          })
        } catch (error) {
          nextResults.push({
            caseId: testCase.id,
            prompt: testCase.prompt,
            score: 0,
            passed: false,
            notes: error instanceof Error ? error.message : 'request failed',
            source: 'error',
          })
          nextEval.push({
            caseId: testCase.id,
            passed: false,
            score: 0,
            safetyOk: false,
            urgentRoutingOk: false,
            actionableOk: false,
            hallucinationFlag: false,
            notes: 'request failed',
          })
        } finally {
          done += 1
          setProgress(Math.round((done / total) * 100))
          setCaseResults([...nextResults].sort((a, b) => a.caseId.localeCompare(b.caseId)))
          setSummaryResults([...nextEval].sort((a, b) => a.caseId.localeCompare(b.caseId)))
        }
      }
    }

    try {
      await Promise.all([...Array(concurrency)].map((_, idx) => worker(idx)))
      setRunAt(new Date().toISOString())
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Evaluation failed')
    } finally {
      setRunning(false)
    }
  }

  const exportReport = async () => {
    if (!(await Sharing.isAvailableAsync())) return
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
    if (!baseDir) return
    const payload = {
      generatedAt: runAt || new Date().toISOString(),
      summary,
      cases: caseResults,
      note: 'Synthetic/public prompts only. Prototype evaluation for hackathon demo.',
    }
    const fileUri = `${baseDir}synthetic-evaluation-report-${Date.now()}.json`
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    })
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: isHindi ? 'सिंथेटिक इवैल्युएशन रिपोर्ट' : 'Synthetic evaluation report',
    })
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <Card title={isHindi ? 'सिंथेटिक इवैल्युएशन सूट' : 'Synthetic Evaluation Suite'}>
        <Text style={styles.subtitle}>
          {isHindi
            ? '30 सिंथेटिक केस पर AI सुरक्षा, एक्शन और रूटिंग टेस्ट।'
            : 'Run 30 synthetic cases for safety, actionability, and urgent-care routing checks.'}
        </Text>
        <View style={styles.spacer} />
        <Button onPress={() => void runEvaluation()} disabled={running}>
          {running
            ? `${isHindi ? 'चल रहा है' : 'Running'}... ${progress}%`
            : isHindi
            ? 'इवैल्युएशन रन करें'
            : 'Run evaluation'}
        </Button>
        <View style={styles.spacerSm} />
        <Button variant="secondary" onPress={() => void exportReport()} disabled={caseResults.length === 0}>
          {isHindi ? 'रिपोर्ट एक्सपोर्ट करें' : 'Export report'}
        </Button>
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </Card>

      <View onLayout={(event) => setTourFocusFrame(event.nativeEvent.layout)}>
      <Card title={isHindi ? 'स्कोरकार्ड' : 'Scorecard'}>
        <Text style={styles.metric}>Cases: {summary.totalCases}</Text>
        <Text style={styles.metric}>Pass rate: {summary.passRate}%</Text>
        <Text style={styles.metric}>Avg score: {summary.avgScore}/100</Text>
        <Text style={styles.metric}>Safety rate: {summary.safetyRate}%</Text>
        <Text style={styles.metric}>Urgent routing accuracy: {summary.urgentRoutingAccuracy}%</Text>
        <Text style={styles.metric}>Actionability rate: {summary.actionabilityRate}%</Text>
        <Text style={styles.metric}>Hallucination risk rate: {summary.hallucinationRate}%</Text>
        {runAt ? (
          <Text style={styles.small}>
            Last run: {new Date(runAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        ) : null}
      </Card>
      </View>

      <Card title={isHindi ? 'केस रिजल्ट (टॉप 10)' : 'Case results (top 10)'}>
        {caseResults.slice(0, 10).map((item) => (
          <View key={item.caseId} style={styles.caseRow}>
            <Text style={styles.caseTitle}>
              {item.caseId} • {item.passed ? 'PASS' : 'FAIL'} • {item.score}
            </Text>
            <Text style={styles.caseNote}>{item.notes}</Text>
          </View>
        ))}
        {caseResults.length === 0 ? (
          <Text style={styles.small}>{isHindi ? 'अभी कोई रिजल्ट नहीं।' : 'No results yet.'}</Text>
        ) : null}
      </Card>
      </ScrollView>
      {demoTourActive && demoTourStep === 'evaluation' && showPresenterOverlay ? (
        <PresenterOverlay
          stepLabel={isHindi ? 'Step 5 of 5' : 'Step 5 of 5'}
          title={isHindi ? 'Synthetic Evaluation' : 'Synthetic Evaluation'}
          script={
            isHindi
              ? 'यह benchmark proof दिखाता है कि solution safety, routing और actionability को measurable तरीके से score करता है।'
              : 'This benchmark proves the solution scores safety, routing, and actionability in a measurable way.'
          }
          backLabel={isHindi ? 'Back: Handoff' : 'Back: Handoff'}
          onPressBack={() => {
            goToDemoTourStep('provider')
            navigation.navigate('ProviderHandoff')
          }}
          ctaLabel={isHindi ? 'Finish demo tour' : 'Finish demo tour'}
          onPressCta={finishDemoTour}
          onPressSkip={finishDemoTour}
          skipLabel={isHindi ? 'Skip demo' : 'Skip demo'}
          stepIndex={5}
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
  subtitle: { fontSize: 13, lineHeight: 19, color: '#45606b' },
  spacer: { height: 12 },
  spacerSm: { height: 8 },
  error: { marginTop: 8, fontSize: 12, color: '#b91c1c' },
  metric: { fontSize: 13, color: '#0f4f5c', marginBottom: 4, fontWeight: '600' },
  small: { marginTop: 6, fontSize: 12, color: '#64748b' },
  caseRow: {
    borderWidth: 1,
    borderColor: '#d7e6e0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#f8fdff',
  },
  caseTitle: { fontSize: 12, fontWeight: '700', color: '#0f4f5c' },
  caseNote: { marginTop: 3, fontSize: 11, color: '#58717a' },
})

