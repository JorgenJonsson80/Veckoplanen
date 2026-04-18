// Hook för att hantera Supabase Auth-session
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  // undefined = laddar fortfarande, null = ej inloggad, object = inloggad
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    // Hämta befintlig session (t.ex. efter magic link-klick)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Lyssna på förändringar: inloggning, utloggning, token-refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Skicka magic link till angiven e-postadress
  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    user,
    loading: user === undefined,
    signInWithMagicLink,
    signOut,
  };
}
