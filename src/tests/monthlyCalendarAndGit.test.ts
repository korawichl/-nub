import { describe, it, expect } from 'vitest';
import {
  getDaysInMonth,
  getFirstDayOfWeek,
  formatMonthYear,
  buildDateString,
  parseDateString,
  shiftDateString,
  getMealCategoryByTime,
  isSnackOrBeverageFood,
  resolveSmartMealCategory,
} from '../utils/date';
import {
  aggregateMonthData,
  generateMonthlyMarkdownReport,
  generateMonthlyJsonArchive,
} from '../utils/gitExporter';
import type { MealItem, NutritionGoals, UserProfile } from '../types';

describe('Date Utilities for Monthly Calendar', () => {
  it('correctly calculates days in months (including leap years)', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31); // Jan
    expect(getDaysInMonth(2026, 2)).toBe(28); // Feb non-leap
    expect(getDaysInMonth(2024, 2)).toBe(29); // Feb leap year
    expect(getDaysInMonth(2026, 4)).toBe(30); // Apr
    expect(getDaysInMonth(2026, 10)).toBe(31); // Oct
  });

  it('determines the first day of week accurately', () => {
    // 2026-10-01 was Thursday (day 4: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
    expect(getFirstDayOfWeek(2026, 10)).toBe(4);
  });

  it('parses and builds date strings seamlessly', () => {
    expect(buildDateString(2026, 10, 5)).toBe('2026-10-05');
    const parsed = parseDateString('2026-10-25');
    expect(parsed.year).toBe(2026);
    expect(parsed.month).toBe(10);
    expect(parsed.day).toBe(25);
    expect(shiftDateString('2026-10-05', 2)).toBe('2026-10-07');
    expect(shiftDateString('2026-10-05', -5)).toBe('2026-09-30');
  });

  it('formats bilingual Thai/English month header', () => {
    const formatted = formatMonthYear(2026, 10);
    expect(formatted).toContain('ตุลาคม 2026');
    expect(formatted).toContain('October 2026');
  });
});

