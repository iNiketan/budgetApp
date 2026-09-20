const rawUrl = process.env.EXPO_PUBLIC_SHEET_URL;
const rawPassword = process.env.EXPO_PUBLIC_PASSWORD;
const rawPin = process.env.EXPO_PUBLIC_PIN;

export const SHEET_URL = (rawUrl || '').trim();
export const PASSWORD = (rawPassword || '').trim();
export const PIN = (rawPin || '').trim();

export const PIN_LENGTH = 4;

// PIN lockout. Without this the 4-digit PIN is brute-forceable by hand in
// minutes; the keypad is the only thing between a stranger holding the phone
// and the family's full expense history.
export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_STEPS_MS = [30_000, 60_000, 120_000, 300_000, 900_000];

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const SUBCATS = {
  needs: ['🏠 Rent','🛒 Groceries','⚡ Utilities','🚗 Transport','💊 Medical','📱 Phone/Net','🏫 School fees'],
  wants: ['🍕 Dining out','🎬 Movies','🛍️ Shopping','✈️ Travel','🎮 Games','☕ Coffee','💇 Salon'],
  savings: ['📈 SIP / MF','🏦 FD / RD','🚨 Emergency fund','🏡 Home goal','🎓 Education fund'],
};

export const COLORS = {
  bg: '#F5F3EE',
  surface: '#FFFFFF',
  surface2: '#F0EDE6',
  text: '#1A1814',
  text2: '#6B6760',
  text3: '#9E9B96',
  border: 'rgba(26,24,20,0.1)',
  accent: '#2D5A3D',
  accentLight: '#E8F0EB',
  needs: '#2D5A3D',
  needsBg: '#E8F0EB',
  wants: '#C84B2F',
  wantsBg: '#FAEAE6',
  savings: '#1A4A6E',
  savingsBg: '#E6EEF5',
  warn: '#8A6D1B',
};

/**
 * Validate the build-time config.
 *
 * Expo inlines EXPO_PUBLIC_* into the JS bundle, so a missing value fails at
 * runtime in ways that are hard to diagnose: an absent PIN silently locks the
 * app forever, and an absent SHEET_URL just looks like "offline". Surfacing the
 * problem explicitly beats both.
 */
function validateConfig() {
  const problems = [];

  if (!SHEET_URL) {
    problems.push('EXPO_PUBLIC_SHEET_URL is not set.');
  } else if (!/^https:\/\//i.test(SHEET_URL)) {
    problems.push('EXPO_PUBLIC_SHEET_URL must be an https:// URL — refusing to send the password in clear text.');
  }

  if (!PASSWORD) {
    problems.push('EXPO_PUBLIC_PASSWORD is not set.');
  }

  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(PIN)) {
    problems.push(`EXPO_PUBLIC_PIN must be exactly ${PIN_LENGTH} digits.`);
  }

  return problems;
}

export const CONFIG_PROBLEMS = validateConfig();
export const CONFIG_ERROR = CONFIG_PROBLEMS.length ? CONFIG_PROBLEMS.join('\n') : null;
