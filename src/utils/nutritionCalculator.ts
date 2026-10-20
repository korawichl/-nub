import type { ActivityLevel, GoalType, NutrientsPer100g, Sex } from '../types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  extreme: 1.9,
};

export interface BMRInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}

export interface MacroCalculationInput {
  calorieTarget: number;
  proteinGrams?: number;
  fatGrams?: number;
  weightKg?: number;
}

export interface MacroTargetsResult {
  calorieTarget: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  proteinCalories: number;
  fatCalories: number;
  carbsCalories: number;
}

export interface PortionNutritionResult {
  grams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface RoughNutritionInput {
  foodName?: string;
  calories: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sodiumMg?: number;
  sugarG?: number;
}

export interface RoughNutritionOutput {
  fat: number;
  sodiumMg: number;
  sugarG: number;
}

/**
 * Intelligent fallback & rough estimation for Fat, Sodium, and Sugar.
 * Ensures scanning foods or adding meals always provides realistic macro/micronutrient estimates.
 */
export function estimateRoughNutrition(input: RoughNutritionInput): RoughNutritionOutput {
  const calories = Math.max(0, Number(input.calories) || 0);
  const protein = Math.max(0, Number(input.protein) || 0);
  const carbs = Math.max(0, Number(input.carbohydrates) || 0);
  const name = (input.foodName || '').toLowerCase();

  // 1. Fat estimation
  let fat =
    input.fat !== undefined && Number.isFinite(input.fat) && input.fat > 0
      ? Math.round(Number(input.fat) * 10) / 10
      : 0;

  if (fat <= 0 && calories > 0) {
    const nonFatCalories = protein * 4 + carbs * 4;
    const remainingCalories = calories - nonFatCalories;
    if (remainingCalories > 0) {
      fat = Math.round((remainingCalories / 9) * 10) / 10;
    } else {
      const isLean = /อกไก่|ไข่ขาว|ข้าวสวย|ผลไม้|น้ำเปล่า|เวย์|chicken breast|egg white|rice/i.test(name);
      const fatRatio = isLean ? 0.08 : 0.25;
      fat = Math.max(0.5, Math.round(((calories * fatRatio) / 9) * 10) / 10);
    }
  }

  // 2. Sodium estimation (mg)
  let sodiumMg =
    input.sodiumMg !== undefined && Number.isFinite(input.sodiumMg) && input.sodiumMg > 0
      ? Math.round(Number(input.sodiumMg))
      : 0;

  if (sodiumMg <= 0 && calories > 0) {
    const isSoupOrNoodle = /เตี๋ยว|เกาเหลา|ต้ม|แกง|ซุป|สุกี้|ราเมง|บะหมี่|noodle|soup|curry|hotpot|sukiyaki/i.test(name);
    const isBeverageOrSweet = /ชานม|โกโก้|กาแฟ|นม|น้ำ|หวาน|ชา|ผลไม้|เค้ก|dessert|juice|tea|coffee|smoothie|shake|ice cream|ไอศกรีม/i.test(name);
    const isSnackOrProcessed = /มาม่า|มันฝรั่ง|ขนมกรุบกรอบ|ไส้กรอก|แฮม|ลูกชิ้น|sausage|snack|chips/i.test(name);

    if (isBeverageOrSweet) {
      sodiumMg = Math.min(180, Math.max(15, Math.round(calories * 0.15)));
    } else if (isSoupOrNoodle || isSnackOrProcessed) {
      sodiumMg = Math.min(1800, Math.max(650, Math.round(calories * 1.8)));
    } else {
      sodiumMg = Math.min(1200, Math.max(300, Math.round(calories * 1.25)));
    }
  }

  // 3. Sugar estimation (g)
  let sugarG =
    input.sugarG !== undefined && Number.isFinite(input.sugarG) && input.sugarG > 0
      ? Math.round(Number(input.sugarG) * 10) / 10
      : 0;

  if (sugarG <= 0 && calories > 0) {
    const isBeverageOrSweet = /ชานม|โกโก้|กาแฟ|นม|น้ำ|หวาน|ชา|ผลไม้|เค้ก|dessert|juice|tea|coffee|smoothie|shake|ice cream|ไอศกรีม|boba|latte|soda|น้ำอัดลม/i.test(name);
    const isSavorySauce = /กะเพรา|ผัด|ทอด|หมูแดง|พะโล้|หวาน|ซอส|เทอริยากิ|stir-fry|curry/i.test(name);
    const isPlainGrainOrMeat = /ข้าวสวย|ข้าวกล้อง|อกไก่|ไข่ต้ม|ไข่ดาว|สเต็ก|เนื้อ|rice|chicken|beef|egg/i.test(name);

    if (isBeverageOrSweet) {
      if (carbs > 0) {
        sugarG = Math.round(carbs * 0.7 * 10) / 10;
      } else {
        sugarG = Math.round(((calories * 0.6) / 4) * 10) / 10;
      }
    } else if (isSavorySauce) {
      sugarG = carbs > 0 ? Math.min(18, Math.max(2, Math.round(carbs * 0.14 * 10) / 10)) : 3;
    } else if (isPlainGrainOrMeat) {
      sugarG = carbs > 0 ? Math.round(carbs * 0.03 * 10) / 10 : 0.2;
    } else {
      sugarG = carbs > 0 ? Math.min(15, Math.max(1, Math.round(carbs * 0.1 * 10) / 10)) : 1.5;
    }
  }

  return {
    fat: Math.max(0, fat),
    sodiumMg: Math.max(0, Math.round(sodiumMg)),
    sugarG: Math.max(0, Math.round(sugarG * 10) / 10),
  };
}

export interface DailySummaryInputItem {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  grams?: number;
  sodiumMg?: number;
  sugarG?: number;
}

export interface DailyTargetsInput {
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  sodiumLimitMg?: number;
  sugarLimitG?: number;
}

export interface DailySummaryResult {
  consumedCalories: number;
  remainingCalories: number;
  calorieTarget: number;
  calorieProgressPercent: number;
  consumedProtein: number;
  remainingProtein: number;
  proteinProgressPercent: number;
  consumedCarbs: number;
  remainingCarbs: number;
  carbsProgressPercent: number;
  consumedFat: number;
  remainingFat: number;
  fatProgressPercent: number;
  consumedSodiumMg: number;
  consumedSugarG: number;
  entryCount: number;
}

export interface WeightEntryInput {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface WeightTrendPoint {
  date: string;
  weightKg: number;
  movingAverage7d: number | null;
}

export interface WeightTrendResult {
  points: WeightTrendPoint[];
  latestWeightKg: number | null;
  initialWeightKg: number;
  targetWeightKg: number;
  sevenDayAverageKg: number | null;
  totalChangeKg: number | null;
  remainingToTargetKg: number | null;
  progressTowardTargetPercent: number | null;
  hasEnoughDataFor7DayAvg: boolean;
}

function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function assertPositiveFinite(value: number, fieldName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number.`);
  }
}

function assertNonNegativeFinite(value: number, fieldName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number.`);
  }
}

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin–St Jeor formula:
 * Male:   BMR = 10 × weightKg + 6.25 × heightCm − 5 × age + 5
 * Female: BMR = 10 × weightKg + 6.25 × heightCm − 5 × age − 161
 */
