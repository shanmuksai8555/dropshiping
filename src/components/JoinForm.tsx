import { useState, type FormEvent } from 'react';

// Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. Spaces and dashes allowed.
export function normaliseIndianMobile(raw: string): string | null {
  const s = raw.replace(/[\s()-]/g, '');
  const m = s.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return m ? `+91${m[1]}` : null;
}

export default function JoinForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [done, setDone] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const n = name.trim();
    if (n.length < 2) next.name = 'Please enter your name.';
    const wa = normaliseIndianMobile(phone);
    if (!wa) next.phone = 'Enter a 10-digit Indian mobile number, with or without +91.';
    setErrors(next);
    if (Object.keys(next).length || !wa) return;
    // TODO(lead-capture): POST /api/lead { name: n, whatsapp: wa, source: 'homepage-vip' }
    // which appends a row to the Google Sheet (see PRD). Not wired yet: NO network call is made
    // and nothing is stored. Keep this TODO until the endpoint exists.
    setDone(n.split(' ')[0]);
  };

  return (
    <section className="section join" id="join" aria-labelledby="join-h">
      <div className="join__card">
        <div className="join__copy">
          <span className="eyebrow">WhatsApp VIP list</span>
          <h2 id="join-h">New drops, on WhatsApp first.</h2>
          <p>Leave your name and number. When the list opens, it is where we will share new arrivals.</p>
          <p className="join__note">Preview build: this form does not save or send anything yet.</p>
        </div>
        {done ? (
          <div className="join__thanks" role="status">
            <span className="join__tick" aria-hidden="true">✓</span>
            <h3>Thanks, {done}.</h3>
            <p>You are on the list. (Preview only: nothing was actually saved.)</p>
            <button className="btn btn--ghost" onClick={() => { setDone(null); setName(''); setPhone(''); }}>Add another number</button>
          </div>
        ) : (
          <form className="join__form" onSubmit={submit} noValidate>
            <label className="field">
              <span>Name</span>
              <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} placeholder="Your name" />
              {errors.name && <small id="err-name" className="field__err">{errors.name}</small>}
            </label>
            <label className="field">
              <span>WhatsApp number</span>
              <div className="field__phone">
                <span aria-hidden="true">+91</span>
                <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'err-phone' : undefined} placeholder="98765 43210" />
              </div>
              {errors.phone && <small id="err-phone" className="field__err">{errors.phone}</small>}
            </label>
            <button className="btn btn--gold btn--block" type="submit">Join the list</button>
          </form>
        )}
      </div>
    </section>
  );
}
