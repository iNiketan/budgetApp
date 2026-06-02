# Family Budget

A shared family expense tracker for Android. Two users log daily expenses that sync to a Google Sheet via Google Apps Script.

## Features

- **PIN lock** — 4-digit screen lock on app open
- **Expense log** — add expenses with amount, description, category, subcategory, and who paid
- **Month navigation** — browse expenses by month with grouped daily view
- **50/30/20 overview** — donut chart showing Needs / Wants / Savings split + monthly income tracker
- **6-month趋势** — bar chart of monthly spending
- **Auto-sync** — refreshes every 60 seconds from Google Sheets

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Navigation | React Navigation 6 (Bottom Tabs) |
| Local storage | AsyncStorage |
| Backend | Google Apps Script Web App |
| Database | Google Sheets |
| Build | EAS Build (Expo Cloud) |

## Setup

1. Clone the repo

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file from the template:
   ```
   cp .env.example .env
   ```

4. Fill in your values in `.env`:
   ```
   EXPO_PUBLIC_SHEET_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   EXPO_PUBLIC_PASSWORD=your-api-password
   EXPO_PUBLIC_PIN=your-4-digit-pin
   ```

5. Start the dev server
   ```
   npx expo start --tunnel
   ```

## Build APK

```bash
eas build -p android --profile preview
```

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SHEET_URL` | Google Apps Script deployment URL |
| `EXPO_PUBLIC_PASSWORD` | API password for the backend |
| `EXPO_PUBLIC_PIN` | 4-digit app unlock PIN |

Variables prefixed with `EXPO_PUBLIC_` are automatically available at runtime in Expo SDK 52+. `.env` is gitignored — never commit it.