export function calculateBMR(input: BMRInput): number {
  assertPositiveFinite(input.weightKg, 'weightKg');
  assertPositiveFinite(input.heightCm, 'heightCm');
  assertPositiveFinite(input.age, 'age');
  if (input.sex !== 'male' && input.sex !== 'female') {
    throw new Error('sex must be "male" or "female".');
  }

  const sexOffset = input.sex === 'male' ? 5 : -161;
  const raw = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexOffset;
  return roundTo(raw, 2);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE) from BMR and either an activity factor or level.
 */
export function calculateTDEE(
  bmr: number,
  activity: ActivityLevel | number = 'high'
): number {
  assertPositiveFinite(bmr, 'bmr');
  const factor =
    typeof activity === 'number' ? activity : ACTIVITY_FACTORS[activity];
  assertPositiveFinite(factor, 'activityFactor');

  return roundTo(bmr * factor, 2);
}

/**
 * Calculates daily calorie target from TDEE and an optional adjustment or explicit override.
 * Default fat-loss adjustment for the initial 3,312 kcal TDEE is 2,900 kcal (-412 kcal).
 */
export function calculateCalorieTarget(
  tdee: number,
  options?: {
    customTarget?: number;
    adjustmentKcal?: number;
    minimumSafeCalories?: number;
  }
): number {
  assertPositiveFinite(tdee, 'tdee');

  if (options?.customTarget !== undefined) {
    assertPositiveFinite(options.customTarget, 'customTarget');
    return roundTo(options.customTarget, 2);
  }

  const adjustment = options?.adjustmentKcal ?? -412;
  if (!Number.isFinite(adjustment)) {
    throw new Error('adjustmentKcal must be a finite number.');
  }

  const minFloor = options?.minimumSafeCalories ?? 1200;
  const raw = Math.max(minFloor, tdee + adjustment);
  return roundTo(raw, 2);
}

