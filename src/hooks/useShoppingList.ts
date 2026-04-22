import { useState, useEffect, useCallback, useMemo } from 'react'
import { getISOWeek } from '../utils/date'
import type { RoomState, Category, ShoppingListItem, UpdateStateFn } from '../types'

interface IngredientInfo {
  amount: string
  category: string
}

export function useShoppingList(
  state: RoomState | null,
  updateState: UpdateStateFn,
  ingredientMap: Record<string, IngredientInfo>,
  categories: Category[]
) {
  const [likelyEmptyItems, setLikelyEmptyItems] = useState<ShoppingListItem[]>([])

  useEffect(() => {
    const now = Date.now()
    const history = state?.purchaseHistory ?? {}
    const items: ShoppingListItem[] = []
    Object.entries(ingredientMap).forEach(([name, info]) => {
      const cat = categories.find(c => c.id === (info.category || 'ovrigt'))
      if (!cat) return
      const record = history[name]
      if (!record?.lastBought) return
      if ((now - new Date(record.lastBought).getTime()) / 86400000 > cat.shelfLife) {
        items.push({ name, amount: info.amount, isExtra: false })
      }
    });
    (state?.extraItems ?? []).forEach(item => {
      const cat = categories.find(c => c.id === (item.category || 'ovrigt'))
      if (!cat) return
      const record = history[item.name]
      if (!record?.lastBought) return
      if ((now - new Date(record.lastBought).getTime()) / 86400000 > cat.shelfLife) {
        items.push({ name: item.name, amount: '', isExtra: true, id: item.id })
      }
    })
    setLikelyEmptyItems(items)
  }, [ingredientMap, categories, state?.purchaseHistory, state?.extraItems])

  const suggestedRebuys = useMemo(() => {
    const now = Date.now()
    const history = state?.purchaseHistory ?? {}
    const currentNames = new Set([
      ...Object.keys(ingredientMap),
      ...(state?.extraItems ?? []).map(i => i.name),
    ])
    return Object.entries(history)
      .filter(([name, record]) => {
        if (!record?.lastBought) return false
        if (currentNames.has(name)) return false
        const cat = categories.find(c => c.id === (record.cat || 'ovrigt'))
        const shelfLife = cat?.shelfLife ?? 7
        const daysSince = (now - new Date(record.lastBought).getTime()) / 86400000
        return daysSince > shelfLife
      })
      .map(([name, record]) => ({
        name,
        catId: record.cat || categories[0]?.id || 'ovrigt',
        daysSince: Math.floor((now - new Date(record.lastBought!).getTime()) / 86400000),
      }))
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 8)
  }, [state?.purchaseHistory, state?.extraItems, ingredientMap, categories])

  const toggleItem = useCallback((itemName: string, category: string) => {
    const isChecked = !!(state?.checkedItems?.[itemName])
    updateState(prev => {
      const next = { ...prev, checkedItems: { ...prev.checkedItems, [itemName]: !isChecked } }
      const hist = prev.purchaseHistory ?? {}
      if (!isChecked) {
        const existing = hist[itemName] ?? { count: 0 }
        next.purchaseHistory = { ...hist, [itemName]: { lastBought: new Date().toISOString(), count: existing.count + 1, cat: category } }
      } else {
        const existing = hist[itemName]
        if (existing) {
          next.purchaseHistory = { ...hist, [itemName]: { ...existing, count: Math.max(0, existing.count - 1) } }
        }
      }
      return next
    }, isChecked ? `ångrade "${itemName}"` : `lade "${itemName}" i korgen`)
  }, [updateState, state?.checkedItems])

  const saveWeeklyList = useCallback((allItems: ShoppingListItem[], meals: Record<string, string>) => {
    const weekKey = getISOWeek()
    updateState(
      prev => ({ ...prev, savedLists: { ...(prev.savedLists ?? {}), [weekKey]: { items: allItems, meals: { ...meals }, savedAt: new Date().toISOString() } } }),
      `sparade handlingslistan för ${weekKey}`
    )
  }, [updateState])

  const addExtraItem = useCallback((name: string, catId: string) => {
    const item = { name, category: catId, id: crypto.randomUUID() }
    updateState(prev => ({ ...prev, extraItems: [...(prev.extraItems ?? []), item] }), `lade till extra vara "${name}"`)
  }, [updateState])

  const removeExtraItem = useCallback((id: string) => {
    updateState(prev => ({ ...prev, extraItems: (prev.extraItems ?? []).filter(i => i.id !== id) }))
  }, [updateState])

  const hideIngredient = useCallback((name: string) => {
    updateState(prev => ({ ...prev, hiddenIngredients: [...(prev.hiddenIngredients ?? []), name] }))
  }, [updateState])

  const restoreIngredients = useCallback(() => {
    updateState(prev => ({ ...prev, hiddenIngredients: [] }))
  }, [updateState])

  const clearChecked = useCallback(() => {
    updateState(prev => ({ ...prev, checkedItems: {}, weeklySpend: null }), 'rensade handlingslistan')
  }, [updateState])

  const setBudget = useCallback((value: number | null) => {
    updateState(prev => ({ ...prev, budget: value }))
  }, [updateState])

  const setWeeklySpend = useCallback((value: number | null) => {
    updateState(prev => ({ ...prev, weeklySpend: value }))
  }, [updateState])

  return {
    likelyEmptyItems,
    suggestedRebuys,
    toggleItem,
    saveWeeklyList,
    addExtraItem,
    removeExtraItem,
    hideIngredient,
    restoreIngredients,
    clearChecked,
    setBudget,
    setWeeklySpend,
  }
}
