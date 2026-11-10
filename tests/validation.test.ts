import { describe, expect, it } from 'vitest';
import { cleanText, isValidPincode, normaliseIndianMobile } from '@/lib/validation';

describe('normaliseIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['91-98765-43210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['(+91) 6000000000', '+916000000000'],
    ['0091 9876543210', '+919876543210'],
  ])('accepts %s', (raw, want) => expect(normaliseIndianMobile(raw)).toBe(want));

  it.each(['', '12345', '5876543210', '98765432101', '+1 9876543210', '+92 9876543210', 'abcdefghij', '98765 4321x'])('rejects %s', (raw) =>
    expect(normaliseIndianMobile(raw)).toBeNull(),
  );
  it('rejects non-strings', () => {
    expect(normaliseIndianMobile(9876543210 as unknown)).toBeNull();
    expect(normaliseIndianMobile(undefined)).toBeNull();
  });
});

describe('isValidPincode', () => {
  it('accepts 6 digits not starting with 0', () => {
    expect(isValidPincode('560001')).toBe(true);
    expect(isValidPincode('110011')).toBe(true);
  });
  it('rejects others', () => {
    for (const p of ['060001', '56000', '5600011', '56O001', '']) expect(isValidPincode(p)).toBe(false);
  });
});

describe('cleanText', () => {
  it('strips control chars, collapses whitespace and caps length', () => {
    expect(cleanText('  Asha\u0000\n  Rao ')).toBe('Asha Rao');
    expect(cleanText('x'.repeat(200), 10)).toHaveLength(10);
    expect(cleanText(42)).toBe('');
  });
});