export interface ProfileTargetCalculationInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goalType: GoalType;
}

export interface ProfileTargetCalculationResult {
  bmr: number;
  tdee: number;
  activityFactor: number;
  calorieTarget: number;
  proteinTargetG: number;
  fatTargetG: number;
  carbsTargetG: number;
  deficitOrSurplusKcal: number;
}

/**
 * Calculates scientifically grounded BMR, TDEE, Calorie Target, and Macro distribution
 * based on user's sex, height, weight, age, activity level, and training goal.
 */
export function calculateNutritionTargetsFromProfile(
  input: ProfileTargetCalculationInput
): ProfileTargetCalculationResult {
  const bmr = calculateBMR({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
    sex: input.sex,
  });

  const factor = ACTIVITY_FACTORS[input.activityLevel];
  const tdee = Math.round(bmr * factor);

  let calorieTarget: number;
  let deficitOrSurplusKcal = 0;

  if (input.goalType === 'fat_loss') {
    // 15-20% deficit (around 400-500 kcal)
    const rawDeficit = Math.round(tdee * 0.15);
    const deficit = Math.max(300, Math.min(600, rawDeficit || 412));
    deficitOrSurplusKcal = -deficit;
    const minSafe = input.sex === 'female' ? 1200 : 1500;
    calorieTarget = Math.max(minSafe, tdee - deficit);
  } else if (input.goalType === 'muscle_gain') {
    // 10-12% lean surplus (around 250-350 kcal)
    const surplus = Math.max(200, Math.min(450, Math.round(tdee * 0.1)));
    deficitOrSurplusKcal = surplus;
    calorieTarget = tdee + surplus;
  } else {
    // Maintenance
    deficitOrSurplusKcal = 0;
    calorieTarget = tdee;
  }

  // Protein targets based on fitness standards:
  // fat_loss: ~1.95 - 2.1g per kg to preserve lean mass during deficit
  // muscle_gain: ~2.0g per kg for hypertrophy
  // maintenance: ~1.85g per kg
  const proteinMultiplier =
    input.goalType === 'fat_loss' ? 1.9318 : input.goalType === 'muscle_gain' ? 2.0 : 1.85;
  const proteinTargetG = Math.round(input.weightKg * proteinMultiplier);

  // Fat targets: ~0.95g per kg
  const fatMultiplier =
    input.goalType === 'fat_loss' ? 0.9659 : input.goalType === 'muscle_gain' ? 1.0 : 0.9;
  const fatTargetG = Math.round(input.weightKg * fatMultiplier);

  // Carbs = Remaining calories / 4
  const proteinCalories = proteinTargetG * 4;
  const fatCalories = fatTargetG * 9;
  const remainingCalories = Math.max(0, calorieTarget - proteinCalories - fatCalories);
  const carbsTargetG = Math.max(30, Math.round((remainingCalories / 4) * 10) / 10);

  return {
    bmr: Math.round(bmr),
    tdee,
    activityFactor: factor,
    calorieTarget: Math.round(calorieTarget),
    proteinTargetG,
    fatTargetG,
    carbsTargetG,
    deficitOrSurplusKcal,
  };
}

