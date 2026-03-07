import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { MascotAvatar } from '../../components/MascotAvatar'
import { SwitchField } from '../../components/ui/SwitchField'
import { buildDoctorHandoffSummary } from '../reports/handoffSummary'
import { tk } from '../../lib/i18n'
import { useAppState } from '../../state/AppState'

export function SettingsTab() {
  const {
    profile,
    setProfile,
    queuedRequestCount,
    notificationPermission,
    notificationsMode,
    scheduledNotificationCount,
    lastReminderRebuildAt,
    symptomLogs,
    reminderLogs,
    requestNotificationPermission,
    addMedication,
    updateMedication,
    deleteMedication,
    clearAllLocalData,
    loadDemoScenario,
    startDemoTour,
    stopDemoTour,
    demoTourActive,
    demoTourNarrationEnabled,
    showPresenterOverlay,
    setDemoTourNarrationEnabled,
    setShowPresenterOverlay,
  } = useAppState()
  const navigation = useNavigation<any>()
  const tabBarHeight = useBottomTabBarHeight()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const isHindi = profile.language === 'hi'

  const writeAndShareTextFile = async (
    content: string,
    filename: string,
    dialogTitle: string,
    mimeType = 'text/plain'
  ) => {
    if (!(await Sharing.isAvailableAsync())) return
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
    if (!baseDir) return
    const fileUri = `${baseDir}${filename}`
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    })
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle })
  }

  const exportRawJson = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      symptomLogs,
      reminderLogs,
    }
    const json = JSON.stringify(payload, null, 2)
    await writeAndShareTextFile(
      json,
      `ayushman-export-${Date.now()}.json`,
      isHindi ? 'हेल्थ डेटा एक्सपोर्ट करें' : 'Export health data',
      'application/json'
    )
  }

  const exportDoctorSummary = async (windowDays: 7 | 30) => {
    const report = buildDoctorHandoffSummary({
      profile,
      symptomLogs,
      reminderLogs,
      windowDays,
    })
    await writeAndShareTextFile(
      report,
      `ayushman-clinical-handoff-${windowDays}d-${Date.now()}.txt`,
      isHindi ? `डॉक्टर सारांश (${windowDays} दिन)` : `Clinical handoff summary (${windowDays} days)`
    )
  }

  const startGuidedDemoTour = async () => {
    await loadDemoScenario()
    startDemoTour('overview')
    navigation.navigate('Overview')
  }

  const stopGuidedDemoTour = () => {
    stopDemoTour()
  }

  const resetDemoState = async () => {
    stopDemoTour()
    setShowPresenterOverlay(true)
    await loadDemoScenario()
    navigation.navigate('Overview')
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 12 }]}
    >
      <View style={styles.navHint}>
        <Text style={styles.navHintText}>Manage profile, sync and medication schedule here.</Text>
      </View>

      <Card>
        <View style={styles.heroRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Settings</Text>
            <Text style={styles.heroSub}>Control sync, reminders, and medication schedule.</Text>
          </View>
          <MascotAvatar mood="default" size={56} />
        </View>
      </Card>

      <Card title={tt('settings')}>
        <SwitchField
          label={tt('cloudSync')}
          value={profile.cloudSyncEnabled}
          onValueChange={(value) => setProfile({ ...profile, cloudSyncEnabled: value })}
        />
        <View style={styles.badgesRow}>
          <Badge tone={notificationPermission === 'granted' ? 'success' : 'warning'}>
            Notifications: {notificationPermission}
          </Badge>
          <Badge tone={notificationsMode === 'dev-client' ? 'success' : 'warning'}>
            Mode: {notificationsMode === 'dev-client' ? 'Dev client/full' : 'Expo Go/limited'}
          </Badge>
          <Badge tone="neutral">Queued: {queuedRequestCount}</Badge>
        </View>
        <View style={styles.actionSpacerMd} />
        <Button variant="secondary" onPress={requestNotificationPermission}>
          {tt('enableNotifications')}
        </Button>
      </Card>

      <Card title="Reminder diagnostics">
        <View style={styles.badgesRow}>
          <Badge tone="neutral">Scheduled: {scheduledNotificationCount}</Badge>
          <Badge tone="neutral">Sound: custom alarm tone</Badge>
          <Badge tone="neutral">Channel: medication-reminders-v2</Badge>
        </View>
        <Text style={styles.noteText}>
          Last rebuild: {lastReminderRebuildAt ? new Date(lastReminderRebuildAt).toLocaleString('en-IN') : 'Not yet'}
        </Text>
      </Card>

      <Card title={tt('medications')}>
        {profile.medications.map((medication, index) => (
          <View key={`${medication.name}-${index}`} style={styles.medCard}>
            <View style={styles.medHeader}>
              <View style={styles.medIcon}>
                <MaterialCommunityIcons name="pill" size={16} color="#0f4f5c" />
              </View>
              <Text style={styles.medTitle}>Medicine {index + 1}</Text>
            </View>
            <Input
              value={medication.name}
              placeholder={tt('medicationName')}
              onChangeText={(value) => void updateMedication(index, 'name', value)}
            />
            <Input
              style={styles.mt8}
              value={medication.dosage}
              placeholder={tt('dosage')}
              onChangeText={(value) => void updateMedication(index, 'dosage', value)}
            />
            <Input
              style={styles.mt8}
              value={medication.times.join(', ')}
              placeholder="Times (09:00, 21:00)"
              onChangeText={(value) =>
                void updateMedication(
                  index,
                  'times',
                  value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                )
              }
            />
            <View style={styles.actionSpacerMd} />
            <Button size="sm" variant="danger" onPress={() => deleteMedication(index)}>
              Delete
            </Button>
          </View>
        ))}
        <Button style={styles.buttonSpacingSm} variant="secondary" onPress={addMedication}>
          {tt('addMedicine')}
        </Button>
      </Card>

      <Card title="Data controls">
        <Button variant="secondary" onPress={() => void exportRawJson()}>
          Export data as JSON
        </Button>
        <View style={styles.actionSpacerMd} />
        <Button variant="secondary" onPress={() => void exportDoctorSummary(7)}>
          Export clinical handoff (7 days)
        </Button>
        <View style={styles.actionSpacerMd} />
        <Button variant="secondary" onPress={() => void exportDoctorSummary(30)}>
          Export clinical handoff (30 days)
        </Button>
        <View style={styles.actionSpacerLg} />
        <Button variant="danger" onPress={clearAllLocalData}>
          Clear local data
        </Button>
        <Text style={styles.noteText}>
          This will clear local profile/log data. Cloud delete is attempted when enabled.
        </Text>
      </Card>

      <Card title={isHindi ? 'AI Evaluation' : 'AI Evaluation'}>
        <Text style={styles.noteText}>
          {isHindi
            ? '30 सिंथेटिक केस पर सुरक्षा, एक्शन और हेल्थ-रूटिंग स्कोर देखें।'
            : 'Run a 30-case synthetic benchmark for safety, actionability, and routing quality.'}
        </Text>
        <View style={styles.actionSpacerMd} />
        <Button
          variant="secondary"
          onPress={() => navigation.navigate('SyntheticEvaluation')}
        >
          {isHindi ? 'इवैल्युएशन सूट खोलें' : 'Open evaluation suite'}
        </Button>
        <View style={styles.actionSpacerMd} />
        <Button
          variant="secondary"
          onPress={() => navigation.navigate('ProviderHandoff')}
        >
          {isHindi ? 'प्रोवाइडर हैंडऑफ मोड' : 'Open provider handoff mode'}
        </Button>
      </Card>

      <Card title={isHindi ? 'Demo Mode' : 'Demo Mode'}>
        <Text style={styles.noteText}>
          {isHindi
            ? '2-3 मिनट डेमो के लिए सिंथेटिक सैंपल डेटा तुरंत लोड करें।'
            : 'Load synthetic sample data instantly for a polished 2-3 minute demo run.'}
        </Text>
        <View style={styles.actionSpacerMd} />
        <SwitchField
          label={isHindi ? 'Presenter overlay दिखाएं' : 'Show presenter overlay'}
          value={showPresenterOverlay}
          onValueChange={setShowPresenterOverlay}
        />
        <View style={styles.actionSpacerMd} />
        <SwitchField
          label={isHindi ? 'Tour narration आवाज में' : 'Tour narration (voice)'}
          value={demoTourNarrationEnabled}
          onValueChange={setDemoTourNarrationEnabled}
        />
        <View style={styles.actionSpacerMd} />
        <Button variant="secondary" onPress={() => void loadDemoScenario()}>
          {isHindi ? 'डेमो डेटा लोड करें' : 'Load demo data'}
        </Button>
        <View style={styles.actionSpacerMd} />
        <Button variant="secondary" onPress={() => void resetDemoState()}>
          {isHindi ? 'डेमो रीसेट करें' : 'Reset demo state'}
        </Button>
        <View style={styles.actionSpacerMd} />
        <Button onPress={() => void startGuidedDemoTour()}>
          {isHindi ? 'Start Demo Tour' : 'Start demo tour'}
        </Button>
        {demoTourActive ? (
          <>
            <View style={styles.actionSpacerMd} />
            <Button variant="danger" onPress={stopGuidedDemoTour}>
              {isHindi ? 'Stop demo tour' : 'Stop demo tour'}
            </Button>
          </>
        ) : null}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef6f2' },
  content: { padding: 16, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f4f5c' },
  heroSub: { marginTop: 4, fontSize: 13, lineHeight: 18, color: '#6b8793' },
  badgesRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  buttonSpacingSm: { marginTop: 10 },
  actionSpacerMd: { height: 14 },
  actionSpacerLg: { height: 16 },
  mt8: { marginTop: 8 },
  medCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6f0f3',
    backgroundColor: '#f8fdff',
    padding: 12,
  },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  medIcon: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: '#dbf7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medTitle: { fontSize: 12, fontWeight: '700', color: '#0f4f5c' },
  noteText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  navHint: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7eadf',
    backgroundColor: '#edf9f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navHintText: { fontSize: 12, color: '#166534', fontWeight: '600' },
})
