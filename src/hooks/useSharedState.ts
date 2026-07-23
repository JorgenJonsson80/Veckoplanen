import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { RoomStateSchema } from '../schemas'
import { errMsg } from '../utils/error'
import type { RoomState, Category, UpdateStateFn } from '../types'

function parseRoomState(raw: unknown): RoomState | null {
  const result = RoomStateSchema.safeParse(raw)
  if (result.success) return result.data as RoomState
  console.warn('RoomState-validering misslyckades:', result.error.issues)
  return null
}

const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']

const SYNC_DEBOUNCE_MS = 500
const SYNC_RETRY_DELAY_MS = 4000
const MAX_ACTIVITY_LOG = 50
const MAX_STATE_BYTES = 500_000
const MAX_SAVED_WEEKS = 20
const MAX_BUDGET_WEEKS = 52
const PURCHASE_HISTORY_DAYS_COMMON = 730   // 2 years for items bought 3+ times
const PURCHASE_HISTORY_DAYS_RARE = 365    // 1 year for items bought fewer times

function pruneState(state: RoomState): RoomState {
  const now = Date.now()
  const result = { ...state }

  if (result.savedMeals) {
    const entries = Object.entries(result.savedMeals).sort(([a], [b]) => b.localeCompare(a))
    if (entries.length > MAX_SAVED_WEEKS)
      result.savedMeals = Object.fromEntries(entries.slice(0, MAX_SAVED_WEEKS))
  }

  if (result.savedLists) {
    const entries = Object.entries(result.savedLists).sort(([a], [b]) => b.localeCompare(a))
    if (entries.length > MAX_SAVED_WEEKS)
      result.savedLists = Object.fromEntries(entries.slice(0, MAX_SAVED_WEEKS))
  }

  if (result.purchaseHistory) {
    const cutoffCommon = now - PURCHASE_HISTORY_DAYS_COMMON * 86400000
    const cutoffRare = now - PURCHASE_HISTORY_DAYS_RARE * 86400000
    const pruned: typeof result.purchaseHistory = {}
    for (const [name, record] of Object.entries(result.purchaseHistory)) {
      if (!record.lastBought) continue
      const ms = new Date(record.lastBought).getTime()
      if ((record.count ?? 0) >= 3 ? ms > cutoffCommon : ms > cutoffRare)
        pruned[name] = record
    }
    result.purchaseHistory = pruned
  }

  if (result.budgetHistory) {
    const entries = Object.entries(result.budgetHistory).sort(([a], [b]) => b.localeCompare(a))
    if (entries.length > MAX_BUDGET_WEEKS)
      result.budgetHistory = Object.fromEntries(entries.slice(0, MAX_BUDGET_WEEKS))
  }

  if (result.ateOut?.length) {
    const cutoff = now - 365 * 86400000
    result.ateOut = result.ateOut.filter(e => new Date(e.date).getTime() > cutoff)
  }

  return result
}

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
    favoriteRecipes: [],
    favoriteWeeks: [],
    activityLog: [],
    purchaseHistory: {},
    budgetHistory: {},
  }
}

