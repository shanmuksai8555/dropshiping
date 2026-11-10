'use client';
import { useState, type FormEvent } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { normaliseIndianMobile } from '@/lib/validation';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; first: string } | { kind: 'unavailable' } | { kind: 'error'; message: string };

export default function JoinForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('all');
  const [company, setCompany] = useState(''); // honeypot
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const n = name.trim();
    if (n.length < 2) next.name = 'Please enter your name.';
    const wa = normaliseIndianMobile(phone);
    if (!wa) next.phone = 'Enter a 10-digit Indian mobile number, with or without +91.';
    setErrors(next);
    if (Object.keys(next).length || !wa) return;
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, phone: wa, interest, source: 'homepage-join', company }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) return setState({ kind: 'done', first: n.split(' ')[0] });
      if (j.code === 'not_configured') return setState({ kind: 'unavailable' });
      if (j.code === 'invalid' && j.errors) {
        setErrors(j.errors);
        return setState({ kind: 'idle' });
      }
      setState({ kind: 'error', message: j.message ?? 'Something went wrong. Please try again.' });
    } catch {
      setState({ kind: 'error', message: 'Network error. Please check your connection and try again.' });
    }
  };

  const reset = () => {
    setState({ kind: 'idle' });
    setName('');
    setPhone('');
  };

  return (
    <section className="section join" id="join" aria-labelledby="join-h">
      <div className="join__card">
        <div className="join__copy">
          <span className="eyebrow">WhatsApp VIP list</span>
          <h2 id="join-h">New drops, on WhatsApp first.</h2>
          <p>Leave your name and number. When the list opens, it is where we will share new arrivals.</p>
          <p className="join__note">Your name and number are added to our sign-up sheet.</p>
        </div>
        {state.kind === 'done' ? (
          <div className="join__thanks" role="status">
            <span className="join__tick" aria-hidden="true">
              ✓
            </span>
            <h3>Thanks, {state.first}.</h3>
            <p>You are on the list.</p>
            <button className="btn btn--ghost" onClick={reset}>
              Add another number
            </button>
          </div>
        ) : state.kind === 'unavailable' ? (
          <div className="join__thanks" role="status">
            <h3>Sign-ups aren’t open yet.</h3>
            <p>The list isn’t connected on this site yet, so nothing was saved. Please check back soon.</p>
            <button className="btn btn--ghost" onClick={() => setState({ kind: 'idle' })}>
              Back
            </button>
          </div>
        ) : (
          <form className="join__form" onSubmit={submit} noValidate>
            <label className="field">
              <span>Name</span>
              <input name="name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} placeholder="Your name" />
              {errors.name && (
                <small id="err-name" className="field__err">
                  {errors.name}
                </small>
              )}
            </label>
            <label className="field">
              <span>WhatsApp number</span>
              <div className="field__phone">
                <span aria-hidden="true">+91</span>
                <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'err-phone' : undefined} placeholder="98765 43210" />
              </div>
              {errors.phone && (
                <small id="err-phone" className="field__err">
                  {errors.phone}
                </small>
              )}
            </label>
            <label className="field">
              <span>Most interested in</span>
              <select className="join__select" name="interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
                <option value="all">Everything</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hp" aria-hidden="true">
              Company
              <input tabIndex={-1} autoComplete="off" name="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <button className="btn btn--gold btn--block" type="submit" disabled={state.kind === 'sending'}>
              {state.kind === 'sending' ? 'Joining…' : 'Join the list'}
            </button>
            {state.kind === 'error' && (
              <p className="form__status form__status--err" role="alert">
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
