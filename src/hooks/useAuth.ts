import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User, AuthError } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) { setUser(null); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') setIsRecovery(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithPassword(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase!.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error }
  }

  async function signInWithMagicLink(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error }
  }

  async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error }
  }

  async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase!.auth.updateUser({ password: newPassword })
    if (!error) setIsRecovery(false)
    return { error }
  }

  async function signInWithGoogle(): Promise<void> {
    await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut(): Promise<void> {
    await supabase!.auth.signOut()
  }

  return {
    user,
    loading: user === undefined,
    isRecovery,
    signInWithPassword,
    signUp,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signOut,
  }
}
