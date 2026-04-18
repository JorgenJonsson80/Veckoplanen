// Hook för Supabase-synkronisering i realtid
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Veckodag-ordning
const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];

// Standardvärden för ett nytt rum
function defaultState(categories) {
  return {
    meals: Object.fromEntries(WEEKDAYS.map(d => [d, ''])),
    checkedItems: {},
    extraItems: [],
    categories: categories,
    customRecipes: [],
    recipeOverrides: {},
    hiddenBuiltin: [],
    activityLog: [],
  };
}

export function useSharedState(roomCode, userName, defaultCategories) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const roomIdRef = useRef(null);

  // Hämta eller skapa rum
  useEffect(() => {
    if (!roomCode) {
      setState(defaultState(defaultCategories));
      setLoading(false);
      return;
    }
    if (!supabase) {
      // Utan Supabase: använd localStorage som fallback
      const key = `veckoplanen_room_${roomCode}`;
      const stored = localStorage.getItem(key);
      setState(stored ? JSON.parse(stored) : defaultState(defaultCategories));
      setLoading(false);
      return;
    }

    async function initRoom() {
      try {
        // Sök efter befintligt rum med den angivna koden
        const { data, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data) {
          roomIdRef.current = data.id;
          setState(data.state);
          // Registrera användaren som medlem om hen inte redan är det
          await ensureMembership(data.id);
        } else {
          // Skapa nytt rum
          const newState = defaultState(defaultCategories);
          const { data: created, error: createError } = await supabase
            .from('rooms')
            .insert({ code: roomCode, state: newState })
            .select()
            .single();
          if (createError) throw createError;
          roomIdRef.current = created.id;
          setState(newState);
          // Lägg till skaparen som första medlem
          await ensureMembership(created.id);
        }
        setLoading(false);
        subscribeToRoom(roomCode);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    initRoom();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // Lägg till den inloggade användaren i room_members (ignorera om redan finns)
  async function ensureMembership(roomId) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('room_members')
      .upsert(
        { room_id: roomId, user_id: user.id, display_name: userName },
        { onConflict: 'room_id,user_id', ignoreDuplicates: true }
      );
  }

  // Prenumerera på realtidsuppdateringar
  function subscribeToRoom(code) {
    if (!supabase) return;
    const channel = supabase
      .channel(`room_${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          setState(payload.new.state);
        }
      )
      .subscribe();
    channelRef.current = channel;
  }

  // Uppdatera delat tillstånd
  const updateState = useCallback(async (updater, activityEntry) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Lägg till aktivitetslogg om det finns
      if (activityEntry && userName) {
        const log = next.activityLog || [];
        const entry = {
          user: userName,
          action: activityEntry,
          time: new Date().toISOString(),
        };
        next.activityLog = [entry, ...log].slice(0, 50);
      }

      // Synka till Supabase eller localStorage
      if (supabase && roomIdRef.current) {
        supabase
          .from('rooms')
          .update({ state: next, updated_at: new Date().toISOString() })
          .eq('id', roomIdRef.current)
          .then(({ error }) => {
            if (error) console.error('Supabase-uppdateringsfel:', error);
          });
      } else if (roomCode) {
        const key = `veckoplanen_room_${roomCode}`;
        localStorage.setItem(key, JSON.stringify(next));
      }

      return next;
    });
  }, [roomCode, userName]);

  return { state, loading, error, updateState };
}

export { WEEKDAYS };