/**
 * Calculates daily macronutrient targets in grams and calories.
 * Protein = 4 kcal/g, Fat = 9 kcal/g, Carbohydrates = remaining calories / 4 kcal/g.
 * For 2,900 kcal, 170g protein (680 kcal), 85g fat (765 kcal) -> remaining 1,455 kcal / 4 = 363.75g carbs.
 */
export function calculateMacros(input: MacroCalculationInput): MacroTargetsResult {
  assertPositiveFinite(input.calorieTarget, 'calorieTarget');

  const proteinGrams =
    input.proteinGrams !== undefined
      ? input.proteinGrams
      : input.weightKg !== undefined
      ? roundTo(input.weightKg * 1.9318, 0)
      : 170;

  const fatGrams =
    input.fatGrams !== undefined
      ? input.fatGrams
      : input.weightKg !== undefined
      ? roundTo(input.weightKg * 0.9659, 0)
      : 85;

  assertNonNegativeFinite(proteinGrams, 'proteinGrams');
  assertNonNegativeFinite(fatGrams, 'fatGrams');

  const proteinCalories = roundTo(proteinGrams * 4, 2);
  const fatCalories = roundTo(fatGrams * 9, 2);
  const remainingCalories = Math.max(0, input.calorieTarget - proteinCalories - fatCalories);
  const carbsGrams = roundTo(remainingCalories / 4, 2);
  const carbsCalories = roundTo(carbsGrams * 4, 2);

  return {
    calorieTarget: roundTo(input.calorieTarget, 2),
    proteinGrams: roundTo(proteinGrams, 2),
    fatGrams: roundTo(fatGrams, 2),
    carbsGrams,
    proteinCalories,
    fatCalories,
    carbsCalories,
  };
}

/**
 * Calculates portion nutrition from nutrients per 100g and portion weight in grams:
 * nutrientTotal = nutrientPer100g * grams / 100
 */
export function calculateFoodNutrition(
  per100g: NutrientsPer100g,
  grams: number
): PortionNutritionResult {
  assertNonNegativeFinite(grams, 'grams');
  assertNonNegativeFinite(per100g.calories, 'caloriesPer100g');
  assertNonNegativeFinite(per100g.protein, 'proteinPer100g');
  assertNonNegativeFinite(per100g.carbohydrates, 'carbohydratesPer100g');
  assertNonNegativeFinite(per100g.fat, 'fatPer100g');

  const ratio = grams / 100;

  return {
    grams: roundTo(grams, 2),
    calories: roundTo(per100g.calories * ratio, 2),
    protein: roundTo(per100g.protein * ratio, 2),
    carbohydrates: roundTo(per100g.carbohydrates * ratio, 2),
    fat: roundTo(per100g.fat * ratio, 2),
  };
}

/**
 * Aggregates all logged food items for a day and computes progress against daily targets.
 */
