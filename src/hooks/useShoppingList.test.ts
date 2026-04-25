import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShoppingList } from './useShoppingList'
import type { RoomState, Category, UpdateStateFn } from '../types'

const categories: Category[] = [
  { id: 'kott', name: 'Kött', emoji: '🥩', shelfLife: 3 },
  { id: 'torrvara', name: 'Torrvaror', emoji: '🌾', shelfLife: 90 },
]

function makeState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    meals: {},
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
    ...overrides,
  }
}

const ingredientMap = {
  Köttfärs: { amount: '500g', category: 'kott', sources: ['Tacos'] },
}
const emptyIngredientMap = {}

describe('useShoppingList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggleItem checks an unchecked item', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.toggleItem('Köttfärs', 'kott') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.checkedItems['Köttfärs']).toBe(true)
  })

  it('toggleItem records purchase history when checking', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.toggleItem('Köttfärs', 'kott') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.purchaseHistory['Köttfärs'].count).toBe(1)
    expect(next.purchaseHistory['Köttfärs'].lastBought).toBeTruthy()
  })

  it('toggleItem learns average purchase interval from previous purchases', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-22T00:00:00Z').getTime())
    const state = makeState({
      purchaseHistory: { Köttfärs: { lastBought: '2026-04-01T00:00:00.000Z', count: 1, cat: 'kott' } },
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))

    act(() => { result.current.toggleItem('Köttfärs', 'kott') })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.purchaseHistory['Köttfärs'].averageIntervalDays).toBe(21)
  })

  it('suggests rebuys from learned purchase interval', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-22T00:00:00Z').getTime())
    const state = makeState({
      purchaseHistory: {
        Kaffe: { lastBought: '2026-04-01T00:00:00.000Z', count: 3, cat: 'torrvara', averageIntervalDays: 21 },
      },
    })

    const { result } = renderHook(() => useShoppingList(state, vi.fn() as unknown as UpdateStateFn, emptyIngredientMap, categories))

    expect(result.current.suggestedRebuys).toEqual([
      { name: 'Kaffe', catId: 'torrvara', daysSince: 21, intervalDays: 21 },
    ])
  })


  it('toggleItem unchecks a checked item and decrements count', () => {
    const lastBought = new Date().toISOString()
    const state = makeState({
      checkedItems: { Köttfärs: true },
      purchaseHistory: { Köttfärs: { lastBought, count: 2 } },
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.toggleItem('Köttfärs', 'kott') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.checkedItems['Köttfärs']).toBe(false)
    expect(next.purchaseHistory['Köttfärs'].count).toBe(1)
    expect(next.purchaseHistory['Köttfärs'].lastBought).toBe(lastBought)
  })

  it('toggleItem preserves lastBought when count reaches zero', () => {
    const lastBought = new Date().toISOString()
    const state = makeState({
      checkedItems: { Köttfärs: true },
      purchaseHistory: { Köttfärs: { lastBought, count: 1 } },
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.toggleItem('Köttfärs', 'kott') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.purchaseHistory['Köttfärs'].count).toBe(0)
    expect(next.purchaseHistory['Köttfärs'].lastBought).toBe(lastBought)
  })

  it('addExtraItem appends to extraItems', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.addExtraItem('Ägg', 'torrvara') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.extraItems).toHaveLength(1)
    expect(next.extraItems[0].name).toBe('Ägg')
    expect(next.extraItems[0].category).toBe('torrvara')
  })

  it('removeExtraItem removes the item by id', () => {
    const state = makeState({ extraItems: [{ id: 'item-1', name: 'Ägg', category: 'torrvara' }] })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.removeExtraItem('item-1') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.extraItems).toHaveLength(0)
  })

  it('clearChecked empties checkedItems', () => {
    const state = makeState({ checkedItems: { Köttfärs: true } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.clearChecked() })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.checkedItems).toEqual({})
  })
})
