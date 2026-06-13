import { useCallback, useMemo } from 'react'
import { getISOWeek, getMonthKey } from '../utils/date'
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
  const budgetHistory = state?.budgetHistory ?? {}

  const likelyEmptyItems = useMemo<ShoppingListItem[]>(() => {
    const now = Date.now()
    const history = state?.purchaseHistory ?? {}
    return Object.entries(ingredientMap).flatMap(([name, info]) => {
      const cat = categories.find(c => c.id === (info.category || 'ovrigt'))
      if (!cat) return []
      const record = history[name]
      if (!record?.lastBought) return []
      if ((now - new Date(record.lastBought).getTime()) / 86400000 > cat.shelfLife) {
        return [{ name, amount: info.amount, isExtra: false }]
      }
      return []
    })
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
    updateState(prev => {
      const isChecked = !!(prev.checkedItems?.[itemName])
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
    }, !!(state?.checkedItems?.[itemName]) ? `ångrade "${itemName}"` : `lade "${itemName}" i korgen`)
  }, [updateState, state?.checkedItems])

  const saveWeeklyList = useCallback((allItems: ShoppingListItem[], meals: Record<string, string>) => {
    const weekKey = getISOWeek()
    updateState(
      prev => ({ ...prev, savedLists: { ...(prev.savedLists ?? {}), [weekKey]: { items: allItems, meals: { ...meals }, savedAt: new Date().toISOString() } } }),
      `sparade handlingslistan för ${weekKey}`
    )
  }, [updateState])

  const addExtraItem = useCallback((name: string, catId: string, addedDuringShopping = false) => {
    const item = { name, category: catId, id: crypto.randomUUID(), addedDuringShopping }
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
    updateState(prev => {
      const weekKey = getISOWeek()
      const impulseCount = (prev.extraItems ?? []).filter(i =>
        i.addedDuringShopping && prev.checkedItems?.[i.name]
      ).length
      const next: typeof prev = { ...prev, checkedItems: {}, extraItems: [], weeklySpend: null, lastShoppingWeek: weekKey }
      if (impulseCount > 0) {
        const existing = prev.budgetHistory?.[weekKey] ?? { budget: prev.budget ?? null, spend: null, savedAt: new Date().toISOString() }
        next.budgetHistory = {
          ...(prev.budgetHistory ?? {}),
          [weekKey]: { ...existing, impulseCount: (existing.impulseCount ?? 0) + impulseCount },
        }
      }
      return next
    }, 'rensade handlingslistan')
  }, [updateState])

  const logAteOut = useCallback((date: string, amount?: number) => {
    updateState(prev => {
      const existing = (prev.ateOut ?? []).filter(e => e.date !== date)
      return { ...prev, ateOut: [...existing, { date, amount }] }
    }, `loggade "åt ute" ${date}`)
  }, [updateState])

  const removeAteOut = useCallback((date: string) => {
    updateState(prev => ({ ...prev, ateOut: (prev.ateOut ?? []).filter(e => e.date !== date) }))
  }, [updateState])

  const monthlySummary = useMemo(() => {
    const currentMonth = getMonthKey()
    const [cy, cm] = currentMonth.split('-').map(Number)
    const prevMonth = cm === 1 ? `${cy - 1}-12` : `${cy}-${String(cm - 1).padStart(2, '0')}`

    const ateOut = state?.ateOut ?? []
    const currentAteOut = ateOut.filter(e => e.date.startsWith(currentMonth))
    const prevAteOut = ateOut.filter(e => e.date.startsWith(prevMonth))

    const ateOutCount = currentAteOut.length
    const ateOutSpend = currentAteOut.reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const prevAteOutCount = prevAteOut.length
    const prevAteOutSpend = prevAteOut.reduce((sum, e) => sum + (e.amount ?? 0), 0)

    const budgetHist = state?.budgetHistory ?? {}
    const currentMonthWeeks = Object.entries(budgetHist).filter(([k]) => {
      const match = k.match(/^(\d{4})-v(\d+)$/)
      if (!match) return false
      const weekNum = parseInt(match[2], 10)
      const year = parseInt(match[1], 10)
      const jan4 = new Date(year, 0, 4)
      const dayOfWeek = (jan4.getDay() + 6) % 7
      const monday = new Date(jan4)
      monday.setDate(jan4.getDate() - dayOfWeek + (weekNum - 1) * 7)
      return monday.toISOString().slice(0, 7) === currentMonth
    })
    const prevMonthWeeks = Object.entries(budgetHist).filter(([k]) => {
      const match = k.match(/^(\d{4})-v(\d+)$/)
      if (!match) return false
      const weekNum = parseInt(match[2], 10)
      const year = parseInt(match[1], 10)
      const jan4 = new Date(year, 0, 4)
      const dayOfWeek = (jan4.getDay() + 6) % 7
      const monday = new Date(jan4)
      monday.setDate(jan4.getDate() - dayOfWeek + (weekNum - 1) * 7)
      return monday.toISOString().slice(0, 7) === prevMonth
    })

    const impulseCount = currentMonthWeeks.reduce((sum, [, r]) => sum + (r.impulseCount ?? 0), 0)
    const prevImpulseCount = prevMonthWeeks.reduce((sum, [, r]) => sum + (r.impulseCount ?? 0), 0)

    return {
      month: currentMonth,
      ateOutCount,
      ateOutSpend,
      impulseCount,
      prev: { ateOutCount: prevAteOutCount, ateOutSpend: prevAteOutSpend, impulseCount: prevImpulseCount },
    }
  }, [state?.ateOut, state?.budgetHistory])

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
    monthlySummary,
    toggleItem,
    saveWeeklyList,
    addExtraItem,
    removeExtraItem,
    hideIngredient,
    restoreIngredients,
    clearChecked,
    setBudget,
    setWeeklySpend,
    logAteOut,
    removeAteOut,
  }
}
