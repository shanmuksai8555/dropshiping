// RFC 4180 CSV with spreadsheet formula-injection protection.

const PHONE_OR_NUMBER = /^[+-]?\d[\d\s.-]*$/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // A cell starting with = + - @ (or tab/CR) can run as a formula in Excel/Sheets. Neutralise it with a
  // leading apostrophe, except for plain numbers and phone numbers like +919876543210 or -12.5.
  if (/^[=+\-@\t\r]/.test(s) && !PHONE_OR_NUMBER.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(',');

export const toCsv = (header: string[], rows: unknown[][]) =>
  [csvRow(header), ...rows.map(csvRow)].join('\r\n') + '\r\n';
