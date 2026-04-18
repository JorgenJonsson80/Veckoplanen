// Inloggningsskärm – stöder lösenord, skapa konto och magic link
import { useState } from 'react';

const s = {
  container: {
    minHeight: '100vh', background: '#f0f7ef',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '24px',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '32px 24px',
    width: '100%', maxWidth: '380px',
    boxShadow: '0 4px 20px rgba(45,80,22,0.12)',
  },
  title: { fontFamily: 'Georgia, serif', color: '#2d5016', fontSize: '28px', margin: '0 0 24px', textAlign: 'center' },
  tabs: { display: 'flex', borderBottom: '2px solid #e8f5e9', marginBottom: '24px' },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontSize: '15px', cursor: 'pointer', color: '#6b8f5e', fontWeight: '600',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
  },
  tabActive: { color: '#2d5016', borderBottom: '2px solid #2d5016' },
  label: { display: 'block', fontWeight: '600', color: '#2d5016', marginBottom: '6px', fontSize: '14px' },
  input: {
    width: '100%', padding: '11px 12px', border: '2px solid #c8e6c9',
    borderRadius: '8px', fontSize: '16px', marginBottom: '14px',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  inputErr: { borderColor: '#c62828' },
  primaryBtn: {
    width: '100%', padding: '13px', background: '#2d5016', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '4px',
  },
  secondaryBtn: {
    width: '100%', padding: '11px', background: 'none', color: '#6b8f5e',
    border: '1.5px solid #c8e6c9', borderRadius: '10px', fontSize: '14px',
    cursor: 'pointer', marginTop: '10px',
  },
  err: { color: '#c62828', fontSize: '13px', marginBottom: '10px' },
  info: { color: '#6b8f5e', fontSize: '13px', marginBottom: '14px', lineHeight: '1.5' },
  successIcon: { fontSize: '44px', textAlign: 'center', margin: '0 0 14px' },
  successText: { color: '#444', textAlign: 'center', lineHeight: '1.6', fontSize: '15px' },
  backBtn: {
    background: 'none', border: 'none', color: '#6b8f5e', fontSize: '13px',
    cursor: 'pointer', marginTop: '18px', display: 'block', width: '100%',
    textAlign: 'center', textDecoration: 'underline',
  },
};

export default function AuthScreen({ onSignInWithPassword, onSignUp, onSignInWithMagicLink, onResetPassword }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'magic' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  function reset() { setErr(''); setEmail(''); setPassword(''); setMagicSent(false); setRegisterDone(false); }

  async function handleLogin() {
    setErr('');
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return; }
    if (password.length < 6) { setErr('Lösenordet måste vara minst 6 tecken.'); return; }
    setLoading(true);
    const { error } = await onSignInWithPassword(email, password);
    setLoading(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Fel e-post eller lösenord.' : 'Något gick fel. Försök igen.');
  }

  async function handleRegister() {
    setErr('');
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return; }
    if (password.length < 6) { setErr('Lösenordet måste vara minst 6 tecken.'); return; }
    setLoading(true);
    const { error } = await onSignUp(email, password);
    setLoading(false);
    if (error) { setErr('Något gick fel. E-postadressen kanske redan används.'); return; }
    setRegisterDone(true);
  }

  async function handleForgotPassword() {
    setErr('');
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return; }
    setLoading(true);
    const { error } = await onResetPassword(email);
    setLoading(false);
    if (error) { setErr('Något gick fel. Försök igen.'); return; }
    setMagicSent(true); // återanvänd "kolla inkorgen"-skärmen
  }

  async function handleMagicLink() {
    setErr('');
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return; }
    setLoading(true);
    const { error } = await onSignInWithMagicLink(email);
    setLoading(false);
    if (error) { setErr('Något gick fel. Försök igen.'); return; }
    setMagicSent(true);
  }

  // Bekräftelseskärm efter registrering
  if (registerDone) return (
    <div style={s.container}><div style={s.card}>
      <h1 style={s.title}>Veckoplanen</h1>
      <div style={s.successIcon}>📬</div>
      <p style={s.successText}>Kontot skapat! Kolla din inkorg och klicka på bekräftelselänken, sedan kan du logga in.</p>
      <button style={s.backBtn} onClick={() => { setTab('login'); reset(); }}>Tillbaka till inloggning</button>
    </div></div>
  );

  // Bekräftelseskärm efter magic link
  if (magicSent) return (
    <div style={s.container}><div style={s.card}>
      <h1 style={s.title}>Veckoplanen</h1>
      <div style={s.successIcon}>📬</div>
      <p style={s.successText}>Kolla din inkorg! Vi skickade en inloggningslänk till <strong>{email}</strong>.</p>
      <button style={s.backBtn} onClick={() => { setTab('login'); reset(); }}>Försök med annan adress</button>
    </div></div>
  );

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Veckoplanen</h1>

        {/* Flikar */}
        <div style={s.tabs}>
          {[
            { key: 'login', label: 'Logga in' },
            { key: 'register', label: 'Skapa konto' },
          ].map(({ key, label }) => (
            <button
              key={key}
              style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }}
              onClick={() => { setTab(key); reset(); }}
            >{label}</button>
          ))}
        </div>

        {/* Logga in med lösenord */}
        {tab === 'login' && (
          <>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label style={s.label}>Lösenord</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleLogin} disabled={loading}>
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
            <button style={s.secondaryBtn} onClick={() => { setTab('magic'); reset(); }}>
              📬 Skicka magic link istället
            </button>
            <button style={{ ...s.secondaryBtn, border: 'none', color: '#aaa', fontSize: '13px', marginTop: '4px' }} onClick={() => { setTab('forgot'); reset(); }}>
              Glömt lösenord?
            </button>
          </>
        )}

        {/* Skapa konto */}
        {tab === 'register' && (
          <>
            <p style={s.info}>Välj ett lösenord du kommer ihåg. Du behöver bekräfta e-postadressen efteråt.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label style={s.label}>Lösenord</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minst 6 tecken" onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleRegister} disabled={loading}>
              {loading ? 'Skapar konto...' : 'Skapa konto'}
            </button>
          </>
        )}

        {/* Glömt lösenord */}
        {tab === 'forgot' && (
          <>
            <p style={s.info}>Ange din e-post så skickar vi en länk för att återställa lösenordet.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleForgotPassword} disabled={loading}>
              {loading ? 'Skickar...' : 'Skicka återställningslänk'}
            </button>
            <button style={s.secondaryBtn} onClick={() => { setTab('login'); reset(); }}>
              ← Tillbaka till inloggning
            </button>
          </>
        )}

        {/* Magic link */}
        {tab === 'magic' && (
          <>
            <p style={s.info}>Ange din e-post så skickar vi en inloggningslänk – inget lösenord behövs.</p>
            <label style={s.label}>E-postadress</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleMagicLink()} />
            {err && <p style={s.err}>{err}</p>}
            <button style={s.primaryBtn} onClick={handleMagicLink} disabled={loading}>
              {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
            </button>
            <button style={s.secondaryBtn} onClick={() => { setTab('login'); reset(); }}>
              ← Tillbaka till lösenord
            </button>
          </>
        )}
      </div>
    </div>
  );
}
