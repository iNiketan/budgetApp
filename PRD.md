# Family Budget App — Product Requirements Document (AI Context)

> This document is written for AI coding assistants (Cursor, GitHub Copilot, Claude, etc.).
> Read this fully before making any changes to the codebase.
> This is the single source of truth for what the app is, how it works, and what can be changed.

---

## 1. What This App Is

A family budget tracking Android app built with React Native (Expo). Two users — the owner and his wife — use it daily to log expenses. All data is stored in a Google Sheet via a Google Apps Script web app. The app is installed as a native APK on both phones.

There is also an HTML version of the same app hosted on Netlify, used as a web fallback.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo SDK 49) |
| Build Tool | EAS Build (Expo Application Services) |
| Navigation | React Navigation v6 (Bottom Tabs) |
| Local Storage | AsyncStorage (@react-native-async-storage) |
| Backend / Database | Google Apps Script Web App |
| Data Store | Google Sheets |
| Web Version | Vanilla HTML + CSS + JS (single file) |
| Web Hosting | Netlify |

---

## 3. Project Structure

```
budgetApp/
├── App.js                          # Root component, handles PIN gate + navigation
├── index.js                        # Expo entry point
├── app.json                        # Expo config
├── eas.json                        # EAS build config
├── package.json                    # Dependencies
├── src/
│   ├── constants.js                # All shared constants (URL, PIN, colors, categories)
│   ├── api.js                      # Google Sheets API functions
│   └── screens/
│       ├── PinScreen.js            # PIN lock screen (shown on app open)
│       ├── ExpensesScreen.js       # Tab 1 — expense list + add modal
│       └── OverviewScreen.js       # Tab 2 — charts, salary, savings
└── assets/                         # App icons and splash screen
```

---

## 4. Google Sheets Backend

### Apps Script URL
Set via `EXPO_PUBLIC_SHEET_URL` in `.env`

### Password
All requests must include the password from `EXPO_PUBLIC_PASSWORD` (set in `.env`)

### Google Sheet Column Structure
| Column | Header | Example Value |
|---|---|---|
| A | Date | 19/04/2026 |
| B | Description | Swiggy dinner |
| C | Category | Wants |
| D | Subcategory | 🍕 Dining out |
| E | Amount | 450 |
| F | Paid By | Me / Wife / Joint |
| G | Month | 3 (0-indexed, April = 3) |
| H | Year | 2026 |

### API Calls (defined in `src/api.js`)

**GET — fetch all expenses**
```javascript
fetch(`${SHEET_URL}?password=${PASSWORD}`)
// Returns: { status: "success", data: [ { Date, Description, Category, ... } ] }
```

**POST — save new expense**
```javascript
fetch(SHEET_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({
    password, date, description, category,
    subcategory, amount, paidBy, month, year
  })
})
// Returns: { status: "success" }
```

---

## 5. App Flow

```
App Opens
    │
    ▼
PinScreen.js
  - Shows 4-dot indicator + numpad
  - PIN is defined in `.env` (`EXPO_PUBLIC_PIN`)
  - Wrong PIN: dots flash, 1 second reset
  - Correct PIN: calls onUnlock() → navigates to main app
    │
    ▼
App.js (after unlock)
  - Calls loadFromSheet() immediately
  - Sets up 60-second auto-refresh interval
  - Passes expenses state down to both screens
    │
    ├──► Tab 1: ExpensesScreen.js
    │      - Shows sync status bar at top
    │      - Month navigation (← current month →)
    │      - Summary pills: Needs / Wants / Savings totals
    │      - Scrollable expense list grouped by day
    │      - Pull-to-refresh (calls onRefresh)
    │      - Floating "+ Add Expense" button
    │      - Add modal (amount, description, category, subcategory, who paid)
    │      - On save: calls saveExpense() API + optimistically updates local state
    │
    └──► Tab 2: OverviewScreen.js
           - Monthly income input (persisted via AsyncStorage key: 'salary')
           - Budget hint: shows 50/30/20 breakdown based on income
           - Savings hero card: saved amount + percentage of income
           - Donut chart: Needs / Wants / Savings split (drawn on Canvas)
           - 6-month bar chart: total spending per month
           - Top categories breakdown with progress bars
```

---

## 6. Constants (src/constants.js)

```javascript
SHEET_URL   // Google Apps Script URL (from EXPO_PUBLIC_SHEET_URL in .env)
PASSWORD    // API password (from EXPO_PUBLIC_PASSWORD in .env)
PIN         // App PIN (from EXPO_PUBLIC_PIN in .env)
MONTHS      // Array of month names
SUBCATS     // Object with needs/wants/savings arrays of subcategory strings
COLORS      // All color tokens used across the app
```

**To change PIN:** Update `EXPO_PUBLIC_PIN` in `.env`
**To change password:** Update `EXPO_PUBLIC_PASSWORD` in `.env` AND the Apps Script code in Google Sheets
**To add a subcategory:** Add a string to the relevant array in `SUBCATS`

---

## 7. Color System (src/constants.js → COLORS)

