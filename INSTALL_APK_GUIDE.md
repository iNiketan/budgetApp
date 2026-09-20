# How to Install APK on Android Directly from Laptop (No Expo Login Required)

This guide provides multiple ways to install your Android APK directly onto your Android phone from your laptop without needing an Expo account, Expo Go, or logging in to EAS Cloud.

---

## Quick Reference: Your Current APK

Your project root already has an APK file ready:
- **File:** `build-1778013427166.apk`
- **Location:** `/run/media/nikesia/Cartuse/vibe/budgetApp/build-1778013427166.apk`

---

## Method 1: Install via USB Cable using ADB (Recommended & Fastest)

This is the standard developer method. It installs the app in seconds with one terminal command.

### Step 1: Install `adb` on your laptop (Ubuntu/Debian)
Open a terminal and run:
```bash
sudo apt update
sudo apt install -y adb
```

### Step 2: Enable Developer Options & USB Debugging on your Android Phone
1. Open **Settings** on your phone.
2. Go to **About Phone** (or **About Device**).
3. Tap **Build Number** 7 times until you see a prompt: *"You are now a developer!"*.
4. Go back to **Settings** > **System** > **Developer Options** (or **Additional Settings** > **Developer Options**).
5. Turn ON **USB Debugging**.
   - *Note for Xiaomi / Redmi / POCO (MIUI / HyperOS):* Also turn ON **"Install via USB"**.

### Step 3: Connect Phone to Laptop via USB
1. Connect your phone using a USB data cable.
2. A popup will appear on your phone screen: **"Allow USB debugging?"**.
3. Check **"Always allow from this computer"** and tap **Allow** / **OK**.

### Step 4: Verify Connection
In your laptop terminal, run:
```bash
adb devices
```
You should see your device listed, for example:
```
List of devices attached
988a1b2c3d4e5f6    device
```
*(If it says `unauthorized`, unlock your phone screen and accept the popup prompt).*

### Step 5: Install the APK
From your project root directory, run:
```bash
adb install -r build-1778013427166.apk
```
- `-r` flag allows re-installing and updating the app while keeping user data.
- Once finished, you will see `Success`. The app will appear on your phone's home screen / app drawer!

---

## Method 2: Direct USB File Transfer (MTP - No Terminal / No ADB)

If you don't want to install ADB or use the terminal:

1. Connect your phone to your laptop with a USB cable.
2. Swipe down from the top of your phone screen, tap the **"Charging this device via USB"** notification, and select **"File Transfer" (MTP)**.
3. On your laptop, open your file manager (Files / Nautilus). Your phone will appear in the sidebar under devices.
4. Copy `build-1778013427166.apk` into your phone's **Download** folder.
5. On your phone:
   - Open the **Files** (or **Files by Google**) app.
   - Go to **Downloads**.
   - Tap `build-1778013427166.apk`.
   - If prompted *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and enable **"Allow from this source"**.
   - Tap **Install**.

---

## Method 3: Install over Local Wi-Fi (No Cable Needed)

If your laptop and phone are connected to the same Wi-Fi network, you can serve the APK from your laptop and download it directly in your phone's browser.

### Step 1: Start a temporary local web server on your laptop
In your project directory, run:
```bash
python3 -m http.server 8000
```

### Step 2: Find your laptop's local IP address
Open another terminal tab and run:
```bash
hostname -I | awk '{print $1}'
```
*(Example output: `192.168.1.45`)*

### Step 3: Download and Install on your phone
1. Open Chrome or any browser on your Android phone.
2. Visit:
   ```
   http://<YOUR_LAPTOP_IP>:8000/build-1778013427166.apk
   ```
   *(e.g., `http://192.168.1.45:8000/build-1778013427166.apk`)*
3. The APK will download directly to your phone.
4. Tap the downloaded file notification, grant permission to install unknown apps if prompted, and tap **Install**.
5. Stop the python server on your laptop anytime by pressing `Ctrl + C`.

---

## Method 4: Wireless ADB (Android 11+)

If you want to use ADB without plugging in a cable:

