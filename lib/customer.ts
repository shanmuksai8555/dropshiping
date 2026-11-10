import type { Customer } from './checkout-snapshot';
import { cleanText, isIndianStateCode, isValidEmail, isValidPincode, normaliseIndianMobile } from './validation';

export function validateCustomer(raw: unknown): { customer?: Customer; errors: Record<string, string> } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const name = cleanText(b.name, 80);
  const phone = normaliseIndianMobile(b.phone);
  const email = cleanText(b.email, 120).toLowerCase();
  const address1 = cleanText(b.address1, 200);
  const address2 = cleanText(b.address2, 200);
  const city = cleanText(b.city, 80);
  const state = typeof b.state === 'string' ? b.state : '';
  const pincode = typeof b.pincode === 'string' ? b.pincode.trim() : '';
  if (name.length < 2) errors.name = 'Please enter your full name.';
  if (!phone) errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (address1.length < 5) errors.address1 = 'Enter your house/flat and street.';
  if (city.length < 2) errors.city = 'Enter your city or town.';
  if (!isIndianStateCode(state)) errors.state = 'Choose your state.';
  if (!isValidPincode(pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.';
  if (Object.keys(errors).length) return { errors };
  return { customer: { name, phone: phone!, email, address1, address2, city, state, pincode }, errors };
}
