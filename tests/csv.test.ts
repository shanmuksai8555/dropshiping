import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';

describe('csvCell', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('Bengaluru')).toBe('Bengaluru');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
  it('quotes commas, quotes and newlines (RFC 4180)', () => {
    expect(csvCell('12, MG Road')).toBe('"12, MG Road"');
    expect(csvCell('Near "Big" Park')).toBe('"Near ""Big"" Park"');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('+cmd')).toBe("'+cmd");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('\tx')).toBe("'\tx");
  });
  it('keeps phone numbers and negative numbers usable', () => {
    expect(csvCell('+919876543210')).toBe('+919876543210');
    expect(csvCell('-12.50')).toBe('-12.50');
  });
});

describe('toCsv', () => {
  it('joins with CRLF and ends with a newline', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
