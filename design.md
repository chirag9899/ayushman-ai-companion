# Design Document: Ayushman AI Companion

## Overview

Ayushman AI Companion is a Progressive Web Application designed to empower chronic disease patients in India with personalized health management tools. The application leverages voice-first interaction, offline-first architecture, and AI-powered personalization to provide medication reminders, symptom tracking, and educational health guidance. The system prioritizes privacy through local-first data storage and accessibility through multilingual support and simple UI patterns optimized for rural and low-literacy users.

### Key Design Principles

1. **Voice-First**: Primary interaction through speech for accessibility
2. **Offline-First**: Core functionality available without internet connectivity
3. **Privacy-First**: All sensitive data stored locally on device
4. **Simplicity**: Minimal taps, large buttons, clear visual hierarchy
5. **Responsible AI**: Clear disclaimers, educational focus, no diagnosis

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PWA Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │ Voice Layer  │  │  Offline     │  │
│  │  (React)     │  │ (Web Speech) │  │  Manager     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Application State (Context/Zustand)       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Health     │  │  Reminder    │  │   AI Tips    │  │
│  │   Service    │  │  Service     │  │   Engine     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Local Storage Layer (IndexedDB)           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Service Worker       │
              │   (Caching, Sync)      │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  External Services     │
              │  (Optional, when       │
              │   online)              │
              └────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: React 18+ with TypeScript
- **State Management**: Zustand (lightweight, simple API)
- **Styling**: Tailwind CSS (utility-first, responsive)
- **PWA**: Workbox for service worker management
- **Storage**: IndexedDB via Dexie.js (structured local storage)
- **Voice**: Web Speech API (SpeechRecognition, SpeechSynthesis)
- **Charts**: Chart.js or Recharts (lightweight visualization)
- **Notifications**: Web Push API with service worker
- **Build Tool**: Vite (fast, modern)

## Components and Interfaces

### Core Components

#### 1. Onboarding Flow Component
```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  voicePrompt: string;
}

interface OnboardingState {
  currentStep: number;
  userData: Partial<UserProfile>;
  completed: boolean;
}
```

#### 2. Voice Input Component
```typescript
interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: string;
  placeholder: string;
  autoStart?: boolean;
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}
```

#### 3. Medicine Reminder Component
```typescript
interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice' | 'thrice' | 'custom';
  times: string[]; // HH:MM format
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

interface ReminderNotification {
  medicineId: string;
  scheduledTime: Date;
  status: 'pending' | 'taken' | 'missed' | 'snoozed';
}
```

#### 4. Symptom Logger Component
```typescript
interface SymptomLog {
  id: string;
  timestamp: Date;
  symptoms: string[];
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
  readings?: HealthReading[];
}

interface HealthReading {
  type: 'blood_sugar' | 'blood_pressure' | 'weight' | 'temperature';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: Date;
}
```

#### 5. Dashboard Component
```typescript
interface DashboardData {
  todayReminders: Medicine[];
  recentSymptoms: SymptomLog[];
  dailyTip: HealthTip;
  adherenceScore: number;
  trendData: ChartData;
}
```

### Service Interfaces

#### Health Service
```typescript
interface HealthService {
  logSymptom(symptom: SymptomLog): Promise<void>;
  getSymptomHistory(days: number): Promise<SymptomLog[]>;
  logReading(reading: HealthReading): Promise<void>;
  getReadingTrends(type: string, days: number): Promise<ChartData>;
  analyzeSymptoms(symptoms: SymptomLog[]): HealthInsight;
}
```

#### Reminder Service
```typescript
interface ReminderService {
  scheduleMedicine(medicine: Medicine): Promise<void>;
  updateMedicine(id: string, updates: Partial<Medicine>): Promise<void>;
  markAsTaken(medicineId: string, time: Date): Promise<void>;
  getUpcomingReminders(): Promise<ReminderNotification[]>;
  calculateAdherence(medicineId: string, days: number): Promise<number>;
}
```

