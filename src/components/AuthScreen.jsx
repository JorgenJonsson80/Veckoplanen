// Inloggningsskärm med magic link – ingen kod att komma ihåg
import { useState } from 'react';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f0f7ef',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 4px 20px rgba(45,80,22,0.12)',
  },
  title: {
    fontFamily: 'Georgia, serif',
    color: '#2d5016',
    fontSize: '28px',
    margin: '0 0 8px',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b8f5e',
    textAlign: 'center',
    margin: '0 0 28px',
    fontSize: '15px',
    lineHeight: '1.5',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: '6px',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #c8e6c9',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px',
    background: '#2d5016',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
  },
  error: {
    color: '#c62828',
    fontSize: '13px',
    marginBottom: '12px',
  },
  successIcon: {
    fontSize: '48px',
    textAlign: 'center',
    margin: '0 0 16px',
  },
  successText: {
    color: '#444',
    textAlign: 'center',
    lineHeight: '1.6',
    fontSize: '15px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6b8f5e',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '20px',
    display: 'block',
    width: '100%',
    textAlign: 'center',
    textDecoration: 'underline',
  },
};

export default function AuthScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!email.includes('@')) {
      setError('Ange en giltig e-postadress.');
      return;
    }
    setLoading(true);
    const { error: err } = await onSignIn(email);
    setLoading(false);
    if (err) {
      setError('Något gick fel. Försök igen.');
    } else {
      setSent(true);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Veckoplanen</h1>

        {!sent ? (
          <>
            <p style={styles.subtitle}>
              Ange din e-post så skickar vi en inloggningslänk – inget lösenord behövs.
            </p>
            <label style={styles.label}>E-postadress</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="din@epost.se"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
            </button>
          </>
        ) : (
          <>
            <div style={styles.successIcon}>📬</div>
            <p style={styles.successText}>
              Kolla din inkorg! Vi har skickat en inloggningslänk till <strong>{email}</strong>.
              <br /><br />
              Klicka på länken i mailet för att logga in.
            </p>
            <button style={styles.backBtn} onClick={() => { setSent(false); setEmail(''); }}>
              Försök med annan adress
            </button>
          </>
        )}
      </div>
    </div>
  );
}
