import type { Recipe } from '../types'

export interface IngredientMapEntry {
  amount: string
  category: string
  sources: string[]
}

export type IngredientMap = Record<string, IngredientMapEntry>

function addAmounts(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  const mA = a.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  const mB = b.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!mA || !mB) return a
  const unitA = mA[2].trim().toLowerCase()
  if (unitA !== mB[2].trim().toLowerCase()) return a
  const sum = parseFloat(mA[1].replace(',', '.')) + parseFloat(mB[1].replace(',', '.'))
  const rounded = sum >= 10 ? Math.round(sum) : sum >= 1 ? Math.round(sum * 10) / 10 : Math.round(sum * 100) / 100
  return unitA ? `${rounded} ${unitA}` : `${rounded}`
}

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
      } else {
        if (!map[ing.name].sources.includes(mealName)) map[ing.name].sources.push(mealName)
        map[ing.name].amount = addAmounts(map[ing.name].amount, scaledAmount)
      }
    })
  })
  return map
}