#### AI Tips Engine
```typescript
interface AITipsEngine {
  generatePersonalizedTip(profile: UserProfile): HealthTip;
  getDietRecommendations(profile: UserProfile): DietTip[];
  getLifestyleSuggestions(profile: UserProfile): LifestyleTip[];
  analyzeRiskFactors(profile: UserProfile): RiskAssessment;
}
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  createdAt: Date;
  language: 'hi' | 'en' | 'regional';
  
  // Habits
  habits: {
    diet: {
      breakfast: string[];
      lunch: string[];
      dinner: string[];
      snacks: string[];
    };
    waterIntake: number; // glasses per day
    exercise: {
      type: string;
      frequency: number; // times per week
      duration: number; // minutes
    };
    substanceUse: {
      smoking: boolean;
      alcohol: boolean;
      tobacco: boolean;
    };
  };
  
  // Medical History
  medicalHistory: {
    conditions: string[]; // e.g., ['diabetes', 'hypertension']
    familyHistory: string[];
    allergies: string[];
    pastHospitalizations: string[];
  };
  
  // Current Medications
  medications: Medicine[];
  
  // Current Symptoms
  currentSymptoms: string[];
  recentReadings: {
    bloodSugar?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    lastChecked: Date;
  };
}
```

### Health Tip
```typescript
interface HealthTip {
  id: string;
  category: 'diet' | 'exercise' | 'medication' | 'lifestyle' | 'general';
  title: string;
  content: string;
  audioUrl?: string; // for text-to-speech cached audio
  relevanceScore: number;
  sources: string[];
  language: string;
}
```