1. On your phone, go to **Settings > Developer options > Wireless debugging** and turn it ON.
2. Tap on **Wireless debugging** > **Pair device with pairing code**.
3. It will display an IP address, Port, and a 6-digit pairing code.
4. On your laptop:
   ```bash
   adb pair <IP>:<PORT>
   # Enter the 6-digit code when prompted
   ```
5. Look at the IP and port shown under "IP address & Port" on the main Wireless debugging screen, then run:
   ```bash
   adb connect <IP>:<PORT>
   ```
6. Install the APK:
   ```bash
   adb install -r build-1778013427166.apk
   ```

---

## Methods to Build & Install WITH Expo

If you want to use the official Expo ecosystem, you have three primary workflows:

### Method A: EAS Cloud Build (Generates Standalone APK via Expo Cloud)
This method offloads the build to Expo's cloud servers, meaning you don't need Android Studio or heavy tools running on your laptop.

1. **Install EAS CLI** (if not installed):
   ```bash
   npm install -g eas-cli
   ```
2. **Log into your Expo account**:
   ```bash
   npx eas-cli login
   ```
   *(If you don't have an Expo account yet, register for free at [expo.dev](https://expo.dev)).*

3. **Link your project**:
   ```bash
   npx eas-cli project:init
   ```

4. **Start the Android APK Cloud Build**:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   - EAS will package and compile your app on Expo's build servers.
   - When the build finishes, your terminal will display a **Download URL** and a **QR Code**.

5. **Install on Phone**:
   - Open your phone camera or QR scanner and scan the terminal QR code.
   - Or open the link in your phone's browser, download the APK, and tap **Install**.

---

### Method B: Test Instantly with Expo Go (No APK Build Required)
For rapid day-to-day development and testing with instant hot-reloading:

1. **Install Expo Go on your phone**:
   - Download **Expo Go** from Google Play Store on your Android phone.
2. **Start the Expo development server on your laptop**:
   ```bash
   npx expo start
   ```
   *(Tip: If your phone and laptop are on different networks or mobile hotspots, run `npx expo start --tunnel`).*
3. **Open the app on your phone**:
   - Scan the terminal QR code with your phone camera or the Expo Go app.
   - The app launches immediately, and any code changes you save update in real-time!

---

### Method C: One-Step Build & Install via Expo CLI (`expo run:android`)
If your phone is plugged in via USB:

1. Connect your phone via USB with **USB Debugging enabled**.
2. Run:
   ```bash
   npx expo run:android
   ```
3. Expo will automatically compile the native code, install the APK directly to your phone via ADB, and start the development server.

---

## Methods to Build a NEW APK Locally (WITHOUT Expo Cloud/Login)

When you want to build locally on your laptop without logging into Expo or using cloud servers:

### Option 1: Native Android Gradle Build (100% Offline)
Since your project already has the `android/` directory:

1. Build Release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   cd ..
   ```
   The generated APK will be at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```
2. Install directly via ADB:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

*(For a Debug build, use `./gradlew assembleDebug` instead).*

### Option 2: EAS Local Build (Uses Local Hardware, No Cloud Queue)
```bash
npx eas-cli build --platform android --profile preview --local
```

---

## Troubleshooting Common Errors

| Error Message | Cause & Fix |
|---|---|
| `adb: command not found` | Run `sudo apt update && sudo apt install -y adb`. |
| `device unauthorized` | Unlock phone screen and tap "Always allow" on the USB debugging prompt. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An older version with a different signing key is installed. Uninstall the previous app from your phone first: `adb uninstall <package_name>` or long-press app icon and tap Uninstall. |
| `INSTALL_FAILED_USER_RESTRICTED` | On Xiaomi/MIUI/HyperOS devices, enable **"Install via USB"** inside Developer Options (requires SIM card active or Xiaomi account once). |
| `INSTALL_FAILED_TEST_ONLY` | Run `adb install -t -r build-1778013427166.apk` to allow test APK builds. |
| App blocked by Play Protect | Tap **"More details"** -> **"Install anyway"**. |

