// Hook för att hantera Supabase Auth-session
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = laddar, null = ej inloggad
  const [isRecovery, setIsRecovery] = useState(false); // true när användaren klickat reset-länk

  useEffect(() => {
    if (!supabase) { setUser(null); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // PASSWORD_RECOVERY körs när användaren klickar länken i återställningsmailet
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'SIGNED_OUT') setIsRecovery(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }

  // Skicka återställningslänk via e-post
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }

  // Sätt nytt lösenord (används efter PASSWORD_RECOVERY-event)
  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsRecovery(false);
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
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
    signOut,
  };
}
