# Ayushman Mobile App (Expo)

Primary hackathon prototype app for patient support + provider workflow assistance.

## Setup

1. Copy `.env.example` to `.env`
2. Set `EXPO_PUBLIC_API_BASE_URL` (backend API base URL)
3. Install and run:

```bash
npm install
npm run start
```

## Scripts

```bash
npm run start        # Expo dev server
npm run android      # Run on Android (dev build)
npm run ios          # Run on iOS (dev build)
npm run web          # Expo web
npm run typecheck    # TypeScript validation
```

## Production build

For shareable Android binaries:

```bash
eas build -p android --profile preview
```

For static web export (optional demo landing):

```bash
npx expo export --platform web
```

## App architecture

### Feature modules

- `src/features/landing` - landing experience
- `src/features/onboarding` - body basics and consent flow
- `src/features/dashboard` - Overview, Reminders, Coach, History, Settings
- `src/features/reports` - Provider handoff + synthetic evaluation
- `src/features/coach` - AI actions, memory/session stores, transcription, service layer

### Shared layers

- `src/state/AppState.tsx` - central orchestration (profile, reminders, permissions, demo tour)
- `src/services/api.ts` - backend API client + error normalization
- `src/lib/*` - i18n, storage/privacy helpers, id generation, queue helpers
- `src/components/*` - reusable UI, overlay, typography, feedback widgets
- `src/types/*` - domain models

## Key capabilities

- Medication scheduling with day-wise repeat and reminder action tracking
- AI Coach with text + voice + image input
- Safety-first responses (educational framing and escalation guidance)
- History and personalized memory context
- Clinical handoff summary export (7/30 days)
- Synthetic evaluation scorecard for demo reliability
- Guided demo tour with manual step controls

## Validation checklist

Before sharing builds:

```bash
npm run typecheck
```

Then manually verify:

- onboarding save and navigation
- reminder add/taken/delete flows
- coach text + image + voice
- provider handoff export
- synthetic evaluation run
- demo tour start/back/next/skip/finish