### Notification Config
```typescript
interface NotificationConfig {
  enabled: boolean;
  medicineReminders: boolean;
  dailyTips: boolean;
  dailyTipTime: string; // HH:MM
  symptomCheckReminders: boolean;
  symptomCheckFrequency: number; // days
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Onboarding Completion Consistency
*For any* user completing the onboarding flow, all required profile fields (language, habits, medications, medical history, current symptoms) should be populated before the user reaches the dashboard.

**Validates: Requirements 1.5**

### Property 2: Voice Input Transcription Accuracy
*For any* voice input session, if the speech recognition confidence score is below a threshold (e.g., 0.7), the system should prompt the user to retry or use text input rather than accepting potentially incorrect transcription.

**Validates: Requirements 2.4**

### Property 3: Reminder Scheduling Consistency
*For any* medicine with a defined schedule, the number of scheduled notifications per day should equal the frequency specified (e.g., "twice daily" = 2 notifications).

**Validates: Requirements 3.1**

### Property 4: Reminder Notification Delivery
*For any* scheduled reminder at time T, a notification should be triggered within a tolerance window (e.g., T ± 2 minutes) when the app is installed and notifications are enabled.

**Validates: Requirements 3.2**

### Property 5: Adherence Logging Idempotence
*For any* medicine reminder, marking it as "taken" multiple times for the same scheduled time should result in only one adherence log entry with that timestamp.

**Validates: Requirements 3.4**

### Property 6: Symptom Log Persistence
*For any* symptom logged by the user, retrieving the symptom history immediately after logging should include the newly added symptom with matching timestamp and details.

**Validates: Requirements 4.4**

### Property 7: Health Reading Validation
*For any* health reading input (blood sugar, blood pressure), values outside medically reasonable ranges (e.g., blood sugar < 20 or > 600 mg/dL) should be rejected with a validation error.

**Validates: Requirements 4.3**

### Property 8: Personalized Tip Relevance
*For any* user profile with specific conditions (e.g., diabetes), generated health tips should include at least one tip relevant to that condition based on the tip's category and content keywords.

**Validates: Requirements 5.1**

### Property 9: Advisory Disclaimer Presence
*For any* screen displaying health advice or tips, the UI should include visible disclaimer text stating the content is educational and not medical diagnosis.

**Validates: Requirements 5.3**

### Property 10: Offline Data Availability
*For any* data created or modified while offline (symptoms, readings, adherence logs), that data should be retrievable from local storage immediately without requiring internet connectivity.

**Validates: Requirements 6.2**

### Property 11: Offline-Online Sync Consistency
*For any* data modified offline, when connectivity is restored and sync completes, the local and remote data states should be identical (assuming no conflicts).

**Validates: Requirements 6.4**

### Property 12: Local Storage Privacy
*For any* health data stored locally, the data should not be transmitted to external servers unless the user has explicitly enabled cloud backup in settings.

**Validates: Requirements 7.2**

### Property 13: Data Deletion Completeness
*For any* user requesting data deletion, after the deletion operation completes, querying local storage for user data should return empty results.

**Validates: Requirements 7.3**

### Property 14: Telemedicine Link Accessibility
*For any* user accessing the help section, the telemedicine service link should be present and functional (opening external service when clicked).

**Validates: Requirements 8.1**

### Property 15: Progress Chart Data Accuracy
*For any* symptom or reading logged over a time period, the progress chart should display data points matching the logged entries for that period.

**Validates: Requirements 9.1**

### Property 16: Adherence Calculation Accuracy
*For any* medicine with N scheduled doses over a period and M doses marked as taken, the adherence percentage should equal (M / N) × 100.

**Validates: Requirements 9.2**

### Property 17: Notification Preference Respect
*For any* user who disables notifications in settings, the system should not trigger any push notifications until notifications are re-enabled.

**Validates: Requirements 10.4**

## Error Handling

### Voice Input Errors
- **No microphone permission**: Display clear prompt to enable microphone with instructions
- **Speech recognition not supported**: Fallback to text input only, hide voice buttons
- **Network timeout**: Use cached voice models if available, otherwise show text input
- **Low confidence transcription**: Show transcription with "Did you mean?" confirmation

### Storage Errors
- **Quota exceeded**: Prompt user to delete old logs, implement automatic cleanup of data older than 6 months
- **IndexedDB unavailable**: Fallback to localStorage with limited functionality
- **Corruption detected**: Attempt recovery, offer data export before reset

### Reminder Errors
- **Notification permission denied**: Show in-app reminders as fallback, prompt to enable notifications
- **Service worker not registered**: Graceful degradation, use in-app polling for reminders
- **Time zone changes**: Recalculate all scheduled reminders based on new time zone

### Sync Errors
- **Network unavailable**: Queue changes for later sync, show offline indicator
- **Conflict detected**: Use "last write wins" strategy with user notification
- **Server error**: Retry with exponential backoff, maintain local data integrity

## Testing Strategy

### Unit Testing
- **Component testing**: Test each React component in isolation with React Testing Library
- **Service testing**: Test health service, reminder service, and AI tips engine with mock data
- **Utility testing**: Test date/time helpers, validation functions, and data transformers
- **Voice API mocking**: Mock Web Speech API for consistent test results

### Property-Based Testing
We will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify universal properties.

**Configuration**: Each property test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Test Tagging**: Each property-based test must include a comment with this format:
```typescript
// Feature: ayushman-ai-companion, Property 1: Onboarding Completion Consistency
```

**Key Property Tests**:
1. Onboarding data completeness across random user inputs
2. Voice transcription handling with various confidence scores
3. Reminder scheduling correctness for all frequency patterns
4. Symptom log persistence and retrieval consistency
5. Health reading validation boundary testing
6. Offline-online sync idempotence
7. Adherence calculation accuracy with random dose patterns

### Integration Testing
- **Onboarding flow**: Complete end-to-end onboarding with voice and text inputs
- **Reminder lifecycle**: Schedule → Notify → Mark taken → Calculate adherence
- **Offline-online transition**: Create data offline → Go online → Verify sync
- **PWA installation**: Test add to home screen and offline functionality

### Accessibility Testing
- **Screen reader compatibility**: Test with NVDA/JAWS
- **Keyboard navigation**: Ensure all features accessible without mouse
- **Color contrast**: Verify WCAG AA compliance for text and buttons
- **Touch targets**: Minimum 44x44px for all interactive elements

### Performance Testing
- **Initial load time**: Target < 3 seconds on 3G connection
- **Time to interactive**: Target < 5 seconds
- **Local storage operations**: Ensure < 100ms for read/write
- **Voice recognition latency**: Target < 500ms from speech end to transcription

## Implementation Notes

### PWA Manifest
```json
{
  "name": "Ayushman AI Companion",
  "short_name": "Ayushman",
  "description": "Your personal chronic disease management companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "lang": "hi",
  "dir": "ltr"
}
```

### Service Worker Strategy
- **Cache-first**: Static assets (HTML, CSS, JS, images)
- **Network-first with cache fallback**: API calls (when online features added)
- **Background sync**: Queue offline data changes for sync when online
- **Periodic sync**: Check for new health tips daily (if supported)

### Localization Strategy
- Use i18next for translation management
- Store translations in JSON files per language
- Support dynamic language switching without reload
- Include voice prompts in translation files
- Prioritize Hindi and English, with extensibility for regional languages

### AI Tips Generation Logic
```typescript
function generatePersonalizedTip(profile: UserProfile): HealthTip {
  const conditions = profile.medicalHistory.conditions;
  const habits = profile.habits;
  
  // Rule-based tip selection
  const tipPool = [];
  
  if (conditions.includes('diabetes')) {
    if (habits.diet.breakfast.includes('white bread')) {
      tipPool.push(diabetesDietTips.wholeGrainAlternatives);
    }
    if (habits.exercise.frequency < 3) {
      tipPool.push(diabetesExerciseTips.walkingRoutine);
    }
  }
  
  if (conditions.includes('hypertension')) {
    if (habits.waterIntake < 6) {
      tipPool.push(hypertensionTips.hydration);
    }
    if (habits.substanceUse.smoking) {
      tipPool.push(hypertensionTips.smokingCessation);
    }
  }
  
  // Select tip with highest relevance score
  return tipPool.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
}
```

### Notification Scheduling
```typescript
function scheduleMedicineReminders(medicine: Medicine) {
  const times = medicine.times; // ['09:00', '21:00']
  
  times.forEach(time => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime < new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // Register notification with service worker
    self.registration.showNotification('Medicine Reminder', {
      body: `Time to take ${medicine.name} - ${medicine.dosage}`,
      tag: `medicine-${medicine.id}-${time}`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      data: {
        medicineId: medicine.id,
        scheduledTime: scheduledTime.toISOString()
      },
      actions: [
        { action: 'taken', title: 'Mark as Taken' },
        { action: 'snooze', title: 'Remind in 15 min' }
      ]
    });
  });
}
```

## Security Considerations

1. **Data Encryption**: Encrypt sensitive fields in IndexedDB using Web Crypto API
2. **XSS Prevention**: Sanitize all user inputs, especially voice transcriptions
3. **CSP Headers**: Implement Content Security Policy to prevent injection attacks
4. **HTTPS Only**: Enforce HTTPS for PWA installation and service worker registration
5. **No External Data Leakage**: Audit all network requests to ensure no PII transmission
6. **Secure Storage**: Use IndexedDB with encryption for sensitive health data
7. **Permission Handling**: Request minimal permissions, explain each permission clearly

## Deployment Strategy

1. **Build**: Vite production build with code splitting and tree shaking
2. **Hosting**: Static hosting on Vercel/Netlify with CDN
3. **PWA Registration**: Automatic service worker registration on first visit
4. **Update Strategy**: Prompt user when new version available, allow manual update
5. **Analytics**: Privacy-focused analytics (no PII) using Plausible or similar
6. **Monitoring**: Error tracking with Sentry (sanitize health data from error reports)

## Future Enhancements

1. **AI-Powered Symptom Analysis**: Use LLM for more sophisticated symptom interpretation
2. **Community Features**: Anonymous peer support groups for chronic disease patients
3. **Wearable Integration**: Sync data from fitness trackers and glucose monitors
4. **Multilingual Voice Models**: Support for more Indian regional languages
5. **Offline AI**: Run small language models locally for better offline tips
6. **Family Sharing**: Allow caregivers to monitor patient adherence (with consent)
7. **Gamification**: Reward streaks for medication adherence and healthy habits
