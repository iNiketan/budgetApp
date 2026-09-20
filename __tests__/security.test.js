import { sanitizeSheetString, desanitizeSheetString } from '../src/api';

describe('Formula / CSV Injection Defense', () => {
  it('neutralizes formulas starting with =', () => {
    expect(sanitizeSheetString('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
  });

  it('neutralizes formulas starting with +', () => {
    expect(sanitizeSheetString('+cmd|/C calc')).toBe("'+cmd|/C calc");
  });

  it('neutralizes formulas starting with -', () => {
    expect(sanitizeSheetString('-2+3+cmd')).toBe("'-2+3+cmd");
  });

  it('neutralizes formulas starting with @', () => {
    expect(sanitizeSheetString('@SUM(1,2)')).toBe("'@SUM(1,2)");
  });

  it('neutralizes formulas with tab or whitespace characters', () => {
    expect(sanitizeSheetString('\t=1+1')).toBe("'=1+1");
  });

  it('leaves safe strings untouched', () => {
    expect(sanitizeSheetString('Grocery shopping')).toBe('Grocery shopping');
    expect(sanitizeSheetString('Coffee at Starbucks')).toBe('Coffee at Starbucks');
    expect(sanitizeSheetString('1200')).toBe('1200');
  });

  it('desanitizes escaped strings back to original for UI display', () => {
    expect(desanitizeSheetString("'=SUM(A1:A10)")).toBe('=SUM(A1:A10)');
    expect(desanitizeSheetString("'+cmd|/C calc")).toBe('+cmd|/C calc');
    expect(desanitizeSheetString('Regular description')).toBe('Regular description');
  });

  it('handles null, undefined, and non-string inputs safely', () => {
    expect(sanitizeSheetString(null)).toBe('');
    expect(sanitizeSheetString(undefined)).toBe('');
    expect(sanitizeSheetString(123)).toBe('123');
    expect(desanitizeSheetString(null)).toBe('');
    expect(desanitizeSheetString(undefined)).toBe('');
  });
});
