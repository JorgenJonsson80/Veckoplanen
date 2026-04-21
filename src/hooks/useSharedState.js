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

const STARTER_MEALS = {
  måndag: 'Tacos',
  tisdag: 'Spagetti Bolognese',
  onsdag: 'Kycklinggryta',
  torsdag: 'Pannkakor',
  fredag: 'Laxpasta',
  lördag: '',
  söndag: '',
};

function defaultState(categories) {
  return {
    meals: { ...STARTER_MEALS },
    checkedItems: {},
    extraItems: [],
    categories,
    customRecipes: [],
    recipeOverrides: {},
    hiddenBuiltin: [],
    activityLog: [],
    purchaseHistory: {},
  };
}

export function useSharedState(roomCode, userName, defaultCategories, userId, shouldCreate = true) {
  // Initialisera direkt från cache så ingenting försvinner vid omladdning
  const [state, setState] = useState(() => {
    if (!roomCode) return null;
    return readCache(roomCode) || null;
  });

  // loading=true bara när vi INTE har något cached att visa
  const [loading, setLoading] = useState(() => !roomCode || !readCache(roomCode));
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
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
        } else if (shouldCreate) {
          // Rum finns inte – skapa det (bara i 'create'-läge)
          const fresh = readCache(roomCode) || defaultState(defaultCategories);
          const { data: created, error: createError } = await supabase
            .from('rooms')
            .insert({ code: roomCode, state: fresh, created_by: userId ?? null })
            .select()
            .single();
          if (createError) throw createError;
          roomIdRef.current = created.id;
          applyState(fresh);
          ensureMembership(created.id);
        } else {
          // Rum hittades inte och vi ska inte skapa det (t.ex. join med ogiltig kod)
          setRoomNotFound(true);
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
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
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

      // Avvisa om state blivit orimligt stor (skydd mot datamissbruk)
      if (JSON.stringify(next).length > 500_000) {
        setSyncError('Rummet har för mycket data. Ta bort gamla recept eller varor.');
        return prev;
      }

      // Spara lokalt direkt (nollställs aldrig vid omladdning)
      if (roomCode) writeCache(roomCode, next);

      // Skicka till Supabase i bakgrunden
      if (supabase && roomIdRef.current) {
        supabase
          .from('rooms')
          .update({ state: next, updated_at: new Date().toISOString() })
          .eq('id', roomIdRef.current)
          .then(({ error: writeError }) => {
            if (writeError) {
              console.error('Supabase-uppdateringsfel:', writeError);
              setSyncError(writeError.message || 'Okänt fel');
            }
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

  return { state, loading, error, syncError, clearSyncError: () => setSyncError(null), roomNotFound, updateState, deleteRoom };
}

export { WEEKDAYS };
