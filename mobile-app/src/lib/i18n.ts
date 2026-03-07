import type { AppLanguage } from '../types/profile'

type Lang = 'en' | 'hi'

const text = {
  appName: { en: 'Ayushman AI Companion', hi: 'आयुष्मान AI साथी' },
  startOnboarding: { en: 'Start onboarding', hi: 'शुरू करें' },
  overview: { en: 'Overview', hi: 'सारांश' },
  reminders: { en: 'Reminder', hi: 'रिमाइंडर' },
  todaysReminders: { en: "Today's Reminders", hi: 'आज के रिमाइंडर' },
  symptoms: { en: 'Symptoms', hi: 'लक्षण' },
  history: { en: 'History', hi: 'हिस्ट्री' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  coach: { en: 'Coach', hi: 'कोच' },
  coachSessions: { en: 'Coach sessions', hi: 'कोच चैट' },
  dailyTip: { en: 'Daily AI tip', hi: 'आज का सुझाव' },
  refreshTip: { en: 'Refresh tip', hi: 'नया सुझाव' },
  source: { en: 'Source', hi: 'स्रोत' },
  updated: { en: 'Updated', hi: 'अपडेट' },
  save: { en: 'Save', hi: 'सेव करें' },
  saveProfile: { en: 'Save profile', hi: 'प्रोफाइल सेव करें' },
  language: { en: 'Language', hi: 'भाषा' },
  dietPattern: { en: 'Diet pattern', hi: 'खाने का तरीका' },
  consent: { en: 'Consent accepted', hi: 'सहमति स्वीकार' },
  cloudSync: { en: 'Cloud sync', hi: 'क्लाउड सिंक' },
  remindersDue: { en: 'Due reminders', hi: 'बाकी रिमाइंडर' },
  noReminders: { en: 'No reminders yet.', hi: 'अभी कोई रिमाइंडर नहीं।' },
  quickSymptomCheckIn: { en: 'Quick symptom check-in', hi: 'झटपट लक्षण चेक-इन' },
  symptomSeverity: { en: 'Symptom severity', hi: 'लक्षण की तीव्रता' },
  saveQuickLog: { en: 'Save quick log', hi: 'जल्दी लॉग सेव करें' },
  quickLogSaved: { en: 'Quick symptom log saved.', hi: 'लक्षण लॉग सेव हो गया।' },
  medicationName: { en: 'Medicine name', hi: 'दवा का नाम' },
  medications: { en: 'Medications', hi: 'दवाएं' },
  dosage: { en: 'Dosage', hi: 'खुराक' },
  addMedicine: { en: 'Add medicine', hi: 'दवा जोड़ें' },
  enableNotifications: { en: 'Enable notifications', hi: 'नोटिफिकेशन चालू करें' },
  alarmDismiss: { en: 'Dismiss', hi: 'बंद करें' },
  alarmTitle: { en: 'Alarm', hi: 'अलार्म' },
  alarmBody: { en: "It's time to take your medicine.", hi: 'दवा लेने का समय हो गया है।' },
  educationalOnlyNotDiagnosis: {
    en: 'Educational guidance only, not medical diagnosis.',
    hi: 'यह केवल शैक्षणिक मार्गदर्शन है, चिकित्सकीय निदान नहीं।',
  },
  defaultTipFallback: {
    en: 'Stay consistent with medicines, hydration, and daily symptom tracking.',
    hi: 'दवा समय पर लें, पानी पिएं और रोज़ लक्षण लिखें।',
  },
  // Nav Hints
  historyHint: { en: 'Previous coach chats are stored here. Tap to restore, long-press for options.', hi: 'पुरानी चैट यहाँ सेव हैं। दबाएं से खोलें, लॉन्ग-प्रेस से विकल्प।' },
  remindersHint: { en: 'Tap clock + to add schedule. Mark Taken when done.', hi: '+ दबाकर रिमाइंडर जोड़ें। ले ली पर टिक करें।' },
  coachHint: { en: 'Chat with AI about symptoms, medicines, or upload an image for analysis.', hi: 'AI से लक्षण/दवा पर बात करें, या इमेज अपलोड करें।' },
  // Hero Subtitles
  historySubtitle: { en: 'Search and manage your past conversations.', hi: 'पुरानी बातचीत खोजें और देखें।' },
  remindersSubtitle: { en: 'Simple daily reminders with quick actions.', hi: 'रोज के रिमाइंडर और एक्शन।' },
  // Empty States
  noHistoryTitle: { en: 'No previous sessions', hi: 'कोई पुरानी चैट नहीं' },
  noHistorySubtitle: { en: 'Start a new chat in Coach to see history here.', hi: 'कोच में नई चैट शुरू करें।' },
  noMatchingChats: { en: 'No matching chats', hi: 'कोई चैट नहीं मिली' },
  tryDifferentSearch: { en: 'Try a different search term.', hi: 'दूसरा खोज शब्द डालें।' },
  noRemindersTitle: { en: 'No reminders set', hi: 'कोई रिमाइंडर नहीं' },
  noRemindersSubtitle: { en: 'Tap the + button to add your first medication reminder.', hi: '+ बटन दबाकर पहली दवा रिमाइंडर जोड़ें।' },
  // Typing Indicator
  typingText: { en: 'Ayushman is typing', hi: 'आयुष्मान सोच रहा है' },
  // Toast Messages - History
  newChatOpened: { en: 'New chat opened.', hi: 'नई चैट शुरू हुई।' },
  sessionOpened: { en: 'Session opened in Coach.', hi: 'चैट कोच में खुली।' },
  sessionDeleted: { en: 'Session deleted.', hi: 'चैट डिलीट हो गई।' },
  // Toast Messages - Reminders
  reminderScheduled: { en: 'Reminder scheduled.', hi: 'रिमाइंडर सेव हो गया।' },
  reminderSavedNoNotif: { en: 'Reminder saved. Turn on notifications for alarms.', hi: 'रिमाइंडर सेव हुआ। अलार्म के लिए नोटिफिकेशन चालू करें।' },
  markedAsTaken: { en: 'Marked as taken.', hi: 'ले ली के रूप में मार्क हुआ।' },
  alarmDismissed: { en: 'Alarm dismissed.', hi: 'अलार्म बंद किया गया।' },
  // Validation Errors
  enterValidTime: { en: 'Enter medicine and valid time like 09:00.', hi: 'दवा का नाम और सही समय डालें (जैसे 09:00)।' },
  pickOneDay: { en: 'Pick at least one day.', hi: 'कम से कम एक दिन चुनें।' },
  // General Errors
  couldNotUpdate: { en: 'Could not update.', hi: 'अपडेट नहीं हो सका।' },
  // Reminders Tab - Additional translations
  notificationsOff: { en: 'Notifications are off. Turn them on from phone settings for alarm alerts.', hi: 'नोटिफिकेशन बंद हैं। अलार्म अलर्ट के लिए फोन सेटिंग्स से चालू करें।' },
  openNotificationSettings: { en: 'Open notification settings', hi: 'नोटिफिकेशन सेटिंग्स खोलें' },
  taken: { en: 'Taken', hi: 'ले ली' },
  addSchedule: { en: 'Add schedule', hi: 'शेड्यूल जोड़ें' },
  timePlaceholder: { en: 'Time (HH:MM) e.g. 09:00', hi: 'समय (HH:MM) जैसे 09:00' },
  everyday: { en: 'Everyday', hi: 'रोज़' },
  selectDays: { en: 'Select days', hi: 'दिन चुनें' },
  saveSchedule: { en: 'Save schedule', hi: 'शेड्यूल सेव करें' },
  snooze: { en: 'Snooze', hi: 'बाद में' },
  // History Tab - Session options
  sessionOptions: { en: 'Session options', hi: 'चैट विकल्प' },
  // Overview Tab - New simplified design
  allDone: { en: 'All caught up!', hi: 'सब कंप्लीट!' },
  startYourDay: { en: 'Good day!', hi: 'शुभ दिन!' },
  completed: { en: 'done', hi: 'हो गया' },
  noRemindersSet: { en: 'No reminders', hi: 'कोई रिमाइंडर नहीं' },
  glasses: { en: 'glasses', hi: 'गिलास' },
  protein: { en: 'protein', hi: 'प्रोटीन' },
  medicines: { en: 'meds', hi: 'दवा' },
  done: { en: 'done', hi: 'डन' },
  pending: { en: 'pending', hi: 'बाकी' },
  none: { en: 'none', hi: 'नहीं' },
  takeMedicine: { en: 'Medicines', hi: 'दवाएं' },
  askCoach: { en: 'Ask Coach', hi: 'सलाह लें' },
  todayTip: { en: "Today's Tip", hi: 'आज का सुझाव' },
  // Weekly Summary & Health Insights
  weeklySummary: { en: 'Weekly Summary', hi: 'साप्ताहिक सारांश' },
  last7Days: { en: 'Last 7 days', hi: 'पिछले 7 दिन' },
  adherence: { en: 'adherence', hi: 'नियमितता' },
  avgGlasses: { en: 'avg glasses', hi: 'औसत गिलास' },
  topSymptomsThisWeek: { en: 'Top symptoms this week', hi: 'इस हफ्ते के लक्षण' },
  healthInsights: { en: 'Health Insights', hi: 'स्वास्थ्य जानकारी' },
  // Smart Reminder Suggestions (for Coach AI context)
  smartReminderSuggestion: { en: 'Smart reminder suggestion', hi: 'स्मार्ट रिमाइंडर सुझाव' },
  correlationDetected: { en: 'Pattern detected', hi: 'पैटर्न मिला' },
  chooseAction: { en: 'Choose an action', hi: 'कोई काम चुनें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  restore: { en: 'Restore', hi: 'खोलें' },
  delete: { en: 'Delete', hi: 'डिलीट करें' },
  searchChats: { en: 'Search chats...', hi: 'चैट खोजें...' },
  // Image Analysis
  analyzingImage: { en: 'Analyzing image...', hi: 'इमेज देख रहा हूँ...' },
  imageTooLarge: { en: 'Image too large. Try a smaller image.', hi: 'इमेज बड़ी है। छोटी इमेज लें।' },
  uploadFailed: { en: 'Upload failed. Check connection.', hi: 'अपलोड फेल। नेटवर्क चेक करें।' },
} as const

export type I18nKey = keyof typeof text

function normalize(language: AppLanguage): Lang {
  return language === 'hi' ? 'hi' : 'en'
}

export function tk(language: AppLanguage, key: I18nKey) {
  return text[key][normalize(language)]
}

export function tp(language: AppLanguage, en: string, hi: string) {
  return normalize(language) === 'hi' ? hi : en
}

export function localizeCondition(condition: string, language: AppLanguage) {
  if (language !== 'hi') return condition
  if (condition === 'diabetes') return 'शुगर'
  if (condition === 'hypertension') return 'बीपी'
  return condition
}
