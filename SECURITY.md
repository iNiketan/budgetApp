# Security

## Reporting

This is a private family app. If you find a problem, open an issue or contact
the maintainer directly — please do not post working credentials in an issue.

## Threat model — read this before trusting the PIN

It is important to be honest about what this app does and does not protect.

**The Sheet is the security boundary.** Anyone holding the Apps Script URL and
the API password has full read *and* write access to the family's expense
sheet, from anywhere, with or without the app.

**The PIN is a convenience lock, not encryption.** It stops someone who picks
up an unlocked phone from browsing the expense list. It does not protect the
data, because:

- The PIN is a 4-digit code (10,000 possibilities).
- Expo inlines every `EXPO_PUBLIC_*` variable into the JS bundle at build time.
  Verified by building the app and reading the exported Hermes bundle: the
  sheet URL, the API password and the PIN are all recoverable as plain strings
  from the shipped `.apk`.

So: **anyone who has the APK, or the git history, has the credentials.** There
is no client-side trick that fixes this — a hash would be brute-forced in
milliseconds, and the password has to be sent in the clear to the backend for
the app to work at all. Treat the APK as containing secrets.

Because of that, the practical controls are:

| Control | Status |
|---|---|
| Keep `.env` out of git and off shared machines | done — gitignored, `chmod 600` |
| Keep the password out of the repo *history* | see "Rotation" below |
| Throttle PIN guessing | done — 5 attempts, then escalating lockout |
| A real credential per device, revocable server-side | **not implemented** — see below |

## Rotation (required)

The Apps Script URL, API password and PIN were committed in `src/constants.js`
and pushed to a public repository. **They must be treated as permanently
public**, because a history rewrite cannot recall forks, clones or caches.

If you have not already done so:

1. **Change the Apps Script password.** Google Sheet → Extensions → Apps Script
   → change the password constant → Deploy → Manage deployments → pencil icon
   → Version: **New version** → Deploy.
   A plain *Save* does not take effect. This is the single most common way
   people think they have rotated a credential and have not.
2. **Change `EXPO_PUBLIC_PIN` and `EXPO_PUBLIC_PASSWORD`** in `.env`, then
   `chmod 600 .env`.
3. **Rebuild the APK and reinstall on both phones.** Every APK built with the
   old `.env` still contains the old password in plain text.
4. **Scrub the history** — `scripts/purge-git-history.sh` (read its header
   first; it force-pushes and is destructive).
5. **Consider making the repository private, or deleting and recreating it.**
   That is the only way to drop GitHub's cached copies of the old commits.

Until step 3 is done on *both* phones, the old credentials are still live on a
device you may no longer control.

## Why the password still travels in a URL

Reads currently use `GET ...?password=...`, which means the password can land
in Apps Script execution logs and any intermediary log along the way.

Moving reads to a POST body is a one-line client change **plus** an Apps Script
change (`doPost` must handle a `read` action). It is deliberately not done here
because it would break the live app for whoever rebuilds without redeploying
the backend first. If you take it on, update the Apps Script deployment in the
same sitting.

## Hardening still worth doing

- **Per-device tokens instead of one shared password.** Would let you revoke a
  single lost phone. Requires backend work.
- **Delete/edit an expense.** Right now a mistake can only be fixed by editing
  the Sheet by hand, and `fetchExpenses` keeps negative amounts precisely so a
  correction entry is possible.
- **Validate on the server.** `doPost` should reject writes from a device the
  owner has not approved, and should not trust client-supplied `month`/`year`.

## What changed in this review

- `.env` restricted to `chmod 600` and confirmed untracked; `.gitignore` now
  covers `.env.*`, `dist/` and `coverage/`.
- PIN keypad now locks out after 5 failed attempts with escalating backoff
  (30s → 15m), persisted to AsyncStorage so force-quitting cannot reset it.
- Build-time config is validated at startup. A missing or non-`https`
  `SHEET_URL`, a missing password, or a malformed PIN now shows an explicit
  error screen instead of a permanently locked app or a silent "offline".
- All backend calls have a 20s timeout with an actual error message, plus HTTP
  status and JSON validation, so an Apps Script HTML error page no longer
  surfaces as an opaque parse error.
- Response bodies are no longer echoed into error messages.