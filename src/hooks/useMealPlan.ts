import { useCallback } from 'react'
import { WEEKDAYS } from './useSharedState'
import { getISOWeek } from '../utils/date'
import type { RoomState, UpdateStateFn } from '../types'

export function useMealPlan(state: RoomState | null, updateState: UpdateStateFn) {
  const meals = state?.meals ?? {}
  const savedMeals = state?.savedMeals ?? {}

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

  return { meals, savedMeals, setMeal, saveMealPlan, loadMealPlan, generateWeekFromMeals, clearMeals }
}
