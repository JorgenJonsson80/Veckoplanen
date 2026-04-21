export interface Category {
  id: string
  name: string
  emoji: string
  shelfLife: number
}

export interface Ingredient {
  name: string
  amount: string
  category: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: Ingredient[]
}

export interface ActivityLogEntry {
  user: string
  action: string
  time: string
}

export interface PurchaseRecord {
  lastBought: string | null
  count: number
  cat?: string
}

export interface ExtraItem {
  id: number
  name: string
  category: string
}

export interface SavedWeekPlan {
  meals: Record<string, string>
  savedAt: string
}

export interface ShoppingListItem {
  name: string
  amount: string
  isExtra: boolean
  id?: number
}

export interface SavedShoppingList {
  items: ShoppingListItem[]
  meals: Record<string, string>
  savedAt: string
}

export interface RoomState {
  meals: Record<string, string>
  checkedItems: Record<string, boolean>
  extraItems: ExtraItem[]
  categories: Category[]
  customRecipes: Recipe[]
  recipeOverrides: Record<string, Partial<Recipe>>
  hiddenBuiltin: string[]
  activityLog: ActivityLogEntry[]
  purchaseHistory: Record<string, PurchaseRecord>
  savedMeals?: Record<string, SavedWeekPlan>
  savedLists?: Record<string, SavedShoppingList>
  budget?: number | null
  weeklySpend?: number | null
  stores?: Store[]
  activeStoreId?: string | null
}

export interface Store {
  id: string
  name: string
  emoji: string
  categoryOrder: string[]
}

export interface Session {
  name: string
  roomCode: string | null
  mode: 'solo' | 'create' | 'join'
  lastUsed?: number
}

export type RecipeDraft = Omit<Recipe, 'id'> & { id: string | null }

export type UpdateStateFn = (
  updater: ((prev: RoomState) => RoomState) | RoomState,
  activityEntry?: string
) => void
