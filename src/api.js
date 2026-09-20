import { SHEET_URL, PASSWORD } from './constants';

// Apps Script cold starts can take several seconds. Without a ceiling a hung
// request leaves the Save button spinning forever with no way out.
const TIMEOUT_MS = 20000;

/**
 * Single fetch path for both reads and writes: hard timeout, HTTP status check,
 * and JSON validation. Apps Script returns an HTML error page for auth
 * failures and quota errors, and `res.json()` on that produced an opaque
 * "JSON Parse error" instead of the real problem.
 */
async function callBackend(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    throw new Error(err && err.name === 'AbortError'
      ? 'The backend took too long to respond.'
      : 'Could not reach the backend.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Backend returned HTTP ${res.status}.`);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // Deliberately not echoing the body — it can contain the sheet URL.
    throw new Error('Backend returned an unexpected non-JSON response.');
  }

  if (!json || json.status !== 'success') {
    throw new Error((json && json.message) || 'Backend rejected the request.');
  }

  return json;
}

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Parse the sheet's DD/MM/YYYY date string. Returns null when unusable. */
function parseSheetDate(value) {
  const m = DATE_RE.exec(String(value == null ? '' : value).trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { day, month, year };
}

function toInt(value) {
  const n = parseInt(String(value == null ? '' : value).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchExpenses() {
  const json = await callBackend(`${SHEET_URL}?password=${encodeURIComponent(PASSWORD)}`);

  return (json.data || []).map(row => {
    const parsed = parseSheetDate(row['Date']);
    const month = toInt(row['Month']);
    const year = toInt(row['Year']);

    return {
      date: row['Date'] || '',
      desc: row['Description'] || '',
      cat: String(row['Category'] || '').trim().toLowerCase(),
      subcat: row['Subcategory'] || '',
      amount: Number.parseFloat(row['Amount']) || 0,
      who: row['Paid By'] || 'Me',
      // Fall back to the Date column: a blank Month/Year cell previously became
      // 0 and made the row permanently invisible to both screens' year filter.
      month: month !== null ? month : (parsed ? parsed.month : 0),
      year: year !== null ? year : (parsed ? parsed.year : 0),
    };
  })
  // Drop blank rows, but keep negative amounts — a refund is a real entry and
  // there is no other way to correct an over-entry.
  .filter(e => e.amount !== 0);
}

export async function saveExpense(entry) {
  await callBackend(SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...entry, password: PASSWORD }),
  });
  return true;
}
