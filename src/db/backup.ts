import { CURRENT_DB_SCHEMA_VERSION, db } from './database';
import type {
  ActivityLog,
  AppSettings,
  FoodCatalogItem,
  Meal,
  MealItem,
  NutritionGoals,
  ScanLog,
  UserProfile,
  WeightLog,
} from '../types';

export interface NubBackupPayload {
  app: 'nub-nutrition-tracker';
  schemaVersion: number;
  exportedAt: string;
  data: {
    profiles: UserProfile[];
    goals: NutritionGoals[];
    foodCatalog: FoodCatalogItem[];
    meals: Meal[];
    mealItems: MealItem[];
    weightLogs: WeightLog[];
    activityLogs: ActivityLog[];
    scanLogs: ScanLog[];
    settings: AppSettings[];
  };
}

/**
 * Exports all 9 IndexedDB tables into a structured, versioned JSON backup object.
 */
export async function exportDatabaseToJson(): Promise<NubBackupPayload> {
  const [
    profiles,
    goals,
    foodCatalog,
    meals,
    mealItems,
    weightLogs,
    activityLogs,
    scanLogs,
    settings,
  ] = await Promise.all([
    db.profiles.toArray(),
    db.goals.toArray(),
    db.foodCatalog.toArray(),
    db.meals.toArray(),
    db.mealItems.toArray(),
    db.weightLogs.toArray(),
    db.activityLogs.toArray(),
    db.scanLogs.toArray(),
    db.settings.toArray(),
  ]);

  return {
    app: 'nub-nutrition-tracker',
    schemaVersion: CURRENT_DB_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      goals,
      foodCatalog,
      meals,
      mealItems,
      weightLogs,
      activityLogs,
      scanLogs,
      settings,
    },
  };
}

/**
 * Validates a backup object before modifying local database records.
 */
export function validateBackupPayload(raw: unknown): NubBackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file: root value must be a JSON object.');
  }

  const candidate = raw as Record<string, unknown>;
  if (candidate.app !== 'nub-nutrition-tracker') {
    throw new Error('Invalid backup file: unrecognized application identifier.');
  }

  if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion < 1) {
    throw new Error('Invalid backup file: missing or invalid schemaVersion.');
  }

  if (!candidate.data || typeof candidate.data !== 'object') {
    throw new Error('Invalid backup file: missing data tables object.');
  }

  const data = candidate.data as Record<string, unknown>;
  const requiredTables = [
    'profiles',
    'goals',
    'foodCatalog',
    'meals',
    'mealItems',
    'weightLogs',
    'activityLogs',
    'scanLogs',
    'settings',
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(data[table])) {
      throw new Error(`Invalid backup file: table "${table}" must be an array.`);
    }
  }

  for (const item of data.mealItems as MealItem[]) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.date !== 'string' ||
      typeof item.foodNameSnapshot !== 'string' ||
      typeof item.calories !== 'number'
    ) {
      throw new Error('Invalid backup file: malformed record in mealItems.');
    }
  }

  for (const w of data.weightLogs as WeightLog[]) {
    if (
      !w ||
      typeof w.id !== 'string' ||
      typeof w.date !== 'string' ||
      typeof w.weightKg !== 'number' ||
      w.weightKg <= 0
    ) {
      throw new Error('Invalid backup file: malformed record in weightLogs.');
    }
  }

  return candidate as unknown as NubBackupPayload;
}

/**
 * Atomically restores a validated backup payload into IndexedDB.
 * If any step fails, the transaction rolls back so existing data is not corrupted.
 */
export async function restoreDatabaseFromBackup(rawJsonString: string): Promise<{
  mealItemsRestored: number;
  weightLogsRestored: number;
  catalogItemsRestored: number;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch {
    throw new Error('Failed to parse JSON file. Ensure the file is valid JSON.');
  }

  const payload = validateBackupPayload(parsed);

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

      await Promise.all([
        db.profiles.bulkPut(payload.data.profiles),
        db.goals.bulkPut(payload.data.goals),
        db.foodCatalog.bulkPut(payload.data.foodCatalog),
        db.meals.bulkPut(payload.data.meals),
        db.mealItems.bulkPut(payload.data.mealItems),
        db.weightLogs.bulkPut(payload.data.weightLogs),
        db.activityLogs.bulkPut(payload.data.activityLogs),
        db.scanLogs.bulkPut(payload.data.scanLogs),
        db.settings.bulkPut(payload.data.settings),
      ]);
    }
  );

  return {
    mealItemsRestored: payload.data.mealItems.length,
    weightLogsRestored: payload.data.weightLogs.length,
    catalogItemsRestored: payload.data.foodCatalog.length,
  };
}

function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a CSV string for all saved food diary records (`mealItems`).
 */
export function generateMealItemsCsv(items: MealItem[]): string {
  const headers = [
    'Date',
    'Meal Category',
    'Food Name',
    'Ingredients',
    'Serving Weight (g)',
    'Calories (kcal)',
    'Protein (g)',
    'Carbohydrates (g)',
    'Fat (g)',
    'Source',
    'Created At',
  ];

  const sorted = [...items].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const rows = sorted.map((item) =>
    [
      escapeCsvCell(item.date),
      escapeCsvCell(item.category),
      escapeCsvCell(item.foodNameSnapshot),
      escapeCsvCell(item.ingredientsSnapshot),
      escapeCsvCell(item.grams),
      escapeCsvCell(item.calories),
      escapeCsvCell(item.protein),
      escapeCsvCell(item.carbohydrates),
      escapeCsvCell(item.fat),
      escapeCsvCell(item.sourceSnapshot),
      escapeCsvCell(item.createdAt),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
