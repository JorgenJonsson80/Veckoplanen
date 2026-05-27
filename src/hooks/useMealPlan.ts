import { useCallback, useMemo } from 'react'
import { WEEKDAYS } from './useSharedState'
import { getISOWeek } from '../utils/date'
import type { RoomState, UpdateStateFn } from '../types'

export function useMealPlan(state: RoomState | null, updateState: UpdateStateFn) {
  const meals = state?.meals ?? {}
  const savedMeals = state?.savedMeals ?? {}
  const favoriteWeeks = state?.favoriteWeeks ?? []

  const setMeal = useCallback((day: string, value: string) => {
    updateState(
      prev => ({ ...prev, meals: { ...prev.meals, [day]: value } }),
      `valde "${value || 'ingen rätt'}" till ${day}`
    )
  }, [updateState])

  const saveMealPlan = useCallback(() => {
    const current = state?.meals ?? {}
    if (!WEEKDAYS.some(d => current[d])) return
    const weekKey = getISOWeek()
    updateState(
      prev => ({ ...prev, savedMeals: { ...(prev.savedMeals ?? {}), [weekKey]: { meals: { ...current }, savedAt: new Date().toISOString() } } }),
      `sparade matsedeln för ${weekKey}`
    )
  }, [updateState, state?.meals])

  const loadMealPlan = useCallback((weekKey: string) => {
    const saved = (state?.savedMeals ?? {})[weekKey]
    if (!saved) return
    updateState(prev => ({ ...prev, meals: { ...saved.meals } }))
  }, [updateState, state?.savedMeals])

  const saveFavoriteWeek = useCallback((name: string) => {
    const current = state?.meals ?? {}
    if (!WEEKDAYS.some(d => current[d])) return
    const trimmedName = name.trim()
    if (!trimmedName) return
    const estimatedSpend = state?.weeklySpend ?? state?.budgetHistory?.[getISOWeek()]?.spend ?? undefined

    updateState(
      prev => ({
        ...prev,
        favoriteWeeks: [
          ...(prev.favoriteWeeks ?? []),
          { id: crypto.randomUUID(), name: trimmedName, meals: { ...current }, savedAt: new Date().toISOString(), estimatedSpend },
        ],
      }),
      `sparade favoritveckan "${trimmedName}"`
    )
  }, [updateState, state?.meals, state?.weeklySpend, state?.budgetHistory])

  const loadFavoriteWeek = useCallback((favoriteWeekId: string) => {
    const favoriteWeek = (state?.favoriteWeeks ?? []).find(week => week.id === favoriteWeekId)
    if (!favoriteWeek) return
    updateState(
      prev => ({
        ...prev,
        meals: { ...favoriteWeek.meals },
        checkedItems: {},
        hiddenIngredients: [],
        weeklySpend: null,
      }),
      `laddade favoritveckan "${favoriteWeek.name}"`
    )
  }, [updateState, state?.favoriteWeeks])

  const deleteFavoriteWeek = useCallback((favoriteWeekId: string) => {
    updateState(prev => ({
      ...prev,
      favoriteWeeks: (prev.favoriteWeeks ?? []).filter(week => week.id !== favoriteWeekId),
    }))
  }, [updateState])

  const generateWeekFromMeals = useCallback((mealNames: string[]) => {
    const selected = mealNames.map(name => name.trim()).filter(Boolean).slice(0, 5)
    if (selected.length < 3) return

    const nextMeals = Object.fromEntries(
      WEEKDAYS.map((day, index) => [day, selected[index % selected.length]])
    )

    updateState(
      prev => ({
        ...prev,
        meals: nextMeals,
        checkedItems: {},
        hiddenIngredients: [],
        weeklySpend: null,
      }),
      `genererade en veckomeny med ${selected.length} rätter`
    )
  }, [updateState])

  const clearMeals = useCallback(() => {
    const empty = Object.fromEntries(WEEKDAYS.map(d => [d, '']))
    updateState(prev => ({ ...prev, meals: empty }), 'rensade matsedeln')
  }, [updateState])

  // Rätter som inte lagats på 3+ veckor och inte är i veckans plan
  const mealRotationSuggestions = useMemo(() => {
    const currentMeals = new Set(
      Object.values(meals).filter(Boolean).map(m => m.toLowerCase())
    )
    const mealLastUsed: Record<string, number> = {}
    Object.values(savedMeals).forEach(weekPlan => {
      const ts = new Date(weekPlan.savedAt).getTime()
      if (!isFinite(ts)) return
      Object.values(weekPlan.meals).forEach(mealName => {
        if (!mealName) return
        if (!mealLastUsed[mealName] || ts > mealLastUsed[mealName]) {
          mealLastUsed[mealName] = ts
        }
      })
    })
    const now = Date.now()
    const THREE_WEEKS = 21 * 86400000
    return Object.entries(mealLastUsed)
      .filter(([mealName, lastUsed]) =>
        !currentMeals.has(mealName.toLowerCase()) && (now - lastUsed) >= THREE_WEEKS
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([mealName, lastUsed]) => ({
        mealName,
        weeksAgo: Math.floor((now - lastUsed) / (7 * 86400000)),
      }))
  }, [savedMeals, meals])

  return {
    meals,
    savedMeals,
    favoriteWeeks,
    setMeal,
    saveMealPlan,
    loadMealPlan,
    saveFavoriteWeek,
    loadFavoriteWeek,
    deleteFavoriteWeek,
    generateWeekFromMeals,
    clearMeals,
    mealRotationSuggestions,
  }
}
