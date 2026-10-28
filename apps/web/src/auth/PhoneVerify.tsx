import { useState } from 'react';

/// Phone verification step (T2.3 contract): POST /v1/me/phone/otp → enter 6 digits → POST /verify.
export function PhoneVerifyPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validPhone = /^\+852\d{8}$/.test(phone.replace(/\s/g, ''));

  async function send() {
    setErr(null);
    const res = await fetch('/v1/me/phone/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.replace(/\s/g, '') }) });
    if (res.ok) setSent(true);
    else setErr(`Couldn't send code (${res.status}). Try again in a bit.`);
  }

  async function verify() {
    setErr(null);
    const res = await fetch('/v1/me/phone/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (res.ok) location.href = '/app';
    else setErr('Wrong code — check the SMS and try again.');
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-bold">Verify your phone</h1>
      <p className="mt-2 text-sm text-muted">One account per verified HK number. Your number is never shown to anyone.</p>
      {!sent ? (
        <div className="mt-6 space-y-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+852 9123 4567" className="w-full rounded-lg border border-line bg-transparent px-3 py-2" />
          {!validPhone && phone.length > 0 && <p className="text-sm text-muted">HK format: +852 followed by 8 digits.</p>}
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={!validPhone} onClick={send} className="w-full rounded-lg px-4 py-2 font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#08110c' }}>Send code</button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-center text-xl tracking-widest" />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={code.length !== 6} onClick={verify} className="w-full rounded-lg px-4 py-2 font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#08110c' }}>Verify</button>
          <button onClick={send} className="w-full text-sm text-muted underline">Resend</button>
        </div>
      )}
    </main>
  );
}
