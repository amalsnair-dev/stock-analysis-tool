# AURIX System Architecture 🏗️

This document details the high-level and component architecture of the **AURIX Mobile App**.

---

## 1. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      AURIX Mobile App                       │
│    (React Native + Expo SDK 52 + Expo Router + Hermes)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
        Port 8081 (HTTP)                Port 8080/8083 (HTTP)
               │                               │
               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │     SoftHub API      │        │    Owner ERP API     │
    │  - License Checks    │        │  - Item Master       │
    │  - Serial Validation │        │  - Stock Audits      │
    │  - Company Branches  │        │  - Transaction Sync  │
    └──────────────────────┘        └──────────────────────┘
```

---

## 2. Navigation State Machine (Expo Router)

```text
[ Splash Screen ]
       │
       ▼
[ /src/app/_layout.tsx ] 
   Check SecureStore for saved baseUrl / token
       ├── Found ──────► Redirect to /(tabs)/stock-taking
       └── Missing ────► Redirect to /index (License Verification)
                           │
                           ▼
                  [ /src/app/index.tsx ]
                  Validate Serial with SoftHub API
                           │
                           ▼
                  [ /src/app/shop.tsx ]
                  Select Shop/Branch & Configure Base URL
                           │
                           ▼
                  [ /(tabs)/_layout.tsx ]
                     ├── (tabs)/stock-taking.tsx  (Barcode & Audit)
                     └── (tabs)/item-details.tsx   (Specs & Pricing)
```

---

## 3. Storage Architecture

| Layer | Implementation | Purpose |
| :--- | :--- | :--- |
| **Secure Credentials** | `expo-secure-store` | Serial keys, SoftHub license response, auth tokens |
| **Session Cache** | `@react-native-async-storage/async-storage` | Selected shop ID, current counter, user preference |
| **In-Memory Store** | `stockTakingTransactionStore` | Fast live audit queue, batch item tallies, duplicates check |

---

## 4. Native Layer Configuration

- **Engine**: Hermes JS Engine (`hermesEnabled=true`) with v8 memory compaction.
- **New Architecture**: React Native Fabric rendering and TurboModules (`newArchEnabled=true`).
- **Dynamic Node Detection**:
  - `android/settings.gradle` and `android/app/build.gradle` automatically probe:
    - `/opt/homebrew/bin/node` (Apple Silicon Mac)
    - `/usr/local/bin/node` (Intel Mac / Linux)
    - System environment `$PATH`
- **Memory & Performance**:
  - Gradle JVM args: `-Xmx3072m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC`
  - VFS file watching: `org.gradle.vfs.watch=true`
  - Gradle cache: `org.gradle.caching=true`
