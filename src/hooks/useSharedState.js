// Hook för Supabase-synkronisering i realtid
// Strategi: localStorage som omedelbar cache, Supabase som källa för sanning
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];

function cacheKey(roomCode) {
  return `veckoplanen_cache_${roomCode}`;
}

function readCache(roomCode) {
  try {
    const raw = localStorage.getItem(cacheKey(roomCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(roomCode, state) {
  try {
    localStorage.setItem(cacheKey(roomCode), JSON.stringify(state));
  } catch { /* fullt localStorage – ignorera */ }
}

function defaultState(categories) {
  return {
    meals: Object.fromEntries(WEEKDAYS.map(d => [d, ''])),
    checkedItems: {},
    extraItems: [],
    categories,
    customRecipes: [],
    recipeOverrides: {},
    hiddenBuiltin: [],
    activityLog: [],
  };
}

export function useSharedState(roomCode, userName, defaultCategories) {
  // Initialisera direkt från cache så ingenting försvinner vid omladdning
  const [state, setState] = useState(() => {
    if (!roomCode) return null;
    return readCache(roomCode) || null;
  });

  // loading=true bara när vi INTE har något cached att visa
  const [loading, setLoading] = useState(() => !roomCode || !readCache(roomCode));
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const roomIdRef = useRef(null);

  // Spara till cache och uppdatera React-state i ett
  function applyState(newState, code = roomCode) {
    if (code) writeCache(code, newState);
    setState(newState);
  }

  useEffect(() => {
    if (!roomCode) {
      setState(defaultState(defaultCategories));
      setLoading(false);
      return;
    }

    if (!supabase) {
      // Utan Supabase: enbart localStorage
      const cached = readCache(roomCode);
      setState(cached || defaultState(defaultCategories));
      setLoading(false);
      return;
    }

    async function initRoom() {
      try {
        const { data, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (data) {
          roomIdRef.current = data.id;
          applyState(data.state);
          ensureMembership(data.id);
        } else {
          // Rum finns inte – skapa det
          const fresh = readCache(roomCode) || defaultState(defaultCategories);
          const { data: created, error: createError } = await supabase
            .from('rooms')
            .insert({ code: roomCode, state: fresh })
            .select()
            .single();
          if (createError) throw createError;
          roomIdRef.current = created.id;
          applyState(fresh);
          ensureMembership(created.id);
        }
      } catch (err) {
        // Supabase misslyckades – visa cache om vi har den, annars default
        if (!readCache(roomCode)) {
          setState(defaultState(defaultCategories));
        }
        setError(err.message);
        console.error('Supabase-fel vid ruminit:', err.message);
      } finally {
        setLoading(false);
        subscribeToRoom(roomCode);
      }
    }

    initRoom();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // Registrera användaren som rumsmedlem (tyst om room_members inte finns ännu)
  async function ensureMembership(roomId) {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('room_members')
        .upsert(
          { room_id: roomId, user_id: user.id, display_name: userName },
          { onConflict: 'room_id,user_id', ignoreDuplicates: true }
        );
    } catch { /* room_members kanske inte skapats ännu – ignorera */ }
  }

  // Prenumerera på realtidsändringar från Supabase
  function subscribeToRoom(code) {
    if (!supabase) return;
    const channel = supabase
      .channel(`room_${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          applyState(payload.new.state, code);
        }
      )
      .subscribe();
    channelRef.current = channel;
  }

  // Uppdatera state: skriver till cache omedelbart, skickar till Supabase asynkront
  const updateState = useCallback((updater, activityEntry) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (activityEntry && userName) {
        const log = next.activityLog || [];
        next.activityLog = [
          { user: userName, action: activityEntry, time: new Date().toISOString() },
          ...log,
        ].slice(0, 50);
      }

      // Spara lokalt direkt (nollställs aldrig vid omladdning)
      if (roomCode) writeCache(roomCode, next);

      // Skicka till Supabase i bakgrunden
      if (supabase && roomIdRef.current) {
        supabase
          .from('rooms')
          .update({ state: next, updated_at: new Date().toISOString() })
          .eq('id', roomIdRef.current)
          .then(({ error }) => {
            if (error) console.error('Supabase-uppdateringsfel:', error);
          });
      }

      return next;
    });
  }, [roomCode, userName]);

  async function deleteRoom() {
    if (roomCode) localStorage.removeItem(cacheKey(roomCode));
    if (!supabase || !roomIdRef.current) return { error: null };
    try {
      // Ta bort rumsmedlemmar först, sedan rummet
      await supabase.from('room_members').delete().eq('room_id', roomIdRef.current);
      const { error: delErr } = await supabase.from('rooms').delete().eq('id', roomIdRef.current);
      if (delErr) throw delErr;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  return { state, loading, error, updateState, deleteRoom };
}

export { WEEKDAYS };
