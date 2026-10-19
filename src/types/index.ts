export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';
export type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type ThemeMode = 'dark' | 'twilight' | 'light';
export type FoodSourceType =
  | 'usda_reference'
  | 'thai_reference'
  | 'user_custom'
  | 'user_estimated'
  | 'ai_confirmed';
export type AIProviderStatus = 'not_configured' | 'ready' | 'processing' | 'failed';

export interface PortionPreset {
  label: string;
  grams: number;
}

export interface UserProfile {
  id: string;
  age: number;
  sex: Sex;
  heightCm: number;
  initialWeightKg: number;
  targetWeightKg: number;
  goal: GoalType;
  activityLevel: ActivityLevel;
  training: string;
  platform: string;
  storage: string;
  budget: string;
  targetDate?: string;
  updatedAt: string;
}

export interface NutritionGoals {
  id: string;
  bmr: number;
  activityFactor: number;
  estimatedTdee: number;
  calorieTarget: number;
  proteinTargetG: number;
  fatTargetG: number;
  carbsTargetG: number;
  waterTargetMl?: number;
  autoCalculateMacros: boolean;
  updatedAt: string;
}

export interface NutrientsPer100g {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface FoodCatalogItem {
  id: string;
  name: string;
  category?: string;
  defaultServingGrams: number;
  portionPresets?: PortionPreset[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: FoodSourceType;
  sourceLabel: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Meal {
  id: string;
  date: string; // YYYY-MM-DD in Asia/Bangkok
  category: MealCategory;
  name?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealItem {
  id: string;
  mealId: string;
  date: string; // YYYY-MM-DD in Asia/Bangkok
  category: MealCategory;
  foodCatalogId?: string;
  // Snapshot fields so historical records never mutate when catalog changes
  foodNameSnapshot: string;
  ingredientsSnapshot?: string;
  grams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sourceSnapshot: FoodSourceType;
  createdAt: string;
  updatedAt: string;
}

export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD in Asia/Bangkok
  weightKg: number;
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  date: string; // YYYY-MM-DD
  activityType: string; // e.g., 'swimming', 'strength_training', 'cardio', 'water_intake'
  durationMinutes: number; // for water_intake, stores ml or 0
  waterMl?: number;
  intensity?: 'low' | 'moderate' | 'high';
  estimatedCaloriesBurned?: number;
  notes?: string;
  createdAt: string;
}

export interface ScanLog {
  id: string;
  date: string;
  status: 'manual_fallback' | 'analyzed' | 'confirmed' | 'cancelled' | 'failed';
  mealName?: string;
  estimatedGrams?: number;
  estimatedCalories?: number;
  providerId: string;
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  theme: ThemeMode;
  timezone: string;
  aiProviderId: string; // 'none' | 'direct_gemini' | 'groq_free' | 'backend_proxy'
  geminiModel?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  aiBackendEndpoint?: string;
  updatedAt: string;
}

export interface ConfirmMealDraft {
  foodName: string;
  ingredients: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  category: MealCategory;
  source: FoodSourceType;
  uncertainties?: string[];
  assumptions?: string[];
  requiresExplicitConfirmation: boolean;
  saveToCatalog?: boolean;
}
