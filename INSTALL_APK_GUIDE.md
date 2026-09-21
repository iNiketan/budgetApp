# How to install the APK on Android

This guide covers how to build and install the Family Budget app directly on your Android phone, either using Expo Cloud (EAS Build) or directly from your laptop via ADB.

---

## Method 1. Install via USB with ADB

This method installs an APK file from your laptop onto a connected phone with one command.

### 1. Install ADB on Ubuntu
```bash
sudo apt update
sudo apt install -y adb
```

### 2. Enable USB debugging on your phone
1. Open Settings.
2. Open About phone.
3. Tap Build number 7 times until developer mode unlocks.
4. Go to Settings > System > Developer options.
5. Turn on USB debugging. On Xiaomi, Redmi, or Poco devices, also turn on Install via USB.

### 3. Connect your phone to the laptop
1. Connect the phone with a USB data cable.
2. Accept the USB debugging prompt on the phone screen. Select "Always allow from this computer".

### 4. Verify the connection
Run:
```bash
adb devices
```
The output lists your device ID followed by `device`.

### 5. Install the APK
Run:
```bash
adb install -r <path-to-apk-file>.apk
```

If Android returns `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, an existing build signed with a different key remains on the device. Work profiles or cloned spaces can keep the package active even after deleting it from the main home screen. To clear it:
```bash
adb shell pm list users
adb shell pm uninstall --user 10 com.josh_bsd_23.FamilyBudget
adb uninstall com.josh_bsd_23.FamilyBudget
```
Then run the install command again.

---

## Method 2. Build and install with EAS Cloud

Expo builds the APK on remote Linux workers. This requires no local Android compilation and uses no laptop CPU or memory.

### 1. Install EAS CLI and log in
```bash
npm install -g eas-cli
npx eas-cli login
```

### 2. Push environment variables to EAS
EAS Cloud builds cannot read your local `.env` file because Git ignores it. Upload your variables to your Expo project dashboard once:
```bash
npx eas-cli env:push preview --path .env --force
```

### 3. Start the build
```bash
npx eas-cli build --platform android --profile preview
```
The build completes in 6 to 9 minutes. The terminal prints a download link and a QR code.

### 4. Install on your phone
Open the link in Chrome on your phone, download the APK, and tap Install.

---

## Method 3. Run with Expo Go during development

Expo Go is for day to day development with hot reloading. It runs the JavaScript bundle inside the Expo Go container without installing a standalone app icon.

1. Install Expo Go from the Google Play Store.
2. Start the development server on your laptop:
   ```bash
   npx expo start -c
   ```
3. Open Expo Go and scan the terminal QR code. If your phone and laptop use different Wi-Fi networks, run `npx expo start --tunnel` instead.

---

## Common errors

| Error | Cause and fix |
|---|---|
| `adb: command not found` | Run `sudo apt install -y adb`. |
| `device unauthorized` | Unlock your phone screen and accept the USB debugging authorization prompt. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An older APK with a different certificate exists on the phone. Check all profiles with `adb shell pm list users` and run `adb shell pm uninstall --user <id> com.josh_bsd_23.FamilyBudget`. |
| `INSTALL_FAILED_USER_RESTRICTED` | Turn on "Install via USB" in Developer options. |
| Configuration problem screen on launch | The APK was built without environment variables. Run `npx eas-cli env:push preview --path .env --force` and rebuild. |
| Play Protect warning | Tap "More details", then tap "Install anyway". |
