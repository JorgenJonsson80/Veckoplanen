import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecipes } from './useRecipes'
import { DEFAULT_RECIPES } from '../constants/recipes'
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
    ...overrides,
  }
}

describe('useRecipes — allRecipes', () => {
  it('returns DEFAULT_RECIPES when state is null', () => {
    const { result } = renderHook(() => useRecipes(null, vi.fn() as unknown as UpdateStateFn))
    expect(result.current.allRecipes).toEqual(DEFAULT_RECIPES)
  })

  it('includes default recipes in the list', () => {
    const state = makeState()
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    expect(result.current.allRecipes.map(r => r.id)).toContain('tacos')
  })

  it('excludes hidden builtin recipes', () => {
    const state = makeState({ hiddenBuiltin: ['tacos'] })
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    expect(result.current.allRecipes.map(r => r.id)).not.toContain('tacos')
  })

  it('applies overrides to builtin recipes', () => {
    const override = { ...DEFAULT_RECIPES[0], name: 'Super Tacos' }
    const state = makeState({ recipeOverrides: { tacos: override } })
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    const tacos = result.current.allRecipes.find(r => r.id === 'tacos')
    expect(tacos?.name).toBe('Super Tacos')
  })

  it('override with empty ingredients falls back to builtin ingredients', () => {
    const state = makeState({ recipeOverrides: { tacos: { name: 'Ny Tacos', ingredients: [] } } })
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    const tacos = result.current.allRecipes.find(r => r.id === 'tacos')
    expect(tacos?.name).toBe('Ny Tacos')
    expect(tacos?.ingredients.length).toBeGreaterThan(0)
  })

  it('override with null ingredients falls back to builtin ingredients', () => {
    const state = makeState({ recipeOverrides: { tacos: { name: 'Ny Tacos', ingredients: null as unknown as [] } } })
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    const tacos = result.current.allRecipes.find(r => r.id === 'tacos')
    expect(tacos?.ingredients.length).toBeGreaterThan(0)
  })

  it('appends custom recipes after defaults', () => {
    const custom = { id: 'custom_1', name: 'Morotssoppa', ingredients: [] }
    const state = makeState({ customRecipes: [custom] })
    const { result } = renderHook(() => useRecipes(state, vi.fn() as unknown as UpdateStateFn))
    const ids = result.current.allRecipes.map(r => r.id)
    expect(ids.indexOf('custom_1')).toBeGreaterThan(ids.indexOf('tacos'))
  })
})

describe('useRecipes — saveRecipe', () => {
  it('saves an override for a builtin recipe', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useRecipes(state, updateState))
    act(() => { result.current.saveRecipe({ ...DEFAULT_RECIPES[0], name: 'Ny Tacos' }) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.recipeOverrides['tacos'].name).toBe('Ny Tacos')
  })

  it('updates an existing custom recipe', () => {
    const custom = { id: 'custom_99', name: 'Gammalt namn', ingredients: [] }
    const state = makeState({ customRecipes: [custom] })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useRecipes(state, updateState))
    act(() => { result.current.saveRecipe({ id: 'custom_99', name: 'Nytt namn', ingredients: [] }) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.customRecipes[0].name).toBe('Nytt namn')
  })

  it('creates a new custom recipe when id is null', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useRecipes(state, updateState))
    act(() => { result.current.saveRecipe({ id: null, name: 'Färsk pasta', ingredients: [] }) })
    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.customRecipes).toHaveLength(1)
    expect(next.customRecipes[0].name).toBe('Färsk pasta')
    expect(next.customRecipes[0].id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('useRecipes — favorites', () => {
  it('adds a recipe to favorites', () => {
    const state = makeState()
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useRecipes(state, updateState))

    act(() => { result.current.toggleFavoriteRecipe('tacos') })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.favoriteRecipes).toEqual(['tacos'])
  })

  it('removes a recipe from favorites', () => {
    const state = makeState({ favoriteRecipes: ['tacos', 'pannkakor'] })
    const updateState = vi.fn() as unknown as UpdateStateFn
    const { result } = renderHook(() => useRecipes(state, updateState))

    act(() => { result.current.toggleFavoriteRecipe('tacos') })

    const updater = (updateState as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const next = updater(state)
    expect(next.favoriteRecipes).toEqual(['pannkakor'])
  })
})
