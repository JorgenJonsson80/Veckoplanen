import { z } from 'zod'

const CategorySchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(50),
  emoji: z.string().max(10),
  shelfLife: z.number().min(0).max(3650),
})

const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().max(50),
  category: z.string().max(64),
})

const RecipeSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(100),
  ingredients: z.array(IngredientSchema).max(100),
  portions: z.number().int().min(1).max(50).optional(),
})

const ActivityLogEntrySchema = z.object({
  user: z.string().max(100),
  action: z.string().max(200),
  time: z.string().max(30),
})

const PurchaseRecordSchema = z.object({
  lastBought: z.string().max(30).nullable(),
  count: z.number().min(0).max(10_000),
  cat: z.string().max(64).optional(),
  averageIntervalDays: z.number().min(0).max(3650).optional(),
})

const ExtraItemSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(100),
  category: z.string().max(64),
})

const SavedWeekPlanSchema = z.object({
  meals: z.record(z.string().max(20), z.string().max(100)),
  savedAt: z.string().max(30),
})

const FavoriteWeekPlanSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(50),
  meals: z.record(z.string().max(20), z.string().max(100)),
  savedAt: z.string().max(30),
  estimatedSpend: z.number().min(0).max(1_000_000).optional(),
})

const BudgetWeekRecordSchema = z.object({
  budget: z.number().nullable(),
  spend: z.number().nullable(),
  savedAt: z.string().max(30),
})

const ShoppingListItemSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().max(50),
  isExtra: z.boolean(),
  id: z.string().max(64).optional(),
})

const SavedShoppingListSchema = z.object({
  items: z.array(ShoppingListItemSchema).max(500),
  meals: z.record(z.string().max(20), z.string().max(100)),
  savedAt: z.string().max(30),
})

const StoreSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(50),
  emoji: z.string().max(10),
  categoryOrder: z.array(z.string().max(64)).max(100),
})

export const RoomStateSchema = z.object({
  meals: z.record(z.string(), z.string()).default({}),
  checkedItems: z.record(z.string(), z.boolean()).default({}),
  extraItems: z.array(ExtraItemSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  customRecipes: z.array(RecipeSchema).max(200).default([]),
  recipeOverrides: z.record(z.string(), RecipeSchema.partial()).default({}),
  hiddenBuiltin: z.array(z.string()).default([]),
  favoriteRecipes: z.array(z.string().max(64)).default([]),
  favoriteWeeks: z.array(FavoriteWeekPlanSchema).default([]),
  hiddenIngredients: z.array(z.string()).optional(),
  activityLog: z.array(ActivityLogEntrySchema).default([]),
  purchaseHistory: z.record(z.string(), PurchaseRecordSchema).default({}),
  savedMeals: z.record(z.string(), SavedWeekPlanSchema).optional(),
  savedLists: z.record(z.string(), SavedShoppingListSchema).optional(),
  budgetHistory: z.record(z.string().max(20), BudgetWeekRecordSchema).optional(),
  budget: z.number().nullable().optional(),
  weeklySpend: z.number().nullable().optional(),
  stores: z.array(StoreSchema).optional(),
  activeStoreId: z.string().nullable().optional(),
  householdSize: z.number().int().min(1).max(20).optional(),
})

export type RoomStateFromSchema = z.infer<typeof RoomStateSchema>
