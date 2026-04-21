import { useCallback } from 'react';
import { WEEKDAYS } from './useSharedState';
import { getISOWeek } from '../utils/date';

export function useMealPlan(state, updateState) {
  const meals = state?.meals || {};
  const savedMeals = state?.savedMeals || {};

  const setMeal = useCallback((day, value) => {
    updateState(
      prev => ({ ...prev, meals: { ...prev.meals, [day]: value } }),
      `valde "${value || 'ingen rätt'}" till ${day}`
    );
  }, [updateState]);

  const saveMealPlan = useCallback(() => {
    const current = state?.meals || {};
    if (!WEEKDAYS.some(d => current[d])) return;
    const weekKey = getISOWeek();
    updateState(
      prev => ({ ...prev, savedMeals: { ...(prev.savedMeals || {}), [weekKey]: { meals: { ...current }, savedAt: new Date().toISOString() } } }),
      `sparade matsedeln för ${weekKey}`
    );
  }, [updateState, state?.meals]);

  const loadMealPlan = useCallback((weekKey) => {
    const saved = (state?.savedMeals || {})[weekKey];
    if (!saved) return;
    updateState(prev => ({ ...prev, meals: { ...saved.meals } }));
  }, [updateState, state?.savedMeals]);

  const clearMeals = useCallback(() => {
    const empty = Object.fromEntries(WEEKDAYS.map(d => [d, '']));
    updateState(prev => ({ ...prev, meals: empty }), 'rensade matsedeln');
  }, [updateState]);

  return { meals, savedMeals, setMeal, saveMealPlan, loadMealPlan, clearMeals };
}
