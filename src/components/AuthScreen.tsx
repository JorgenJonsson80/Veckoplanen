import { useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'

interface Props {
  onSignInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>
  onSignUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  onSignInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  onResetPassword: (email: string) => Promise<{ error: AuthError | null }>
  onSignInWithGoogle: () => Promise<void>
}

const featureCards = [
  ['🍽', 'Välj veckans middagar', 'Fyll i rätterna dag för dag. Har du recept sparade fylls handlingslistan på automatiskt — men du kan också skriva in varor direkt.'],
  ['🛒', 'Handla utan stress', 'Alla ingredienser samlas i en lista sorterad efter dina butikshyllor. Bocka av medan du handlar.'],
  ['👨‍👩‍👧', 'Dela med familjen', 'Skapa ett familjerum och dela en länk — alla ser och redigerar samma lista i realtid.'],
] as const

export default function AuthScreen({ onSignInWithPassword, onSignUp, onSignInWithMagicLink, onResetPassword, onSignInWithGoogle }: Props) {
  const [tab, setTab] = useState<'login' | 'register' | 'magic' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [registerDone, setRegisterDone] = useState(false)

  function reset() { setErr(''); setEmail(''); setPassword(''); setMagicSent(false); setRegisterDone(false) }

  async function handleLogin() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    if (password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    setLoading(true)
    const { error } = await onSignInWithPassword(email, password)
    setLoading(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Fel e-post eller lösenord.' : 'Något gick fel. Försök igen.')
  }

  async function handleRegister() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    if (password.length < 8) { setErr('Lösenordet måste vara minst 8 tecken.'); return }
    setLoading(true)
    const { error } = await onSignUp(email, password)
    setLoading(false)
    if (error) { setErr('Något gick fel. E-postadressen kanske redan används.'); return }
    setRegisterDone(true)
  }

  async function handleForgotPassword() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    setLoading(true)
    const { error } = await onResetPassword(email)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setMagicSent(true)
  }

  async function handleMagicLink() {
    setErr('')
    if (!email.includes('@')) { setErr('Ange en giltig e-postadress.'); return }
    setLoading(true)
    const { error } = await onSignInWithMagicLink(email)
    setLoading(false)
    if (error) { setErr('Något gick fel. Försök igen.'); return }
    setMagicSent(true)
  }

  const inputCls = 'w-full px-3 py-2.5 border-2 border-border rounded-lg text-base mb-3.5 font-[inherit]'
  const primaryBtnCls = 'w-full py-3 bg-primary text-white border-0 rounded-xl text-base font-semibold cursor-pointer font-serif mt-1'
  const secondaryBtnCls = 'w-full py-2.5 bg-transparent text-secondary border border-border rounded-xl text-sm cursor-pointer mt-2.5'
  const labelCls = 'block font-semibold text-primary text-sm mb-1.5'

  if (registerDone) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start px-6 pt-8 pb-12">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-3xl text-center mb-6">Veckoplanen</h1>
        <div className="text-5xl text-center mb-3">📬</div>
        <p className="text-[#444] text-center leading-relaxed text-base">Kontot skapat! Kolla din inkorg och klicka på bekräftelselänken, sedan kan du logga in.</p>
        <button className="bg-transparent border-0 text-secondary text-sm cursor-pointer mt-5 block w-full text-center underline" onClick={() => { setTab('login'); reset() }}>Tillbaka till inloggning</button>
      </div>
    </div>
  )

  if (magicSent) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start px-6 pt-8 pb-12">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h1 className="font-serif text-primary text-3xl text-center mb-6">Veckoplanen</h1>
        <div className="text-5xl text-center mb-3">📬</div>
        <p className="text-[#444] text-center leading-relaxed text-base">Kolla din inkorg! Vi skickade en inloggningslänk till <strong>{email}</strong>.</p>
        <button className="bg-transparent border-0 text-secondary text-sm cursor-pointer mt-5 block w-full text-center underline" onClick={() => { setTab('login'); reset() }}>Försök med annan adress</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start px-6 pt-8 pb-12">
      {/* Hero */}
      <div className="w-full max-w-sm mb-7 text-center">
        <h1 className="font-serif text-primary text-[32px] mb-2">Veckoplanen</h1>
        <p className="text-secondary text-base leading-snug mb-7">
          Planera veckans middagar och få en smart handlingslista — ensam eller tillsammans med familjen.
        </p>
        <div className="flex flex-col gap-3 text-left">
          {featureCards.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 bg-white rounded-xl p-3.5 shadow-[0_2px_8px_rgba(45,80,22,0.07)]">
              <span className="text-2xl leading-none shrink-0 mt-0.5">{icon}</span>
              <div>
                <strong className="text-primary text-sm block mb-0.5">{title}</strong>
                <span className="text-[#666] text-sm leading-snug">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_4px_20px_rgba(45,80,22,0.12)]">
        <h2 className="font-serif text-primary text-xl text-center mb-5">Kom igång — det tar en minut</h2>

        {/* Google */}
        <button
          onClick={onSignInWithGoogle}
          className="w-full py-3 mb-4 bg-white border-2 border-[#e0e0e0] rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2.5 text-[#333]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
          Fortsätt med Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-px bg-bg-subtle" />
          <span className="text-[#bbb] text-xs">eller med e-post</span>
          <div className="flex-1 h-px bg-bg-subtle" />
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-bg-subtle mb-6">
          {([['login', 'Logga in'], ['register', 'Skapa konto']] as const).map(([key, label]) => (
            <button
              key={key}
              className={`flex-1 py-2.5 border-0 bg-transparent text-[15px] cursor-pointer font-semibold border-b-2 -mb-0.5 transition-colors ${tab === key ? 'text-primary border-primary' : 'text-secondary border-transparent'}`}
              onClick={() => { setTab(key); reset() }}
            >{label}</button>
          ))}
        </div>

        {tab === 'login' && (
          <>
            <label className={labelCls}>E-postadress</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label className={labelCls}>Lösenord</label>
            <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {err && <p className="text-error text-sm mb-2.5">{err}</p>}
            <button className={primaryBtnCls} onClick={handleLogin} disabled={loading}>{loading ? 'Loggar in...' : 'Logga in'}</button>
            <button className={secondaryBtnCls} onClick={() => { setTab('magic'); reset() }}>📬 Skicka magic link istället</button>
            <button className="w-full py-2.5 bg-transparent border-0 text-[#aaa] text-sm cursor-pointer mt-1" onClick={() => { setTab('forgot'); reset() }}>Glömt lösenord?</button>
          </>
        )}

        {tab === 'register' && (
          <>
            <p className="text-secondary text-sm mb-3.5 leading-relaxed">Välj ett lösenord du kommer ihåg. Du behöver bekräfta e-postadressen efteråt.</p>
            <label className={labelCls}>E-postadress</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus />
            <label className={labelCls}>Lösenord</label>
            <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minst 8 tecken" onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            {err && <p className="text-error text-sm mb-2.5">{err}</p>}
            <button className={primaryBtnCls} onClick={handleRegister} disabled={loading}>{loading ? 'Skapar konto...' : 'Skapa konto'}</button>
          </>
        )}

        {tab === 'forgot' && (
          <>
            <p className="text-secondary text-sm mb-3.5 leading-relaxed">Ange din e-post så skickar vi en länk för att återställa lösenordet.</p>
            <label className={labelCls}>E-postadress</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
            {err && <p className="text-error text-sm mb-2.5">{err}</p>}
            <button className={primaryBtnCls} onClick={handleForgotPassword} disabled={loading}>{loading ? 'Skickar...' : 'Skicka återställningslänk'}</button>
            <button className={secondaryBtnCls} onClick={() => { setTab('login'); reset() }}>← Tillbaka till inloggning</button>
          </>
        )}

        {tab === 'magic' && (
          <>
            <p className="text-secondary text-sm mb-3.5 leading-relaxed">Ange din e-post så skickar vi en inloggningslänk – inget lösenord behövs.</p>
            <label className={labelCls}>E-postadress</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.se" autoFocus onKeyDown={e => e.key === 'Enter' && handleMagicLink()} />
            {err && <p className="text-error text-sm mb-2.5">{err}</p>}
            <button className={primaryBtnCls} onClick={handleMagicLink} disabled={loading}>{loading ? 'Skickar...' : 'Skicka inloggningslänk'}</button>
            <button className={secondaryBtnCls} onClick={() => { setTab('login'); reset() }}>← Tillbaka till lösenord</button>
          </>
        )}
      </div>
    </div>
  )
}
