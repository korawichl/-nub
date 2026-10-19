import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type {
  ActivityLog,
  ConfirmMealDraft,
  FoodCatalogItem,
  MealCategory,
  MealItem,
  NutritionGoals,
  UserProfile,
} from '../types';
import {
  formatDisplayDate,
  getBangkokDateString,
  shiftDateString,
} from '../utils/date';
import { calculateDailySummary } from '../utils/nutritionCalculator';
import {
  addActivityLogEntry,
  addCatalogFoodToMeal,
  deleteMealItem,
} from '../db/database';
import {
  Camera,
  Plus,
  Utensils,
  Trash2,
  Edit3,
  Scale,
  Dumbbell,
  Droplets,
  Flame,
  ArrowUpRight,
  Search,
  ChevronDown,
  Download,
  MoreHorizontal,
  MinusCircle,
  Check,
  Wheat,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface TodayDashboardProps {
  todayItems: MealItem[];
  allMealItems: MealItem[];
  todayActivities: ActivityLog[];
  goals: NutritionGoals;
  profile: UserProfile;
  frequentFoods: FoodCatalogItem[];
  onNavigateToDiary: (category?: MealCategory) => void;
  onNavigateToScanner: () => void;
  onOpenConfirmMeal: (draft: ConfirmMealDraft) => void;
  onEditMealItem: (item: MealItem) => void;
  onQuickLogWeight: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  todayItems,
  allMealItems,
  todayActivities,
  goals,
  profile,
  frequentFoods,
  onNavigateToDiary,
  onNavigateToScanner,
  onOpenConfirmMeal,
  onEditMealItem,
  onQuickLogWeight,
}) => {
  const todayBangkok = getBangkokDateString();
  const summary = calculateDailySummary(todayItems, {
    calorieTarget: goals.calorieTarget,
    proteinTargetG: goals.proteinTargetG,
    carbsTargetG: goals.carbsTargetG,
    fatTargetG: goals.fatTargetG,
  });

  // Water calculations
  const consumedWaterMl = todayActivities
    .filter((a) => a.activityType === 'water')
    .reduce((sum, a) => sum + (a.waterMl || a.durationMinutes || 0), 0);
  const waterTargetMl = goals.waterTargetMl || 3000;

  // Workouts logged today
  const workoutLogs = todayActivities.filter((a) => a.activityType !== 'water');

  // Search & Filter state for the Manage Food Log table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealCategory, setSelectedMealCategory] = useState<string>('All');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Quick Activity State
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutType, setWorkoutType] = useState('Swimming (ว่ายน้ำ)');
  const [workoutDuration, setWorkoutDuration] = useState('45');

  // Build 7-day history for the Recharts Bar Chart
  const last7Days = Array.from({ length: 7 }, (_, idx) =>
    shiftDateString(todayBangkok, -(6 - idx))
  );

  const weeklyChartData = last7Days.map((dateStr) => {
    const items = allMealItems.filter((i) => i.date === dateStr);
    const kcal = Math.round(items.reduce((s, x) => s + x.calories, 0));
    const protein = Math.round(items.reduce((s, x) => s + x.protein, 0));
    const isToday = dateStr === todayBangkok;
    // Format day name: e.g. Mon, Tue, etc.
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      dateStr,
      dayLabel: isToday ? 'Today' : dayLabel,
      consumedKcal: kcal,
      targetKcal: goals.calorieTarget,
      protein,
      isToday,
    };
  });

  // Table Filtering
  const filteredItems = useMemo(() => {
    return todayItems.filter((item) => {
      const matchSearch = item.foodNameSnapshot
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchCat =
        selectedMealCategory === 'All' || item.category === selectedMealCategory;
      return matchSearch && matchCat;
    });
  }, [todayItems, searchQuery, selectedMealCategory]);

  // Real CSV Export for Today's Meals
  const handleExportCSV = () => {
    if (todayItems.length === 0) {
      alert('No food items logged today to export.');
      return;
    }

    const itemsToExport =
      selectedItemIds.length > 0
        ? todayItems.filter((i) => selectedItemIds.includes(i.id))
        : filteredItems;

    const headers = [
      'Food Name',
      'Meal Category',
      'Portion (g)',
      'Calories (kcal)',
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
      'Logged Date',
      'Source',
    ];

    const rows = itemsToExport.map((i) => [
      `"${i.foodNameSnapshot.replace(/"/g, '""')}"`,
      i.category,
      i.grams,
      Math.round(i.calories),
      i.protein,
      i.carbohydrates,
      i.fat,
      i.date,
      i.sourceSnapshot,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `nubcal-meals-${todayBangkok}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Action Handlers
  const handleQuickWater = async (amountMl: number) => {
    await addActivityLogEntry({
      date: todayBangkok,
      activityType: 'water',
      durationMinutes: 0,
      estimatedCaloriesBurned: 0,
      waterMl: amountMl,
      notes: `Quick hydration +${amountMl}ml`,
    });
  };

  const handleCustomWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(workoutDuration, 10) || 30;
    const estimatedBurn = Math.round(duration * 7.5);

    await addActivityLogEntry({
      date: todayBangkok,
      activityType: workoutType,
      durationMinutes: duration,
      estimatedCaloriesBurned: estimatedBurn,
      notes: `Logged workout: ${workoutType}`,
    });

    setShowWorkoutForm(false);
  };

  const handleQuickAddCatalog = async (food: FoodCatalogItem) => {
    await addCatalogFoodToMeal(
      food,
      food.defaultServingGrams,
      todayBangkok,
      'lunch'
    );
  };

  // Selection Handlers
  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((i) => selectedItemIds.includes(i.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedItemIds.length} food logs?`)) {
      for (const id of selectedItemIds) {
        await deleteMealItem(id);
      }
      setSelectedItemIds([]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* =========================================================================
          1. TOP SECTION: QUICK STATS (6 ROUNDED PILL CARDS IN A ROW)
          Exact translation of Jobgio's 6 top cards into Nubcal nutrition metrics!
         ========================================================================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#171717] tracking-tight">Quick Stats</h2>
            <p className="text-xs text-[#858585] mt-0.5">
              Your nutrition & calorie budget for {formatDisplayDate(todayBangkok)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* Card 1: Remaining Calories */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center transition-transform group-hover:scale-105">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {Math.round(summary.remainingCalories).toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Remaining kcal
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">Budget Balance</div>
          </div>

          {/* Card 2: Consumed Calories */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center transition-transform group-hover:scale-105">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-800 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {Math.round(summary.consumedCalories).toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Consumed kcal
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">
              {Math.round((summary.consumedCalories / goals.calorieTarget) * 100)}% of goal
            </div>
          </div>

          {/* Card 3: Calorie Target / Active Burn (Highlighted Black Circular Icon with Arrow) */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {goals.calorieTarget.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Daily Target kcal
              </span>
            </div>
            <div className="mt-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black transition-colors" />
            </div>
          </div>

          {/* Card 4: Protein */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center transition-transform group-hover:scale-105">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {Math.round(summary.consumedProtein)}g
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Protein / {goals.proteinTargetG}g
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">Muscle Builder</div>
          </div>

          {/* Card 5: Carbs & Fat */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center transition-transform group-hover:scale-105">
              <Wheat className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {Math.round(summary.consumedCarbs)}g / {Math.round(summary.consumedFat)}g
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Carbs & Fat
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">Daily Energy</div>
          </div>

          {/* Card 6: Water Intake */}
          <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white border border-[#EEEEEE] rounded-[18px] sm:rounded-[22px] min-h-[118px] sm:min-h-[148px] shadow-xs hover:border-neutral-300 transition-all text-center group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center transition-transform group-hover:scale-105">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 stroke-[2.2]" />
            </div>
            <div className="flex flex-col items-center mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
                {(consumedWaterMl / 1000).toFixed(1)}L
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                Water / {(waterTargetMl / 1000).toFixed(1)}L
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-neutral-400 font-medium">Hydration</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MIDDLE SECTION: STATISTICS GROUPED BAR CHART + QUICK ACTIONS CARD
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recharts 7-Day Grouped Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#171717] tracking-tight">
                7-Day Intake Statistics
              </h3>
              <p className="text-xs text-[#858585]">
                Calorie intake compared to your daily budget
              </p>
            </div>

            {/* Legend matching Jobgio */}
            <div className="flex items-center gap-4 text-xs font-medium text-[#858585]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#171717]"></span>
                <span>Consumed kcal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4D4D8]"></span>
                <span>Daily Target</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData}
                margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858585', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858585', fontSize: 11 }}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v}`)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#111111] text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-neutral-800">
                          <p className="font-semibold text-neutral-300 mb-1">{label}</p>
                          <p className="text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                            <span>Consumed:</span>
                            <span className="font-bold">{payload[0].value} kcal</span>
                          </p>
                          <p className="text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block"></span>
                            <span>Target:</span>
                            <span className="font-bold text-neutral-300">{payload[1].value} kcal</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Consumed Calories - Near Black Bars */}
                <Bar
                  dataKey="consumedKcal"
                  fill="#171717"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                />

                {/* Daily Target - Soft Gray Bars */}
                <Bar
                  dataKey="targetKcal"
                  fill="#D4D4D8"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Signature Black Pill Pin Callout above today's bar */}
            <div
              className="absolute pointer-events-none flex flex-col items-center"
              style={{
                left: '92%',
                top: '6px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-[#111111] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md tracking-tight whitespace-nowrap">
                {Math.round(summary.consumedCalories)} kcal
              </div>
              <div className="w-1.5 h-1.5 bg-[#111111] rounded-full mt-0.5"></div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions & Sessions (Jobgio "Pending Approvals" style) */}
        <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#171717] tracking-tight">
              Quick Actions & Logs
            </h3>
            <button
              type="button"
              className="text-[#858585] hover:text-[#171717] transition-colors"
              title="Quick Log"
            >
              <MinusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#F5F5F5] flex-1 justify-center">
            {/* Row 1: AI Camera Scanner */}
            <div
              onClick={onNavigateToScanner}
              className="flex items-center justify-between py-3 group cursor-pointer hover:bg-neutral-50/80 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#171717] group-hover:text-black">
                    AI Photo Food Scan
                  </span>
                  <span className="text-[11px] text-[#858585]">
                    Scan dish or nutrition label
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Ready</span>
              </span>
            </div>

            {/* Row 2: Water Quick Add */}
            <div className="flex items-center justify-between py-3 group -mx-2 px-2 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#171717]">
                    Hydration Log
                  </span>
                  <span className="text-[11px] text-[#858585]">
                    {consumedWaterMl} / {waterTargetMl} ml
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickWater(250)}
                  className="px-2 py-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickWater(500)}
                  className="px-2 py-1 text-[11px] font-semibold text-white bg-black hover:bg-neutral-800 rounded-full shadow-2xs"
                >
                  +500ml
                </button>
              </div>
            </div>

            {/* Row 3: Workout Session */}
            <div className="flex items-center justify-between py-3 group -mx-2 px-2 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#171717]">
                    Workout Activity
                  </span>
                  <span className="text-[11px] text-[#858585]">
                    {workoutLogs.length} sessions logged
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkoutForm(!showWorkoutForm)}
                className="text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1 rounded-full"
              >
                {showWorkoutForm ? 'Close' : '+ Log'}
              </button>
            </div>
          </div>

          {/* Quick Workout Form */}
          {showWorkoutForm && (
            <form onSubmit={handleCustomWorkoutSubmit} className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value="Swimming (ว่ายน้ำ)">Swimming</option>
                  <option value="Weight Training (เวทเทรนนิ่ง)">Weights</option>
                  <option value="Running (วิ่ง)">Running</option>
                  <option value="Cycling (ปั่นจักรยาน)">Cycling</option>
                </select>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                  placeholder="Minutes"
                  className="text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-full"
              >
                Save Workout
              </button>
            </form>
          )}

          {/* Weight Log pill button */}
          <div className="pt-3 border-t border-[#F5F5F5] flex items-center justify-between text-xs text-neutral-500">
            <span>Goal: {profile.initialWeightKg} → {profile.targetWeightKg} kg</span>
            <button
              type="button"
              onClick={onQuickLogWeight}
              className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Weigh In</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BOTTOM SECTION: MANAGE FOOD LOGS TABLE (JOBGIO "MANAGE JOBS" STYLE)
         ========================================================================= */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col gap-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#171717] tracking-tight">
                Manage Food Logs
              </h3>
              <p className="text-xs text-[#858585] mt-0.5">
                {todayItems.length} meal items recorded today ({formatDisplayDate(todayBangkok)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToDiary()}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Diary</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food name..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F9F9F9] border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white w-40 sm:w-48 transition-all"
              />
            </div>

            {/* Meal Category Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#171717] bg-white border border-[#EEEEEE] rounded-full hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                <span>{selectedMealCategory === 'All' ? 'Meal Type' : selectedMealCategory}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-neutral-200 rounded-2xl shadow-xl py-1 z-30">
                  {['All', 'breakfast', 'lunch', 'dinner', 'snacks'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedMealCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 capitalize"
                    >
                      <span>{cat}</span>
                      {selectedMealCategory === cat && <Check className="w-3 h-3 text-black" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export CSV Button matching Jobgio */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
            >
              <span>Export</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Add Custom Meal */}
            <button
              type="button"
              onClick={() =>
                onOpenConfirmMeal({
                  foodName: '',
                  ingredients: '',
                  servingGrams: 150,
                  calories: 0,
                  protein: 0,
                  carbohydrates: 0,
                  fat: 0,
                  category: 'lunch',
                  source: 'user_custom',
                  requiresExplicitConfirmation: false,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#171717] bg-[#F5F5F5] hover:bg-neutral-200 rounded-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Actions */}
        {selectedItemIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 text-white rounded-2xl text-xs">
            <span>{selectedItemIds.length} items selected</span>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-600 rounded-full flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
          </div>
        )}

        {/* Mobile Food List Cards (Shown strictly on mobile < 640px) */}
        <div className="block sm:hidden flex flex-col divide-y divide-[#F5F5F5] -mx-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No food entries recorded yet for today. Use AI Scan or Quick Add above!
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="py-3 px-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                    <Utensils className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#171717] truncate">
                        {item.foodNameSnapshot}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                          item.category === 'breakfast'
                            ? 'bg-amber-50 text-amber-700'
                            : item.category === 'lunch'
                            ? 'bg-blue-50 text-blue-700'
                            : item.category === 'dinner'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#858585] mt-0.5">
                      {item.grams}g · P:{item.protein}g C:{item.carbohydrates}g F:{item.fat}g
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-[#171717]">
                    {Math.round(item.calories)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditMealItem(item)}
                    className="p-1 text-neutral-400 hover:text-black"
                    title="Edit item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => await deleteMealItem(item.id)}
                    className="p-1 text-rose-400 hover:text-rose-600"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / Tablet Table Container (Hidden on mobile < 640px) */}
        <div className="hidden sm:block overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-xs text-[#171717] border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-[#858585] font-medium text-[11px]">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Food Item</th>
                <th className="py-3 px-3">Meal Category</th>
                <th className="py-3 px-3">Portion</th>
                <th className="py-3 px-3">Macros (P · C · F)</th>
                <th className="py-3 px-3">Calories</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F8F8]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No food entries recorded yet for today. Use AI Scan or Quick Add above!
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const isActionOpen = actionMenuOpenId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FAFAFA] transition-colors ${
                        isSelected ? 'bg-neutral-50/70' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold text-xs shrink-0">
                            <Utensils className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-semibold text-[#171717] block">
                              {item.foodNameSnapshot}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {item.sourceSnapshot === 'ai_confirmed' ? 'AI Vision' : 'Manual Entry'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            item.category === 'breakfast'
                              ? 'bg-amber-50 text-amber-700'
                              : item.category === 'lunch'
                              ? 'bg-blue-50 text-blue-700'
                              : item.category === 'dinner'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[#858585]">{item.grams}g</td>

                      <td className="py-3 px-3 text-[#858585]">
                        <span className="text-neutral-900 font-medium">P: {item.protein}g</span> · C:{' '}
                        {item.carbohydrates}g · F: {item.fat}g
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#171717]">
                        {Math.round(item.calories)} kcal
                      </td>

                      <td className="py-3 px-3 text-right relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(isActionOpen ? null : item.id)
                          }
                          className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isActionOpen && (
                          <div className="absolute right-3 top-8 w-28 bg-white border border-neutral-200 rounded-xl shadow-xl py-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                onEditMealItem(item);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteMealItem(item.id);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Quick-Log Thai Foods Pills underneath Table */}
        <div className="pt-3 border-t border-[#F5F5F5] flex flex-col gap-2">
          <span className="text-xs font-bold text-neutral-700">
            Quick-Log อาหารไทยยอดนิยม (1-Tap):
          </span>
          <div className="flex flex-wrap gap-2">
            {frequentFoods.slice(0, 8).map((food) => {
              const servingKcal = Math.round(
                (food.caloriesPer100g * food.defaultServingGrams) / 100
              );
              const shortName = food.name.split('/')[0].trim();
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => handleQuickAddCatalog(food)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-[#F5F5F5] hover:bg-neutral-200 text-[#171717] rounded-full transition-colors"
                >
                  <Plus className="w-3 h-3 text-neutral-500" />
                  <span>{shortName}</span>
                  <span className="text-neutral-400 text-[10px]">({servingKcal} kcal)</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
