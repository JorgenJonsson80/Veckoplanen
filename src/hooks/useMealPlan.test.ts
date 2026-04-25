import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMealPlan } from './useMealPlan'
import type { RoomState, UpdateStateFn } from '../types'

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

describe('useMealPlan', () => {
  it('returns meals from state', () => {
    const state = makeState({ meals: { måndag: 'Tacos' } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    expect(result.current.meals).toEqual({ måndag: 'Tacos' })
  })

  it('setMeal calls updateState with updated meals', () => {
    const state = makeState({ meals: { måndag: '' } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    act(() => { result.current.setMeal('måndag', 'Pasta') })
    expect(updateState).toHaveBeenCalledOnce()
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.meals.måndag).toBe('Pasta')
  })

  it('clearMeals sets all weekdays to empty string', () => {
    const state = makeState({ meals: { måndag: 'Tacos', tisdag: 'Pasta' } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    act(() => { result.current.clearMeals() })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    Object.values(next.meals).forEach(v => expect(v).toBe(''))
  })

  it('saveMealPlan does nothing if all meals are empty', () => {
    const state = makeState({ meals: { måndag: '', tisdag: '' } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    act(() => { result.current.saveMealPlan() })
    expect(updateState).not.toHaveBeenCalled()
  })

  it('loadMealPlan restores a saved meal plan', () => {
    const saved = { meals: { måndag: 'Tacos' }, savedAt: '2024-01-01T00:00:00Z' }
    const state = makeState({ savedMeals: { '2024-W01': saved } })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    act(() => { result.current.loadMealPlan('2024-W01') })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.meals).toEqual({ måndag: 'Tacos' })
  })

  it('loadMealPlan does nothing for unknown week key', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))
    act(() => { result.current.loadMealPlan('2099-W99') })
    expect(updateState).not.toHaveBeenCalled()
  })

  it('generateWeekFromMeals fills the week and resets stale shopping list state', () => {
    const state = makeState({
      checkedItems: { Mjölk: true },
      hiddenIngredients: ['Tomat'],
      weeklySpend: 450,
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))

    act(() => { result.current.generateWeekFromMeals(['Tacos', 'Pannkakor', 'Laxpasta']) })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.meals).toEqual({
      måndag: 'Tacos',
      tisdag: 'Pannkakor',
      onsdag: 'Laxpasta',
      torsdag: 'Tacos',
      fredag: 'Pannkakor',
      lördag: 'Laxpasta',
      söndag: 'Tacos',
    })
    expect(next.checkedItems).toEqual({})
    expect(next.hiddenIngredients).toEqual([])
    expect(next.weeklySpend).toBeNull()
  })

  it('saveFavoriteWeek stores the current meals with a name', () => {
    const state = makeState({ meals: { måndag: 'Tacos', tisdag: 'Pannkakor' }, weeklySpend: 780 })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))

    act(() => { result.current.saveFavoriteWeek('Snabba veckan') })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.favoriteWeeks).toHaveLength(1)
    expect(next.favoriteWeeks[0].name).toBe('Snabba veckan')
    expect(next.favoriteWeeks[0].meals).toEqual(state.meals)
    expect(next.favoriteWeeks[0].estimatedSpend).toBe(780)
  })

  it('loadFavoriteWeek restores meals and resets stale shopping list state', () => {
    const state = makeState({
      checkedItems: { Mjölk: true },
      hiddenIngredients: ['Tomat'],
      weeklySpend: 450,
      favoriteWeeks: [{ id: 'week_1', name: 'Barnens vecka', meals: { måndag: 'Tacos' }, savedAt: '2026-01-01T00:00:00Z' }],
    })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useMealPlan(state, updateState))

    act(() => { result.current.loadFavoriteWeek('week_1') })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.meals).toEqual({ måndag: 'Tacos' })
    expect(next.checkedItems).toEqual({})
    expect(next.hiddenIngredients).toEqual([])
    expect(next.weeklySpend).toBeNull()
  })
})
