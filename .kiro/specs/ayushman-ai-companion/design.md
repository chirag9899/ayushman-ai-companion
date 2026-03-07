# Design Document: Ayushman AI Companion

## Overview

Ayushman AI Companion is a mobile healthcare support system that combines:

- Patient-side daily support (reminders, coach, history)
- Safety-aware AI interaction (text/voice/image)
- Provider-ready summary exports
- Evaluation tooling for responsible AI demonstration

The design is mobile-first (Expo React Native), local-first for privacy, and cloud-assisted for AI and synchronization.

## Design Principles

1. **Mobile-first usability** - simple flows, fast actions, clear hierarchy
2. **Safety-first AI** - educational framing, escalation guidance, no diagnosis claims
3. **Local-first privacy** - encrypted local artifacts with explicit cloud sync control
4. **Workflow value** - patient support plus clinician handoff output
5. **Demo reliability** - deterministic guided tour and synthetic evaluation proof

## High-Level Architecture

```text
Mobile App (Expo React Native)
├─ Presentation Layer
│  ├─ Landing / Onboarding
│  ├─ Dashboard Tabs (Overview, Reminders, Coach, History, Settings)
│  └─ Reports (Provider Handoff, Synthetic Evaluation)
├─ App Orchestration
│  └─ AppState (profile, reminders, permissions, demo tour, notifications)
├─ Feature Services
│  ├─ Coach service + command actions + memory/session stores
│  ├─ Reminder scheduling/actions
│  └─ Report builders/evaluators
├─ Shared Utilities
│  ├─ i18n / IDs / queue / profile helpers
│  └─ local privacy encryption helpers
└─ Local Storage
   └─ AsyncStorage + encrypted payloads

AWS Backend (SAM / Lambda / API Gateway)
├─ /chat/converse (text coach)
├─ /image/analyze + upload path (vision flow)
├─ /tips/generate
└─ /profile/sync and delete
```

## Technology Stack

- **Client**: Expo SDK 55, React Native, TypeScript
- **UI**: NativeWind + reusable UI primitives
- **State**: React context (`AppState`)
- **Storage**: AsyncStorage (+ encrypted memory/session payloads)
- **Notifications**: Expo notifications + Notifee path for native Android alarms
- **Voice/Image**: Expo speech recognition + image picker
- **Backend**: AWS SAM, Lambda (Node/TS), API Gateway, DynamoDB, Bedrock models

## Module Design

### 1) AppState orchestration (`src/state/AppState.tsx`)

Responsibilities:

- profile lifecycle (load/save/sync/delete)
- reminder scheduling and action persistence
- notification permission and rebuild flows
- demo data and tour state machine
- queue and fallback coordination for network failures

### 2) Coach domain (`src/features/coach/*`)

Responsibilities:

- request/reply orchestration with backend
- command extraction for reminder actions from chat
- voice transcription integration
- encrypted message + session history persistence
- memory enrichment (themes/correlations/weekly summary)

### 3) Dashboard domain (`src/features/dashboard/*`)

Responsibilities:

- daily overview and insights surfaces
- reminder management UI and action controls
- Coach UI, image attachment flow, typing state
- history session browse/restore/delete
- settings, export, demo controls

### 4) Reports domain (`src/features/reports/*`)

Responsibilities:

- provider handoff snapshot and export text generation
- synthetic case evaluation execution and scorecard export

## Key Data Contracts

### UserProfile (core)

- demographics, habits, conditions, medications, language, consent/sync flags
- current symptom/readings snapshot

### ReminderLog

- reminderKey, medicationName, scheduledTime, status, timestamp, snoozedUntil

### CoachResultCard

- confidence, nextAction, disclaimer (safety framing surface)

### EvaluationSummary

- pass rate, average score, safety rate, routing/actionability/hallucination metrics

## Runtime Flows

### A) Reminder Flow

1. User adds or edits schedule
2. AppState normalizes schedule + weekdays
3. System rebuilds scheduled triggers (Expo/Notifee)
4. User action updates reminder logs
5. Overview/handoff metrics derive from logs

### B) Coach Flow

1. Input from text/voice/image
2. Command router checks if message is actionable (set reminder)
3. Else request AI reply/vision analysis via backend
4. Render response + optional safety summary card
5. Persist encrypted chat/session artifacts

### C) Handoff Flow

1. Aggregate symptom + reminder + profile data by window
2. Compute adherence, trends, red flags, timeline
3. Render clinician view
4. Export shareable summary file

### D) Demo Tour Flow

1. Load synthetic demo data
2. Start deterministic step sequence (overview → reminders → coach → provider → evaluation)
3. Overlay controls enforce manual Back/Next/Skip/Finish
4. Optional narration per step

## Safety and Privacy Controls

- Educational-only banner and non-diagnostic response framing
- Escalation guidance for urgent scenarios
- Encrypted local artifacts for coach/profile logs
- Explicit cloud sync toggle and clear-data controls
- Synthetic/public case benchmark for measurable safety review

## Error Handling Strategy

- **Network/API failures**: user-friendly errors + local fallback behavior
- **Notification capability mismatch**: degrade to supported path with clear messaging
- **Image upload/analysis errors**: retry-friendly response and non-crashing UI
- **Permission denial**: settings deep-link and local fallback guidance

## Testing and Verification

- Type safety via `npm run typecheck`
- Manual critical-path checks:
  - onboarding
  - reminder create/mark/delete
  - coach text/voice/image
  - provider export
  - evaluation run/export
  - demo tour navigation integrity

## Deployment Notes

- Mobile distribution via EAS Android build (APK/AAB)
- Optional static web export for demo/landing hosting
- Backend deploy via SAM (`sam build`, `sam deploy --guided`)
