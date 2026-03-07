# Requirements Document

## Introduction

Ayushman AI Companion is a mobile-first healthcare support application built with Expo React Native and an AWS-backed AI layer.  
The system helps patients with medication adherence, symptom guidance, and multilingual AI support while generating clinic-ready summaries and measurable evaluation outputs for responsible AI workflows.

## Glossary

- **System**: Ayushman AI Companion mobile app + backend APIs
- **User**: Patient using the app for daily health support
- **Coach**: AI chat experience (text, voice, image)
- **Reminder**: Scheduled medicine alert with action logging
- **Handoff Summary**: Doctor-friendly 7/30 day snapshot export
- **Synthetic Evaluation**: Benchmark run over predefined synthetic scenarios
- **Demo Tour**: Guided in-app walkthrough for reviewers/judges
- **Local Memory**: Encrypted local storage for messages and profile context

## Requirements

### Requirement 1 - Onboarding and Consent

**User Story:** As a first-time user, I want a simple onboarding flow so I can start quickly while giving informed consent.

#### Acceptance Criteria

1. WHEN the app opens for first use, THE System SHALL show landing and onboarding before dashboard access
2. WHEN onboarding is completed, THE System SHALL store language, body basics, and consent state
3. WHEN consent is not accepted, THE System SHALL block health coaching and data sync actions
4. WHEN onboarding completes, THE System SHALL request notification permission for reminders
5. WHEN app restarts, THE System SHALL route users based on onboarding completion state

### Requirement 2 - Medication Scheduling and Reminder Actions

**User Story:** As a user taking medicines, I want reliable reminders and action controls so I can improve adherence.

#### Acceptance Criteria

1. WHEN a schedule is added, THE System SHALL validate medication name and time format
2. WHEN a schedule uses custom weekdays, THE System SHALL store and apply selected days
3. WHEN reminder time is due, THE System SHALL trigger notification/alarm path based on platform capability
4. WHEN user selects taken/snooze/dismiss action, THE System SHALL persist action status with timestamp
5. WHEN schedules change, THE System SHALL rebuild future notifications without duplicate active schedules

### Requirement 3 - AI Coach: Text, Voice, and Image

**User Story:** As a user, I want to chat in natural language (including Hindi) and attach voice/image inputs for better help.

#### Acceptance Criteria

1. WHEN user types or speaks a message, THE System SHALL send it to Coach flow with language context
2. WHEN voice transcription returns duplicate final tokens, THE System SHALL deduplicate repeated fragments
3. WHEN an image is attached, THE System SHALL support image+text request in a single send action
4. WHEN backend vision analysis succeeds, THE System SHALL show analysis response and safety summary card
5. WHEN AI backend fails, THE System SHALL show specific fallback error messaging instead of generic failure copy

### Requirement 4 - Command Execution from Coach

**User Story:** As a user, I want Coach to understand reminder commands so I can set schedules directly from chat.

#### Acceptance Criteria

1. WHEN user asks Coach to set a medicine reminder, THE System SHALL parse actionable intent from message
2. WHEN parsed command is valid, THE System SHALL create/update medication schedule from Coach action
3. WHEN parsed command is invalid or incomplete, THE System SHALL ask for missing fields
4. WHEN command execution completes, THE System SHALL show confirmation in chat
5. WHEN a reminder is created from Coach, THE System SHALL trigger rescheduling of notification infrastructure

### Requirement 5 - Personalized Memory and Insights

**User Story:** As a returning user, I want the app to remember my context and provide trend-aware support.

#### Acceptance Criteria

1. WHEN users interact with Coach, THE System SHALL update encrypted local memory artifacts
2. WHEN symptom/reminder data grows, THE System SHALL generate weekly summary and trend insights
3. WHEN correlations are detected, THE System SHALL expose insight cards in dashboard surfaces
4. WHEN memory is loaded, THE System SHALL preserve decryption fallback handling without crashing
5. WHEN user starts a new chat, THE System SHALL archive previous session to history

### Requirement 6 - Safety and Responsible AI

**User Story:** As a healthcare user, I want clear safety framing so I do not confuse support content with diagnosis.

#### Acceptance Criteria

1. WHEN Coach renders AI responses, THE System SHALL show educational framing and non-diagnosis language
2. WHEN response confidence/next action exists, THE System SHALL display structured safety summary card
3. WHEN urgent risk language is detected, THE System SHALL include seek-care escalation guidance
4. WHEN user-facing mode is active, THE System SHALL not display developer-only debug snapshots
5. WHEN system produces suggestions, THE System SHALL avoid definitive diagnosis claims

### Requirement 7 - Provider Handoff Summary

**User Story:** As a clinician or patient preparing for consultation, I want a compact summary of recent history.

#### Acceptance Criteria

1. WHEN provider handoff screen opens, THE System SHALL present 7-day and 30-day windows
2. WHEN snapshot is computed, THE System SHALL include adherence, symptom trends, timeline, and red flags
3. WHEN latest readings are available, THE System SHALL include normalized vitals in summary view
4. WHEN export is triggered, THE System SHALL generate shareable text summary file
5. WHEN no data is present, THE System SHALL show graceful empty/NA states

### Requirement 8 - Synthetic Evaluation Suite

**User Story:** As a reviewer, I want measurable evaluation so I can assess safety and usefulness.

#### Acceptance Criteria

1. WHEN evaluation run starts, THE System SHALL execute all synthetic cases and show progress
2. WHEN each case completes, THE System SHALL score pass/fail, safety, routing, and actionability
3. WHEN run finishes, THE System SHALL compute aggregate scorecard metrics
4. WHEN export is requested, THE System SHALL produce JSON report artifact
5. WHEN individual case request fails, THE System SHALL record failure in report instead of aborting full run

### Requirement 9 - Demo Tour Experience

**User Story:** As a presenter, I want a guided walkthrough so I can reliably demonstrate value in under 3 minutes.

#### Acceptance Criteria

1. WHEN Start Demo Tour is triggered, THE System SHALL preload demo data and start at step 1 deterministically
2. WHEN tour is active, THE System SHALL display lock overlay controls (Back/Next/Skip/Finish)
3. WHEN moving steps, THE System SHALL navigate to mapped screen sequence consistently
4. WHEN narration mode is enabled, THE System SHALL play voice narration for each step
5. WHEN reset demo state is triggered, THE System SHALL restore demo data and return to overview

### Requirement 10 - Privacy, Storage, and Data Controls

**User Story:** As a privacy-conscious user, I want local encrypted data controls and optional cloud sync.

#### Acceptance Criteria

1. WHEN profile/log/chat data is written locally, THE System SHALL encrypt sensitive artifacts at rest
2. WHEN cloud sync is disabled, THE System SHALL continue to function fully in local mode
3. WHEN cloud sync is enabled, THE System SHALL attempt profile sync and queue on transient failures
4. WHEN clear local data is requested, THE System SHALL delete local artifacts and reset runtime state
5. WHEN data export actions are used, THE System SHALL generate shareable files without exposing hidden secrets