export function calculateDailySummary(
  items: DailySummaryInputItem[],
  targets: DailyTargetsInput
): DailySummaryResult {
  assertPositiveFinite(targets.calorieTarget, 'calorieTarget');
  assertNonNegativeFinite(targets.proteinTargetG, 'proteinTargetG');
  assertNonNegativeFinite(targets.carbsTargetG, 'carbsTargetG');
  assertNonNegativeFinite(targets.fatTargetG, 'fatTargetG');

  let cal = 0;
  let pro = 0;
  let carb = 0;
  let fat = 0;
  let sodium = 0;
  let sugar = 0;

  for (const item of items) {
    assertNonNegativeFinite(item.calories, 'item.calories');
    assertNonNegativeFinite(item.protein, 'item.protein');
    assertNonNegativeFinite(item.carbohydrates, 'item.carbohydrates');
    assertNonNegativeFinite(item.fat, 'item.fat');

    cal += item.calories;
    pro += item.protein;
    carb += item.carbohydrates;
    fat += item.fat;
    if (typeof item.sodiumMg === 'number' && Number.isFinite(item.sodiumMg)) {
      sodium += Math.max(0, item.sodiumMg);
    }
    if (typeof item.sugarG === 'number' && Number.isFinite(item.sugarG)) {
      sugar += Math.max(0, item.sugarG);
    }
  }

  const consumedCalories = roundTo(cal, 2);
  const consumedProtein = roundTo(pro, 2);
  const consumedCarbs = roundTo(carb, 2);
  const consumedFat = roundTo(fat, 2);
  const consumedSodiumMg = Math.round(sodium);
  const consumedSugarG = roundTo(sugar, 1);

  const remainingCalories = roundTo(targets.calorieTarget - consumedCalories, 2);
  const remainingProtein = roundTo(targets.proteinTargetG - consumedProtein, 2);
  const remainingCarbs = roundTo(targets.carbsTargetG - consumedCarbs, 2);
  const remainingFat = roundTo(targets.fatTargetG - consumedFat, 2);

  const calcPct = (consumed: number, target: number) =>
    target > 0 ? roundTo((consumed / target) * 100, 1) : 0;

  return {
    consumedCalories,
    remainingCalories,
    calorieTarget: roundTo(targets.calorieTarget, 2),
    calorieProgressPercent: calcPct(consumedCalories, targets.calorieTarget),
    consumedProtein,
    remainingProtein,
    proteinProgressPercent: calcPct(consumedProtein, targets.proteinTargetG),
    consumedCarbs,
    remainingCarbs,
    carbsProgressPercent: calcPct(consumedCarbs, targets.carbsTargetG),
    consumedFat,
    remainingFat,
    fatProgressPercent: calcPct(consumedFat, targets.fatTargetG),
    consumedSodiumMg,
    consumedSugarG,
    entryCount: items.length,
  };
}

/**
 * Calculates weight history series, 7-day rolling average (when >= 7 entries exist),
 * and progress toward the target weight.
 */
