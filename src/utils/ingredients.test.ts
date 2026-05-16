import { describe, it, expect } from 'vitest'
import { buildIngredientMap } from './ingredients'
import type { Recipe } from '../types'

const tacos: Recipe = {
  id: 'tacos',
  name: 'Tacos',
  ingredients: [
    { name: 'Köttfärs', amount: '500g', category: 'kott' },
    { name: 'Tortilla', amount: '8 st', category: 'brod' },
  ],
}

const pasta: Recipe = {
  id: 'pasta',
  name: 'Pasta',
  ingredients: [
    { name: 'Köttfärs', amount: '400g', category: 'kott' },
    { name: 'Pasta', amount: '400g', category: 'torrvara' },
  ],
}

describe('buildIngredientMap', () => {
  it('returns empty map for empty meals', () => {
    expect(buildIngredientMap({}, [tacos])).toEqual({})
  })

  it('maps ingredients from a single meal', () => {
    const map = buildIngredientMap({ måndag: 'Tacos' }, [tacos])
    expect(map['Köttfärs']).toEqual({ amount: '500g', category: 'kott', sources: ['Tacos'] })
    expect(map['Tortilla']).toEqual({ amount: '8 st', category: 'brod', sources: ['Tacos'] })
  })

  it('deduplicates shared ingredients and tracks both sources', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Pasta' }, [tacos, pasta])
    expect(map['Köttfärs'].sources).toEqual(['Tacos', 'Pasta'])
  })

  it('combines amounts when same ingredient appears in different meals', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Pasta' }, [tacos, pasta])
    expect(map['Köttfärs'].amount).toBe('900 g')
  })

  it('ignores meal entries with no matching recipe', () => {
    const map = buildIngredientMap({ måndag: 'Okänd rätt' }, [tacos])
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('ignores empty meal values', () => {
    const map = buildIngredientMap({ måndag: '', tisdag: 'Tacos' }, [tacos])
    expect(Object.keys(map)).toHaveLength(2)
  })

  it('is case-insensitive when matching recipe names', () => {
    const map = buildIngredientMap({ måndag: 'tacos' }, [tacos])
    expect(map['Köttfärs']).toBeDefined()
  })

  it('does not add the same source twice when same recipe appears on two days', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Tacos' }, [tacos])
    expect(map['Köttfärs'].sources).toEqual(['Tacos'])
  })

  it('doubles the amount when same recipe appears on two days', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Tacos' }, [tacos])
    expect(map['Köttfärs'].amount).toBe('1000 g')
    expect(map['Tortilla'].amount).toBe('16 st')
  })

  it('keeps first amount when units differ between recipes', () => {
    const recipeA: Recipe = { id: 'a', name: 'A', ingredients: [{ name: 'Mjölk', amount: '2 dl', category: 'mejeri' }] }
    const recipeB: Recipe = { id: 'b', name: 'B', ingredients: [{ name: 'Mjölk', amount: '500 ml', category: 'mejeri' }] }
    const map = buildIngredientMap({ måndag: 'A', tisdag: 'B' }, [recipeA, recipeB])
    expect(map['Mjölk'].amount).toBe('2 dl')
  })

  it('handles amounts with no unit', () => {
    const recipe: Recipe = { id: 'a', name: 'A', ingredients: [{ name: 'Ägg', amount: '2', category: 'mejeri' }] }
    const map = buildIngredientMap({ måndag: 'A', tisdag: 'A' }, [recipe])
    expect(map['Ägg'].amount).toBe('4')
  })

  it('scales amounts by household size', () => {
    const recipe: Recipe = { id: 'a', name: 'A', portions: 4, ingredients: [{ name: 'Köttfärs', amount: '400 g', category: 'kott' }] }
    const map = buildIngredientMap({ måndag: 'A' }, [recipe], 8)
    expect(map['Köttfärs'].amount).toBe('800 g')
  })
})
