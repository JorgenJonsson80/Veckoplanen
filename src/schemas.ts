import { z } from 'zod'

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  shelfLife: z.number(),
})

const IngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  category: z.string(),
})

const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(IngredientSchema),
})

const ActivityLogEntrySchema = z.object({
  user: z.string(),
  action: z.string(),
  time: z.string(),
})

const PurchaseRecordSchema = z.object({
  lastBought: z.string().nullable(),
  count: z.number(),
  cat: z.string().optional(),
})

const ExtraItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
})

const SavedWeekPlanSchema = z.object({
  meals: z.record(z.string(), z.string()),
  savedAt: z.string(),
})

const ShoppingListItemSchema = z.object({
  name: z.string(),
  amount: z.string(),
  isExtra: z.boolean(),
  id: z.string().optional(),
})

const SavedShoppingListSchema = z.object({
  items: z.array(ShoppingListItemSchema),
  meals: z.record(z.string(), z.string()),
  savedAt: z.string(),
})

const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  categoryOrder: z.array(z.string()),
})

export const RoomStateSchema = z.object({
  meals: z.record(z.string(), z.string()).default({}),
  checkedItems: z.record(z.string(), z.boolean()).default({}),
  extraItems: z.array(ExtraItemSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  customRecipes: z.array(RecipeSchema).default([]),
  recipeOverrides: z.record(z.string(), RecipeSchema.partial()).default({}),
  hiddenBuiltin: z.array(z.string()).default([]),
  activityLog: z.array(ActivityLogEntrySchema).default([]),
  purchaseHistory: z.record(z.string(), PurchaseRecordSchema).default({}),
  savedMeals: z.record(z.string(), SavedWeekPlanSchema).optional(),
  savedLists: z.record(z.string(), SavedShoppingListSchema).optional(),
  budget: z.number().nullable().optional(),
  weeklySpend: z.number().nullable().optional(),
  stores: z.array(StoreSchema).optional(),
  activeStoreId: z.string().nullable().optional(),
})

export type RoomStateFromSchema = z.infer<typeof RoomStateSchema>
