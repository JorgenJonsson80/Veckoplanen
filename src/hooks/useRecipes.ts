import { useMemo, useCallback } from 'react'
import { DEFAULT_RECIPES } from '../constants/recipes'
import type { RoomState, Recipe, RecipeDraft, UpdateStateFn } from '../types'

export function useRecipes(state: RoomState | null, updateState: UpdateStateFn) {
  const favoriteRecipes = state?.favoriteRecipes ?? []

  const allRecipes = useMemo((): Recipe[] => {
    const custom = state?.customRecipes ?? []
    const overrides = state?.recipeOverrides ?? {}
    const hidden = state?.hiddenBuiltin ?? []
    const base = DEFAULT_RECIPES
      .filter(r => !hidden.includes(r.id))
      .map(r => {
        const ov = overrides[r.id]
        if (!ov) return r
        return {
          ...r,
          ...ov,
          ingredients: ov.ingredients?.length ? ov.ingredients : r.ingredients,
        }
      })
    return [...base, ...custom]
  }, [state?.customRecipes, state?.recipeOverrides, state?.hiddenBuiltin])

  const saveRecipe = useCallback((updatedRecipe: RecipeDraft) => {
    const isBuiltin = DEFAULT_RECIPES.some(r => r.id === updatedRecipe.id)
    if (isBuiltin) {
      updateState(
        prev => ({ ...prev, recipeOverrides: { ...prev.recipeOverrides, [updatedRecipe.id!]: updatedRecipe as Recipe } }),
        `redigerade receptet "${updatedRecipe.name}"`
      )
    } else if (updatedRecipe.id) {
      const id = updatedRecipe.id
      updateState(
        prev => ({ ...prev, customRecipes: (prev.customRecipes || []).map(r => r.id === id ? { ...updatedRecipe, id } : r) }),
        `uppdaterade receptet "${updatedRecipe.name}"`
      )
    } else {
      const newRecipe: Recipe = { ...updatedRecipe, id: crypto.randomUUID() }
      updateState(
        prev => ({ ...prev, customRecipes: [...(prev.customRecipes || []), newRecipe] }),
        `skapade receptet "${newRecipe.name}"`
      )
    }
  }, [updateState])

  const toggleFavoriteRecipe = useCallback((recipeId: string) => {
    const isFavorite = favoriteRecipes.includes(recipeId)
    updateState(
      prev => ({
        ...prev,
        favoriteRecipes: isFavorite
          ? (prev.favoriteRecipes ?? []).filter(id => id !== recipeId)
          : [...(prev.favoriteRecipes ?? []), recipeId],
      }),
      isFavorite ? 'tog bort en favoriträtt' : 'lade till en favoriträtt'
    )
  }, [favoriteRecipes, updateState])

  return { allRecipes, favoriteRecipes, saveRecipe, toggleFavoriteRecipe }
}
