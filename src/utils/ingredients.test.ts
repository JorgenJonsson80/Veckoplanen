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

  it('keeps first amount for shared ingredients', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Pasta' }, [tacos, pasta])
    expect(map['Köttfärs'].amount).toBe('500g')
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

  it('does not add the same source twice', () => {
    const map = buildIngredientMap({ måndag: 'Tacos', tisdag: 'Tacos' }, [tacos])
    expect(map['Köttfärs'].sources).toEqual(['Tacos'])
  })
})
