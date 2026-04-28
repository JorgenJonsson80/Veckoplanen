import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../utils/roomCode'
import type { Session } from '../types'

interface SupabaseRoom {
  id: string
  code: string
  created_by: string | null
}

interface Props {
  onStart: (sess: Session) => void
  initialJoinCode: string | null
  recentRooms?: Session[]
  recentRoomsKey?: string | null
  userId?: string | null
}

async function findUniqueCode(): Promise<string> {
  if (!supabase) return generateRoomCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode()
    const { data } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
    if (!data) return code
  }
  return generateRoomCode()
}

const MODE_OPTIONS = [
  { key: 'solo', label: '👤 Eget (bara för mig)', desc: 'Ingen delning – perfekt om du planerar ensam.' },
  { key: 'create', label: '🏠 Skapa familjerum', desc: 'Dela med partner eller familj via en rumskod.' },
  { key: 'join', label: '🔑 Gå med i rum', desc: 'Du har fått en kod av en familjemedlem.' },
] as const

export default function RoomSetup({ onStart, initialJoinCode, recentRooms = [], recentRoomsKey = null, userId }: Props) {
  const [mode, setMode] = useState<'solo' | 'create' | 'join' | null>(initialJoinCode ? 'join' : null)
  const [recent, setRecent] = useState(recentRooms)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  const [allRooms, setAllRooms] = useState<SupabaseRoom[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [openingRoom, setOpeningRoom] = useState<SupabaseRoom | null>(null)

  useEffect(() => {
    if (!supabase) { setRoomsLoading(false); return }
    supabase
      .from('rooms')
      .select('id, code, created_by')
      .then(({ data }) => { setAllRooms(data ?? []); setRoomsLoading(false) })
  }, [])

  useEffect(() => {
    if (mode !== 'create') return
    setCodeChecking(true)
    findUniqueCode().then(code => { setGeneratedCode(code); setCodeChecking(false) })
  }, [mode])

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function handleSelectRoom(room: SupabaseRoom) {
    const cached = recent.find(r => r.roomCode === room.code)
    if (cached) { onStart(cached); return }
    setOpeningRoom(room)
    setErr('')
  }

  function handleOpenRoom() {
    if (!openingRoom) return
    if (!name.trim()) { setErr('Ange ditt namn.'); return }
    const isCreator = openingRoom.created_by === userId
    onStart({ name: name.trim(), roomCode: openingRoom.code, mode: isCreator ? 'create' : 'join' })
  }

  async function handleDeleteRoom(room: SupabaseRoom) {
    if (!supabase) return
    await supabase.from('room_members').delete().eq('room_id', room.id)
    await supabase.from('rooms').delete().eq('id', room.id)
    setAllRooms(prev => prev.filter(r => r.id !== room.id))
    const updated = recent.filter(r => r.roomCode !== room.code)
    setRecent(updated)
    if (recentRoomsKey) localStorage.setItem(recentRoomsKey, JSON.stringify(updated))
    setConfirmDeleteId(null)
  }

  function handleStart() {
    setErr('')
    if (!name.trim()) { setErr('Ange ditt namn.'); return }
    if (mode === 'join') {
      const code = normalizeRoomCode(joinCode)
      if (!isValidRoomCode(code)) { setErr(`Rumskoden måste vara ${ROOM_CODE_LENGTH} tecken och bara innehålla giltiga tecken.`); return }
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
  const roomRowCls = 'flex items-center flex-1 px-3.5 py-2.5 bg-bg border border-border rounded-xl cursor-pointer gap-2.5 text-left'

  if (openingRoom) {
    const isCreator = openingRoom.created_by === userId
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
          <h1 className="font-serif text-primary text-[28px] text-center mb-2">Veckoplanen</h1>
          <p className="text-secondary text-center mb-6 text-[15px]">
            {isCreator ? '🏠' : '🔑'} Öppnar rum <span className="font-mono font-bold">{openingRoom.code}</span>
          </p>
          <label className={labelCls}>Ditt namn</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="t.ex. Erik"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleOpenRoom()}
          />
          {err && <p className="text-error text-sm mb-2">{err}</p>}
          <button
            className="w-full py-3.5 bg-primary text-white border-0 rounded-xl text-[17px] font-semibold cursor-pointer font-serif mb-2"
            onClick={handleOpenRoom}
          >
            Öppna rum
          </button>
          <button
            className="w-full py-2 bg-transparent border-0 text-secondary text-sm cursor-pointer underline"
            onClick={() => { setOpeningRoom(null); setErr('') }}
          >
            ← Tillbaka
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-[28px] text-center mb-2">Veckoplanen</h1>
        <p className="text-secondary text-center mb-7 text-[15px]">Din familjens matsedel och handlingslista</p>

        {(roomsLoading || allRooms.length > 0) && (
          <div className="mb-5">
            <p className="text-secondary text-xs font-bold mb-2 tracking-[0.5px] uppercase">Dina rum</p>
            {roomsLoading ? (
              <p className="text-secondary text-sm py-2">Laddar rum...</p>
            ) : (
              allRooms.map(room => {
                const isOwner = room.created_by === userId
                const cached = recent.find(r => r.roomCode === room.code)
                const isConfirming = confirmDeleteId === room.id
                return (
                  <div key={room.id} className="flex items-center gap-1.5 mb-1.5">
                    <button className={roomRowCls} onClick={() => { setConfirmDeleteId(null); handleSelectRoom(room) }}>
                      <span className="text-xl">{isOwner ? '🏠' : '🔑'}</span>
                      <span className="flex-1 font-mono text-primary font-semibold text-[15px] tracking-[1px]">{room.code}</span>
                      {cached && <span className="text-xs text-secondary">{cached.name}</span>}
                      <span className="text-xs text-[#aaa]">{isOwner ? 'Ditt rum' : 'Gick med'}</span>
                    </button>
                    {isOwner && (
                      isConfirming ? (
                        <>
                          <button
                            onClick={() => handleDeleteRoom(room)}
                            className="shrink-0 h-8 px-2 bg-error text-white border-0 rounded-lg text-xs cursor-pointer font-semibold"
                          >Radera</button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="shrink-0 w-8 h-8 bg-white border border-[#e0e0e0] rounded-lg text-[#aaa] text-base cursor-pointer flex items-center justify-center"
                          >×</button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(room.id)}
                          className="shrink-0 w-8 h-8 bg-white border border-[#e0e0e0] rounded-lg text-[#aaa] text-base cursor-pointer flex items-center justify-center"
                          title="Radera rum"
                        >🗑</button>
                      )
                    )}
                  </div>
                )
              })
            )}
            <div className="border-t border-[#f0f0f0] my-4" />
          </div>
        )}

        <div className="mb-5">
          {MODE_OPTIONS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setErr(''); setConfirmDeleteId(null) }}
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
                <input className={inputCls} value={joinCode} onChange={e => setJoinCode(normalizeRoomCode(e.target.value))} placeholder="t.ex. ABCD2345" maxLength={ROOM_CODE_LENGTH} onKeyDown={e => e.key === 'Enter' && handleStart()} />
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
