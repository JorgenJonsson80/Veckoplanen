import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../utils/roomCode'
import type { Session } from '../types'

async function findUniqueCode(): Promise<string> {
  if (!supabase) return generateRoomCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    const { data } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
    if (!data) return code
  }
  return generateRoomCode()
}

type Step = 'name' | 'how' | 'family-create' | 'family-join'

interface Props {
  onStart: (sess: Session) => void
  initialJoinCode?: string | null
}

export default function FirstRunSetup({ onStart, initialJoinCode }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [codeChecking, setCodeChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (step !== 'family-create') return
    setCodeChecking(true)
    findUniqueCode().then(code => { setGeneratedCode(code); setCodeChecking(false) })
  }, [step])

  function finish(sess: Session) {
    localStorage.setItem('veckoplanen_onboarded', '1')
    onStart(sess)
  }

  function handleNameNext() {
    if (!name.trim()) { setErr('Ange ditt namn.'); return }
    setErr('')
    setStep(initialJoinCode ? 'family-join' : 'how')
  }

  function handleSolo() {
    finish({ name: name.trim(), roomCode: null, mode: 'solo' })
  }

  function handleFamilyCreate() {
    if (!generatedCode) return
    finish({ name: name.trim(), roomCode: generatedCode, mode: 'create' })
  }

  function handleFamilyJoin() {
    const code = normalizeRoomCode(joinCode)
    if (!isValidRoomCode(code)) { setErr('Koden verkar inte stämma — kontrollera att du skrivit rätt.'); return }
    setErr('')
    finish({ name: name.trim(), roomCode: code, mode: 'join' })
  }

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const inputCls = 'w-full px-3 py-3 border-2 border-border rounded-xl text-base mb-1 box-border font-[inherit]'
  const primaryBtn = 'w-full py-3.5 bg-primary text-white border-0 rounded-xl text-[17px] font-semibold cursor-pointer font-serif mt-3'
  const choiceBtn = 'flex flex-col gap-1 w-full px-4 py-4 mb-3 border-2 border-primary rounded-xl text-left cursor-pointer bg-white text-primary font-[inherit]'
  const backLink = 'bg-transparent border-0 text-secondary text-sm cursor-pointer underline mt-4 block text-center'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-[28px] text-center mb-7">Veckoplanen 🌿</h1>

        {step === 'name' && (
          <>
            <h2 className="font-serif text-primary text-[22px] mb-2">Vad heter du?</h2>
            <p className="text-secondary text-[15px] mb-5">Så dina familjemedlemmar vet vem som lagt till vad.</p>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="t.ex. Anna"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleNameNext()}
            />
            {err && <p className="text-error text-sm mt-1 mb-0">{err}</p>}
            <button className={primaryBtn} onClick={handleNameNext}>Nästa →</button>
          </>
        )}

        {step === 'how' && (
          <>
            <h2 className="font-serif text-primary text-[22px] mb-2">Hej {name}!</h2>
            <p className="text-secondary text-[15px] mb-5">Hur vill du använda appen?</p>
            <button className={choiceBtn} onClick={handleSolo}>
              <span className="text-[17px] font-semibold">👤 Bara jag</span>
              <span className="text-sm text-secondary">Jag planerar ensam, ingen delning.</span>
            </button>
            <button className={choiceBtn} onClick={() => setStep('family-create')}>
              <span className="text-[17px] font-semibold">👨‍👩‍👧 Med familjen</span>
              <span className="text-sm text-secondary">Planera och handla ihop med partner eller barn.</span>
            </button>
            <button className={backLink} onClick={() => setStep('name')}>← Tillbaka</button>
          </>
        )}

        {step === 'family-create' && (
          <>
            <h2 className="font-serif text-primary text-[22px] mb-2">Bjud in familjen</h2>
            <p className="text-secondary text-[15px] mb-5">
              Dela den här koden med din familj. De skriver in den när de öppnar appen.
            </p>
            {codeChecking ? (
              <p className="text-secondary text-sm mb-4">Skapar kod...</p>
            ) : (
              <div className="bg-bg border-2 border-dashed border-secondary rounded-xl p-4 text-center mb-2">
                <div className="font-mono text-[32px] font-bold text-primary tracking-[6px]">{generatedCode}</div>
                <button className="bg-transparent border-0 text-secondary text-sm cursor-pointer mt-2 underline" onClick={copyCode}>
                  {copied ? '✅ Kopierad!' : '📋 Kopiera koden'}
                </button>
              </div>
            )}
            <button className={primaryBtn} onClick={handleFamilyCreate} disabled={codeChecking}>
              Klar, starta →
            </button>
            <button className={backLink} onClick={() => { setStep('family-join'); setErr('') }}>
              Har du redan fått en kod? Skriv in den här
            </button>
            <button className={backLink} onClick={() => setStep('how')}>← Tillbaka</button>
          </>
        )}

        {step === 'family-join' && (
          <>
            <h2 className="font-serif text-primary text-[22px] mb-2">Gå med i familjens grupp</h2>
            <p className="text-secondary text-[15px] mb-5">Skriv in koden du fått av din familjemedlem.</p>
            <input
              className={inputCls}
              value={joinCode}
              onChange={e => setJoinCode(normalizeRoomCode(e.target.value))}
              placeholder="t.ex. ABCD2345"
              maxLength={ROOM_CODE_LENGTH}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleFamilyJoin()}
            />
            {err && <p className="text-error text-sm mt-1 mb-0">{err}</p>}
            <button className={primaryBtn} onClick={handleFamilyJoin}>Gå med →</button>
            <button className={backLink} onClick={() => { setStep('family-create'); setErr('') }}>← Tillbaka</button>
          </>
        )}
      </div>
    </div>
  )
}
