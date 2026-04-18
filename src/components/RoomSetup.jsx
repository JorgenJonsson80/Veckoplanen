// Startsida: välj läge – Eget, Skapa familjerum, Gå med i rum
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
  code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}

// Kontrollera mot Supabase att koden inte redan används
async function findUniqueCode() {
  if (!supabase) return generateRoomCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const { data } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle();
    if (!data) return code; // ledig kod hittad
  }
  return generateRoomCode(); // ge upp och hoppas på det bästa
}

const styles = {
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
  title: { fontFamily: 'Georgia, serif', color: '#2d5016', fontSize: '28px', margin: '0 0 8px', textAlign: 'center' },
  subtitle: { color: '#6b8f5e', textAlign: 'center', margin: '0 0 28px', fontSize: '15px' },
  modeBtn: {
    display: 'block', width: '100%', padding: '14px', marginBottom: '10px',
    border: '2px solid #2d5016', borderRadius: '10px', background: '#fff',
    color: '#2d5016', fontSize: '16px', cursor: 'pointer', textAlign: 'left',
  },
  modeBtnActive: { background: '#2d5016', color: '#fff' },
  label: { display: 'block', fontWeight: '600', color: '#2d5016', marginBottom: '6px', fontSize: '14px' },
  input: {
    width: '100%', padding: '10px 12px', border: '2px solid #c8e6c9',
    borderRadius: '8px', fontSize: '16px', marginBottom: '16px',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  codeBox: {
    background: '#f0f7ef', border: '2px dashed #6b8f5e',
    borderRadius: '10px', padding: '14px', textAlign: 'center', marginBottom: '16px',
  },
  codeText: { fontFamily: 'monospace', fontSize: '28px', fontWeight: 'bold', color: '#2d5016', letterSpacing: '4px' },
  primaryBtn: {
    width: '100%', padding: '14px', background: '#2d5016', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '17px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'Georgia, serif',
  },
  copyBtn: {
    background: 'none', border: 'none', color: '#6b8f5e',
    fontSize: '13px', cursor: 'pointer', marginTop: '6px', textDecoration: 'underline',
  },
  error: { color: '#c62828', fontSize: '13px', marginBottom: '8px' },
  checking: { color: '#6b8f5e', fontSize: '13px', marginBottom: '8px' },
};

export default function RoomSetup({ onStart }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  // Generera och verifiera en unik kod när "skapa"-läget väljs
  useEffect(() => {
    if (mode !== 'create') return;
    setCodeChecking(true);
    findUniqueCode().then(code => {
      setGeneratedCode(code);
      setCodeChecking(false);
    });
  }, [mode]);

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStart() {
    setErr('');
    if (!name.trim()) { setErr('Ange ditt namn.'); return; }
    if (mode === 'join') {
      const code = joinCode.trim().toUpperCase();
      if (code.length !== 5) { setErr('Rumskoden måste vara 5 tecken.'); return; }
      onStart({ name: name.trim(), roomCode: code, mode });
    } else if (mode === 'create') {
      if (!generatedCode) { setErr('Väntar på rumskod...'); return; }
      onStart({ name: name.trim(), roomCode: generatedCode, mode });
    } else {
      onStart({ name: name.trim(), roomCode: null, mode: 'solo' });
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Veckoplanen</h1>
        <p style={styles.subtitle}>Din familjens matsedel och handlingslista</p>

        <div style={{ marginBottom: '20px' }}>
          {[
            { key: 'solo', label: '👤 Eget (bara för mig)' },
            { key: 'create', label: '🏠 Skapa familjerum' },
            { key: 'join', label: '🔑 Gå med i rum' },
          ].map(({ key, label }) => (
            <button
              key={key}
              style={{ ...styles.modeBtn, ...(mode === key ? styles.modeBtnActive : {}) }}
              onClick={() => { setMode(key); setErr(''); }}
            >{label}</button>
          ))}
        </div>

        {mode && (
          <>
            <label style={styles.label}>Ditt namn</label>
            <input
              style={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="t.ex. Erik"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              autoFocus
            />

            {mode === 'create' && (
              <>
                <p style={{ color: '#555', fontSize: '14px', margin: '0 0 8px' }}>
                  Dela den här koden med din familj:
                </p>
                {codeChecking ? (
                  <p style={styles.checking}>Skapar rumskod...</p>
                ) : (
                  <div style={styles.codeBox}>
                    <div style={styles.codeText}>{generatedCode}</div>
                    <button style={styles.copyBtn} onClick={copyCode}>
                      {copied ? '✅ Kopierad!' : '📋 Kopiera koden'}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === 'join' && (
              <>
                <label style={styles.label}>Rumskod</label>
                <input
                  style={styles.input}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="t.ex. ERIK7"
                  maxLength={5}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                />
              </>
            )}

            {err && <p style={styles.error}>{err}</p>}

            <button style={styles.primaryBtn} onClick={handleStart} disabled={mode === 'create' && codeChecking}>
              {mode === 'solo' ? 'Starta' : mode === 'create' ? 'Skapa rum' : 'Gå med'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
