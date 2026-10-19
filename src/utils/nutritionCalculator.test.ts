import { describe, expect, it } from 'vitest';
import {
  calculateBMR,
  calculateCalorieTarget,
  calculateDailySummary,
  calculateFoodNutrition,
  calculateMacros,
  calculateTDEE,
  calculateWeightTrend,
  calculateStreak,
  calculateEnergyBalance,
} from './nutritionCalculator';

describe('nutritionCalculator', () => {
  describe('calculateBMR', () => {
    it('calculates exact initial user BMR using Mifflin-St Jeor (88kg, 180cm, age 18, male = 1920 kcal)', () => {
      const bmr = calculateBMR({
        weightKg: 88,
        heightCm: 180,
        age: 18,
        sex: 'male',
      });
      // 10*88 (880) + 6.25*180 (1125) - 5*18 (90) + 5 = 1920
      expect(bmr).toBe(1920);
    });

    it('supports female Mifflin-St Jeor offset', () => {
      const bmr = calculateBMR({
        weightKg: 60,
        heightCm: 165,
        age: 25,
        sex: 'female',
      });
      // 600 + 1031.25 - 125 - 161 = 1345.25
      expect(bmr).toBe(1345.25);
    });

    it('rejects invalid non-positive inputs', () => {
      expect(() =>
        calculateBMR({ weightKg: 0, heightCm: 180, age: 18, sex: 'male' })
      ).toThrow();
      expect(() =>
        calculateBMR({ weightKg: 88, heightCm: -10, age: 18, sex: 'male' })
      ).toThrow();
    });
  });

  describe('calculateTDEE', () => {
    it('calculates exact TDEE for BMR 1920 and high activity factor 1.725 (= 3312 kcal)', () => {
      expect(calculateTDEE(1920, 'high')).toBe(3312);
      expect(calculateTDEE(1920, 1.725)).toBe(3312);
    });
  });

  describe('calculateCalorieTarget', () => {
    it('returns 2900 kcal initial target for 3312 TDEE', () => {
      expect(calculateCalorieTarget(3312)).toBe(2900);
      expect(calculateCalorieTarget(3312, { customTarget: 2900 })).toBe(2900);
    });

    it('respects minimum safe calorie floor', () => {
      expect(calculateCalorieTarget(1500, { adjustmentKcal: -600, minimumSafeCalories: 1200 })).toBe(
        1200
      );
    });
  });

  describe('calculateMacros', () => {
    it('calculates exact initial carbohydrate target (363.75g) from 2900 kcal, 170g protein, 85g fat', () => {
      const macros = calculateMacros({
        calorieTarget: 2900,
        proteinGrams: 170,
        fatGrams: 85,
      });
      expect(macros.proteinCalories).toBe(680);
      expect(macros.fatCalories).toBe(765);
      expect(macros.carbsGrams).toBe(363.75);
      expect(macros.carbsCalories).toBe(1455);
    });
  });

  describe('calculateFoodNutrition', () => {
    it('calculates portion nutrients accurately using nutrientPer100g * grams / 100', () => {
      const chickenBreastPer100g = {
        calories: 165,
        protein: 31,
        carbohydrates: 0,
        fat: 3.6,
      };
      const result = calculateFoodNutrition(chickenBreastPer100g, 250);
      expect(result).toEqual({
        grams: 250,
        calories: 412.5,
        protein: 77.5,
        carbohydrates: 0,
        fat: 9,
      });
    });
  });

  describe('calculateDailySummary', () => {
    it('aggregates daily items and computes remaining calories and macro progress', () => {
      const summary = calculateDailySummary(
        [
          { calories: 650, protein: 45, carbohydrates: 70, fat: 20 },
          { calories: 850, protein: 60, carbohydrates: 95, fat: 25 },
        ],
        {
          calorieTarget: 2900,
          proteinTargetG: 170,
          carbsTargetG: 363.75,
          fatTargetG: 85,
        }
      );

      expect(summary.consumedCalories).toBe(1500);
      expect(summary.remainingCalories).toBe(1400);
      expect(summary.consumedProtein).toBe(105);
      expect(summary.remainingProtein).toBe(65);
      expect(summary.consumedCarbs).toBe(165);
      expect(summary.consumedFat).toBe(45);
      expect(summary.entryCount).toBe(2);
    });
  });

  describe('calculateWeightTrend', () => {
    it('returns empty state without fabricating data when no entries exist', () => {
      const trend = calculateWeightTrend([], 88, 80);
      expect(trend.points).toHaveLength(0);
      expect(trend.latestWeightKg).toBeNull();
      expect(trend.sevenDayAverageKg).toBeNull();
      expect(trend.hasEnoughDataFor7DayAvg).toBe(false);
    });

    it('computes 7-day moving average only when at least 7 days of records exist', () => {
      const entries = [
        { date: '2026-10-13', weightKg: 88.0 },
        { date: '2026-10-14', weightKg: 87.8 },
        { date: '2026-10-15', weightKg: 87.6 },
        { date: '2026-10-16', weightKg: 87.5 },
        { date: '2026-10-17', weightKg: 87.4 },
        { date: '2026-10-18', weightKg: 87.2 },
        { date: '2026-10-19', weightKg: 87.0 },
      ];
      const trend = calculateWeightTrend(entries, 88, 80);
      expect(trend.hasEnoughDataFor7DayAvg).toBe(true);
      expect(trend.sevenDayAverageKg).toBe(87.5);
      expect(trend.latestWeightKg).toBe(87.0);
      expect(trend.totalChangeKg).toBe(-1);
      expect(trend.remainingToTargetKg).toBe(7);
      expect(trend.progressTowardTargetPercent).toBe(12.5);
    });
  });

  describe('calculateStreak', () => {
    it('returns consecutive days when logged today and previous days', () => {
      const dates = ['2026-10-17', '2026-10-18', '2026-10-19'];
      expect(calculateStreak(dates, '2026-10-19')).toBe(3);
    });

    it('preserves streak if today is not logged yet but yesterday was logged', () => {
      const dates = ['2026-10-17', '2026-10-18'];
      expect(calculateStreak(dates, '2026-10-19')).toBe(2);
    });

    it('returns 0 if both today and yesterday have no logs', () => {
      const dates = ['2026-10-15', '2026-10-16'];
      expect(calculateStreak(dates, '2026-10-19')).toBe(0);
    });

    it('handles empty dates gracefully', () => {
      expect(calculateStreak([], '2026-10-19')).toBe(0);
    });
  });

  describe('calculateEnergyBalance', () => {
    it('calculates deficit and estimated fat loss grams correctly', () => {
      // Consumed 1800, TDEE 2200, Workout 300 => Total Exp = 2500 => Deficit = 700 kcal
      // Fat loss = 700 / 7.7 = ~90.9g
      const res = calculateEnergyBalance(1800, 2200, 300);
      expect(res.totalExpenditure).toBe(2500);
      expect(res.netDeficit).toBe(700);
      expect(res.status).toBe('deficit');
      expect(res.estimatedFatChangeGrams).toBe(90.9);
    });

    it('calculates surplus when consumed exceeds total expenditure', () => {
      const res = calculateEnergyBalance(2800, 2000, 200);
      expect(res.totalExpenditure).toBe(2200);
      expect(res.netDeficit).toBe(-600);
      expect(res.status).toBe('surplus');
      expect(res.estimatedFatChangeGrams).toBe(77.9);
    });
  });

  describe('sodium and sugar in calculateDailySummary', () => {
    it('sums sodium and sugar accurately across items', () => {
      const summary = calculateDailySummary(
        [
          { calories: 400, protein: 30, carbohydrates: 40, fat: 10, sodiumMg: 750, sugarG: 5.5 },
          { calories: 300, protein: 20, carbohydrates: 30, fat: 8, sodiumMg: 600, sugarG: 8.2 },
        ],
        { calorieTarget: 2000, proteinTargetG: 150, carbsTargetG: 200, fatTargetG: 65 }
      );
      expect(summary.consumedSodiumMg).toBe(1350);
      expect(summary.consumedSugarG).toBe(13.7);
    });
  });
});
