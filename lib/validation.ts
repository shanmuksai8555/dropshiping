// Client-safe validators shared by forms and API routes.

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. Spaces, dots, dashes and brackets allowed. */
export function normaliseIndianMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/[\s().-]/g, '');
  const m = s.match(/^(?:\+91|0091|91|0)?([6-9]\d{9})$/);
  return m ? `+91${m[1]}` : null;
}

/** Indian PIN code: 6 digits, first digit 1-9. */
export const isValidPincode = (raw: unknown) => typeof raw === 'string' && /^[1-9][0-9]{5}$/.test(raw.trim());

export const isValidEmail = (raw: unknown) =>
  typeof raw === 'string' && raw.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());

/** Trim, collapse whitespace, strip control characters, cap length. */
export function cleanText(raw: unknown, max = 120): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// WooCommerce state codes for India (WC core i18n/states.php).
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];
export const isIndianStateCode = (c: unknown) => typeof c === 'string' && INDIAN_STATES.some((s) => s.code === c);
