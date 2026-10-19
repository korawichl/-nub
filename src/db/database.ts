import Dexie, { type Table } from 'dexie';
import type {
  ActivityLog,
  AppSettings,
  FoodCatalogItem,
  Meal,
  MealCategory,
  MealItem,
  NutritionGoals,
  ScanLog,
  UserProfile,
  WeightLog,
} from '../types';
import {
  createInitialGoals,
  createInitialProfile,
  createInitialSettings,
  DEFAULT_GOALS_ID,
  DEFAULT_PROFILE_ID,
  DEFAULT_SETTINGS_ID,
  getInitialFoodCatalog,
} from './seedData';
import { calculateFoodNutrition } from '../utils/nutritionCalculator';

export const CURRENT_DB_SCHEMA_VERSION = 3;

export class NubNutritionDatabase extends Dexie {
  profiles!: Table<UserProfile, string>;
  goals!: Table<NutritionGoals, string>;
  foodCatalog!: Table<FoodCatalogItem, string>;
  meals!: Table<Meal, string>;
  mealItems!: Table<MealItem, string>;
  weightLogs!: Table<WeightLog, string>;
  activityLogs!: Table<ActivityLog, string>;
  scanLogs!: Table<ScanLog, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('NubNutritionTrackerDB');

    // Version 1: Initial schema with all 9 required tables
    this.version(1).stores({
      profiles: 'id, updatedAt',
      goals: 'id, updatedAt',
      foodCatalog: 'id, name, category, source, usageCount, updatedAt',
      meals: 'id, date, category, [date+category]',
      mealItems: 'id, mealId, date, category, foodCatalogId, createdAt',
      weightLogs: 'id, date, createdAt',
      activityLogs: 'id, date, activityType, createdAt',
      scanLogs: 'id, date, status, createdAt',
      settings: 'id, updatedAt',
    });

    // Version 2: Migration ensuring usageCount and sourceSnapshot defaults on existing items
    this.version(2)
      .stores({
        profiles: 'id, updatedAt',
        goals: 'id, updatedAt',
        foodCatalog: 'id, name, category, source, usageCount, updatedAt',
        meals: 'id, date, category, [date+category]',
        mealItems: 'id, mealId, date, category, foodCatalogId, createdAt',
        weightLogs: 'id, date, createdAt',
        activityLogs: 'id, date, activityType, createdAt',
        scanLogs: 'id, date, status, createdAt',
        settings: 'id, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('foodCatalog')
          .toCollection()
          .modify((item: FoodCatalogItem) => {
            if (typeof item.usageCount !== 'number') {
              item.usageCount = 0;
            }
          });
      });

    // Version 3: Upgrade catalog with Thai foods, bilingual names, portion presets, and waterTargetMl
    this.version(CURRENT_DB_SCHEMA_VERSION)
      .stores({
        profiles: 'id, updatedAt',
        goals: 'id, updatedAt',
        foodCatalog: 'id, name, category, source, usageCount, updatedAt',
        meals: 'id, date, category, [date+category]',
        mealItems: 'id, mealId, date, category, foodCatalogId, createdAt',
        weightLogs: 'id, date, createdAt',
        activityLogs: 'id, date, activityType, createdAt',
        scanLogs: 'id, date, status, createdAt',
        settings: 'id, updatedAt',
      })
      .upgrade(async (tx) => {
        const seedItems = getInitialFoodCatalog();
        const catalogTable = tx.table<FoodCatalogItem, string>('foodCatalog');
        for (const seed of seedItems) {
          const existing = await catalogTable.get(seed.id);
          if (!existing) {
            await catalogTable.put(seed);
          } else {
            await catalogTable.update(seed.id, {
              name: seed.name,
              category: seed.category,
              portionPresets: seed.portionPresets,
              defaultServingGrams: seed.defaultServingGrams,
            });
          }
        }

        const goalsTable = tx.table<NutritionGoals, string>('goals');
        await goalsTable.toCollection().modify((g: NutritionGoals) => {
          if (!g.waterTargetMl) {
            g.waterTargetMl = 3000;
          }
        });
      });
  }
}

export const db = new NubNutritionDatabase();

/**
 * Ensures initial profile, nutrition targets, settings, and reference catalog exist.
 * Also merges any newly added reference foods from seedData without overwriting user custom foods.
 */
export async function initializeDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.goals, db.settings, db.foodCatalog],
    async () => {
      const existingProfile = await db.profiles.get(DEFAULT_PROFILE_ID);
      if (!existingProfile) {
        await db.profiles.put(createInitialProfile());
      }

      const existingGoals = await db.goals.get(DEFAULT_GOALS_ID);
      if (!existingGoals) {
        await db.goals.put(createInitialGoals());
      } else if (!existingGoals.waterTargetMl) {
        await db.goals.update(DEFAULT_GOALS_ID, { waterTargetMl: 3000 });
      }

      const existingSettings = await db.settings.get(DEFAULT_SETTINGS_ID);
      if (!existingSettings) {
        await db.settings.put(createInitialSettings());
      }

      const seedCatalog = getInitialFoodCatalog();
      for (const seedItem of seedCatalog) {
        const existing = await db.foodCatalog.get(seedItem.id);
        if (!existing) {
          await db.foodCatalog.put(seedItem);
        } else if (!existing.portionPresets && seedItem.portionPresets) {
          await db.foodCatalog.update(seedItem.id, {
            name: seedItem.name,
            portionPresets: seedItem.portionPresets,
          });
        }
      }
    }
  );
}

/**
 * Logs a food item to a meal on a specific date, storing an immutable snapshot of its name and nutrition values.
 */
