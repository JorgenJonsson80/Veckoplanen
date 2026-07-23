import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onUpdatePassword: (password: string) => Promise<{ error: AuthError | null }>
}

export default function ResetPasswordScreen({ onUpdatePassword }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setErr('')
    if (password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    if (password !== confirm) { setErr('Lösenorden matchar inte.'); return }
    setLoading(true)
    const { error } = await onUpdatePassword(password)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-2xl text-center mb-4">Veckoplanen</h1>
        <div className="flex justify-center mb-4 text-primary"><CircleCheck size={44} /></div>
        <p className="text-primary font-semibold text-center text-sm mb-1">Lösenordet är uppdaterat!</p>
        <p className="text-secondary text-center text-sm leading-relaxed">Du är inloggad och kan börja använda appen.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-2xl text-center mb-2">Veckoplanen</h1>
        <p className="text-secondary text-center text-sm leading-relaxed mb-6">Välj ett nytt lösenord för ditt konto.</p>

        <label className="block font-semibold text-primary text-sm mb-1.5">Nytt lösenord</label>
        <input
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg text-base mb-3.5 font-[inherit]"
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Minst 8 tecken" autoFocus
        />
        <label className="block font-semibold text-primary text-sm mb-1.5">Bekräfta lösenord</label>
        <input
          className="w-full px-3 py-2.5 border-2 border-border rounded-lg text-base mb-3.5 font-[inherit]"
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Samma lösenord igen" onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {err && <p className="text-error text-sm mb-2.5">{err}</p>}
        <button
          className="w-full py-3 bg-primary text-white border-0 rounded-xl text-base font-semibold cursor-pointer font-serif mt-1"
          onClick={handleSubmit} disabled={loading}
        >{loading ? 'Sparar...' : 'Spara nytt lösenord'}</button>
      </div>
    </div>
  )
}
