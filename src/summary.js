// Pure budget math. Deliberately free of React / React Native imports so it can
// be unit-tested in plain Node (see __tests__/summary.test.js).

export const CATEGORY_KEYS = ['needs', 'wants', 'savings'];

/**
 * Format a number as Indian rupees, e.g. 4500 -> "₹4,500".
 * Negative values render as "-₹4,500" rather than "₹-4,500".
 */
export function fmt(n) {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? '-' : '';
  return sign + '₹' + Math.abs(v).toLocaleString('en-IN');
}

/**
 * Bucket expenses into needs / wants / savings.
 *
 * `spent` is money that actually left the household (needs + wants).
 * Savings-category entries (SIP, FD, emergency fund) are NOT spending — the
 * money is still yours, it just moved into a savings vehicle. Conflating the
 * two is what previously made "saved this month" understate by exactly the
 * amount you had saved.
 *
 * Unrecognised categories land in `other` instead of being silently counted as
 * savings, so a typo in the sheet is visible rather than misattributed.
 */
export function summarize(expenses) {
  let needs = 0, wants = 0, savings = 0, other = 0;

  for (const e of expenses || []) {
    if (!e) continue;
    const amt = Number(e.amount) || 0;
    switch (e.cat) {
      case 'needs': needs += amt; break;
      case 'wants': wants += amt; break;
      case 'savings': savings += amt; break;
      default: other += amt; break;
    }
  }

  const spent = needs + wants;
  const allocated = spent + savings + other;
  return { needs, wants, savings, other, spent, allocated };
}

/** Expenses belonging to a 0-indexed month + year. */
export function monthOf(expenses, month, year) {
  return (expenses || []).filter(e => e && e.month === month && e.year === year);
}

/**
 * What's left of this month's income after real spending.
 * `saved` may be negative — overspending is reported, not clamped to zero.
 */
export function savingsFromIncome(income, spent) {
  const inc = Number(income) || 0;
  const out = Number(spent) || 0;
  const saved = inc > 0 ? inc - out : 0;
  const pct = inc > 0 ? Math.round((saved / inc) * 100) : 0;
  return { income: inc, spent: out, saved, pct };
}

/** Progress toward the 20%-of-income savings target, clamped to 0..100. */
export function savingsBarPct(pct) {
  return Math.max(0, Math.min((Number(pct) || 0) / 20 * 100, 100));
}

/** Add `delta` months to a {month, year} pair, handling year rollover. */
export function addMonths(month, year, delta) {
  const total = year * 12 + month + delta;
  return { month: ((total % 12) + 12) % 12, year: Math.floor(total / 12) };
}

/** Total money spent per month for the trailing `count` months, oldest first.
 *  Savings-category entries are excluded — they are money moved, not spent. */
export function trailingTrend(expenses, now, count = 6) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const { month, year } = addMonths(now.getMonth(), now.getFullYear(), -i);
    const { spent } = summarize(monthOf(expenses, month, year));
    out.push({ month, year, total: spent, isCurrent: i === 0 });
  }
  return out;
}

/** Subcategory totals for a month, biggest first. */
export function breakdown(expenses, limit = 5) {
  const sub = {};
  for (const e of expenses || []) {
    if (!e) continue;
    const key = e.subcat || (e.cat === 'needs' ? 'Other needs'
      : e.cat === 'wants' ? 'Other wants'
      : e.cat === 'savings' ? 'Other savings'
      : 'Uncategorised');
    sub[key] = (sub[key] || 0) + (Number(e.amount) || 0);
  }
  return Object.entries(sub).sort((a, b) => b[1] - a[1]).slice(0, limit);
}
