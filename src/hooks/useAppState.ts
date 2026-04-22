import { useState, useMemo } from 'react'
import { useSharedState } from './useSharedState'
import { useRecipes } from './useRecipes'
import { useMealPlan } from './useMealPlan'
import { useShoppingList } from './useShoppingList'
import { DEFAULT_CATEGORIES } from '../constants/categories'
import { getISOWeek } from '../utils/date'
import { buildIngredientMap } from '../utils/ingredients'
import type { User } from '@supabase/supabase-js'
import type { Session, Category, Store, ShoppingListItem, RecipeDraft } from '../types'

type StoreDraft = Omit<Store, 'id'> & { id: string | null }

const SESSION_KEY = 'veckoplanen_session'

function recentRoomsKey(userId: string): string {
  return `veckoplanen_recent_rooms_${userId}`
}

export function getRecentRooms(userId: string): Session[] {
  try { return JSON.parse(localStorage.getItem(recentRoomsKey(userId)) || '[]') }
  catch { return [] }
}

function saveRecentRoom(userId: string, sess: Session) {
  const key = recentRoomsKey(userId)
  const rooms = getRecentRooms(userId).filter(r => !(r.roomCode === sess.roomCode && r.mode === sess.mode))
  rooms.unshift({ ...sess, lastUsed: Date.now() })
  localStorage.setItem(key, JSON.stringify(rooms.slice(0, 5)))
}

