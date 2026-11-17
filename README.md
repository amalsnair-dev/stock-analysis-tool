# AURIX Mobile App 📱✨
> **An Allure Jewelry ERP Software** — Cross-platform mobile inventory management, stock taking, and barcode scanning solution built with React Native and Expo.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Application Flow & Usage](#application-flow--usage)
- [Architecture & Folder Structure](#architecture--folder-structure)
- [API Services & Integrations](#api-services--integrations)
- [Environment Configuration](#environment-configuration)
- [Getting Started & Development](#getting-started--development)
- [Building for Production (Android & iOS)](#building-for-production-android--ios)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## 🌟 Overview
**AURIX** is a specialized mobile client tailored for jewelry retail and manufacturing enterprises running the Allure ERP ecosystem. It empowers floor staff, auditors, and shop managers to perform lightning-fast inventory audits, scan jewelry tags via high-performance device camera, verify live item weights, calculate estimates, and reconcile stock transactions seamlessly across branches.

---

## 🚀 Key Features

### 1. 🔐 License Verification & Dynamic Branch Resolution
- Centralized enterprise license verification via **SoftHub API** (`verifyLicense`).
- Dynamic candidate resolution for companies by Database ID, Company Code, or Company ID.
- Multi-branch support with branch code detection.

### 2. 🏪 Shop & Session Management
- Intuitive branch/shop selector.
- Persistent session storage leveraging `expo-secure-store` and `AsyncStorage`.
- Dedicated slide-out drawer (`AurixDrawer`) providing instant visibility into selected shop, branch code, and current user context.

### 3. 📦 Real-Time Stock Taking & Auditing
- Real-time jewelry barcode scanning powered by `expo-camera`.
- Audio sound effects (`expo-audio`) confirming valid/invalid barcode scans (`barcode-success.wav`).
- Batch and transaction persistence using `stockTakingTransactionStore`.
- Validation modal (`ValidationPopup`) preventing duplicate scans and flagging uncounted items.
- Item detail breakdown with gross weight, net weight, stone weight, and purity verification.

### 4. 💎 Item Details & Estimation
- Deep item inspection (`item-details.tsx`) with metal breakdown (Gold, Diamond, Silver, Platinum).
- Counter and operator resolution (`counterApi.ts`, `operatorApi.ts`).
- Thermal receipt and estimate printing via `expo-print`.

### 5. ⚡ Enterprise Performance & Portability
- Native Android build optimizations with Hermes JS Engine and React Native New Architecture (Fabric).
- Dynamic Node path resolver eliminating Android Studio environment errors across different OS setups.
- Automated GitHub Actions CI/CD workflows for quality checks and automatic production APK builds.

---

## 🔄 Application Flow & Usage

```
[ App Launch / Splash Screen ]
              │
              ▼
[ License Verification Screen ] ──► Validates serial against SoftHub API
              │
              ▼
    [ Shop Selection ] ──────────► Chooses active branch & configures API Base URL
              │
              ▼
   [ Main Stock-Taking Hub ]
     ├── Barcode Scanner
     ├── Item Weight & Specs
     ├── Live Stock Ledger
     └── Drawer Navigation (Shop Switch / Settings)
```

1. **Step 1 — License Verification (`src/app/index.tsx`)**:
   - The user enters their company serial key (e.g., `BTS-STO-...`).
   - The app verifies active status with the SoftHub API.
   - On success, candidate branches are fetched and cached securely.

2. **Step 2 — Shop Selection (`src/app/shop.tsx`)**:
   - User selects the branch/counter they are operating in.
   - The base API URL is configured dynamically and persisted.

3. **Step 3 — Stock Taking (`src/app/(tabs)/stock-taking.tsx`)**:
   - Point the camera at any item tag or barcode.
   - The app beeps on success, displays tag details (Gross Wt, Net Wt, Purity, Pcs), and records the audit record.

4. **Step 4 — Item Details (`src/app/(tabs)/item-details.tsx`)**:
   - View complete item history, pricing breakdown, and print estimates.

---

## 🏗️ Architecture & Folder Structure

```text
AurixApp/
├── .github/
│   └── workflows/
│       ├── build-apk.yml           # Automated GitHub Action for building Android APK
│       └── ci.yml                  # Linting & TypeScript quality assurance pipeline
├── android/                        # Android Native Project (Continuous Native Generation)
│   ├── app/
│   │   ├── build.gradle            # App-level Gradle config (Hermes, packaging options)
│   │   └── src/main/res/           # Native drawables, brand app icons, splash screens
│   ├── gradle.properties           # JVM tuning (3GB heap, caching, parallel execution)
│   └── settings.gradle             # Cross-platform dynamic Node detection
├── assets/
│   ├── images/
│   │   ├── aurix-logo.png          # Official AURIX brand logo
│   │   ├── aurix-logo-full.png     # Full logo with ERP tagline
│   │   ├── icon.png                # 1024x1024 master app icon
│   │   ├── android-icon-*.png      # Android Adaptive icon assets (safe 66% zone)
│   │   └── splash-icon.png         # Splash screen logo asset
│   └── barcode-success.wav         # Sound effect for barcode recognition
├── src/
│   ├── app/                        # Expo Router screen routes (file-based navigation)
│   │   ├── (tabs)/                 # Tab navigator screens
│   │   │   ├── _layout.tsx         # Bottom navigation configuration
│   │   │   ├── stock-taking.tsx    # Primary stock taking screen
│   │   │   └── item-details.tsx    # Item details & estimation
│   │   ├── _layout.tsx             # Root application navigator & session bootstrap
│   │   ├── index.tsx               # Entry & License Verification screen
│   │   ├── shop.tsx                # Branch & Shop selection screen
│   │   └── stock-taking-detail.tsx # Detailed audit ledger per transaction
│   ├── components/                 # Reusable UI components
│   │   ├── AurixLogo/              # Branded logo component
│   │   ├── navigation/             # AurixDrawer & navigation headers
│   │   └── ValidationPopup/        # Stock audit verification modals
│   ├── services/                   # Modular API client layer
│   │   ├── apiClient.ts            # Dynamic Axios/Fetch client with base URL switching
│   │   ├── licenseApi.ts           # SoftHub license verification
│   │   ├── companyApi.ts           # Branch & Company lookup
│   │   ├── itemApi.ts              # Stock item lookup & barcodes
│   │   ├── stockTakingApi.ts       # Stock auditing & transaction recording
│   │   └── estimateReceipt.ts      # Receipt and printing generator
│   └── storage/
│       └── localStorage.ts         # SecureStore & AsyncStorage persistence
├── app.json                        # Expo application manifest & plugin configuration
└── package.json                    # Project dependencies and script definitions
```

---

## 🔌 API Services & Integrations

| Service | Target Port / Protocol | Purpose |
| :--- | :--- | :--- |
| **SoftHub API** | Port `8081` | License validation, serial checking, branch registration |
| **Owner API** | Port `8080` / `8083` | Master product catalog, pricing, item rates, branches |
| **Device Services** | Native | Camera barcode reader, audio player, thermal printing |

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```env
# SoftHub License API (Port 8081)
EXPO_PUBLIC_SOFTHUB_API_PROTOCOL=http
EXPO_PUBLIC_SOFTHUB_API_HOST=192.168.1.50
EXPO_PUBLIC_SOFTHUB_API_PORT=8081
EXPO_PUBLIC_SOFTHUB_API_PROJECT=api

# Owner ERP API (Port 8080)
EXPO_PUBLIC_OWNER_API_PROTOCOL=http
EXPO_PUBLIC_OWNER_API_HOST=192.168.1.50
EXPO_PUBLIC_OWNER_API_PORT=8080
EXPO_PUBLIC_OWNER_API_PROJECT=aurix
```

---

## 🛠️ Getting Started & Development

### Prerequisites
- **Node.js**: v18+ or v20+
- **JDK**: Java 17 (recommended for Android Gradle Plugin 8.8+)
- **Android Studio**: Android SDK Platform 34/36, NDK `27.1.12297006`

### Installation
```bash
# 1. Clone repository
git clone https://github.com/BLOGTEC-SOFTWARE-LLP/aurix-mobile-app.git
cd aurix-mobile-app

# 2. Install dependencies
npm install

# 3. Start Expo development server
npx expo start
```

### Running on Physical Device / Emulator
```bash
# Run on connected Android device or emulator
npx expo run:android

# Run on iOS simulator (macOS required)
npx expo run:ios
```

---

## 📦 Building for Production

### Android Debug APK (Local)
To generate a local test APK in seconds:
```bash
cd android
./gradlew app:assembleDebug
```
Output location:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Android Release APK (Local)
```bash
cd android
./gradlew app:assembleRelease
```
Output location:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🤖 CI/CD Pipeline
The repository includes automated GitHub Actions:
- **`ci.yml`**: Runs on every Pull Request and Push to `main`. Executes TypeScript typechecking and ESLint to guarantee code quality.
- **`build-apk.yml`**: Automatically compiles and outputs production-ready APK artifacts directly within GitHub Actions releases.

---

## ❓ Troubleshooting & FAQs

### 1. `command 'node' failed` in Android Studio
- **Solution**: The project's `android/settings.gradle` and `android/app/build.gradle` automatically probe Homebrew (`/opt/homebrew/bin/node`), `/usr/local/bin/node`, and system `$PATH`. Ensure Node is installed on your machine.

### 2. Gradle Java Version Incompatibility
- **Solution**: Ensure your Android Studio Gradle JDK is configured to **JDK 17** (`Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK`).

### 3. Clearing Native CMake / Ninja Cache
If an interrupted build leaves temporary native cache files:
```bash
cd android
rm -rf app/.cxx app/build
./gradlew --stop
./gradlew app:assembleDebug
```

---

## 📄 License
Proprietary and confidential software owned exclusively by **BLOGTEC SOFTWARE LLP**. All rights reserved.
Unauthorized copying, modification, reverse engineering, or distribution of this software is strictly prohibited.
