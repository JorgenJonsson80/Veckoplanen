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
  portions?: number
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
  averageIntervalDays?: number
}

export interface ExtraItem {
  id: string
  name: string
  category: string
  addedDuringShopping?: boolean
}

export interface AteOutEntry {
  date: string    // YYYY-MM-DD
  amount?: number
}

export interface SavedWeekPlan {
  meals: Record<string, string>
  savedAt: string
}

export interface FavoriteWeekPlan {
  id: string
  name: string
  meals: Record<string, string>
  savedAt: string
  estimatedSpend?: number
}

export interface BudgetWeekRecord {
  budget: number | null
  spend: number | null
  savedAt: string
  impulseCount?: number
}

export interface ShoppingListItem {
  name: string
  amount: string
  isExtra: boolean
  id?: string
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
  favoriteRecipes: string[]
  favoriteWeeks: FavoriteWeekPlan[]
  hiddenIngredients?: string[]
  activityLog: ActivityLogEntry[]
  purchaseHistory: Record<string, PurchaseRecord>
  savedMeals?: Record<string, SavedWeekPlan>
  savedLists?: Record<string, SavedShoppingList>
  budgetHistory?: Record<string, BudgetWeekRecord>
  budget?: number | null
  weeklySpend?: number | null
  stores?: Store[]
  activeStoreId?: string | null
  householdSize?: number
  ateOut?: AteOutEntry[]
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