```javascript
bg:         '#F5F3EE'   // App background (warm off-white)
surface:    '#FFFFFF'   // Cards and modals
surface2:   '#F0EDE6'   // Secondary surfaces, unselected pills
text:       '#1A1814'   // Primary text
text2:      '#6B6760'   // Secondary text
text3:      '#9E9B96'   // Muted text, labels
border:     'rgba(26,24,20,0.1)'
accent:     '#2D5A3D'   // Primary green (tabs, buttons, savings hero)
accentLight:'#E8F0EB'   // Light green (selected who-pill)
needs:      '#2D5A3D'   // Dark green
needsBg:    '#E8F0EB'
wants:      '#C84B2F'   // Terracotta red
wantsBg:    '#FAEAE6'
savings:    '#1A4A6E'   // Navy blue
savingsBg:  '#E6EEF5'
```

---

## 8. Categories

### Needs
🏠 Rent, 🛒 Groceries, ⚡ Utilities, 🚗 Transport, 💊 Medical, 📱 Phone/Net, 🏫 School fees

### Wants
🍕 Dining out, 🎬 Movies, 🛍️ Shopping, ✈️ Travel, 🎮 Games, ☕ Coffee, 💇 Salon

### Savings
📈 SIP / MF, 🏦 FD / RD, 🚨 Emergency fund, 🏡 Home goal, 🎓 Education fund

---

## 9. State Management

State lives in `App.js` and is passed as props:

```javascript
expenses        // Array of all expense objects fetched from Google Sheet
loadData()      // Function to re-fetch all expenses from sheet
handleAdd(entry) // Optimistically adds a new expense to local state
```

Each expense object shape:
```javascript
{
  date: '19/04/2026',   // DD/MM/YYYY string
  desc: 'Swiggy dinner',
  cat: 'wants',          // lowercase: 'needs' | 'wants' | 'savings'
  subcat: '🍕 Dining out',
  amount: 450,           // number
  who: 'Me',             // 'Me' | 'Wife' | 'Joint'
  month: 3,              // 0-indexed
  year: 2026
}
```

---

## 10. Building and Deploying

### Run locally (requires Expo Go on phone)
```bash
npx expo start --tunnel
```

### Build Android APK
```bash
eas build -p android --profile preview
```
- Builds on Expo cloud servers (~12 minutes)
- Downloads as `.apk` file
- Install by sideloading (enable "Install from unknown sources" in Android settings)

### After any code change — rebuild APK
```bash
eas build -p android --profile preview
```

### Web version update
- Edit the single HTML file
- Drag and drop to Netlify (app.netlify.com/drop) to update

---

## 11. Known Issues and Constraints

- **No delete expense feature** — expenses can only be deleted by editing the Google Sheet directly
- **No edit expense feature** — same limitation
- **Month uses 0-indexed integers** — January = 0, December = 11. This matches JavaScript's `Date.getMonth()`
- **Apps Script freezes old deployments** — if you update the Apps Script backend code, you MUST create a "New version" in Deploy → Manage Deployments, not just save. Otherwise changes don't take effect
- **Offline mode** — the app does not queue failed requests. If there is no internet, save will throw an error and the expense is lost
- **No pagination** — all expenses are fetched in a single call. Will become slow if the sheet grows beyond ~1000 rows
- **Donut chart is canvas-based** — drawn manually in OverviewScreen, not using a chart library

---

## 12. Planned / Possible Features (Not Yet Built)

- Delete expense (swipe to delete in list)
- Edit expense
- Monthly budget limits per category with alerts
- Offline queue — save locally and sync when back online
- Export month as PDF
- Recurring expenses (auto-add monthly fixed costs like rent)
- Multiple currencies
- Dark mode

---

## 13. How to Make Changes

1. Edit the relevant file in `src/screens/` or `src/constants.js`
2. Test with `npx expo start` (requires Expo Go on phone + tunnel)
3. When ready: `eas build -p android --profile preview`
4. Download APK from the Expo build link
5. Install on both phones

**For backend changes** (adding a new column to the sheet, changing validation):
- Edit the Apps Script in Google Sheets → Extensions → Apps Script
- Save → Deploy → Manage Deployments → edit → New version → Deploy
- Update `src/api.js` to match

---

## 14. AI Assistant Instructions

When making changes to this codebase:

- **Always check `src/constants.js` first** — colors, categories, PIN, URL are all there
- **Do not change the Google Sheet column order** — the `doGet` function maps by header name, but `doPost` uses positional `appendRow`. Adding columns must be done carefully
- **Do not change the month encoding** — month is stored as 0-indexed integer matching JS `Date.getMonth()`
- **Preserve the optimistic update pattern** — `handleAdd()` in App.js adds to local state immediately so the UI feels instant, without waiting for the sheet to confirm
- **Keep styles in StyleSheet.create()** — do not use inline styles except for dynamic values
- **The app supports two users (Me / Wife / Joint)** — any feature involving "who paid" must preserve all three options
- **Do not introduce new navigation patterns** — the app uses bottom tabs only, no stack navigation
- **AsyncStorage key for salary is `'salary'`** — do not rename this or existing saved values will be lost

---

*Last updated: May 2026*
*App version: 1.0.0*
*Built with Expo SDK 54 / React Native 0.81*

## 15. Environment Variables

Create a `.env` file in the project root (see `.env.example` for the template):

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SHEET_URL` | Google Apps Script deployment URL |
| `EXPO_PUBLIC_PASSWORD` | API password for the Apps Script backend |
| `EXPO_PUBLIC_PIN` | 4-digit app unlock PIN |

These are loaded automatically by Expo (SDK 52+ supports `EXPO_PUBLIC_` prefix natively). **Never commit `.env` to git.**
