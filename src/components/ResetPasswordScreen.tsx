import { useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onUpdatePassword: (password: string) => Promise<{ error: AuthError | null }>
}

const s = {
  container: { minHeight: '100vh', background: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { background: '#fff', borderRadius: '16px', padding: '32px 24px', width: '100%', maxWidth: '380px', boxShadow: '0 4px 20px rgba(45,80,22,0.12)' },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '26px', margin: '0 0 8px', textAlign: 'center' as const },
  sub: { color: 'var(--clr-secondary)', textAlign: 'center' as const, fontSize: '14px', margin: '0 0 24px', lineHeight: '1.5' },
  label: { display: 'block', fontWeight: '600', color: 'var(--clr-primary)', marginBottom: '6px', fontSize: '14px' },
  input: { width: '100%', padding: '11px 12px', border: '2px solid #c8e6c9', borderRadius: '8px', fontSize: '16px', marginBottom: '14px', boxSizing: 'border-box', fontFamily: 'inherit' } as React.CSSProperties,
  btn: { width: '100%', padding: '13px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Georgia, serif' } as React.CSSProperties,
  err: { color: 'var(--clr-error)', fontSize: '13px', marginBottom: '10px' },
}

export default function ResetPasswordScreen({ onUpdatePassword }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setErr('')
    if (password.length < 6) { setErr('Lösenordet måste vara minst 6 tecken.'); return }
    if (password !== confirm) { setErr('Lösenorden matchar inte.'); return }
    setLoading(true)
    const { error } = await onUpdatePassword(password)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setDone(true)
  }

  if (done) return (
    <div style={s.container}><div style={s.card}>
      <h1 style={s.title}>Veckoplanen</h1>
      <div style={{ fontSize: '44px', textAlign: 'center', margin: '0 0 16px' }}>✅</div>
      <p style={{ ...s.sub, color: 'var(--clr-primary)', fontWeight: '600' }}>Lösenordet är uppdaterat!</p>
      <p style={s.sub}>Du är inloggad och kan börja använda appen.</p>
    </div></div>
  )

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Veckoplanen</h1>
        <p style={s.sub}>Välj ett nytt lösenord för ditt konto.</p>
        <label style={s.label}>Nytt lösenord</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minst 6 tecken" autoFocus />
        <label style={s.label}>Bekräfta lösenord</label>
        <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Samma lösenord igen" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        {err && <p style={s.err}>{err}</p>}
        <button style={s.btn} onClick={handleSubmit} disabled={loading}>{loading ? 'Sparar...' : 'Spara nytt lösenord'}</button>
      </div>
    </div>
  )
}
