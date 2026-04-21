import type { Recipe } from '../types'

export interface IngredientMapEntry {
  amount: string
  category: string
  sources: string[]
}

export type IngredientMap = Record<string, IngredientMapEntry>

export function buildIngredientMap(meals: Record<string, string>, recipes: Recipe[]): IngredientMap {
  const map: IngredientMap = {}
  Object.values(meals).forEach(mealName => {
    if (!mealName) return
    const recipe = recipes.find(r => r.name.toLowerCase() === mealName.toLowerCase())
    if (!recipe) return
    recipe.ingredients.forEach(ing => {
      if (!ing.name.trim()) return
      if (!map[ing.name]) {
        map[ing.name] = { amount: ing.amount, category: ing.category, sources: [mealName] }
      } else if (!map[ing.name].sources.includes(mealName)) {
        map[ing.name].sources.push(mealName)
      }
    })
  })
  return map
}