export function calculateWeightTrend(
  entries: WeightEntryInput[],
  initialWeightKg: number = 88,
  targetWeightKg: number = 80
): WeightTrendResult {
  assertPositiveFinite(initialWeightKg, 'initialWeightKg');
  assertPositiveFinite(targetWeightKg, 'targetWeightKg');

  for (const entry of entries) {
    assertPositiveFinite(entry.weightKg, 'entry.weightKg');
  }

  // Sort ascending by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by date (keep latest entry for a given date)
  const byDate = new Map<string, WeightEntryInput>();
  for (const entry of sorted) {
    byDate.set(entry.date, entry);
  }
  const uniqueSorted = Array.from(byDate.values());

  const points: WeightTrendPoint[] = uniqueSorted.map((entry, idx) => {
    let movingAverage7d: number | null = null;
    if (idx >= 6) {
      const windowSlice = uniqueSorted.slice(idx - 6, idx + 1);
      const sum = windowSlice.reduce((acc, cur) => acc + cur.weightKg, 0);
      movingAverage7d = roundTo(sum / 7, 2);
    }
    return {
      date: entry.date,
      weightKg: roundTo(entry.weightKg, 2),
      movingAverage7d,
    };
  });

  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const latestWeightKg = latestPoint ? latestPoint.weightKg : null;
  const hasEnoughDataFor7DayAvg = points.length >= 7;
  const sevenDayAverageKg =
    hasEnoughDataFor7DayAvg && latestPoint ? latestPoint.movingAverage7d : null;

  let totalChangeKg: number | null = null;
  let remainingToTargetKg: number | null = null;
  let progressTowardTargetPercent: number | null = null;

  if (latestWeightKg !== null) {
    totalChangeKg = roundTo(latestWeightKg - initialWeightKg, 2);
    remainingToTargetKg = roundTo(latestWeightKg - targetWeightKg, 2);

    const totalGoalDelta = initialWeightKg - targetWeightKg;
    if (totalGoalDelta !== 0) {
      const achievedDelta = initialWeightKg - latestWeightKg;
      const rawPct = (achievedDelta / totalGoalDelta) * 100;
      progressTowardTargetPercent = roundTo(Math.max(0, Math.min(100, rawPct)), 1);
    } else {
      progressTowardTargetPercent = 100;
    }
  }

  return {
    points,
    latestWeightKg,
    initialWeightKg: roundTo(initialWeightKg, 2),
    targetWeightKg: roundTo(targetWeightKg, 2),
    sevenDayAverageKg,
    totalChangeKg,
    remainingToTargetKg,
    progressTowardTargetPercent,
    hasEnoughDataFor7DayAvg,
  };
}

/**
 * Calculates current consecutive logging streak in days based on recorded dates and reference date (Bangkok YYYY-MM-DD).
 */
export function calculateStreak(loggedDates: string[], referenceDate: string): number {
  if (!loggedDates || loggedDates.length === 0 || !referenceDate) return 0;

  const dateSet = new Set(loggedDates.filter(Boolean));
  let streak = 0;

  // Helper to shift YYYY-MM-DD by delta days
  const shift = (base: string, deltaDays: number): string => {
    const d = new Date(base + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };

  // Check if today has at least one logged item
  let cursor = referenceDate;
  if (!dateSet.has(cursor)) {
    // If today is not logged yet, streak can still be maintained if yesterday was logged
    const yesterday = shift(referenceDate, -1);
    if (!dateSet.has(yesterday)) {
      return 0;
    }
    cursor = yesterday;
  }

  // Count backwards day by day
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }

  return streak;
}

export interface EnergyBalanceResult {
  tdee: number;
  workoutBurn: number;
  totalExpenditure: number;
  consumedCalories: number;
  netDeficit: number; // positive = deficit (fat burn), negative = surplus (gain)
  estimatedFatChangeGrams: number;
  status: 'deficit' | 'surplus' | 'maintenance';
}

/**
 * Calculates net calorie deficit/surplus and estimated daily fat loss/gain in grams.
 * 1 kg of adipose tissue ≈ 7,700 kcal (approx 7.7 kcal/g).
 */
export function calculateEnergyBalance(
  consumedCalories: number,
  tdee: number,
  workoutBurn: number = 0
): EnergyBalanceResult {
  const safeConsumed = Math.max(0, consumedCalories || 0);
  const safeTdee = Math.max(0, tdee || 0);
  const safeWorkout = Math.max(0, workoutBurn || 0);

  const totalExpenditure = roundTo(safeTdee + safeWorkout, 1);
  const netDeficit = roundTo(totalExpenditure - safeConsumed, 1);
  const estimatedFatChangeGrams = roundTo(Math.abs(netDeficit) / 7.7, 1);

  let status: 'deficit' | 'surplus' | 'maintenance' = 'maintenance';
  if (netDeficit > 50) {
    status = 'deficit';
  } else if (netDeficit < -50) {
    status = 'surplus';
  }

  return {
    tdee: safeTdee,
    workoutBurn: safeWorkout,
    totalExpenditure,
    consumedCalories: safeConsumed,
    netDeficit,
    estimatedFatChangeGrams,
    status,
  };
}
