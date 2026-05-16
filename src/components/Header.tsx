import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Session } from '../types'

interface HeaderProps {
  session: Session
  user: User
  onHome: () => void
  onShowActivity: () => void
  onSwitchRoom: () => void
  onSignOut: () => void
}

export default function Header({ session, user, onHome, onShowActivity, onSwitchRoom, onSignOut }: HeaderProps) {
  const [copied, setCopied] = useState(false)

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
        className="bg-transparent border-0 text-white text-left p-0 cursor-pointer font-[inherit]"
        aria-label="Gå till startsidan"
      >
        <h1 className="font-serif text-xl m-0">Veckoplanen</h1>
        {user.email && (
          <div className="text-[11px] text-white/65 mt-px">
            {session.name} · {user.email.split('@')[0]}
          </div>
        )}
      </button>
      <div className="flex items-center gap-2.5">
        {canInvite && (
          <button
            onClick={handleShareRoom}
            title="Bjud in familjen – tryck för att dela länk"
            className="bg-white/20 border-0 cursor-pointer text-white px-2.5 py-1 rounded-xl flex flex-col items-center leading-snug gap-px"
          >
            <span className="text-[9px] opacity-75 tracking-[0.5px] uppercase">{copied ? '✅ Kopierad!' : 'Bjud in'}</span>
            <span className="font-mono text-sm tracking-[1px]">{session.roomCode}</span>
          </button>
        )}
        {session.roomCode && (
          <button className="bg-transparent border-0 text-white text-[22px] cursor-pointer p-1" onClick={onShowActivity} aria-label="Visa aktivitetsfeed">📋</button>
        )}
        <button className="bg-white/15 border-0 text-white text-sm cursor-pointer px-2.5 py-1 rounded-lg" onClick={onSwitchRoom} title="Byt rum eller läge">⇄ Byt rum</button>
        <button className="bg-white/15 border-0 text-white text-sm cursor-pointer px-2.5 py-1 rounded-lg" onClick={onSignOut}>Logga ut</button>
      </div>
    </header>
  )
}
