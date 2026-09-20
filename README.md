# Family Budget

A shared family expense tracker for Android. Two users log daily expenses that sync to a Google Sheet via Google Apps Script.

## Features

- **PIN lock** — 4-digit screen lock on app open, with escalating lockout after repeated wrong entries
- **Expense log** — add expenses with amount, description, category, subcategory, and who paid
- **Month navigation** — browse expenses by month with a grouped daily view
- **50/30/20 overview** — proportional donut of the Needs / Wants / Savings split, plus a monthly income tracker and a savings target bar
- **6-month trend** — bar chart of monthly spending
- **Auto-sync** — refreshes every 60 seconds from Google Sheets, with pull-to-refresh
- **Explicit sync state** — the status bar shows the real reason a sync failed instead of a generic "offline?"

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React Native (Expo SDK 57) |
| Navigation | React Navigation 6 (Bottom Tabs) |
| Charts | react-native-svg |
| Local storage | AsyncStorage |
| Backend | Google Apps Script Web App |
| Database | Google Sheets |
| Build | EAS Build (Expo Cloud) |
| Tests | Jest + jest-expo |

## Project Structure

```
budgetApp/
├── App.js                       # Root: PIN gate, expense state, sync loop
├── babel.config.js
├── src/
│   ├── constants.js             # Config, validation, colors, categories
│   ├── api.js                   # Google Sheets API: fetch + save
│   ├── summary.js               # Pure budget math (unit-tested)
│   └── screens/
│       ├── PinScreen.js         # PIN lock with lockout
│       ├── ExpensesScreen.js    # Tab 1 — expense list + add modal
│       └── OverviewScreen.js    # Tab 2 — donut, savings, trend
├── __tests__/
│   └── summary.test.js
└── scripts/
    └── purge-git-history.sh     # One-off: scrub leaked secrets from history
```

## Setup

1. Clone the repo

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file from the template and lock it down:
   ```
   cp .env.example .env && chmod 600 .env
   ```

4. Fill in your values in `.env`:
   ```
   EXPO_PUBLIC_SHEET_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   EXPO_PUBLIC_PASSWORD=your-api-password
   EXPO_PUBLIC_PIN=0000
   ```

5. Start the dev server
   ```
   npx expo start --tunnel
   ```

## Tests

```bash
npm test
```

Covers the money math in `src/summary.js` — how expenses are bucketed into
Needs / Wants / Savings, what counts as *spent* versus *saved*, month
arithmetic across year boundaries, and the 6-month trend. `summary.js` has no
React or React Native imports, which is what makes it testable in isolation.

The money math is worth testing specifically because the same numbers drive the
savings hero card and the donut, and a regression there is silent — the app
still renders, it just lies.

## Build APK

```bash
eas build -p android --profile preview
```

Rebuild after **any** change, including `.env` changes.

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SHEET_URL` | Google Apps Script deployment URL (must be `https://`) |
| `EXPO_PUBLIC_PASSWORD` | API password for the backend |
| `EXPO_PUBLIC_PIN` | 4-digit app unlock PIN |

`.env` is gitignored and should be `chmod 600`. Never commit it.

## Security

Read **[SECURITY.md](SECURITY.md)** before assuming the PIN protects the data.

The short version: Expo inlines every `EXPO_PUBLIC_*` value into the JS bundle
at build time, so **the sheet URL, the API password and the PIN are all
recoverable in plain text from a built APK**. The PIN is a convenience lock
against someone picking up an unlocked phone — it is not data protection. The
API password is the real credential, and it grants full read/write access to
the sheet.

If the credentials have ever been committed to this repository, they must be
treated as permanently public and rotated. See `scripts/purge-git-history.sh`.

## Known Limitations

- **No delete or edit.** A mistake can only be corrected by editing the Sheet
  directly. `fetchExpenses` keeps negative amounts so a correction entry is at
  least possible.
- **No offline queue.** A save with no connectivity fails with an error; the
  expense is not queued for later.
- **No pagination.** All expenses are fetched in a single call, which will get
  slow past roughly a thousand rows.
- **Overview always shows the current month** — unlike the Expenses tab, it has
  no month selector yet.
- **Month is 0-indexed** in the Sheet (January = 0), matching JS `Date.getMonth()`.
- **Apps Script needs a new deployment version** for backend changes to take
  effect; a plain Save does nothing.
