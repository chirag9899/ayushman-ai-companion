import { LineChart } from 'react-native-chart-kit'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useMemo, useState } from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MascotAvatar } from '../../components/MascotAvatar'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { tk } from '../../lib/i18n'
import { useAppState } from '../../state/AppState'

const measureTypes = [
  { key: 'pain', label: 'Pain', icon: 'emoticon-sad-outline' as const },
  { key: 'weight', label: 'Weight', icon: 'scale-bathroom' as const },
  { key: 'sugar', label: 'Sugar', icon: 'water-outline' as const },
  { key: 'pressure', label: 'Pressure', icon: 'heart-pulse' as const },
]
type MeasureType = (typeof measureTypes)[number]['key']

export function SymptomsTab() {
  const { profile, symptomLogs, quickAddSymptomLog } = useAppState()
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const [symptoms, setSymptoms] = useState('')
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [weight, setWeight] = useState('')
  const [sugar, setSugar] = useState('')
  const [pressureSys, setPressureSys] = useState('')
  const [pressureDia, setPressureDia] = useState('')
  const [message, setMessage] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureType>('pain')
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const openSheet = () => setSheetOpen(true)
  const closeSheet = () => setSheetOpen(false)

  const chartData = useMemo(() => {
    const recent = symptomLogs.slice(0, 7).reverse()
    return {
      labels: recent.map((log) =>
        new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      ),
      datasets: [
        {
          data: recent.map((log) => log.severity),
        },
      ],
    }
  }, [symptomLogs])

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
      >
        <View style={styles.navHint}>
          <Text style={styles.navHintText}>Log symptoms here daily. Use + button for quick measurements.</Text>
        </View>

        <Card>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Measurements</Text>
              <Text style={styles.heroSub}>Track pain and vitals with a cleaner daily flow.</Text>
            </View>
            <MascotAvatar mood="thinking" size={56} />
          </View>
        </Card>

        <Card title={tt('symptoms')}>
          {symptomLogs.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet.</Text>
          ) : (
            symptomLogs.slice(0, 8).map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logTitleRow}>
                  <View style={styles.logIconWrap}>
                    <MaterialCommunityIcons name="emoticon-sad-outline" size={18} color="#a855f7" />
                  </View>
                  <View style={styles.logTitleTextWrap}>
                    <Text style={styles.logSymptoms}>{log.symptoms}</Text>
                    <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.severityPill}>
                    <Text style={styles.severityPillText}>{tt('symptomSeverity')}: {log.severity}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card title="Trend chart">
          {chartData.labels.length >= 2 ? (
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 64}
              height={220}
              yAxisInterval={1}
              withDots
              withShadow={false}
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: () => '#334155',
                decimalPlaces: 0,
                propsForDots: { r: '4' },
              }}
              bezier
            />
          ) : (
            <Text style={styles.emptyText}>Add at least 2 logs for trend.</Text>
          )}
        </Card>
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.fab, { bottom: Math.max(8, insets.bottom + 6) }]}
        onPress={openSheet}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={closeSheet}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={closeSheet} />
          <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add measurement</Text>
          <Text style={styles.sheetHint}>What do you want to measure?</Text>
          <View style={styles.measureRow}>
            {measureTypes.map((item) => {
              const active = selectedMeasure === item.key
              return (
                <Pressable
                  key={item.key}
                  style={[styles.measureItem, active ? styles.measureItemActive : null]}
                  onPress={() => setSelectedMeasure(item.key as MeasureType)}
                >
                  <View style={[styles.measureIconWrap, active ? styles.measureIconWrapActive : null]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={active ? '#8b5cf6' : '#64748b'}
                    />
                  </View>
                  <Text style={[styles.measureLabel, active ? styles.measureLabelActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {selectedMeasure === 'pain' ? (
            <>
              <Textarea
                value={symptoms}
                placeholder="Describe current symptoms..."
                onChangeText={setSymptoms}
              />
              <Text style={styles.metaText}>
                {tt('symptomSeverity')}: {severity}
              </Text>
              <View style={styles.severityRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    style={styles.flexBtn}
                    variant={severity === value ? 'primary' : 'secondary'}
                    onPress={() => setSeverity(value as 1 | 2 | 3 | 4 | 5)}
                  >
                    {String(value)}
                  </Button>
                ))}
              </View>
              <View style={styles.saveQuickWrap}>
                <Button
                  style={styles.saveQuickButton}
                  onPress={async () => {
                    await quickAddSymptomLog(symptoms, severity)
                    setSymptoms('')
                    setMessage(tt('quickLogSaved'))
                    closeSheet()
                  }}
                >
                  {tt('saveQuickLog')}
                </Button>
              </View>
            </>
          ) : null}

          {selectedMeasure === 'weight' ? (
            <>
              <Input
                value={weight}
                keyboardType="decimal-pad"
                placeholder="Weight in kg (e.g. 64.5)"
                onChangeText={setWeight}
              />
              <View style={styles.saveQuickWrap}>
                <Button
                  style={styles.saveQuickButton}
                  onPress={async () => {
                    const value = weight.trim()
                    if (!value) return
                    await quickAddSymptomLog(`Weight: ${value} kg`, 2)
                    setWeight('')
                    setMessage('Weight saved')
                    closeSheet()
                  }}
                >
                  Save weight
                </Button>
              </View>
            </>
          ) : null}

          {selectedMeasure === 'sugar' ? (
            <>
              <Input
                value={sugar}
                keyboardType="number-pad"
                placeholder="Blood sugar mg/dL (e.g. 128)"
                onChangeText={setSugar}
              />
              <View style={styles.saveQuickWrap}>
                <Button
                  style={styles.saveQuickButton}
                  onPress={async () => {
                    const value = sugar.trim()
                    if (!value) return
                    await quickAddSymptomLog(`Blood sugar: ${value} mg/dL`, 3)
                    setSugar('')
                    setMessage('Sugar reading saved')
                    closeSheet()
                  }}
                >
                  Save sugar
                </Button>
              </View>
            </>
          ) : null}

          {selectedMeasure === 'pressure' ? (
            <>
              <View style={styles.bpRow}>
                <Input
                  style={styles.bpInput}
                  value={pressureSys}
                  keyboardType="number-pad"
                  placeholder="Systolic"
                  onChangeText={setPressureSys}
                />
                <Input
                  style={styles.bpInput}
                  value={pressureDia}
                  keyboardType="number-pad"
                  placeholder="Diastolic"
                  onChangeText={setPressureDia}
                />
              </View>
              <View style={styles.saveQuickWrap}>
                <Button
                  style={styles.saveQuickButton}
                  onPress={async () => {
                    const sys = pressureSys.trim()
                    const dia = pressureDia.trim()
                    if (!sys || !dia) return
                    await quickAddSymptomLog(`Blood pressure: ${sys}/${dia} mmHg`, 3)
                    setPressureSys('')
                    setPressureDia('')
                    setMessage('Blood pressure saved')
                    closeSheet()
                  }}
                >
                  Save pressure
                </Button>
              </View>
            </>
          ) : null}
          </View>
        </View>
      </Modal>
      {message ? <Text style={styles.successText}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ebf1ff' },
  content: { padding: 16, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f4f5c' },
  heroSub: { marginTop: 4, fontSize: 13, color: '#6b8793', lineHeight: 18 },
  metaText: { marginTop: 12, fontSize: 12, color: '#475569' },
  severityRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  flexBtn: { flex: 1 },
  mt12: { marginTop: 12 },
  successText: { marginHorizontal: 8, marginTop: 6, fontSize: 12, color: '#047857', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#475569' },
  logCard: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#f8fdff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6f0f3',
  },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIconWrap: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitleTextWrap: { flex: 1 },
  logTime: { fontSize: 11, color: '#7a8fa0', marginTop: 3 },
  logSymptoms: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  severityPill: {
    borderRadius: 999,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#c9f3f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityPillText: { fontSize: 10, color: '#0f4f5c', fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    height: 60,
    width: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    shadowColor: '#14b8a6',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.25)' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#dbe5ef',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: '#0f4f5c',
  },
  sheetHint: {
    fontSize: 13,
    color: '#8aa3b0',
    textAlign: 'center',
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  measureItem: { alignItems: 'center', flex: 1, gap: 6 },
  measureItemActive: { transform: [{ scale: 1.03 }] },
  measureIconWrap: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureIconWrapActive: { backgroundColor: '#f3e8ff' },
  measureLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  measureLabelActive: { color: '#7c3aed' },
  saveQuickWrap: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddf3f2',
    backgroundColor: '#f7fffe',
    padding: 8,
  },
  saveQuickButton: {
    minHeight: 48,
    borderRadius: 12,
  },
  bpRow: { flexDirection: 'row', gap: 8 },
  bpInput: { flex: 1 },
  navHint: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e1ff',
    backgroundColor: '#f5f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navHintText: { fontSize: 12, color: '#2f3d86', fontWeight: '600' },
})
