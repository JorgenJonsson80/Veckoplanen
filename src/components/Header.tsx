import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { Home, ClipboardList, ArrowLeftRight, Check, Menu } from 'lucide-react'
import type { Session } from '../types'

interface HeaderProps {
  session: Session
  roomName?: string | null
  user: User
  onHome: () => void
  onShowActivity: () => void
  onSwitchRoom: () => void
  onSignOut: () => void
}

export default function Header({ session, roomName, user, onHome, onShowActivity, onSwitchRoom, onSignOut }: HeaderProps) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleShareRoom() {
    const url = `${window.location.origin}/join/${session.roomCode}`
    if (navigator.share) {
      navigator.share({ title: 'Gå med i Veckoplanen', text: 'Klicka för att gå med i vår matplanering!', url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }

  const canInvite = session.roomCode && session.mode !== 'solo'

  return (
    <header className="bg-primary text-white px-4 flex items-center justify-between h-14 sticky top-0 z-10">
      <button
        type="button"
        onClick={onHome}
        className="bg-transparent border-0 text-white text-left p-0 cursor-pointer font-[inherit] min-w-0"
        aria-label="Gå till startsidan"
      >
        <h1 className="font-serif text-xl m-0 truncate">Veckoplanen</h1>
        {(roomName || session.roomCode) && (
          <div className="text-[11px] text-white/65 mt-px truncate flex items-center gap-1">
            <Home size={11} className="shrink-0" /> {roomName || session.roomCode} · {session.name}
          </div>
        )}
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {canInvite && (
          <button
            onClick={handleShareRoom}
            title="Bjud in familjen – tryck för att dela länk"
            className="bg-white/20 border-0 cursor-pointer text-white px-2.5 py-1 rounded-xl flex flex-col items-center leading-snug gap-px"
          >
            <span className="text-[9px] opacity-75 tracking-[0.5px] uppercase flex items-center gap-0.5">{copied ? <><Check size={10} /> Kopierad!</> : 'Bjud in'}</span>
            <span className="font-mono text-sm tracking-[1px]">{session.roomCode}</span>
          </button>
        )}

        {session.roomCode && (
          <button
            className="bg-transparent border-0 text-white cursor-pointer p-1"
            onClick={onShowActivity}
            aria-label="Visa aktivitetsfeed"
          ><ClipboardList size={22} /></button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            className="bg-white/15 border-0 text-white cursor-pointer w-9 h-9 rounded-lg flex items-center justify-center"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Meny"
          >
            <Menu size={20} />
          </button>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden min-w-36 z-50">
              <button
                onClick={() => { setMenuOpen(false); onHome() }}
                className="w-full px-4 py-3 text-left text-primary text-sm border-0 bg-transparent cursor-pointer border-b border-[#f0f0f0] font-[inherit] flex items-center gap-2"
              >
                <Home size={16} /> Till startsidan
              </button>
              <button
                onClick={() => { setMenuOpen(false); onSwitchRoom() }}
                className="w-full px-4 py-3 text-left text-primary text-sm border-0 bg-transparent cursor-pointer border-b border-[#f0f0f0] font-[inherit] flex items-center gap-2"
              >
                <ArrowLeftRight size={16} /> Byt rum
              </button>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                className="w-full px-4 py-3 text-left text-[#d32f2f] text-sm border-0 bg-transparent cursor-pointer font-[inherit]"
              >
                Logga ut
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
