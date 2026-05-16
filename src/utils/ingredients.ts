import type { Recipe } from '../types'

export interface IngredientMapEntry {
  amount: string
  category: string
  sources: string[]
}

export type IngredientMap = Record<string, IngredientMapEntry>

function scaleAmount(amount: string, scale: number): string {
  if (!amount || Math.abs(scale - 1) < 0.01) return amount
  const match = amount.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!match) return amount
  const num = parseFloat(match[1].replace(',', '.'))
  const unit = match[2].trim()
  const scaled = num * scale
  const rounded = scaled >= 10 ? Math.round(scaled) : scaled >= 1 ? Math.round(scaled * 10) / 10 : Math.round(scaled * 100) / 100
  return unit ? `${rounded} ${unit}` : `${rounded}`
}

export function buildIngredientMap(
  meals: Record<string, string>,
  recipes: Recipe[],
  householdSize = 4
): IngredientMap {
  const map: IngredientMap = {}
  Object.values(meals).forEach(mealName => {
    if (!mealName) return
    const recipe = recipes.find(r => r.name.toLowerCase() === mealName.toLowerCase())
    if (!recipe) return
    const scale = householdSize / (recipe.portions ?? 4)
    recipe.ingredients.forEach(ing => {
      if (!ing.name.trim()) return
      const scaledAmount = scaleAmount(ing.amount, scale)
      if (!map[ing.name]) {
        map[ing.name] = { amount: scaledAmount, category: ing.category, sources: [mealName] }
      } else if (!map[ing.name].sources.includes(mealName)) {
        map[ing.name].sources.push(mealName)
      }
    })
  })
  return map
}