export function useSharedState(
  roomCode: string | null,
  userName: string,
  defaultCategories: Category[],
  userId: string | null | undefined,
  shouldCreate = true,
  initialRoomName: string | null = null
) {
  const [state, setState] = useState<RoomState | null>(() => {
    if (!roomCode) return null
    return readCache(roomCode) ?? null
  })

  const [loading, setLoading] = useState(() => !roomCode || !readCache(roomCode as string))
  const [error, setError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [roomName, setRoomName] = useState<string | null>(initialRoomName)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const writeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestStateRef = useRef<RoomState | null>(null)
  const userNameRef = useRef(userName)
  const defaultCategoriesRef = useRef(defaultCategories)
  const userIdRef = useRef(userId)
  const shouldCreateRef = useRef(shouldCreate)
  const initialRoomNameRef = useRef(initialRoomName)
  userNameRef.current = userName
  defaultCategoriesRef.current = defaultCategories
  userIdRef.current = userId
  shouldCreateRef.current = shouldCreate
  initialRoomNameRef.current = initialRoomName

  function applyState(newState: RoomState, code = roomCode): void {
    if (code) writeCache(code, newState)
    latestStateRef.current = newState
    setState(newState)
  }

  useEffect(() => {
    if (!roomCode) {
      setState(defaultState(defaultCategoriesRef.current))
      setLoading(false)
      return
    }

    const cached = readCache(roomCode)
    latestStateRef.current = cached
    setState(cached ?? null)
    setLoading(!cached)

    if (!supabase) {
      setState(cached ?? defaultState(defaultCategoriesRef.current))
      setLoading(false)
      return
    }

    let cancelled = false

    async function initRoom() {
      try {
        if (!shouldCreateRef.current) {
          const { data: joinedRows, error: joinError } = await supabase!
            .rpc('join_room_by_code', { join_code: roomCode, display_name: userNameRef.current })

          if (cancelled) return
          if (joinError) throw joinError

          const joined = Array.isArray(joinedRows) ? joinedRows[0] : null
          if (!joined) {
            setRoomNotFound(true)
            return
          }

          roomIdRef.current = joined.joined_room_id as string
          setRoomName((joined.room_name as string | null) ?? null)
          applyState(parseRoomState(joined.room_state) ?? defaultState(defaultCategoriesRef.current))
          return
        }

        const { data, error: fetchError } = await supabase!
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .maybeSingle()

        if (cancelled) return
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        if (data) {
          roomIdRef.current = data.id as string
          setRoomName((data.name as string | null) ?? null)
          applyState(parseRoomState(data.state) ?? defaultState(defaultCategoriesRef.current))
          ensureMembership(data.id as string)
        } else if (shouldCreateRef.current) {
          const fresh = readCache(roomCode!) ?? defaultState(defaultCategoriesRef.current)
          const { data: created, error: createError } = await supabase!
            .from('rooms')
            .insert({ code: roomCode, state: fresh, created_by: userIdRef.current ?? null, name: initialRoomNameRef.current })
            .select()
            .single()
          if (cancelled) return
          if (createError) {
            if (createError.message?.includes('Max 5')) {
              setError('Du har skapat för många rum. Ta bort ett gammalt rum och försök igen.')
              setLoading(false)
              return
            }
            throw createError
          }
          roomIdRef.current = (created as { id: string }).id
          setRoomName((created as { name: string | null }).name ?? null)
          applyState(fresh)
          ensureMembership((created as { id: string }).id)
        } else {
          setRoomNotFound(true)
        }
      } catch (err) {
        if (cancelled) return
        if (!readCache(roomCode!)) {
          setState(defaultState(defaultCategoriesRef.current))
        }
        setError(errMsg(err))
        console.error('Supabase-fel vid ruminit:', errMsg(err))
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
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current)
    }
  }, [roomCode])

  async function ensureMembership(roomId: string): Promise<void> {
    if (!supabase) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('room_members')
        .upsert(
          { room_id: roomId, user_id: user.id, display_name: userNameRef.current },
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
          const row = payload.new as { state: unknown; name?: string | null }
          const parsed = parseRoomState(row.state)
          if (parsed) applyState(parsed, code)
          if ('name' in row) setRoomName(row.name ?? null)
        }
      )
      .subscribe()
    channelRef.current = channel
  }

  const updateState: UpdateStateFn = useCallback((updater, activityEntry) => {
    setState(prev => {
      let next = typeof updater === 'function' ? updater(prev!) : updater

      if (activityEntry && userName) {
        const log = next.activityLog ?? []
        next.activityLog = [
          { user: userName, action: activityEntry, time: new Date().toISOString() },
          ...log,
        ].slice(0, MAX_ACTIVITY_LOG)
      }

      next = pruneState(next)

      const serialized = JSON.stringify(next)
      if (serialized.length > MAX_STATE_BYTES) {
        setSyncError('Rummet har för mycket data. Ta bort gamla recept eller varor.')
        return prev
      }

      if (roomCode) writeCache(roomCode, next)

      if (supabase && roomIdRef.current) {
        const roomId = roomIdRef.current
        latestStateRef.current = next

        const attemptWrite = (isRetry: boolean) => {
          const current = latestStateRef.current
          if (!current) return
          supabase!.from('rooms')
            .update({ state: current })
            .eq('id', roomId)
            .then(({ error: writeError }) => {
              if (!writeError) {
                if (retryTimeoutRef.current) {
                  clearTimeout(retryTimeoutRef.current)
                  retryTimeoutRef.current = null
                }
                setSyncError(null)
                return
              }
              console.error('Supabase-uppdateringsfel:', writeError)
              if (isRetry) {
                setSyncError(writeError.message || 'Okänt synkfel')
              } else {
                setSyncError('Synkfel – försöker igen…')
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = setTimeout(() => attemptWrite(true), SYNC_RETRY_DELAY_MS)
              }
            })
        }

        if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current)
        writeDebounceRef.current = setTimeout(() => {
          writeDebounceRef.current = null
          attemptWrite(false)
        }, SYNC_DEBOUNCE_MS)
      }

      return next
    })
  }, [roomCode, userName])

  async function renameRoom(newName: string): Promise<{ error: unknown }> {
    const trimmed = newName.trim() || null
    setRoomName(trimmed)
    if (!supabase || !roomIdRef.current) return { error: null }
    const { error: renameError } = await supabase.from('rooms').update({ name: trimmed }).eq('id', roomIdRef.current)
    return { error: renameError }
  }

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

  return { state, loading, error, syncError, clearSyncError: () => setSyncError(null), roomNotFound, roomName, renameRoom, updateState, deleteRoom }
}

export { WEEKDAYS }
