# TimeFlow Enterprise — Offline-First Multi-Tenant Mobile App (`timeflow-mobile`)

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020.svg)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)
![Architecture](https://img.shields.io/badge/Architecture-Offline--First%20Sync-10B981.svg)

Cross-platform **iOS & Android Enterprise HRM and Attendance Mobile Application** built with **React Native & Expo SDK 57**, featuring an **Offline-First Geofenced Attendance Queue**, **Multi-Tenant Workspace Routing**, and **Automatic Network Recovery Sync**.

---

## Key Capabilities

### 1. Offline-First Geofenced Attendance Engine (`src/shared/offline/`)
* **Uninterrupted Offline Clock-In / Clock-Out:** Employees can record their attendance even without internet connectivity.
* **Local On-Device Geofence Verification:** Active branch coordinates and geofence radii are cached locally in `expo-secure-store` (`syncOfflineEssentialData`) so the app verifies GPS distance on-device while offline.
* **Offline JWT Session Validation:** Validates cached tokens locally when offline so workers are never locked out in low-signal areas.
* **Automatic Chronological Queue Sync (`syncPendingAttendance`):** A continuous `@react-native-community/netinfo` listener automatically replays queued offline clock-in/clock-out events in chronological order as soon as connectivity returns, with server-side idempotency (`occurredAt`).

### 2. Multi-Tenant Workspace Support
* **Zero-Friction Email Discovery & Workspace Slug Routing:** Supports optional workspace slug selection (`x-workspace-slug`) or automatic email-based organization discovery, persisting tenant credentials securely in `expo-secure-store`.
* **Deep Link Invitation Onboarding:** Handles employee invitation links (`ExpoLinking`) directly inside the mobile app to complete account activation.

### 3. Complete Mobile HRM & Management Suite
* **Interactive Dashboard:** Real-time company overview metrics, personal leave balance cards, and session breakdowns (`FULL`, `HALF`, `SHORT`).
* **Leave Requests & Approvals:** Apply for leaves, choose acting employees, and approve/reject pending team leave requests on the go.
* **Mobile Management Console:** HR and Admin users can manage Employees, Branches, Organization Attendance, and even run CSV Data Imports (`expo-document-picker`) directly from their phone.

---

## Environment Variables (`.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Expo Metro Bundler
npx expo start

# 3. Run on Android / iOS
npm run android
npm run ios
```

---

## Author
Architected and developed by **[Shamodha Sahan](https://shamodha.com)**.
