# Ayushman AI Companion

AI Care Copilot for patients with a clinic-ready summary layer for healthcare workflows.

## What this repo contains

- `mobile-app/` - Expo React Native app (primary prototype)
- `backend/` - AWS SAM backend for profile sync, chat/tips/image flows
- `requirements.md` / `design.md` - product and technical design docs

## Current product scope (prototype)

- Medication reminders with scheduling and adherence logging
- AI Coach (text + voice + image) with safety-oriented responses
- History and personalized memory insights
- Provider handoff summary (7/30 day, exportable)
- Synthetic evaluation suite (safety/routing/actionability scorecard)
- Guided demo tour mode for judging

## Quick start

### 1) Mobile app

```bash
cd mobile-app
npm install
npm run start
```

Type check:

```bash
npm run typecheck
```

### 2) Backend (optional for local UI work)

```bash
cd backend
npm install
sam build
sam local start-api
```

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile-app/.env` to connect app with backend.

## Clean architecture (mobile)

The app is organized by feature + shared platform layers:

- `src/features/*` - feature modules (`coach`, `dashboard`, `reports`, `onboarding`, `landing`)
- `src/state/AppState.tsx` - app-level orchestration and cross-feature state
- `src/services/*` - API and external integrations
- `src/lib/*` - pure utilities (i18n, id generation, storage/privacy helpers)
- `src/components/*` - reusable UI and presentation primitives
- `src/types/*` - shared domain types

## Build and distribution

### Android APK/AAB (recommended for judges)

Use EAS build from `mobile-app`:

```bash
eas build -p android --profile preview
```

Then share the generated install link in your demo hub.

### Optional web export (for simple landing/demo host)

```bash
cd mobile-app
npx expo export --platform web
```

If successful, static files are generated under `dist/` for hosting.

## Submission assets

Use `SUBMISSION_KIT.md` to prepare:

- Working prototype link
- 3-minute explanation video
- Deck/PPT structure

## License

Developed for hackathon prototype usage.
