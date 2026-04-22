import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

interface Props {
  onStart: (sess: Session) => void
  initialJoinCode: string | null
  recentRooms?: Session[]
  recentRoomsKey?: string | null
}

// I, O, 1, 0 excluded to avoid visual confusion when sharing codes verbally
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

function generateRoomCode(): string {
  const buf = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

async function findUniqueCode(): Promise<string> {
  if (!supabase) return generateRoomCode()
  const code = generateRoomCode()
  const { data } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
  return data ? generateRoomCode() : code
}

const MODE_OPTIONS = [
  { key: 'solo', label: '👤 Eget (bara för mig)', desc: 'Ingen delning – perfekt om du planerar ensam.' },
  { key: 'create', label: '🏠 Skapa familjerum', desc: 'Dela med partner eller familj via en rumskod.' },
  { key: 'join', label: '🔑 Gå med i rum', desc: 'Du har fått en kod av en familjemedlem.' },
] as const

export default function RoomSetup({ onStart, initialJoinCode, recentRooms = [], recentRoomsKey = null }: Props) {
  const [mode, setMode] = useState<'solo' | 'create' | 'join' | null>(initialJoinCode ? 'join' : null)
  const [recent, setRecent] = useState(recentRooms)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  function removeRecent(idx: number) {
    const updated = recent.filter((_, i) => i !== idx)
    setRecent(updated)
    if (recentRoomsKey) localStorage.setItem(recentRoomsKey, JSON.stringify(updated))
  }

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

  const inputCls = 'w-full px-3 py-2.5 border-2 border-border rounded-lg text-base mb-4 box-border font-[inherit]'
  const labelCls = 'block font-semibold text-primary text-sm mb-1.5'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-[28px] text-center mb-2">Veckoplanen</h1>
        <p className="text-secondary text-center mb-7 text-[15px]">Din familjens matsedel och handlingslista</p>

        {recent.length > 0 && (
          <div className="mb-5">
            <p className="text-secondary text-xs font-bold mb-2 tracking-[0.5px] uppercase">Senast använda</p>
            {recent.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <button
                  className="flex items-center flex-1 px-3.5 py-2.5 bg-bg border border-border rounded-xl cursor-pointer gap-2.5 text-left"
                  onClick={() => onStart(r)}
                >
                  <span className="text-xl">{r.mode === 'solo' ? '👤' : '🏠'}</span>
                  <span className="flex-1 text-primary font-semibold text-[15px]">{r.name}</span>
                  {r.roomCode && <span className="font-mono text-sm text-secondary tracking-[1px]">{r.roomCode}</span>}
                  <span className="text-xs text-[#aaa]">{r.mode === 'solo' ? 'Eget' : 'Familjerum'}</span>
                </button>
                <button
                  onClick={() => removeRecent(i)}
                  className="shrink-0 w-8 h-8 bg-white border border-[#e0e0e0] rounded-lg text-[#aaa] text-base cursor-pointer flex items-center justify-center"
                  title="Ta bort från listan"
                >×</button>
              </div>
            ))}
            <div className="border-t border-bg-subtle my-4" />
          </div>
        )}

        <div className="mb-5">
          {MODE_OPTIONS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setErr('') }}
              className={`flex flex-col gap-0.5 w-full px-4 py-3.5 mb-2.5 border-2 border-primary rounded-xl text-base cursor-pointer text-left ${mode === key ? 'bg-primary text-white' : 'bg-white text-primary'}`}
            >
              <span>{label}</span>
              <span className={`text-xs font-normal ${mode === key ? 'opacity-80' : 'opacity-55'}`}>{desc}</span>
            </button>
          ))}
        </div>

        {mode && (
          <>
            <label className={labelCls}>Ditt namn</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="t.ex. Erik" onKeyDown={e => e.key === 'Enter' && handleStart()} autoFocus />

            {mode === 'create' && (
              <>
                <p className="text-[#555] text-sm mb-2">Dela den här koden med din familj:</p>
                {codeChecking ? (
                  <p className="text-secondary text-sm mb-2">Skapar rumskod...</p>
                ) : (
                  <div className="bg-bg border-2 border-dashed border-secondary rounded-xl p-3.5 text-center mb-4">
                    <div className="font-mono text-[28px] font-bold text-primary tracking-[4px]">{generatedCode}</div>
                    <button className="bg-transparent border-0 text-secondary text-sm cursor-pointer mt-1.5 underline" onClick={copyCode}>{copied ? '✅ Kopierad!' : '📋 Kopiera koden'}</button>
                  </div>
                )}
              </>
            )}

            {mode === 'join' && (
              <>
                <label className={labelCls}>Rumskod</label>
                <input className={inputCls} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="t.ex. ABCD2345" maxLength={CODE_LENGTH} onKeyDown={e => e.key === 'Enter' && handleStart()} />
              </>
            )}

            {err && <p className="text-error text-sm mb-2">{err}</p>}
            <button
              className="w-full py-3.5 bg-primary text-white border-0 rounded-xl text-[17px] font-semibold cursor-pointer font-serif"
              onClick={handleStart}
              disabled={mode === 'create' && codeChecking}
            >
              {mode === 'solo' ? 'Starta' : mode === 'create' ? 'Skapa rum' : 'Gå med'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