export function useAppState(user: User | null) {
  const [session, setSession] = useState<Session | null>(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') }
    catch { return null }
  })

  const { state, loading, error, syncError, clearSyncError, roomNotFound, updateState, deleteRoom } = useSharedState(
    session?.roomCode ?? null,
    session?.name ?? 'Användare',
    DEFAULT_CATEGORIES,
    user?.id ?? null,
    session?.mode !== 'join'
  )

  function handleStart(sess: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
    if (user?.id) saveRecentRoom(user.id, sess)
    setSession(sess)
  }

  function handleSwitchRoom() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  async function handleDeleteRoom(signOut: () => Promise<void>) {
    const { error: delErr } = await deleteRoom()
    if (delErr) { alert('Kunde inte radera rummet: ' + (delErr as Error).message); return }
    if (user?.id && session?.roomCode) {
      const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode)
      localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated))
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  function handleSignOut(signOut: () => Promise<void>) {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    signOut()
  }

  function clearRoomNotFound() {
    if (user?.id && session?.roomCode) {
      const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode)
      localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated))
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  const { allRecipes, saveRecipe: saveRecipeData } = useRecipes(state, updateState)
  const categories = useMemo((): Category[] => state?.categories ?? DEFAULT_CATEGORIES, [state])

  const ingredientMap = useMemo(
    () => buildIngredientMap(state?.meals ?? {}, allRecipes),
    [state?.meals, allRecipes]
  )

  const { meals, savedMeals, setMeal, saveMealPlan, loadMealPlan, clearMeals } = useMealPlan(state, updateState)

  const checkedItems = state?.checkedItems ?? {}
  const extraItems = state?.extraItems ?? []
  const hiddenIngredients = state?.hiddenIngredients ?? []
  const stores = state?.stores ?? []
  const savedLists = state?.savedLists ?? {}
  const activeStoreId = state?.activeStoreId ?? null
  const activeStore = stores.find(s => s.id === activeStoreId) ?? null
  const currentWeek = getISOWeek()

  const orderedCategories = useMemo((): Category[] => {
    if (!activeStore) return categories
    return activeStore.categoryOrder
      .map(id => categories.find(c => c.id === id))
      .filter((c): c is Category => c !== undefined)
      .concat(categories.filter(c => !activeStore.categoryOrder.includes(c.id)))
  }, [activeStore, categories])

  const allItemsGrouped = useMemo((): Record<string, ShoppingListItem[]> => {
    const grouped: Record<string, ShoppingListItem[]> = {}
    orderedCategories.forEach(cat => { grouped[cat.id] = [] })
    Object.entries(ingredientMap).forEach(([name, info]) => {
      if (hiddenIngredients.includes(name)) return
      const catId = info.category || 'ovrigt'
      if (!grouped[catId]) grouped[catId] = []
      grouped[catId].push({ name, amount: info.amount, isExtra: false })
    })
    extraItems.forEach(item => {
      const catId = item.category || 'ovrigt'
      if (!grouped[catId]) grouped[catId] = []
      grouped[catId].push({ name: item.name, amount: '', isExtra: true, id: item.id })
    })
    return grouped
  }, [orderedCategories, ingredientMap, extraItems, hiddenIngredients])

  const totalItems = useMemo(() => Object.values(allItemsGrouped).flat().length, [allItemsGrouped])
  const checkedCount = useMemo(
    () => Object.values(allItemsGrouped).flat().filter(i => checkedItems[i.name]).length,
    [allItemsGrouped, checkedItems]
  )

  const { likelyEmptyItems, suggestedRebuys, toggleItem, saveWeeklyList, addExtraItem, removeExtraItem, hideIngredient, restoreIngredients, clearChecked, setBudget, setWeeklySpend } = useShoppingList(state, updateState, ingredientMap, categories)

  function saveRecipe(updatedRecipe: RecipeDraft) {
    return saveRecipeData(updatedRecipe)
  }

  function handleCatReorder(newCategories: Category[]) {
    updateState(prev => ({ ...prev, categories: newCategories }))
  }

  function addCategory(cat: Category) {
    updateState(prev => ({ ...prev, categories: [...(prev.categories ?? DEFAULT_CATEGORIES), cat] }))
  }

  function removeCategory(catId: string) {
    const hasItems = Object.values(ingredientMap).some(i => i.category === catId) || (state?.extraItems ?? []).some(i => i.category === catId)
    if (hasItems) { alert('Kategorin används av varor och kan inte tas bort.'); return }
    updateState(prev => ({ ...prev, categories: (prev.categories ?? DEFAULT_CATEGORIES).filter(c => c.id !== catId) }))
  }

  function saveStore(store: Store) {
    updateState(prev => {
      const existing = prev.stores ?? []
      const exists = existing.some(s => s.id === store.id)
      return { ...prev, stores: exists ? existing.map(s => s.id === store.id ? store : s) : [...existing, store], activeStoreId: prev.activeStoreId ?? store.id }
    }, `sparade butiken "${store.name}"`)
  }

  function deleteStore(storeId: string) {
    updateState(prev => ({ ...prev, stores: (prev.stores ?? []).filter(s => s.id !== storeId), activeStoreId: prev.activeStoreId === storeId ? null : prev.activeStoreId }))
  }

  function setActiveStore(storeId: string | null) {
    updateState(prev => ({ ...prev, activeStoreId: storeId }))
  }

  return {
    session,
    state,
    loading,
    error,
    syncError,
    clearSyncError,
    roomNotFound,
    handleStart,
    handleSwitchRoom,
    handleDeleteRoom,
    handleSignOut,
    clearRoomNotFound,
    allRecipes,
    categories,
    ingredientMap,
    meals,
    savedMeals,
    setMeal,
    saveMealPlan,
    loadMealPlan,
    clearMeals,
    checkedItems,
    extraItems,
    hiddenIngredients,
    stores,
    savedLists,
    activeStoreId,
    currentWeek,
    orderedCategories,
    allItemsGrouped,
    totalItems,
    checkedCount,
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
    saveRecipe,
    handleCatReorder,
    addCategory,
    removeCategory,
    saveStore,
    deleteStore,
    setActiveStore,
    budget: state?.budget ?? null,
    weeklySpend: state?.weeklySpend ?? null,
    purchaseHistory: state?.purchaseHistory ?? {},
    activityLog: state?.activityLog ?? [],
  }
}

export type { StoreDraft }
