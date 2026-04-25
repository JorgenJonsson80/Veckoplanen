import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSharedState, WEEKDAYS } from './useSharedState'
import type { Category, RoomState } from '../types'

vi.mock('../lib/supabase', () => ({ supabase: null }))

const NO_CATEGORIES: Category[] = []
const ROOM_CODE = 'TESTROOM'

function makeState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    meals: {},
    checkedItems: {},
    extraItems: [],
    categories: [],
    customRecipes: [],
    recipeOverrides: {},
    hiddenBuiltin: [],
    favoriteRecipes: [],
    favoriteWeeks: [],
    activityLog: [],
    purchaseHistory: {},
    budgetHistory: {},
    ...overrides,
  }
}

describe('WEEKDAYS', () => {
  it('exports 7 days starting with måndag and ending with söndag', () => {
    expect(WEEKDAYS).toHaveLength(7)
    expect(WEEKDAYS[0]).toBe('måndag')
    expect(WEEKDAYS[6]).toBe('söndag')
  })
})

describe('useSharedState — no roomCode', () => {
  it('returns a non-null default state and finishes loading', async () => {
    const { result } = renderHook(() =>
      useSharedState(null, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).not.toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.roomNotFound).toBe(false)
  })
})

describe('useSharedState — offline (supabase = null)', () => {
  beforeEach(() => localStorage.clear())

  it('returns a non-null state and finishes loading when there is no cache', async () => {
    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).not.toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('restores state from localStorage cache on mount', async () => {
    const cached = makeState({ meals: { måndag: 'Laxpasta' } })
    localStorage.setItem(`veckoplanen_cache_${ROOM_CODE}`, JSON.stringify(cached))

    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.state?.meals.måndag).toBe('Laxpasta'))
    expect(result.current.loading).toBe(false)
  })
})

describe('useSharedState — updateState', () => {
  beforeEach(() => localStorage.clear())

  async function setup() {
    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    return result
  }

  it('updates state via function updater', async () => {
    const result = await setup()
    act(() => {
      result.current.updateState(prev => ({ ...prev!, meals: { måndag: 'Tacos' } }))
    })
    expect(result.current.state?.meals.måndag).toBe('Tacos')
  })

  it('appends to activityLog with user and action when activityEntry is provided', async () => {
    const result = await setup()
    act(() => {
      result.current.updateState(prev => prev!, 'lade till recept')
    })
    expect(result.current.state?.activityLog[0].action).toBe('lade till recept')
    expect(result.current.state?.activityLog[0].user).toBe('Kalle')
  })

  it('does not append to activityLog when no activityEntry is provided', async () => {
    const result = await setup()
    act(() => {
      result.current.updateState(prev => prev!)
    })
    expect(result.current.state?.activityLog).toHaveLength(0)
  })

  it('caps activityLog at 50 entries, newest first', async () => {
    const log = Array.from({ length: 50 }, (_, i) => ({
      user: 'A',
      action: `action ${i}`,
      time: new Date().toISOString(),
    }))
    localStorage.setItem(
      `veckoplanen_cache_${ROOM_CODE}`,
      JSON.stringify(makeState({ activityLog: log }))
    )

    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.state?.activityLog).toHaveLength(50))

    act(() => {
      result.current.updateState(prev => prev!, 'ny händelse')
    })

    expect(result.current.state?.activityLog).toHaveLength(50)
    expect(result.current.state?.activityLog[0].action).toBe('ny händelse')
  })

  it('rejects update and sets syncError when state would exceed 500 KB', async () => {
    const result = await setup()
    const prevRecipes = result.current.state?.customRecipes

    act(() => {
      result.current.updateState(() => ({
        ...makeState(),
        customRecipes: [{ id: 'big', name: 'x'.repeat(500_001), ingredients: [] }],
      }))
    })

    expect(result.current.syncError).toContain('för mycket data')
    expect(result.current.state?.customRecipes).toEqual(prevRecipes)
  })

  it('persists updated state to localStorage', async () => {
    const result = await setup()
    act(() => {
      result.current.updateState(prev => ({ ...prev!, meals: { fredag: 'Pizza' } }))
    })
    const raw = localStorage.getItem(`veckoplanen_cache_${ROOM_CODE}`)
    expect(JSON.parse(raw!).meals.fredag).toBe('Pizza')
  })
})

describe('useSharedState — deleteRoom', () => {
  beforeEach(() => localStorage.clear())

  it('clears localStorage cache and returns { error: null } when supabase is null', async () => {
    localStorage.setItem(`veckoplanen_cache_${ROOM_CODE}`, JSON.stringify(makeState()))

    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    let deleteResult!: { error: unknown }
    await act(async () => {
      deleteResult = await result.current.deleteRoom()
    })

    expect(deleteResult.error).toBeNull()
    expect(localStorage.getItem(`veckoplanen_cache_${ROOM_CODE}`)).toBeNull()
  })
})

describe('useSharedState — clearSyncError', () => {
  beforeEach(() => localStorage.clear())

  it('clears syncError set by an oversized update', async () => {
    const { result } = renderHook(() =>
      useSharedState(ROOM_CODE, 'Kalle', NO_CATEGORIES, 'user-1')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateState(() => ({
        ...makeState(),
        customRecipes: [{ id: 'big', name: 'x'.repeat(500_001), ingredients: [] }],
      }))
    })
    expect(result.current.syncError).not.toBeNull()

    act(() => { result.current.clearSyncError() })
    expect(result.current.syncError).toBeNull()
  })
})