export async function addMealItemSnapshot(params: {
  date: string;
  category: MealCategory;
  foodCatalogId?: string;
  foodName: string;
  ingredients?: string;
  grams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sodiumMg?: number;
  sugarG?: number;
  source: FoodCatalogItem['source'];
}): Promise<MealItem> {
  const now = new Date().toISOString();

  return db.transaction('rw', [db.meals, db.mealItems, db.foodCatalog], async () => {
    let meal = await db.meals
      .where('[date+category]')
      .equals([params.date, params.category])
      .first();

    if (!meal) {
      meal = {
        id: `meal_${params.date}_${params.category}`,
        date: params.date,
        category: params.category,
        name: params.category.charAt(0).toUpperCase() + params.category.slice(1),
        createdAt: now,
        updatedAt: now,
      };
      await db.meals.put(meal);
    } else {
      await db.meals.update(meal.id, { updatedAt: now });
    }

    const item: MealItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mealId: meal.id,
      date: params.date,
      category: params.category,
      foodCatalogId: params.foodCatalogId,
      foodNameSnapshot: params.foodName.trim(),
      ingredientsSnapshot: params.ingredients?.trim() || undefined,
      grams: Math.round(params.grams * 100) / 100,
      calories: Math.round(params.calories * 100) / 100,
      protein: Math.round(params.protein * 100) / 100,
      carbohydrates: Math.round(params.carbohydrates * 100) / 100,
      fat: Math.round(params.fat * 100) / 100,
      sodiumMg: typeof params.sodiumMg === 'number' ? Math.round(params.sodiumMg) : undefined,
      sugarG: typeof params.sugarG === 'number' ? Math.round(params.sugarG * 10) / 10 : undefined,
      sourceSnapshot: params.source,
      createdAt: now,
      updatedAt: now,
    };

    await db.mealItems.put(item);

    if (params.foodCatalogId) {
      const catItem = await db.foodCatalog.get(params.foodCatalogId);
      if (catItem) {
        await db.foodCatalog.update(catItem.id, {
          usageCount: (catItem.usageCount || 0) + 1,
          updatedAt: now,
        });
      }
    }

    return item;
  });
}

/**
 * Adds a meal item directly from a FoodCatalogItem and serving weight in grams.
 */
export async function addCatalogFoodToMeal(
  catalogItem: FoodCatalogItem,
  grams: number,
  date: string,
  category: MealCategory
): Promise<MealItem> {
  const portion = calculateFoodNutrition(
    {
      calories: catalogItem.caloriesPer100g,
      protein: catalogItem.proteinPer100g,
      carbohydrates: catalogItem.carbsPer100g,
      fat: catalogItem.fatPer100g,
    },
    grams
  );

  const ratio = grams / 100;
  const sodiumMg = catalogItem.sodiumMgPer100g !== undefined
    ? Math.round(catalogItem.sodiumMgPer100g * ratio)
    : undefined;
  const sugarG = catalogItem.sugarGPer100g !== undefined
    ? Math.round(catalogItem.sugarGPer100g * ratio * 10) / 10
    : undefined;

  return addMealItemSnapshot({
    date,
    category,
    foodCatalogId: catalogItem.id,
    foodName: catalogItem.name,
    grams: portion.grams,
    calories: portion.calories,
    protein: portion.protein,
    carbohydrates: portion.carbohydrates,
    fat: portion.fat,
    sodiumMg,
    sugarG,
    source: catalogItem.source,
  });
}

export async function updateMealItemSnapshot(
  id: string,
  updates: Partial<
    Pick<
      MealItem,
      | 'foodNameSnapshot'
      | 'ingredientsSnapshot'
      | 'grams'
      | 'calories'
      | 'protein'
      | 'carbohydrates'
      | 'fat'
      | 'sodiumMg'
      | 'sugarG'
      | 'category'
    >
  >
): Promise<void> {
  const now = new Date().toISOString();
  await db.mealItems.update(id, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteMealItem(id: string): Promise<void> {
  await db.mealItems.delete(id);
}

/**
 * Logs a training session (e.g., Swimming or Strength Training) or water intake into `activityLogs`.
 */
export async function addActivityLogEntry(params: {
  date: string;
  activityType: string;
  durationMinutes: number;
  waterMl?: number;
  intensity?: 'low' | 'moderate' | 'high';
  estimatedCaloriesBurned?: number;
  notes?: string;
}): Promise<ActivityLog> {
  const entry: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: params.date,
    activityType: params.activityType,
    durationMinutes: Math.max(0, Math.round(params.durationMinutes)),
    waterMl: params.waterMl ? Math.round(params.waterMl) : undefined,
    intensity: params.intensity,
    estimatedCaloriesBurned: params.estimatedCaloriesBurned
      ? Math.round(params.estimatedCaloriesBurned)
      : undefined,
    notes: params.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await db.activityLogs.put(entry);
  return entry;
}

export async function deleteActivityLogEntry(id: string): Promise<void> {
  await db.activityLogs.delete(id);
}

/**
 * Clears all user records and restores clean default profile, targets, settings, and reference catalog.
 */
export async function resetAllDataToInitial(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.profiles,
      db.goals,
      db.foodCatalog,
      db.meals,
      db.mealItems,
      db.weightLogs,
      db.activityLogs,
      db.scanLogs,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.goals.clear(),
        db.foodCatalog.clear(),
        db.meals.clear(),
        db.mealItems.clear(),
        db.weightLogs.clear(),
        db.activityLogs.clear(),
        db.scanLogs.clear(),
        db.settings.clear(),
      ]);
    }
  );
  await initializeDatabase();
}
