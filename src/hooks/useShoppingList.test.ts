import { describe, it, expect, vi } from 'vitest'
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
    activityLog: [],
    purchaseHistory: {},
    ...overrides,
  }
}

const ingredientMap = {
  Köttfärs: { amount: '500g', category: 'kott', sources: ['Tacos'] },
}

describe('useShoppingList', () => {
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

  it('toggleItem unchecks a checked item and decrements count', () => {
    const state = makeState({
      checkedItems: { Köttfärs: true },
      purchaseHistory: { Köttfärs: { lastBought: new Date().toISOString(), count: 2 } },
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.toggleItem('Köttfärs', 'kott') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.checkedItems['Köttfärs']).toBe(false)
    expect(next.purchaseHistory['Köttfärs'].count).toBe(1)
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
