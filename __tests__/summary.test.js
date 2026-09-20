import {
  fmt,
  summarize,
  monthOf,
  savingsFromIncome,
  savingsBarPct,
  addMonths,
  trailingTrend,
  breakdown,
} from '../src/summary';

const e = (cat, amount, extra = {}) => ({
  date: '19/04/2026', desc: 'x', cat, subcat: '', amount, who: 'Me', month: 3, year: 2026, ...extra,
});

describe('fmt', () => {
  it('formats rupees with Indian grouping', () => {
    expect(fmt(450)).toBe('₹450');
    expect(fmt(150000)).toBe('₹1,50,000');
  });

  it('puts the minus sign before the symbol', () => {
    expect(fmt(-4500)).toBe('-₹4,500');
  });

  it('handles junk without producing NaN', () => {
    expect(fmt(undefined)).toBe('₹0');
    expect(fmt('abc')).toBe('₹0');
  });
});

describe('summarize', () => {
  it('excludes savings-category entries from money spent', () => {
    const s = summarize([e('needs', 60000), e('wants', 30000), e('savings', 20000)]);
    expect(s.needs).toBe(60000);
    expect(s.wants).toBe(30000);
    expect(s.savings).toBe(20000);
    // Regression: savings contributions are not spending.
    expect(s.spent).toBe(90000);
    expect(s.allocated).toBe(110000);
  });

  it('buckets unknown categories as other instead of calling them savings', () => {
    const s = summarize([e('saving', 500), e('needs', 100)]);
    expect(s.savings).toBe(0);
    expect(s.other).toBe(500);
    expect(s.allocated).toBe(600);
  });

  it('survives empty, null and malformed rows', () => {
    expect(summarize([])).toEqual({ needs: 0, wants: 0, savings: 0, other: 0, spent: 0, allocated: 0 });
    expect(summarize(null).allocated).toBe(0);
    expect(summarize([null, e('needs', 'not-a-number')]).needs).toBe(0);
  });
});

describe('savingsFromIncome', () => {
  it('reports true savings, not income minus savings contributions', () => {
    // 150k income, 90k actually spent, 20k parked in a SIP.
    const s = savingsFromIncome(150000, 90000);
    expect(s.saved).toBe(60000);
    expect(s.pct).toBe(40);
  });

  it('reports overspending as negative rather than clamping to zero', () => {
    const s = savingsFromIncome(100000, 120000);
    expect(s.saved).toBe(-20000);
    expect(s.pct).toBe(-20);
  });

  it('returns zeros when income has not been entered', () => {
    expect(savingsFromIncome('', 5000)).toMatchObject({ saved: 0, pct: 0 });
  });
});

describe('savingsBarPct', () => {
  it('caps at the 20% target and floors at zero', () => {
    expect(savingsBarPct(10)).toBe(50);
    expect(savingsBarPct(20)).toBe(100);
    expect(savingsBarPct(60)).toBe(100);
    expect(savingsBarPct(-15)).toBe(0);
  });
});

describe('addMonths', () => {
  it('rolls forward across a year boundary', () => {
    expect(addMonths(11, 2026, 1)).toEqual({ month: 0, year: 2027 });
  });

  it('rolls backward across a year boundary', () => {
    expect(addMonths(0, 2026, -1)).toEqual({ month: 11, year: 2025 });
  });

  it('handles multi-year jumps', () => {
    expect(addMonths(0, 2026, -25)).toEqual({ month: 11, year: 2023 });
  });
});

describe('monthOf', () => {
  it('filters on both month and year', () => {
    const rows = [e('needs', 100, { month: 3, year: 2026 }), e('needs', 200, { month: 3, year: 2025 })];
    expect(monthOf(rows, 3, 2026)).toHaveLength(1);
    expect(monthOf(rows, 3, 2026)[0].amount).toBe(100);
  });
});

describe('trailingTrend', () => {
  it('returns 6 months oldest first, with the current month last', () => {
    const now = new Date(2026, 3, 15); // April 2026
    const t = trailingTrend([e('needs', 500, { month: 3, year: 2026 })], now);
    expect(t).toHaveLength(6);
    expect(t[0]).toMatchObject({ month: 10, year: 2025 });
    expect(t[5]).toMatchObject({ month: 3, year: 2026, total: 500, isCurrent: true });
    expect(t.filter(m => m.isCurrent)).toHaveLength(1);
  });

  it('excludes savings contributions from the spend trend', () => {
    const now = new Date(2026, 3, 15);
    const t = trailingTrend([
      e('needs', 500, { month: 3, year: 2026 }),
      e('savings', 900, { month: 3, year: 2026 }),
    ], now);
    expect(t[5].total).toBe(500);
  });
});

describe('breakdown', () => {
  it('sorts by amount and respects the limit', () => {
    const rows = [
      e('needs', 100, { subcat: '🛒 Groceries' }),
      e('wants', 900, { subcat: '🍕 Dining out' }),
      e('needs', 500, { subcat: '🏠 Rent' }),
    ];
    const b = breakdown(rows, 2);
    expect(b).toHaveLength(2);
    expect(b[0][0]).toBe('🍕 Dining out');
    expect(b[1][0]).toBe('🏠 Rent');
  });

  it('names the fallback bucket per category', () => {
    expect(breakdown([e('savings', 10, { subcat: '' })])[0][0]).toBe('Other savings');
  });
});
