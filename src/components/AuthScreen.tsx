import { useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onSignInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>
  onSignUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  onSignInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  onResetPassword: (email: string) => Promise<{ error: AuthError | null }>
  onSignInWithGoogle: () => Promise<void>
}

const s = {
  container: {
    minHeight: '100vh', background: 'var(--clr-bg)',
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'flex-start', padding: '32px 24px 48px',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '32px 24px',
    width: '100%', maxWidth: '380px',
    boxShadow: '0 4px 20px rgba(45,80,22,0.12)',
  },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '28px', margin: '0 0 24px', textAlign: 'center' as const },
  tabs: { display: 'flex', borderBottom: '2px solid #e8f5e9', marginBottom: '24px' },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontSize: '15px', cursor: 'pointer', color: 'var(--clr-secondary)', fontWeight: '600',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
  } as React.CSSProperties,
  tabActive: { color: 'var(--clr-primary)', borderBottom: '2px solid #2d5016' },
  label: { display: 'block', fontWeight: '600', color: 'var(--clr-primary)', marginBottom: '6px', fontSize: '14px' },
  input: {
    width: '100%', padding: '11px 12px', border: '2px solid #c8e6c9',
    borderRadius: '8px', fontSize: '16px', marginBottom: '14px',
    boxSizing: 'border-box', fontFamily: 'inherit',
  } as React.CSSProperties,
  primaryBtn: {
    width: '100%', padding: '13px', background: 'var(--clr-primary)', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '4px',
  } as React.CSSProperties,
  secondaryBtn: {
    width: '100%', padding: '11px', background: 'none', color: 'var(--clr-secondary)',
    border: '1.5px solid #c8e6c9', borderRadius: '10px', fontSize: '14px',
    cursor: 'pointer', marginTop: '10px',
  } as React.CSSProperties,
  err: { color: 'var(--clr-error)', fontSize: '13px', marginBottom: '10px' },
  info: { color: 'var(--clr-secondary)', fontSize: '13px', marginBottom: '14px', lineHeight: '1.5' },
  successIcon: { fontSize: '44px', textAlign: 'center' as const, margin: '0 0 14px' },
  successText: { color: '#444', textAlign: 'center' as const, lineHeight: '1.6', fontSize: '15px' },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--clr-secondary)', fontSize: '13px',
    cursor: 'pointer', marginTop: '18px', display: 'block', width: '100%',
    textAlign: 'center' as const, textDecoration: 'underline',
  },
}

