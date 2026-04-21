import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

interface Props {
  onStart: (sess: Session) => void
  initialJoinCode: string | null
  recentRooms?: Session[]
  recentRoomsKey?: string | null
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

function generateRoomCode(): string {
  const buf = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

async function findUniqueCode(): Promise<string> {
  if (!supabase) return generateRoomCode()
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode()
    const { data } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
    if (!data) return code
  }
  return generateRoomCode()
}

const styles = {
  container: { minHeight: '100vh', background: 'var(--clr-bg)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card: { background: '#fff', borderRadius: '16px', padding: '32px 24px', width: '100%', maxWidth: '380px', boxShadow: '0 4px 20px rgba(45,80,22,0.12)' },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '28px', margin: '0 0 8px', textAlign: 'center' as const },
  subtitle: { color: 'var(--clr-secondary)', textAlign: 'center' as const, margin: '0 0 28px', fontSize: '15px' },
  modeBtn: { display: 'block', width: '100%', padding: '14px', marginBottom: '10px', border: '2px solid #2d5016', borderRadius: '10px', background: '#fff', color: 'var(--clr-primary)', fontSize: '16px', cursor: 'pointer', textAlign: 'left' as const } as React.CSSProperties,
  modeBtnActive: { background: 'var(--clr-primary)', color: '#fff' },
  label: { display: 'block', fontWeight: '600', color: 'var(--clr-primary)', marginBottom: '6px', fontSize: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #c8e6c9', borderRadius: '8px', fontSize: '16px', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'inherit' } as React.CSSProperties,
  codeBox: { background: 'var(--clr-bg)', border: '2px dashed #6b8f5e', borderRadius: '10px', padding: '14px', textAlign: 'center' as const, marginBottom: '16px' },
  codeText: { fontFamily: 'monospace', fontSize: '28px', fontWeight: 'bold', color: 'var(--clr-primary)', letterSpacing: '4px' },
  primaryBtn: { width: '100%', padding: '14px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '17px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Georgia, serif' } as React.CSSProperties,
  copyBtn: { background: 'none', border: 'none', color: 'var(--clr-secondary)', fontSize: '13px', cursor: 'pointer', marginTop: '6px', textDecoration: 'underline' },
  error: { color: 'var(--clr-error)', fontSize: '13px', marginBottom: '8px' },
  checking: { color: 'var(--clr-secondary)', fontSize: '13px', marginBottom: '8px' },
}

export default function RoomSetup({ onStart, initialJoinCode, recentRooms = [], recentRoomsKey = null }: Props) {
  const [mode, setMode] = useState<'solo' | 'create' | 'join' | null>(initialJoinCode ? 'join' : null)
  const [recent, setRecent] = useState(recentRooms)

  function removeRecent(idx: number) {
    const updated = recent.filter((_, i) => i !== idx)
    setRecent(updated)
    if (recentRoomsKey) localStorage.setItem(recentRoomsKey, JSON.stringify(updated))
  }

  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (mode !== 'create') return
    setCodeChecking(true)
    findUniqueCode().then(code => { setGeneratedCode(code); setCodeChecking(false) })
  }, [mode])

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function handleStart() {
    setErr('')
    if (!name.trim()) { setErr('Ange ditt namn.'); return }
    if (mode === 'join') {
      const code = joinCode.trim().toUpperCase()
      if (code.length !== CODE_LENGTH) { setErr(`Rumskoden måste vara ${CODE_LENGTH} tecken.`); return }
      onStart({ name: name.trim(), roomCode: code, mode })
    } else if (mode === 'create') {
      if (!generatedCode) { setErr('Väntar på rumskod...'); return }
      onStart({ name: name.trim(), roomCode: generatedCode, mode })
    } else {
      onStart({ name: name.trim(), roomCode: null, mode: 'solo' })
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Veckoplanen</h1>
        <p style={styles.subtitle}>Din familjens matsedel och handlingslista</p>

        {recent.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: 'var(--clr-secondary)', fontSize: '12px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Senast använda</p>
            {recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '11px 14px', background: 'var(--clr-bg)', border: '1.5px solid #c8e6c9', borderRadius: '10px', cursor: 'pointer', gap: '10px', textAlign: 'left' }}
                  onClick={() => onStart(r)}
                >
                  <span style={{ fontSize: '20px' }}>{r.mode === 'solo' ? '👤' : '🏠'}</span>
                  <span style={{ flex: 1, color: 'var(--clr-primary)', fontWeight: '600', fontSize: '15px' }}>{r.name}</span>
                  {r.roomCode && <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--clr-secondary)', letterSpacing: '1px' }}>{r.roomCode}</span>}
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{r.mode === 'solo' ? 'Eget' : 'Familjerum'}</span>
                </button>
                <button onClick={() => removeRecent(i)} style={{ flexShrink: 0, width: '32px', height: '32px', background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: '8px', color: '#aaa', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Ta bort från listan">×</button>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e8f5e9', margin: '16px 0' }} />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          {([
            { key: 'solo', label: '👤 Eget (bara för mig)', desc: 'Ingen delning – perfekt om du planerar ensam.' },
            { key: 'create', label: '🏠 Skapa familjerum', desc: 'Dela med partner eller familj via en rumskod.' },
            { key: 'join', label: '🔑 Gå med i rum', desc: 'Du har fått en kod av en familjemedlem.' },
          ] as const).map(({ key, label, desc }) => (
            <button
              key={key}
              style={{ ...styles.modeBtn, ...(mode === key ? styles.modeBtnActive : {}), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
              onClick={() => { setMode(key); setErr('') }}
            >
              <span>{label}</span>
              <span style={{ fontSize: '12px', opacity: mode === key ? 0.8 : 0.55, fontWeight: '400' }}>{desc}</span>
            </button>
          ))}
        </div>

        {mode && (
          <>
            <label style={styles.label}>Ditt namn</label>
            <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="t.ex. Erik" onKeyDown={e => e.key === 'Enter' && handleStart()} autoFocus />

            {mode === 'create' && (
              <>
                <p style={{ color: '#555', fontSize: '14px', margin: '0 0 8px' }}>Dela den här koden med din familj:</p>
                {codeChecking ? (
                  <p style={styles.checking}>Skapar rumskod...</p>
                ) : (
                  <div style={styles.codeBox}>
                    <div style={styles.codeText}>{generatedCode}</div>
                    <button style={styles.copyBtn} onClick={copyCode}>{copied ? '✅ Kopierad!' : '📋 Kopiera koden'}</button>
                  </div>
                )}
              </>
            )}

            {mode === 'join' && (
              <>
                <label style={styles.label}>Rumskod</label>
                <input style={styles.input} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="t.ex. ABCD2345" maxLength={CODE_LENGTH} onKeyDown={e => e.key === 'Enter' && handleStart()} />
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
  )
}
