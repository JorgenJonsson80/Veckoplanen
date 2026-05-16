import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShoppingList } from './useShoppingList'
import type { RoomState, Category, UpdateStateFn, BudgetWeekRecord } from '../types'

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
    budgetHistory: {},
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

  it('setWeeklySpend stores budget history for the current week', () => {
    const state = makeState({ budget: 900 })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))

    act(() => { result.current.setWeeklySpend(840) })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    const weekKey = Object.keys(next.budgetHistory ?? {})[0]
    expect(next.weeklySpend).toBe(840)
    expect(next.budgetHistory?.[weekKey]).toMatchObject({ budget: 900, spend: 840 })
  })

  it('budgetSummary exposes current, previous and four week average', () => {
    const state = makeState({
      budgetHistory: {
        '2026-W13': { budget: 900, spend: 700, savedAt: '2026-03-27T00:00:00Z' },
        '2026-W14': { budget: 900, spend: 800, savedAt: '2026-04-03T00:00:00Z' },
        '2026-W15': { budget: 900, spend: 900, savedAt: '2026-04-10T00:00:00Z' },
        '2026-W16': { budget: 900, spend: 1000, savedAt: '2026-04-17T00:00:00Z' },
      },
    })

    const { result } = renderHook(() => useShoppingList(state, vi.fn() as unknown as UpdateStateFn, ingredientMap, categories))

    expect(result.current.budgetSummary.previous?.spend).toBe(1000)
    expect(result.current.budgetSummary.averageSpend).toBe(850)
    expect(result.current.budgetSummary.recordedWeeks).toBe(4)
  })

  it('addExtraItem sets addedDuringShopping flag when passed', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.addExtraItem('Chips', 'snacks', true) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.extraItems[0].addedDuringShopping).toBe(true)
  })

  it('addExtraItem defaults addedDuringShopping to false', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.addExtraItem('Ägg', 'torrvara') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.extraItems[0].addedDuringShopping).toBe(false)
  })

  it('clearChecked counts checked impulse items and stores in budgetHistory', () => {
    const state = makeState({
      checkedItems: { Chips: true, Ägg: true },
      extraItems: [
        { id: '1', name: 'Chips', category: 'snacks', addedDuringShopping: true },
        { id: '2', name: 'Ägg', category: 'torrvara', addedDuringShopping: false },
      ],
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.clearChecked() })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    const weekRecord = Object.values(next.budgetHistory ?? {})[0] as BudgetWeekRecord | undefined
    expect(weekRecord?.impulseCount).toBe(1)
    expect(next.extraItems).toHaveLength(0)
    expect(next.checkedItems).toEqual({})
  })

  it('clearChecked does not write budgetHistory when no impulse items were checked', () => {
    const state = makeState({
      checkedItems: { Köttfärs: true },
      extraItems: [],
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.clearChecked() })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(Object.keys(next.budgetHistory ?? {})).toHaveLength(0)
  })

  it('logAteOut adds an entry to ateOut', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.logAteOut('2026-05-14', 350) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.ateOut).toEqual([{ date: '2026-05-14', amount: 350 }])
  })

  it('logAteOut replaces existing entry for the same date', () => {
    const state = makeState({ ateOut: [{ date: '2026-05-14', amount: 200 }] })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.logAteOut('2026-05-14', 450) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.ateOut).toHaveLength(1)
    expect(next.ateOut![0].amount).toBe(450)
  })

  it('removeAteOut removes entry by date', () => {
    const state = makeState({ ateOut: [{ date: '2026-05-14', amount: 300 }, { date: '2026-05-13' }] })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useShoppingList(state, updateState, ingredientMap, categories))
    act(() => { result.current.removeAteOut('2026-05-14') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.ateOut).toHaveLength(1)
    expect(next.ateOut![0].date).toBe('2026-05-13')
  })

  describe('monthlySummary', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-05-14T12:00:00Z')) })
    afterEach(() => vi.useRealTimers())

    it('returns zero counts when no data', () => {
      const { result } = renderHook(() => useShoppingList(makeState(), vi.fn() as unknown as UpdateStateFn, emptyIngredientMap, categories))
      expect(result.current.monthlySummary.ateOutCount).toBe(0)
      expect(result.current.monthlySummary.impulseCount).toBe(0)
    })

    it('counts ateOut entries in current month', () => {
      const state = makeState({
        ateOut: [
          { date: '2026-05-10', amount: 200 },
          { date: '2026-05-12' },
          { date: '2026-04-30', amount: 150 },
        ],
      })
      const { result } = renderHook(() => useShoppingList(state, vi.fn() as unknown as UpdateStateFn, emptyIngredientMap, categories))
      expect(result.current.monthlySummary.ateOutCount).toBe(2)
      expect(result.current.monthlySummary.ateOutSpend).toBe(200)
      expect(result.current.monthlySummary.prev.ateOutCount).toBe(1)
      expect(result.current.monthlySummary.prev.ateOutSpend).toBe(150)
    })
  })

  describe('likelyEmptyItems', () => {
    it('flags items past shelf life', () => {
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-14T00:00:00Z').getTime())
      const state = makeState({
        purchaseHistory: {
          Köttfärs: { lastBought: '2026-05-10T00:00:00Z', count: 1, cat: 'kott' },
        },
      })
      const { result } = renderHook(() => useShoppingList(state, vi.fn() as unknown as UpdateStateFn, ingredientMap, categories))
      expect(result.current.likelyEmptyItems.map(i => i.name)).toContain('Köttfärs')
    })

    it('does not flag recently bought items', () => {
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-14T00:00:00Z').getTime())
      const state = makeState({
        purchaseHistory: {
          Köttfärs: { lastBought: '2026-05-13T00:00:00Z', count: 1, cat: 'kott' },
        },
      })
      const { result } = renderHook(() => useShoppingList(state, vi.fn() as unknown as UpdateStateFn, ingredientMap, categories))
      expect(result.current.likelyEmptyItems).toHaveLength(0)
    })
  })
})
