# Family budget

A shared family expense tracker for Android. Two users log daily expenses that sync to a Google Sheet using Google Apps Script.

## Features

- PIN lock. Four digit screen lock on open, with escalating lockout after repeated wrong entries.
- Expense log. Add expenses with amount, description, category, subcategory, and payer.
- Input sanitization. Sanitizes spreadsheet formula prefixes to prevent cell formula execution in Google Sheets.
- Bounds validation. Enforces amount ceilings and description length limits to prevent sheet corruption.
- Month navigation. Browse expenses by month with a grouped daily view.
- 50/30/20 overview. Proportional donut chart of the Needs, Wants, and Savings split, with monthly income tracking and a savings target bar.
- Six month trend. Bar chart of monthly spending.
- Auto sync. Refreshes every 60 seconds from Google Sheets, with pull to refresh.
- Explicit sync state. The status bar displays the exact backend error instead of a generic offline label.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | React Native (Expo SDK 57) |
| Core | React 19.2, React Native 0.86 |
| Navigation | React Navigation 6 (Bottom Tabs) |
| Charts | react-native-svg |
| Local storage | AsyncStorage |
| Backend | Google Apps Script Web App |
| Database | Google Sheets |
| Build system | EAS Build (Expo Cloud) |
| Test suite | Jest and jest-expo |

## Project structure

```
budgetApp/
├── App.js                       # Root: PIN gate, expense state, sync loop
├── app.json                     # Expo configuration and plugin settings
├── eas.json                     # EAS build profiles (APK preview, production)
├── INSTALL_APK_GUIDE.md         # Step by step installation and ADB guide
├── src/
│   ├── constants.js             # Config, validation, colors, categories
│   ├── api.js                   # Google Sheets API: fetch, save, sanitization
│   ├── summary.js               # Budget math (unit tested)
│   └── screens/
│       ├── PinScreen.js         # PIN lock with persisted lockout
│       ├── ExpensesScreen.js    # Expense list and entry modal
│       └── OverviewScreen.js    # Donut chart, savings, trend
├── __tests__/
│   ├── summary.test.js          # Budget calculations and date handling
│   └── security.test.js         # Formula injection defense tests
└── scripts/
    └── purge-git-history.sh     # Scrub leaked secrets from git history
```

## Setup

1. Clone the repository.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` from the template:
   ```bash
   cp .env.example .env && chmod 600 .env
   ```

4. Populate `.env`:
   ```bash
   EXPO_PUBLIC_SHEET_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   EXPO_PUBLIC_PASSWORD=your-api-password
   EXPO_PUBLIC_PIN=0000
   ```

5. Start the development server for Expo Go:
   ```bash
   npx expo start -c
   ```

## Tests

Run the test suite:
```bash
npm test
```

Twenty-six unit tests cover:
- Money math in `src/summary.js`: category splits, income math, savings progress, month boundaries, and rolling trend calculations.
- Security in `src/api.js`: spreadsheet formula injection neutralization (`=`, `+`, `-`, `@`, `\t`) and clean round-trip unescaping.

## Building the standalone APK

Do not compile native Android code locally if your machine has limited resources. Use EAS Cloud:

1. Push your environment variables to EAS Cloud once:
   ```bash
   npx eas-cli env:push preview --path .env --force
   ```
   Git ignores `.env` for security. Pushing variables to EAS allows cloud workers to compile the APK with your configuration without committing secrets to GitHub.

2. Run the build:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

3. Download the finished APK using the link or QR code printed in the terminal. Detailed USB and ADB instructions are in [INSTALL_APK_GUIDE.md](INSTALL_APK_GUIDE.md).

## Resolved build and runtime issues

- **Expo Go version mismatch.** Upgraded the project from SDK 54 to SDK 57 (`react-native` 0.86.3, `react` 19.2.3) so the project runs directly in the latest Expo Go client from Google Play.
- **Missing credentials in cloud builds.** Cloud builds previously failed on launch with a configuration error because `.env` is gitignored. Resolved by uploading project variables to EAS Cloud with `eas env:push`.
- **Package signature conflicts on install.** Devices with multiple profiles (work profiles, cloned apps, second space) retain older package signatures after personal uninstalls. Resolved by targeting and removing package residue across specific user IDs with `adb shell pm uninstall --user <id>`.
- **Spreadsheet formula injection.** Resolved by sanitizing cell inputs that start with formula operators before dispatching the POST payload to Google Sheets.
- **Local compilation strain.** Resolved by offloading Android builds to EAS Cloud workers rather than compiling locally via Gradle.

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SHEET_URL` | Google Apps Script deployment URL. Must begin with `https://`. |
| `EXPO_PUBLIC_PASSWORD` | API password for backend requests. |
| `EXPO_PUBLIC_PIN` | Four digit unlock PIN. |

Keep `.env` restricted with `chmod 600` and never commit it to source control.

## Security

Read [SECURITY.md](SECURITY.md) before relying on the PIN.

Expo inlines `EXPO_PUBLIC_*` values into the JavaScript bundle at build time. The sheet URL, the API password, and the PIN are recoverable in plain text from any compiled APK. The PIN stops someone holding an unlocked phone from viewing logs, but does not provide database encryption. The API password controls read and write access to the underlying spreadsheet.

## Known limitations

- **No delete or edit in app.** Mistakes must be edited in the Google Sheet directly. `fetchExpenses` preserves negative amounts so correction entries are possible.
- **No offline queue.** Network failures abort the write; the app does not cache entries offline for retry.
- **Single query fetch.** All rows load in one request, which slows down as the sheet grows beyond several thousand rows.
- **Overview month view.** The Overview tab displays the current calendar month and does not contain a month picker.
- **Zero indexed months.** Google Sheets stores months 0-indexed (January = 0), matching `Date.prototype.getMonth()`.
- **Apps Script deployments.** Backend changes require creating a new deployment version in the Apps Script editor; saving the script alone does not publish updates.
