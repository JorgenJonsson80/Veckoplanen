import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { RoomStateSchema } from '../schemas'
import type { RoomState, Category, UpdateStateFn } from '../types'

function parseRoomState(raw: unknown): RoomState | null {
  const result = RoomStateSchema.safeParse(raw)
  if (result.success) return result.data as RoomState
  console.warn('RoomState-validering misslyckades:', result.error.issues)
  return null
}

const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']

function cacheKey(roomCode: string): string {
  return `veckoplanen_cache_${roomCode}`
}

function readCache(roomCode: string): RoomState | null {
  try {
    const raw = localStorage.getItem(cacheKey(roomCode))
    if (!raw) return null
    return parseRoomState(JSON.parse(raw))
  } catch { return null }
}

function writeCache(roomCode: string, state: RoomState): void {
  try {
    localStorage.setItem(cacheKey(roomCode), JSON.stringify(state))
  } catch { /* fullt localStorage – ignorera */ }
}

const STARTER_MEALS: Record<string, string> = {
  måndag: 'Tacos',
  tisdag: 'Spagetti Bolognese',
  onsdag: 'Kycklinggryta',
  torsdag: 'Pannkakor',
  fredag: 'Laxpasta',
  lördag: '',
  söndag: '',
}

function defaultState(categories: Category[]): RoomState {
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
  }
}

export function useSharedState(
  roomCode: string | null,
  userName: string,
  defaultCategories: Category[],
  userId: string | null | undefined,
  shouldCreate = true
) {
  const [state, setState] = useState<RoomState | null>(() => {
    if (!roomCode) return null
    return readCache(roomCode) ?? null
  })

  const [loading, setLoading] = useState(() => !roomCode || !readCache(roomCode as string))
  const [error, setError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const roomIdRef = useRef<string | null>(null)

  function applyState(newState: RoomState, code = roomCode): void {
    if (code) writeCache(code, newState)
    setState(newState)
  }

  useEffect(() => {
    if (!roomCode) {
      setState(defaultState(defaultCategories))
      setLoading(false)
      return
    }

    if (!supabase) {
      const cached = readCache(roomCode)
      setState(cached ?? defaultState(defaultCategories))
      setLoading(false)
      return
    }

    let cancelled = false

    async function initRoom() {
      try {
        const { data, error: fetchError } = await supabase!
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single()

        if (cancelled) return
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        if (data) {
          roomIdRef.current = data.id as string
          applyState(parseRoomState(data.state) ?? defaultState(defaultCategories))
          ensureMembership(data.id as string)
        } else if (shouldCreate) {
          const fresh = readCache(roomCode!) ?? defaultState(defaultCategories)
          const { data: created, error: createError } = await supabase!
            .from('rooms')
            .insert({ code: roomCode, state: fresh, created_by: userId ?? null })
            .select()
            .single()
          if (cancelled) return
          if (createError) throw createError
          roomIdRef.current = (created as { id: string }).id
          applyState(fresh)
          ensureMembership((created as { id: string }).id)
        } else {
          setRoomNotFound(true)
        }
      } catch (err) {
        if (cancelled) return
        if (!readCache(roomCode!)) {
          setState(defaultState(defaultCategories))
        }
        setError((err as Error).message)
        console.error('Supabase-fel vid ruminit:', (err as Error).message)
      } finally {
        if (!cancelled) {
          setLoading(false)
          subscribeToRoom(roomCode!)
        }
      }
    }

    initRoom()
    return () => {
      cancelled = true
      if (channelRef.current) supabase!.removeChannel(channelRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode])

  async function ensureMembership(roomId: string): Promise<void> {
    if (!supabase) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('room_members')
        .upsert(
          { room_id: roomId, user_id: user.id, display_name: userName },
          { onConflict: 'room_id,user_id', ignoreDuplicates: true }
        )
    } catch { /* room_members kanske inte skapats ännu – ignorera */ }
  }

  function subscribeToRoom(code: string): void {
    if (!supabase) return
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    const channel = supabase
      .channel(`room_${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          const parsed = parseRoomState((payload.new as { state: unknown }).state)
          if (parsed) applyState(parsed, code)
        }
      )
      .subscribe()
    channelRef.current = channel
  }

  const updateState: UpdateStateFn = useCallback((updater, activityEntry) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev!) : updater

      if (activityEntry && userName) {
        const log = next.activityLog ?? []
        next.activityLog = [
          { user: userName, action: activityEntry, time: new Date().toISOString() },
          ...log,
        ].slice(0, 50)
      }

      if (JSON.stringify(next).length > 500_000) {
        setSyncError('Rummet har för mycket data. Ta bort gamla recept eller varor.')
        return prev
      }

      if (roomCode) writeCache(roomCode, next)

      if (supabase && roomIdRef.current) {
        supabase
          .from('rooms')
          .update({ state: next, updated_at: new Date().toISOString() })
          .eq('id', roomIdRef.current)
          .then(({ error: writeError }) => {
            if (writeError) {
              console.error('Supabase-uppdateringsfel:', writeError)
              setSyncError(writeError.message || 'Okänt fel')
            }
          })
      }

      return next
    })
  }, [roomCode, userName])

  async function deleteRoom(): Promise<{ error: unknown }> {
    if (roomCode) localStorage.removeItem(cacheKey(roomCode))
    if (!supabase || !roomIdRef.current) return { error: null }
    try {
      await supabase.from('room_members').delete().eq('room_id', roomIdRef.current)
      const { error: delErr } = await supabase.from('rooms').delete().eq('id', roomIdRef.current)
      if (delErr) throw delErr
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  return { state, loading, error, syncError, clearSyncError: () => setSyncError(null), roomNotFound, updateState, deleteRoom }
}

export { WEEKDAYS }
