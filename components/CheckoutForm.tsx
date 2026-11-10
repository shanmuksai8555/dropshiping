'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cart, cartSubtotal, useCart } from '@/lib/cart-store';
import { formatINR } from '@/lib/format';
import { INDIAN_STATES, isValidEmail, isValidPincode, normaliseIndianMobile } from '@/lib/validation';

export type PaymentsMode = 'not_configured' | 'catalog_missing' | 'test' | 'live';

type Fields = { name: string; phone: string; email: string; address1: string; address2: string; city: string; state: string; pincode: string };
const EMPTY: Fields = { name: '', phone: '', email: '', address1: '', address2: '', city: '', state: '', pincode: '' };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (evt: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckoutJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'));
    document.body.appendChild(s);
  });
}

function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!normaliseIndianMobile(f.phone)) e.phone = 'Enter a 10-digit Indian mobile number.';
  if (!isValidEmail(f.email)) e.email = 'Enter a valid email address.';
  if (f.address1.trim().length < 5) e.address1 = 'Enter your house/flat and street.';
  if (f.city.trim().length < 2) e.city = 'Enter your city or town.';
  if (!f.state) e.state = 'Choose your state.';
  if (!isValidPincode(f.pincode)) e.pincode = 'Enter a valid 6-digit PIN code.';
  return e;
}

export default function CheckoutForm({ mode }: { mode: PaymentsMode }) {
  const items = useCart();
  const router = useRouter();
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<{ busy: boolean; msg?: string; err?: boolean }>({ busy: false });
  const enabled = mode === 'test' || mode === 'live';

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const field = (k: keyof Fields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, wide = false) => (
    <label className={`field${wide ? ' field--wide' : ''}`}>
      <span>{label}</span>
      <input name={k} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `err-${k}` : undefined} {...props} />
      {errors[k] && (
        <small id={`err-${k}`} className="field__err">
          {errors[k]}
        </small>
      )}
    </label>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return setStatus({ busy: false, msg: 'Please fix the highlighted fields.', err: true });
    if (!enabled) return;
    setStatus({ busy: true, msg: 'Preparing your payment…' });
    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: f, items: items.map((i) => ({ productId: i.productId, variationId: i.variationId, qty: i.qty })) }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        if (j.errors) setErrors(j.errors);
        return setStatus({ busy: false, msg: j.message ?? 'Could not start the payment.', err: true });
      }
      await loadCheckoutJs();
      const rzp = new window.Razorpay!({
        key: j.keyId,
        order_id: j.orderId,
        amount: j.amount,
        currency: j.currency,
        name: j.storeName,
        description: `${items.length} item${items.length === 1 ? '' : 's'}`,
        prefill: j.prefill,
        theme: { color: '#c9a46a' },
        modal: { ondismiss: () => setStatus({ busy: false, msg: 'Payment cancelled. Your cart is unchanged.' }) },
        handler: async (r: RazorpayResponse) => {
          setStatus({ busy: true, msg: 'Confirming your payment…' });
          const vr = await fetch('/api/checkout/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
          const vj = await vr.json().catch(() => ({}));
          if (vr.ok && vj.ok) {
            cart.clear();
            router.push(vj.redirect);
          } else {
            setStatus({ busy: false, err: true, msg: vj.message ?? `Payment ${r.razorpay_payment_id} received, but the order could not be confirmed yet. Please keep this ID.` });
          }
        },
      });
      rzp.on('payment.failed', (r) => setStatus({ busy: false, err: true, msg: r.error?.description ?? 'Payment failed. You have not been charged for this attempt.' }));
      rzp.open();
    } catch (err) {
      setStatus({ busy: false, err: true, msg: (err as Error).message || 'Something went wrong.' });
    }
  };

  if (!items.length)
    return (
      <div className="empty">
        <p>Your cart is empty.</p>
        <Link className="btn btn--gold" href="/shop">
          Browse the shop
        </Link>
      </div>
    );

  return (
    <div className="cart">
      <form className="form" onSubmit={submit} noValidate>
        {mode === 'not_configured' && (
          <p className="notice notice--warn" role="status">
            <span className="notice__tag">Setup</span>
            <span>
              <strong>Payments not configured.</strong> Razorpay keys are not set on this server, so checkout is switched off. You can fill in the form, but no payment can be taken.
            </span>
          </p>
        )}
        {mode === 'catalog_missing' && (
          <p className="notice notice--warn" role="status">
            <span className="notice__tag">Setup</span>
            <span>
              <strong>Store catalog not connected.</strong> Live payments are disabled while the site shows sample products.
            </span>
          </p>
        )}
        {mode === 'test' && (
          <p className="notice" role="status">
            <span className="notice__tag">Test mode</span>
            <span>Razorpay is in test mode. No real money is charged.</span>
          </p>
        )}
        <fieldset>
          <legend>Contact</legend>
          <div className="form__grid">
            {field('name', 'Full name', { autoComplete: 'name', maxLength: 80 }, true)}
            {field('phone', 'Mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', placeholder: '98765 43210', maxLength: 16 })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email', maxLength: 120 })}
          </div>
        </fieldset>
        <fieldset>
          <legend>Delivery address</legend>
          <div className="form__grid">
            {field('address1', 'House / flat, street', { autoComplete: 'address-line1', maxLength: 200 }, true)}
            {field('address2', 'Area, landmark (optional)', { autoComplete: 'address-line2', maxLength: 200 }, true)}
            {field('city', 'City / town', { autoComplete: 'address-level2', maxLength: 80 })}
            {field('pincode', 'PIN code', { inputMode: 'numeric', autoComplete: 'postal-code', maxLength: 6, pattern: '[1-9][0-9]{5}' })}
            <label className="field field--wide">
              <span>State</span>
              <select name="state" value={f.state} onChange={set('state')} autoComplete="address-level1" aria-invalid={!!errors.state}>
                <option value="">Choose…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.state && <small className="field__err">{errors.state}</small>}
            </label>
          </div>
        </fieldset>
        <button className="btn btn--gold btn--block" type="submit" disabled={!enabled || status.busy}>
          {enabled ? (status.busy ? 'Please wait…' : 'Pay with Razorpay') : 'Payments not configured'}
        </button>
        <p className="field__hint">UPI, cards and netbanking are handled by Razorpay. We never see your card details.</p>
        <p className={`form__status${status.err ? ' form__status--err' : ''}`} role="status" aria-live="polite">
          {status.msg}
        </p>
      </form>
      <aside className="summary" aria-label="Order summary">
        <h2>Your order</h2>
        <ul className="summary__lines">
          {items.map((i) => (
            <li key={`${i.productId}:${i.variationId ?? 0}`}>
              <span>
                {i.name} × {i.qty}
                {i.variationLabel ? ` (${i.variationLabel})` : ''}
              </span>
              <span>{formatINR(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="summary__row summary__row--total">
          <span>Subtotal</span>
          <span>{formatINR(cartSubtotal(items))}</span>
        </div>
        <p className="summary__note">The amount you pay is calculated on our server from current prices and shown in the Razorpay window before you confirm.</p>
      </aside>
    </div>
  );
}