describe('Git Exporter and Monthly Archive', () => {
  const mockGoals: NutritionGoals = {
    id: 'goals_1',
    bmr: 1900,
    activityFactor: 1.5,
    estimatedTdee: 2850,
    calorieTarget: 2500,
    proteinTargetG: 160,
    fatTargetG: 70,
    carbsTargetG: 300,
    autoCalculateMacros: true,
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const mockProfile: UserProfile = {
    id: 'user_1',
    name: 'Korawich',
    age: 25,
    sex: 'male',
    heightCm: 180,
    initialWeightKg: 85,
    targetWeightKg: 78,
    goal: 'fat_loss',
    activityLevel: 'high',
    training: 'Strength & Swimming',
    platform: 'PWA',
    storage: 'local',
    budget: 'free',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const mockMealItems: MealItem[] = [
    {
      id: 'item_1',
      mealId: 'meal_1',
      date: '2026-10-01',
      category: 'breakfast',
      foodNameSnapshot: 'อกไก่ต้มสุก',
      grams: 150,
      calories: 248,
      protein: 46.5,
      carbohydrates: 0,
      fat: 5.4,
      sourceSnapshot: 'thai_reference',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'item_2',
      mealId: 'meal_2',
      date: '2026-10-01',
      category: 'lunch',
      foodNameSnapshot: 'ข้าวมันไก่ต้ม',
      grams: 300,
      calories: 534,
      protein: 34.5,
      carbohydrates: 63.0,
      fat: 15.6,
      sourceSnapshot: 'thai_reference',
      createdAt: '2026-10-01T12:00:00Z',
      updatedAt: '2026-10-01T12:00:00Z',
    },
    {
      id: 'item_3',
      mealId: 'meal_3',
      date: '2026-10-02',
      category: 'dinner',
      foodNameSnapshot: 'ซูชิแซลมอน',
      grams: 140,
      calories: 249,
      protein: 10.9,
      carbohydrates: 35.7,
      fat: 6.3,
      sourceSnapshot: 'international_reference',
      createdAt: '2026-10-02T18:00:00Z',
      updatedAt: '2026-10-02T18:00:00Z',
    },
  ];

  it('aggregates days correctly for a month', () => {
    const days = aggregateMonthData(2026, 10, mockMealItems);
    expect(days.length).toBe(31);

    const day1 = days.find((d) => d.date === '2026-10-01');
    expect(day1).toBeDefined();
    expect(day1?.mealCount).toBe(2);
    expect(day1?.totalCalories).toBe(782); // 248 + 534
    expect(day1?.totalProtein).toBe(81); // 46.5 + 34.5

    const day2 = days.find((d) => d.date === '2026-10-02');
    expect(day2?.mealCount).toBe(1);
    expect(day2?.totalCalories).toBe(249);

    const day3 = days.find((d) => d.date === '2026-10-03');
    expect(day3?.mealCount).toBe(0);
    expect(day3?.totalCalories).toBe(0);
  });

  it('generates a rich, well-formed Git Markdown report (.md)', () => {
    const markdown = generateMonthlyMarkdownReport({
      year: 2026,
      month: 10,
      mealItems: mockMealItems,
      goals: mockGoals,
      profile: mockProfile,
    });

    expect(markdown).toContain('# 📊 สรุปบันทึกโภชนาการประจำเดือน: ตุลาคม 2026');
    expect(markdown).toContain('Korawich');
    expect(markdown).toContain('2500 kcal/วัน');
    expect(markdown).toContain('## 📈 ภาพรวมประจำเดือน (Monthly Overview)');
    expect(markdown).toContain('## 📅 ตารางสรุปรายวัน (Daily Log Table)');
    expect(markdown).toContain('| 2026-10-01 |');
    expect(markdown).toContain('อกไก่ต้มสุก');
    expect(markdown).toContain('ข้าวมันไก่ต้ม');
    expect(markdown).toContain('## 📝 รายละเอียดเมนูอาหารรายวัน (Detailed Meal Breakdowns)');
    expect(markdown).toContain('มื้อเช้า (Breakfast)');
    expect(markdown).toContain('มื้อเที่ยง (Lunch)');
    expect(markdown).toContain('มื้อเย็น (Dinner)');
    expect(markdown).toContain('ซูชิแซลมอน');
  });

  it('generates structured monthly JSON archive', () => {
    const jsonStr = generateMonthlyJsonArchive({
      year: 2026,
      month: 10,
      mealItems: mockMealItems,
      goals: mockGoals,
      profile: mockProfile,
    });

    const parsed = JSON.parse(jsonStr);
    expect(parsed.app).toBe('nub-nutrition-tracker');
    expect(parsed.exportType).toBe('monthly_git_archive');
    expect(parsed.month).toBe('2026-10');
    expect(parsed.summary.daysInMonth).toBe(31);
    expect(parsed.summary.loggedDaysCount).toBe(2);
    expect(parsed.days.length).toBe(31);
  });
});

describe('Smart Time-Based & Snack Auto-Categorization', () => {
  it('categorizes main meals by Bangkok time of day', () => {
    // 08:30 Bangkok (+07:00) -> 01:30 UTC
    const morning = new Date('2026-10-26T08:30:00+07:00');
    expect(getMealCategoryByTime(morning)).toBe('breakfast');

    // 12:45 Bangkok (+07:00)
    const noon = new Date('2026-10-26T12:45:00+07:00');
    expect(getMealCategoryByTime(noon)).toBe('lunch');

    // 18:15 Bangkok (+07:00)
    const evening = new Date('2026-10-26T18:15:00+07:00');
    expect(getMealCategoryByTime(evening)).toBe('dinner');
  });

  it('accurately detects snacks, desserts, bakery items, and beverages', () => {
    expect(isSnackOrBeverageFood('เค้กช็อกโกแลตหน้านิ่ม')).toBe(true);
    expect(isSnackOrBeverageFood('ชานมไข่มุกหวานน้อย')).toBe(true);
    expect(isSnackOrBeverageFood('ขนมครกใบเตย')).toBe(true);
    expect(isSnackOrBeverageFood('บิงซูสตรอว์เบอร์รี่')).toBe(true);
    expect(isSnackOrBeverageFood('ข้าวเหนียวมะม่วง')).toBe(true);
    expect(isSnackOrBeverageFood('ครัวซองต์เนยสด')).toBe(true);

    // Main meals should NOT be flagged as snacks
    expect(isSnackOrBeverageFood('ข้าวมันไก่ต้ม')).toBe(false);
    expect(isSnackOrBeverageFood('ข้าวกะเพราหมูสับไข่ดาว')).toBe(false);
    expect(isSnackOrBeverageFood('ข้าวหน้าเนื้อกิวด้ง')).toBe(false);
    expect(isSnackOrBeverageFood('ซูชิแซลมอน')).toBe(false);
    expect(isSnackOrBeverageFood('ข้าวเหนียวหมูปิ้ง')).toBe(false);
  });

  it('resolves smart meal category: time-based for main meals, snacks for desserts, and respects manual override', () => {
    const lunchTime = new Date('2026-10-26T12:30:00+07:00');

    // Auto mode + main meal at 12:30 -> lunch
    expect(
      resolveSmartMealCategory({
        isAutoMode: true,
        manualCategory: 'breakfast',
        foodName: 'ข้าวมันไก่ต้ม',
        date: lunchTime,
      })
    ).toBe('lunch');

    // Auto mode + snack at 12:30 -> overrides to 'snacks'
    expect(
      resolveSmartMealCategory({
        isAutoMode: true,
        manualCategory: 'lunch',
        foodName: 'บราวนี่ช็อกโกแลต',
        date: lunchTime,
      })
    ).toBe('snacks');

    // Manual mode -> strictly respects user's manual selection even if it's a snack
    expect(
      resolveSmartMealCategory({
        isAutoMode: false,
        manualCategory: 'breakfast',
        foodName: 'ครัวซองต์อัลมอนด์',
        date: lunchTime,
      })
    ).toBe('breakfast');
  });
});
