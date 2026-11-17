# AURIX User & Operator Manual 📖

A practical step-by-step operational manual for jewelry showroom staff, inventory auditors, and store operators.

---

## 1. Initial Setup & License Activation

When opening the app for the first time or after resetting session:
1. Open the **AURIX** app.
2. The **License Verification** screen will be shown.
3. Enter your company **Serial Key** (e.g., `BTS-STO-XXXXX`).
4. Tap **CONTINUE**.
5. The app verifies the license against the SoftHub registry. Once verified, the available branches/shops for your company will load automatically.

---

## 2. Selecting a Shop / Branch

1. On the **Select Shop** screen, choose the showroom or branch you are working in.
2. Select your **Counter** and **Operator** code.
3. Tap **PROCEED TO AUDIT**.
4. The app stores this configuration, so you don't have to re-enter it each time you open the app.

---

## 3. Stock Taking & Barcode Scanning

### How to Scan Tags:
1. Navigate to the **Stock Taking** tab (bottom bar).
2. The live camera viewfinder will initialize.
3. Hold the camera steady over the jewelry tag barcode or QR code.
4. When scanned successfully:
   - The device plays a confirmation beep (`barcode-success.wav`).
   - The item's **Tag Number**, **Category**, **Gross Wt**, **Net Wt**, and **Purity** appear immediately.
   - The audit counter increments automatically.

### Handling Duplicate Scans:
- If a tag has already been counted in the current session, the **Validation Popup** will display an alert:
  > *"Duplicate Item: Tag #XXX has already been counted."*
- This prevents double-counting inventory.

---

## 4. Item Details & Price Estimation

1. Tap the **Item Details** tab.
2. Enter or scan any item tag number.
3. View the complete gemstone and metal breakdown:
   - Metal type (Gold 916 / 22KT, Diamond, Platinum, Silver)
   - Making charges / Wastage calculations
   - Stone weight deductions
4. Tap **PRINT ESTIMATE** to generate a receipt via thermal Bluetooth/network printer (`expo-print`).

---

## 5. Drawer Navigation & Changing Settings

Tap the **Hamburger Menu (≡)** at the top left of any screen to open the **AurixDrawer**:
- View currently active Shop Code and Branch.
- Switch to another Counter.
- View software version and system health.
- **Logout / Reset License**: Clears saved credentials to activate with a different serial key.
