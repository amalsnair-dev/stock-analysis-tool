# AURIX Developer Setup & Build Guide 💻

Step-by-step developer guide for onboarding, configuring development machines, building native artifacts, and running automated tests.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v18.x` LTS
- **JDK**: Java 17 (`openjdk@17` or Oracle JDK 17)
- **Android Studio**: Ladybug / Koala or newer
  - Android SDK Platform 34/36
  - Android NDK `27.1.12297006`
  - CMake `3.22.1`
- **Xcode** (macOS only, for iOS builds): Version 15+

---

## 2. Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/BLOGTEC-SOFTWARE-LLP/aurix-mobile-app.git
cd aurix-mobile-app

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env
```

---

## 3. Running Locally

```bash
# Start Metro bundler
npx expo start

# Run on Android device/emulator
npx expo run:android

# Run on iOS simulator
npx expo run:ios
```

---

## 4. Building Native APKs

### Fast Debug APK:
```bash
cd android
./gradlew app:assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Production Release APK:
```bash
cd android
./gradlew app:assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 5. Quality Assurance Commands

Always run these before opening a Pull Request:
```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Clean build test
cd android && ./gradlew clean app:assembleDebug
```