export default function AuthScreen({ onSignInWithPassword, onSignUp, onSignInWithMagicLink, onResetPassword, onSignInWithGoogle }: Props) {
  const [tab, setTab] = useState<'login' | 'register' | 'magic' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [registerDone, setRegisterDone] = useState(false)

  function reset() { setErr(''); setEmail(''); setPassword(''); setMagicSent(false); setRegisterDone(false) }

  async function handleLogin() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    if (password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    setLoading(true)
    const { error } = await onSignInWithPassword(email, password)
    setLoading(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Fel e-post eller lösenord.' : 'Något gick fel. Försök igen.')
  }

  async function handleRegister() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    if (password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    setLoading(true)
    const { error } = await onSignUp(email, password)
    setLoading(false)
    if (error) { setErr('Något gick fel. E-postadressen kanske redan används.'); return }
    setRegisterDone(true)
  }

  async function handleForgotPassword() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    setLoading(true)
    const { error } = await onResetPassword(email)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setMagicSent(true)
  }

  async function handleMagicLink() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    setLoading(true)
    const { error } = await onSignInWithMagicLink(email)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setMagicSent(true)
  }

  if (registerDone) return (
    <div style={s.container}><div style={s.card}>
      <h1 style={s.title}>Veckoplanen</h1>
      <div style={s.successIcon}>📬</div>
      <p style={s.successText}>Kontot skapat! Kolla din inkorg och klicka på bekräftelselänken, sedan kan du logga in.</p>
      <button style={s.backBtn} onClick={() => { setTab('login'); reset() }}>Tillbaka till inloggning</button>
    </div></div>
  )

  if (magicSent) return (
    <div style={s.container}><div style={s.card}>
      <h1 style={s.title}>Veckoplanen</h1>
      <div style={s.successIcon}>📬</div>
      <p style={s.successText}>Kolla din inkorg! Vi skickade en inloggningslänk till <strong>{email}</strong>.</p>
      <button style={s.backBtn} onClick={() => { setTab('login'); reset() }}>Försök med annan adress</button>
    </div></div>
  )

  return (
    <div style={s.container}>
      <div style={{ width: '100%', maxWidth: '380px', marginBottom: '28px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '32px', margin: '0 0 8px' }}>Veckoplanen</h1>
        <p style={{ color: 'var(--clr-secondary)', fontSize: '16px', margin: '0 0 28px', lineHeight: 1.4 }}>
          Planera veckans middagar och få en smart handlingslista — ensam eller tillsammans med familjen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          {([
            ['🍽', 'Välj veckans middagar', 'Fyll i rätterna dag för dag. Har du recept sparade fylls handlingslistan på automatiskt — men du kan också skriva in varor direkt.'],
            ['🛒', 'Handla utan stress', 'Alla ingredienser samlas i en lista sorterad efter dina butikshyllor. Bocka av medan du handlar.'],
            ['👨‍👩‍👧', 'Dela med familjen', 'Skapa ett familjerum och dela en länk — alla ser och redigerar samma lista i realtid.'],
          ] as const).map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: '12px', background: '#fff', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(45,80,22,0.07)' }}>
              <span style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>{icon}</span>
              <div>
                <strong style={{ color: 'var(--clr-primary)', fontSize: '14px', display: 'block', marginBottom: '3px' }}>{title}</strong>
                <span style={{ color: '#666', fontSize: '13px', lineHeight: 1.4 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <h1 style={{ ...s.title, fontSize: '20px', margin: '0 0 20px' }}>Kom igång — det tar en minut</h1>

        <button
          onClick={onSignInWithGoogle}
          style={{ width: '100%', padding: '12px', marginBottom: '16px', background: '#fff', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#333' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
          Fortsätt med Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e8f5e9' }} />
          <span style={{ color: '#bbb', fontSize: '12px' }}>eller med e-post</span>
          <div style={{ flex: 1, height: '1px', background: '#e8f5e9' }} />
        </div>

        <div style={s.tabs}>
          {([['login', 'Logga in'], ['register', 'Skapa konto']] as const).map(([key, label]) => (
            <button
              key={key}
              style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }}
              onClick={() => { setTab(key); reset() }}
            >{label}</button>
          ))}
        </div>

        {tab === 'login' && (
          <>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label style={s.label}>Lösenord</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleLogin} disabled={loading}>{loading ? 'Loggar in...' : 'Logga in'}</button>
            <button style={s.secondaryBtn} onClick={() => { setTab('magic'); reset() }}>📬 Skicka magic link istället</button>
            <button style={{ ...s.secondaryBtn, border: 'none', color: '#aaa', fontSize: '13px', marginTop: '4px' }} onClick={() => { setTab('forgot'); reset() }}>Glömt lösenord?</button>
          </>
        )}

        {tab === 'register' && (
          <>
            <p style={s.info}>Välj ett lösenord du kommer ihåg. Du behöver bekräfta e-postadressen efteråt.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label style={s.label}>Lösenord</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minst 8 tecken" onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleRegister} disabled={loading}>{loading ? 'Skapar konto...' : 'Skapa konto'}</button>
          </>
        )}

        {tab === 'forgot' && (
          <>
            <p style={s.info}>Ange din e-post så skickar vi en länk för att återställa lösenordet.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleForgotPassword} disabled={loading}>{loading ? 'Skickar...' : 'Skicka återställningslänk'}</button>
            <button style={s.secondaryBtn} onClick={() => { setTab('login'); reset() }}>← Tillbaka till inloggning</button>
          </>
        )}

        {tab === 'magic' && (
          <>
            <p style={s.info}>Ange din e-post så skickar vi en inloggningslänk – inget lösenord behövs.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleMagicLink()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleMagicLink} disabled={loading}>{loading ? 'Skickar...' : 'Skicka inloggningslänk'}</button>
            <button style={s.secondaryBtn} onClick={() => { setTab('login'); reset() }}>← Tillbaka till lösenord</button>
          </>
        )}
      </div>
    </div>
  )
}
