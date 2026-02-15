# Ayushman AI Companion

> Your Personal Chronic Disease Management Partner

[![AWS AI for Bharat Hackathon](https://img.shields.io/badge/AWS-AI%20for%20Bharat-orange)](https://aws.amazon.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-blue)](https://web.dev/progressive-web-apps/)

## 🎯 Problem Statement

India faces a chronic disease epidemic:
- **77 million** people living with diabetes
- **200+ million** with hypertension
- Limited healthcare access in rural areas
- Low health literacy rates
- Poor medication adherence (40-50%)
- Language barriers in healthcare delivery

## 💡 Our Solution

**Ayushman AI Companion** is a Progressive Web Application (PWA) designed to empower chronic disease patients in India through:

- 🗣️ **Voice-First Interface** - Accessible for low-literacy users
- 🌐 **Multilingual Support** - Hindi, English, and regional languages
- 📴 **Offline-First** - Works without internet connectivity
- 🔒 **Privacy-Focused** - All data stored locally on device
- 💊 **Smart Reminders** - Medication adherence tracking
- 📊 **Health Tracking** - Symptom logs and progress visualization
- 🤖 **AI-Powered Tips** - Personalized health guidance

## ✨ Key Features

### 1. Intelligent Onboarding
- Collects comprehensive health profile through voice or text
- Captures daily habits, current medications, medical history
- Records current symptoms and health readings

### 2. Medication Management
- Scheduled push notifications for medicine reminders
- Adherence tracking with visual feedback
- Follow-up reminders for missed doses

### 3. Symptom & Health Tracking
- Voice-enabled symptom logging
- Blood sugar and blood pressure recording
- Visual charts showing health trends over time

### 4. Personalized Health Guidance
- AI-generated diet recommendations (Indian food context)
- Lifestyle tips based on user's condition
- Educational content in simple, accessible language
- Integration with e-Sanjeevani for telemedicine

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PWA Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │ Voice Layer  │  │  Offline     │  │
│  │  (React)     │  │ (Web Speech) │  │  Manager     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Application State (Zustand)               │  │
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
```

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **PWA**: Workbox
- **Storage**: IndexedDB (via Dexie.js)
- **Voice**: Web Speech API
- **Charts**: Chart.js / Recharts
- **Testing**: Fast-check (Property-based testing), React Testing Library
- **Build Tool**: Vite

## 📋 Project Documentation

This repository contains comprehensive technical documentation:

- **[Requirements Document](/.kiro/specs/ayushman-ai-companion/requirements.md)** - 10 user stories with detailed acceptance criteria following EARS patterns
- **[Design Document](/.kiro/specs/ayushman-ai-companion/design.md)** - Complete technical design with:
  - System architecture
  - Component interfaces
  - Data models
  - 17 correctness properties for property-based testing
  - Comprehensive testing strategy
  - Security considerations

## 🎯 Design Principles

1. **Voice-First** - Primary interaction through speech for accessibility
2. **Offline-First** - Core functionality available without internet
3. **Privacy-First** - All sensitive data stored locally on device
4. **Simplicity** - Minimal taps, large buttons, clear visual hierarchy
5. **Responsible AI** - Clear disclaimers, educational focus, no diagnosis

## 🧪 Testing Strategy

### Property-Based Testing
- Using **fast-check** library for TypeScript
- 17 correctness properties defined and tested
- Minimum 100 iterations per property test
- Properties cover:
  - Onboarding data completeness
  - Reminder scheduling accuracy
  - Symptom log persistence
  - Offline-online sync consistency
  - Adherence calculation accuracy

### Unit Testing
- React Testing Library for component tests
- Service layer testing with mock data
- Utility function testing

## 🌍 Social Impact

### Target Audience
- 277+ million chronic disease patients in India
- Focus on rural and underserved communities
- Low-literacy populations
- Non-English speakers

### Expected Outcomes
- 30% improvement in medication adherence
- Reduced emergency hospital visits
- Better quality of life for patients
- Empowered self-management of chronic conditions

## 🚀 Future Enhancements

- Integration with AWS Bedrock for advanced AI tips
- Amazon Polly for text-to-speech
- Amazon Transcribe for improved voice recognition
- Wearable device integration
- Community support features
- Caregiver monitoring (with consent)

## 📄 License

This project is developed for the AWS AI for Bharat Hackathon.

## 👥 Team

**Hackathon Submission:** AWS AI for Bharat Hackathon 2024

[Add your team member names and roles here]

## 🙏 Acknowledgments

- AWS AI for Bharat Hackathon
- ICMR and NP-NCD guidelines for chronic disease management
- ADA (American Diabetes Association) standards
- e-Sanjeevani telemedicine platform

---

**Built with ❤️ for Bharat's Healthcare**
