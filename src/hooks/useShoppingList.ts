import { useState, useEffect, useCallback, useMemo } from 'react'
import { getISOWeek } from '../utils/date'
import type { RoomState, Category, ShoppingListItem, UpdateStateFn } from '../types'

interface IngredientInfo {
  amount: string
  category: string
}

function getUpdatedAverageInterval(existingInterval: number | undefined, lastBought: string | null | undefined, now: number): number | undefined {
  if (!lastBought) return existingInterval
  const daysSince = (now - new Date(lastBought).getTime()) / 86400000
  if (!Number.isFinite(daysSince) || daysSince < 1) return existingInterval
  return existingInterval ? Math.round((existingInterval * 0.7 + daysSince * 0.3) * 10) / 10 : Math.round(daysSince * 10) / 10
}

export function useShoppingList(
  state: RoomState | null,
  updateState: UpdateStateFn,
  ingredientMap: Record<string, IngredientInfo>,
  categories: Category[]
) {
  const [likelyEmptyItems, setLikelyEmptyItems] = useState<ShoppingListItem[]>([])
  const budgetHistory = state?.budgetHistory ?? {}

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
    })
    setLikelyEmptyItems(items)
  }, [ingredientMap, categories, state?.purchaseHistory])

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
        const intervalDays = record.averageIntervalDays ?? shelfLife
        return daysSince >= Math.max(3, intervalDays * 0.8)
      })
      .map(([name, record]) => ({
        name,
        catId: record.cat || categories[0]?.id || 'ovrigt',
        daysSince: Math.floor((now - new Date(record.lastBought!).getTime()) / 86400000),
        intervalDays: record.averageIntervalDays,
      }))
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 8)
  }, [state?.purchaseHistory, state?.extraItems, ingredientMap, categories])

  const budgetSummary = useMemo(() => {
    const entries = Object.entries(budgetHistory)
      .filter(([, record]) => record.spend != null)
      .sort(([a], [b]) => b.localeCompare(a))

    const currentWeek = getISOWeek()
    const current = budgetHistory[currentWeek] ?? null
    const previous = entries.find(([week]) => week !== currentWeek)?.[1] ?? null
    const recent = entries.slice(0, 4).map(([, record]) => record.spend).filter((spend): spend is number => spend != null)
    const averageSpend = recent.length ? Math.round(recent.reduce((sum, spend) => sum + spend, 0) / recent.length) : null

    return {
      current,
      previous,
      averageSpend,
      recordedWeeks: entries.length,
    }
  }, [budgetHistory])

  const toggleItem = useCallback((itemName: string, category: string) => {
    const isChecked = !!(state?.checkedItems?.[itemName])
    updateState(prev => {
      const next = { ...prev, checkedItems: { ...prev.checkedItems, [itemName]: !isChecked } }
      const hist = prev.purchaseHistory ?? {}
      if (!isChecked) {
        const existing = hist[itemName] ?? { count: 0, lastBought: null }
        const now = Date.now()
        next.purchaseHistory = {
          ...hist,
          [itemName]: {
            lastBought: new Date(now).toISOString(),
            count: existing.count + 1,
            cat: category,
            averageIntervalDays: getUpdatedAverageInterval(existing.averageIntervalDays, existing.lastBought, now),
          },
        }
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
    updateState(prev => ({ ...prev, checkedItems: {}, extraItems: [], weeklySpend: null }), 'rensade handlingslistan')
  }, [updateState])

  const setBudget = useCallback((value: number | null) => {
    const weekKey = getISOWeek()
    updateState(prev => {
      const next = { ...prev, budget: value }
      if (prev.weeklySpend != null) {
        next.budgetHistory = {
          ...(prev.budgetHistory ?? {}),
          [weekKey]: {
            budget: value,
            spend: prev.weeklySpend,
            savedAt: new Date().toISOString(),
          },
        }
      }
      return next
    })
  }, [updateState])

  const setWeeklySpend = useCallback((value: number | null) => {
    const weekKey = getISOWeek()
    updateState(prev => {
      if (value == null) {
        const { [weekKey]: _removed, ...rest } = prev.budgetHistory ?? {}
        return { ...prev, weeklySpend: null, budgetHistory: rest }
      }
      return {
        ...prev,
        weeklySpend: value,
        budgetHistory: {
          ...(prev.budgetHistory ?? {}),
          [weekKey]: {
            budget: prev.budget ?? null,
            spend: value,
            savedAt: new Date().toISOString(),
          },
        },
      }
    })
  }, [updateState])

  return {
    likelyEmptyItems,
    suggestedRebuys,
    budgetHistory,
    budgetSummary,
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
