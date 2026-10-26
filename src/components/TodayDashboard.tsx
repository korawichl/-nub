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
  AppSettings,
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
import {
  calculateDailySummary,
  calculateStreak,
  calculateEnergyBalance,
} from '../utils/nutritionCalculator';
import { getFoodAnalysisProvider } from '../services/aiProvider';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ShareSummaryModal } from './ShareSummaryModal';
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
  Search,
  ChevronDown,
  Download,
  MoreHorizontal,
  MinusCircle,
  Check,
  Sparkles,
  BookOpen,
  Mic,
  MicOff,
  ScanBarcode,
  Share2,
  AlertTriangle,
  Loader2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface TodayDashboardProps {
  todayItems: MealItem[];
  allMealItems: MealItem[];
  todayActivities: ActivityLog[];
  goals: NutritionGoals;
  profile: UserProfile;
  frequentFoods: FoodCatalogItem[];
  settings?: AppSettings;
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
  settings,
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

  // Dynamic Streak calculation from real logged meal dates
  const streakDays = useMemo(() => {
    return calculateStreak(
      allMealItems.map((m) => m.date),
      todayBangkok
    );
  }, [allMealItems, todayBangkok]);

  // Water calculations
  const consumedWaterMl = todayActivities
    .filter((a) => a.activityType === 'water')
    .reduce((sum, a) => sum + (a.waterMl || a.durationMinutes || 0), 0);
  const waterTargetMl = goals.waterTargetMl || 3000;

  // Workouts logged today & Energy Balance (Deficit / Surplus calculation)
  const workoutLogs = todayActivities.filter((a) => a.activityType !== 'water');
  const totalWorkoutBurn = workoutLogs.reduce(
    (sum, w) => sum + (w.estimatedCaloriesBurned || 0),
    0
  );
  const tdee = goals.estimatedTdee || goals.calorieTarget || 2000;
  const energyBalance = calculateEnergyBalance(
    summary.consumedCalories,
    tdee,
    totalWorkoutBurn
  );

  // Modals state
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Natural Language / Voice AI Prompt State
  const [textPrompt, setTextPrompt] = useState('');
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptError, setAiPromptError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Custom Water amount input
  const [customWaterMl, setCustomWaterMl] = useState('300');

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

  // Voice Speech Recognition Handler
  const toggleSpeechRecognition = () => {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert(
        'Speech recognition is not supported in this browser. Please type your meal or use Chrome/Safari.'
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'th-TH'; // Primary Thai with multilingual support
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setTextPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Natural Language AI Food Logging
  const handleRunTextAiPrompt = async (overridePrompt?: string) => {
    const query = (overridePrompt || textPrompt).trim();
    if (!query) return;

    setAiPromptLoading(true);
    setAiPromptError(null);

    try {
      const effectiveProviderId =
        !settings?.aiProviderId || settings.aiProviderId === 'none'
          ? 'free_builtin'
          : settings.aiProviderId;
      const provider = getFoodAnalysisProvider(
        effectiveProviderId,
        settings?.aiBackendEndpoint,
        settings?.geminiApiKey,
        settings?.geminiModel,
        settings?.groqApiKey
      );

      if (!provider.analyzeTextPrompt) {
        throw new Error('AI text prompt analysis is not supported by the configured provider.');
      }

      const result = await provider.analyzeTextPrompt(query);
      setTextPrompt('');

      const ingredientsText =
        result.identifiedFoodItems && result.identifiedFoodItems.length > 0
          ? result.identifiedFoodItems
              .map((i) => `${i.name} (~${i.estimatedGrams}g)`)
              .join(', ')
          : query;

      onOpenConfirmMeal({
        foodName: result.mealName,
        ingredients: ingredientsText,
        servingGrams: result.estimatedWeightGrams,
        calories: result.estimatedCalories,
        protein: result.protein,
        carbohydrates: result.carbohydrates,
        fat: result.fat,
        sodiumMg: result.sodiumMg,
        sugarG: result.sugarG,
        category: 'lunch',
        source: 'ai_confirmed',
        uncertainties: result.uncertainties,
        assumptions: result.assumptions,
        requiresExplicitConfirmation: true,
      });
    } catch (err) {
      setAiPromptError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze text prompt with AI.'
      );
    } finally {
      setAiPromptLoading(false);
    }
  };

  // Quick Action Handlers
  const handleQuickWater = async (amountMl: number) => {
    if (amountMl <= 0) return;
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
          0. TOP UTILITY BAR: USER PROFILE, STREAK BADGE & QUICK ACCESS MODAL BUTTONS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E9EAF2] rounded-[24px] p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src="/user-avatar.webp"
              alt="User"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#6258F5]/40 shadow-xs"
            />
            <span className="absolute -bottom-1 -right-1 bg-[#6258F5] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ring-2 ring-white">
              🔥{streakDays}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#20243A] truncate">
                สวัสดี {profile.name || 'Korawich'} 👋
              </span>
              <span className="text-[10px] font-semibold text-[#6258F5] bg-[#EFEDFF] px-2 py-0.5 rounded-full hidden xs:inline">
                {streakDays} Days Streak
              </span>
            </div>
            <span className="text-xs text-[#858BA0]">
              {formatDisplayDate(todayBangkok)} • บันทึกแล้ว {todayItems.length} รายการ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Barcode Scanner Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6258F5] bg-[#F0F4FF] hover:bg-[#EFEDFF] rounded-full border border-[#6258F5]/20 transition-all hover:scale-[1.02] shadow-2xs"
          >
            <ScanBarcode className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Barcode</span>
          </button>

          {/* Share Daily Summary Card Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#20243A] bg-[#F6F7FB] hover:bg-[#E9EAF2] rounded-full border border-[#E9EAF2] transition-all hover:scale-[1.02]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          {/* Calendar & Git History */}
          <button
            type="button"
            onClick={() => onNavigateToDiary()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#6258F5] hover:bg-[#756BFF] rounded-full transition-all hover:scale-[1.02] shadow-sm shadow-[#6258F5]/25"
          >
            <Calendar className="w-3.5 h-3.5 text-white" />
            <span>ปฏิทิน & Git</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          0.5 NATURAL LANGUAGE & VOICE AI FOOD LOGGING BAR
         ========================================================================= */}
      <div className="bg-white border border-[#6258F5]/25 rounded-[24px] p-4 sm:p-5 shadow-xs flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#EFEDFF] text-[#6258F5] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#20243A]">AI Quick Food Logger</h3>
              <p className="text-[11px] text-[#858BA0]">
                พิมพ์หรือกดไมค์พูดเมนูอาหาร ระบบคำนวณสารอาหารและแคลอรี่ให้อัตโนมัติ
              </p>
            </div>
          </div>
          {isListening && (
            <span className="text-[11px] font-bold text-[#EB6478] bg-[#FFF0F2] px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 border border-[#EB6478]/30">
              <span className="w-2 h-2 rounded-full bg-[#EB6478]"></span>
              กำลังฟังเสียงพูดของคุณ...
            </span>
          )}
        </div>

        {/* Input & Voice Controls */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunTextAiPrompt();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="เช่น 'ข้าวกะเพราหมูสับไข่ดาว + ชานมหวานน้อย' หรือ 'อกไก่ต้ม 200g กับข้าวกล้อง'..."
              aria-label="พิมพ์หรือพูดชื่อเมนูอาหารเพื่อวิเคราะห์ด้วย AI"
              disabled={aiPromptLoading}
              className="w-full pl-4 pr-11 py-2.5 text-xs bg-[#F6F7FB] border border-[#E9EAF2] rounded-xl text-[#20243A] placeholder:text-[#858BA0] focus:outline-none focus:border-[#6258F5] focus:bg-white transition-all"
            />
            {/* Voice Mic Button inside input */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              title={isListening ? 'Stop recording' : 'Speak meal in Thai / English'}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                isListening
                  ? 'bg-[#EB6478] text-white animate-pulse ring-2 ring-[#EB6478]/40'
                  : 'text-[#858BA0] hover:text-[#6258F5] hover:bg-[#EFEDFF]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={aiPromptLoading || !textPrompt.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#6258F5] hover:bg-[#756BFF] disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-[#6258F5]/25 flex items-center justify-center gap-2 shrink-0"
          >
            {aiPromptLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI กำลังวิเคราะห์...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI บันทึกทันที</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-[#858BA0]">ตัวอย่างคลิกไว:</span>
          {[
            'ข้าวกะเพราหมูสับไข่ดาว',
            'ส้มตำไทย + อกไก่ย่าง',
            'เวย์โปรตีน 1 scoop + กล้วยหอม',
            'ชาเขียวมัทฉะลาเต้หวาน 25%',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setTextPrompt(sample);
                handleRunTextAiPrompt(sample);
              }}
              className="text-[11px] font-medium text-[#20243A] bg-[#F0F4FF] hover:bg-[#EFEDFF] hover:text-[#6258F5] px-2.5 py-1 rounded-lg border border-[#E9EAF2] transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* AI Error Alert */}
        {aiPromptError && (
          <div className="p-3 bg-[#FFF0F2] border border-[#EB6478]/30 rounded-xl flex items-start gap-2 text-xs text-[#EB6478]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{aiPromptError}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          1. TOP SECTION: QUICK STATS (6 ROUNDED PILL CARDS IN A ROW)
         ========================================================================= */}
      {/* =========================================================================
          1. UNIFIED BENTO HERO: ENERGY & MACRO PROTAGONIST HUB
         ========================================================================= */}
      <div className="bg-white border border-[#E9EAF2] rounded-[28px] p-5 sm:p-6 shadow-xs flex flex-col gap-5">
        {/* Top Header of Bento */}
        <div className="flex items-center justify-between border-b border-[#E9EAF2] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6258F5] animate-pulse"></span>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#20243A]">
              Daily Energy & Nutrition Hub
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                energyBalance.status === 'deficit'
                  ? 'bg-[#E8F8F2] text-[#27AE82]'
                  : energyBalance.status === 'surplus'
                  ? 'bg-[#FEF7E8] text-[#D9961A]'
                  : 'bg-[#EFEDFF] text-[#6258F5]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>
                {energyBalance.status === 'deficit'
                  ? `Deficit ~${energyBalance.estimatedFatChangeGrams}g burn`
                  : energyBalance.status === 'surplus'
                  ? `Surplus +${energyBalance.estimatedFatChangeGrams}g`
                  : 'Balanced'}
              </span>
            </span>
          </div>
        </div>

        {/* Center Grid: Hero Calorie Gauge (Left) + 3 Macro Pillars (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Hero: Circular Calorie Gauge (7 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* SVG Circular Progress Gauge */}
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-[#F0F2F8]"
                  strokeWidth="10"
                  fill="none"
                />
                {/* Active Consumed Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={
                    summary.consumedCalories > goals.calorieTarget
                      ? '#EB6478'
                      : '#6258F5'
                  }
                  strokeWidth="10"
                  strokeDasharray={314.16}
                  strokeDashoffset={
                    314.16 *
                    (1 -
                      Math.min(
                        1,
                        summary.consumedCalories / (goals.calorieTarget || 1)
                      ))
                  }
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Inside the Gauge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#858BA0]">
                  Remaining
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#20243A] tabular-nums leading-tight">
                  {Math.round(summary.remainingCalories).toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-[#6258F5]">
                  kcal
                </span>
              </div>
            </div>

            {/* Calorie Stats Breakdown next to Gauge */}
            <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7FB] border border-[#E9EAF2]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EFEDFF] text-[#6258F5] flex items-center justify-center shrink-0">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#858BA0]">ทานแล้ว</span>
                </div>
                <span className="text-xs font-bold text-[#20243A] tabular-nums">
                  {Math.round(summary.consumedCalories).toLocaleString()} kcal
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F7FB] border border-[#E9EAF2]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#6258F5] text-white flex items-center justify-center shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#858BA0]">เป้าหมาย</span>
                </div>
                <span className="text-xs font-bold text-[#20243A] tabular-nums">
                  {goals.calorieTarget.toLocaleString()} kcal
                </span>
              </div>

              <div className="text-[11px] text-[#858BA0] flex items-center justify-between px-1">
                <span>ความคืบหน้า</span>
                <span className="font-bold text-[#6258F5] tabular-nums">
                  {Math.round((summary.consumedCalories / (goals.calorieTarget || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero: The 3 Clean Macro Pillars (Protein, Carbs, Fat) (5 cols) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-3.5 border-t lg:border-t-0 lg:border-l border-[#E9EAF2] pt-4 lg:pt-0 lg:pl-6">
            <span className="text-xs font-bold text-[#858BA0] uppercase tracking-wider">
              Macronutrient Target
            </span>

            {/* Protein */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#20243A] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6258F5]"></span>
                  <span>Protein (โปรตีน)</span>
                </span>
                <span className="font-bold text-[#20243A] tabular-nums">
                  {Math.round(summary.consumedProtein)}g{' '}
                  <span className="text-[#858BA0] font-normal">/ {goals.proteinTargetG}g</span>
                </span>
              </div>
              <div className="w-full bg-[#F0F2F8] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#6258F5] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((summary.consumedProtein / (goals.proteinTargetG || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Carbohydrates */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#20243A] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                  <span>Carbs (คาร์โบไฮเดรต)</span>
                </span>
                <span className="font-bold text-[#20243A] tabular-nums">
                  {Math.round(summary.consumedCarbs)}g{' '}
                  <span className="text-[#858BA0] font-normal">/ {goals.carbsTargetG}g</span>
                </span>
              </div>
              <div className="w-full bg-[#F0F2F8] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((summary.consumedCarbs / (goals.carbsTargetG || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#20243A] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                  <span>Fat (ไขมัน)</span>
                </span>
                <span className="font-bold text-[#20243A] tabular-nums">
                  {Math.round(summary.consumedFat)}g{' '}
                  <span className="text-[#858BA0] font-normal">/ {goals.fatTargetG}g</span>
                </span>
              </div>
              <div className="w-full bg-[#F0F2F8] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((summary.consumedFat / (goals.fatTargetG || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: 3 Quiet Health Micro-Stats (Water, Sodium, Sugar) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-[#E9EAF2]">
          {/* Water Hydration */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F7FB] border border-[#E9EAF2]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#20243A] tabular-nums">
                  {(consumedWaterMl / 1000).toFixed(1)}L / {(waterTargetMl / 1000).toFixed(1)}L
                </span>
                <span className="text-[10px] text-[#858BA0]">น้ำดื่มวันนี้</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickWater(250)}
                className="text-[10px] font-bold text-[#3B82F6] bg-white hover:bg-[#EFF6FF] px-2 py-1 rounded-lg border border-[#E9EAF2] transition-colors"
                title="ดื่มน้ำแก้วเล็ก +250ml"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() => handleQuickWater(500)}
                className="text-[10px] font-bold text-[#3B82F6] bg-white hover:bg-[#EFF6FF] px-2 py-1 rounded-lg border border-[#E9EAF2] transition-colors"
                title="ดื่มน้ำขวด +500ml"
              >
                +500ml
              </button>
            </div>
          </div>

          {/* Sodium */}
          <div className="flex flex-col justify-between p-3 rounded-2xl bg-[#F6F7FB] border border-[#E9EAF2] gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6258F5]" />
                <span className="text-xs font-bold text-[#20243A]">Sodium (โซเดียม)</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  summary.consumedSodiumMg > 2000
                    ? 'bg-[#FFF0F2] text-[#EB6478]'
                    : 'bg-[#E8F8F2] text-[#27AE82]'
                }`}
              >
                {summary.consumedSodiumMg > 2000 ? 'เกินเกณฑ์ WHO' : 'ปกติ'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs tabular-nums font-semibold text-[#20243A]">
              <span>{summary.consumedSodiumMg.toLocaleString()} mg</span>
              <span className="text-[10px] text-[#858BA0] font-normal">เกณฑ์: 2,000 mg</span>
            </div>
          </div>

          {/* Sugar */}
          <div className="flex flex-col justify-between p-3 rounded-2xl bg-[#F6F7FB] border border-[#E9EAF2] gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-xs font-bold text-[#20243A]">Sugar (น้ำตาล)</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  summary.consumedSugarG > 24
                    ? 'bg-[#FFF0F2] text-[#EB6478]'
                    : 'bg-[#E8F8F2] text-[#27AE82]'
                }`}
              >
                {summary.consumedSugarG > 24 ? 'เกิน 6 ช้อนชา' : 'ปกติ'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs tabular-nums font-semibold text-[#20243A]">
              <span>{summary.consumedSugarG} g</span>
              <span className="text-[10px] text-[#858BA0] font-normal">เกณฑ์: 24 g</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MIDDLE SECTION: STATISTICS GROUPED BAR CHART + QUICK ACTIONS CARD
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recharts 7-Day Grouped Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E9EAF2] rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#20243A] tracking-tight">
                7-Day Intake Statistics
              </h3>
              <p className="text-xs text-[#858BA0]">
                Calorie intake over the past 7 days
              </p>
            </div>

            {/* Legend - Consumed Only */}
            <div className="flex items-center gap-4 text-xs font-medium text-[#858BA0]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6258F5]"></span>
                <span className="font-semibold text-[#20243A]">Consumed kcal</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData}
                margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EAF2" />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858BA0', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858BA0', fontSize: 11 }}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v}`)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(98, 88, 245, 0.04)' }}
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#17213D] text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-[#20243A]">
                          <p className="font-semibold text-[#EFEDFF] mb-1">{label}</p>
                          <p className="text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#756BFF] inline-block"></span>
                            <span>Consumed:</span>
                            <span className="font-bold">{payload[0].value} kcal</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Consumed Calories - Primary Purple Bars */}
                <Bar
                  dataKey="consumedKcal"
                  fill="#6258F5"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Primary Purple Pill Pin Callout above today's bar */}
            <div
              className="absolute pointer-events-none flex flex-col items-end"
              style={{
                right: '10px',
                top: '6px',
              }}
            >
              <div className="bg-[#6258F5] text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow-md shadow-[#6258F5]/25 tracking-tight whitespace-nowrap">
                Today: {Math.round(summary.consumedCalories)} kcal
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions & Sessions */}
        <div className="bg-white border border-[#E9EAF2] rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#20243A] tracking-tight">
              Quick Actions & Logs
            </h3>
            <button
              type="button"
              className="text-[#858BA0] hover:text-[#6258F5] transition-colors"
              title="Quick Log"
            >
              <MinusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#E9EAF2] flex-1 justify-center">
            {/* Row 1: AI Camera Scanner */}
            <div
              onClick={onNavigateToScanner}
              className="flex items-center justify-between py-3 group cursor-pointer hover:bg-[#F6F7FB] -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#6258F5] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#6258F5]/25">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#20243A] group-hover:text-[#6258F5] transition-colors">
                    AI Photo Food Scan
                  </span>
                  <span className="text-[11px] text-[#858BA0]">
                    Scan dish or nutrition label
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-[#27AE82] bg-[#E8F8F2] px-2.5 py-0.5 rounded-full border border-[#27AE82]/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Ready</span>
              </span>
            </div>

            {/* Row 2: Water Quick Add & Custom Cups */}
            <div className="flex flex-col py-3 group -mx-2 px-2 rounded-xl gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#756BFF] text-white flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#20243A]">
                      Hydration Log
                    </span>
                    <span className="text-[11px] text-[#858BA0]">
                      {consumedWaterMl.toLocaleString()} / {waterTargetMl.toLocaleString()} ml ({Math.round((consumedWaterMl / waterTargetMl) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => handleQuickWater(250)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] active:scale-95 rounded-full transition-all"
                  >
                    +250ml
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickWater(500)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#6258F5] hover:bg-[#756BFF] active:scale-95 rounded-full shadow-2xs transition-all"
                  >
                    +500ml
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickWater(750)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] active:scale-95 rounded-full transition-all"
                  >
                    +750ml
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickWater(1500)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#756BFF] bg-[#F0F4FF] hover:bg-[#EFEDFF] active:scale-95 rounded-full transition-all"
                  >
                    +1.5L
                  </button>
                </div>
              </div>

              {/* Custom ml input with quick add */}
              <div className="flex items-center gap-1.5 pl-12">
                <div className="relative flex-1 max-w-[140px]">
                  <input
                    type="number"
                    min="10"
                    step="50"
                    value={customWaterMl}
                    onChange={(e) => setCustomWaterMl(e.target.value)}
                    placeholder="Custom ml"
                    className="w-full px-2.5 py-1 text-xs bg-[#F6F7FB] border border-[#E9EAF2] rounded-lg text-[#20243A] focus:outline-none focus:border-[#6258F5]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#858BA0]">ml</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const amt = parseInt(customWaterMl, 10);
                    if (amt > 0) {
                      handleQuickWater(amt);
                    }
                  }}
                  className="px-3 py-1 text-xs font-semibold text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Row 3: Workout Session */}
            <div className="flex items-center justify-between py-3 group -mx-2 px-2 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#17213D] text-white flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#20243A]">
                    Workout Activity
                  </span>
                  <span className="text-[11px] text-[#858BA0]">
                    {workoutLogs.length} sessions logged
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkoutForm(!showWorkoutForm)}
                className="text-xs font-medium text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] px-3 py-1 rounded-full transition-colors"
              >
                {showWorkoutForm ? 'Close' : '+ Log'}
              </button>
            </div>
          </div>

          {/* Quick Workout Form */}
          {showWorkoutForm && (
            <form onSubmit={handleCustomWorkoutSubmit} className="pt-3 border-t border-[#E9EAF2] flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="text-xs px-2 py-1.5 bg-[#F6F7FB] border border-[#E9EAF2] text-[#20243A] rounded-lg"
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
                  className="text-xs px-2 py-1.5 bg-[#F6F7FB] border border-[#E9EAF2] text-[#20243A] rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-semibold text-white bg-[#6258F5] hover:bg-[#756BFF] rounded-full transition-colors"
              >
                Save Workout
              </button>
            </form>
          )}

          {/* Weight Log pill button */}
          <div className="pt-3 border-t border-[#E9EAF2] flex items-center justify-between text-xs text-[#858BA0]">
            <span>Goal: {profile.initialWeightKg} → {profile.targetWeightKg} kg</span>
            <button
              type="button"
              onClick={onQuickLogWeight}
              className="text-xs font-semibold text-[#6258F5] hover:text-[#756BFF] hover:underline flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Weigh In</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BOTTOM SECTION: MANAGE FOOD LOGS TABLE
         ========================================================================= */}
      <div className="bg-white border border-[#E9EAF2] rounded-[24px] p-6 shadow-xs flex flex-col gap-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#20243A] tracking-tight">
                Manage Food Logs
              </h3>
              <p className="text-xs text-[#858BA0] mt-0.5">
                {todayItems.length} meal items recorded today ({formatDisplayDate(todayBangkok)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToDiary()}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] rounded-full transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Diary</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#858BA0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food name..."
                aria-label="ค้นหารายการอาหารที่บันทึกวันนี้"
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F6F7FB] border border-[#E9EAF2] text-[#20243A] rounded-full focus:outline-none focus:ring-2 focus:ring-[#6258F5] focus:bg-white w-40 sm:w-48 transition-all"
              />
            </div>

            {/* Meal Category Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#20243A] bg-white border border-[#E9EAF2] rounded-full hover:bg-[#F6F7FB] transition-colors shadow-2xs"
              >
                <span>{selectedMealCategory === 'All' ? 'Meal Type' : selectedMealCategory}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#858BA0]" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E9EAF2] rounded-2xl shadow-xl py-1 z-30">
                  {['All', 'breakfast', 'lunch', 'dinner', 'snacks'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedMealCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#20243A] hover:bg-[#F0F4FF] capitalize"
                    >
                      <span>{cat}</span>
                      {selectedMealCategory === cat && <Check className="w-3 h-3 text-[#6258F5]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#6258F5] hover:bg-[#756BFF] rounded-full transition-colors shadow-xs shadow-[#6258F5]/20"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#6258F5] bg-[#EFEDFF] hover:bg-[#E2DFFF] rounded-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Actions */}
        {selectedItemIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#17213D] text-white rounded-2xl text-xs">
            <span>{selectedItemIds.length} items selected</span>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-[#EB6478] hover:bg-[#D95367] rounded-full flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
          </div>
        )}

        {/* Mobile Food List Cards (Shown strictly on mobile < 640px) */}
        <div className="block sm:hidden flex flex-col divide-y divide-[#E9EAF2] -mx-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#858BA0]">
              No food entries recorded yet for today. Use AI Scan or Quick Add above!
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="py-3 px-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-[#EFEDFF] flex items-center justify-center text-[#6258F5] shrink-0">
                    <Utensils className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#20243A] truncate">
                        {item.foodNameSnapshot}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                          item.category === 'breakfast'
                            ? 'bg-[#FEF7E8] text-[#D9961A]'
                            : item.category === 'lunch'
                            ? 'bg-[#F0F4FF] text-[#6258F5]'
                            : item.category === 'dinner'
                            ? 'bg-[#EFEDFF] text-[#756BFF]'
                            : 'bg-[#E8F8F2] text-[#27AE82]'
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#858BA0] mt-0.5">
                      {item.grams}g · P:{item.protein}g C:{item.carbohydrates}g F:{item.fat}g
                    </p>
                    {(item.sodiumMg !== undefined || item.sugarG !== undefined) && (
                      <p className="text-[10px] text-[#756BFF] mt-0.5 font-medium">
                        {item.sodiumMg !== undefined && `🧂 Na: ${item.sodiumMg}mg`}
                        {item.sodiumMg !== undefined && item.sugarG !== undefined && ' · '}
                        {item.sugarG !== undefined && `🍬 น้ำตาล: ${item.sugarG}g`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-[#6258F5] mr-1">
                    {Math.round(item.calories)} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditMealItem(item)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#858BA0] hover:text-[#6258F5] hover:bg-[#EFEDFF] active:scale-95 transition-all"
                    aria-label={`แก้ไขรายการ ${item.foodNameSnapshot}`}
                    title="Edit item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => await deleteMealItem(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#EB6478] hover:text-[#D13D54] hover:bg-[#FFF0F2] active:scale-95 transition-all"
                    aria-label={`ลบรายการ ${item.foodNameSnapshot}`}
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
          <table className="w-full text-left text-xs text-[#20243A] border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-[#E9EAF2] text-[#858BA0] font-medium text-[11px]">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded-md border-[#E9EAF2] text-[#6258F5] focus:ring-[#6258F5] cursor-pointer accent-[#6258F5]"
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
            <tbody className="divide-y divide-[#E9EAF2]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#858BA0]">
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
                      className={`hover:bg-[#F6F7FB] transition-colors ${
                        isSelected ? 'bg-[#EFEDFF]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="rounded-md border-[#E9EAF2] text-[#6258F5] focus:ring-[#6258F5] cursor-pointer accent-[#6258F5]"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#EFEDFF] flex items-center justify-center text-[#6258F5] font-bold text-xs shrink-0">
                            <Utensils className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-semibold text-[#20243A] block">
                              {item.foodNameSnapshot}
                            </span>
                            <span className="text-[10px] text-[#858BA0]">
                              {item.sourceSnapshot === 'ai_confirmed' ? 'AI Vision' : 'Manual Entry'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            item.category === 'breakfast'
                              ? 'bg-[#FEF7E8] text-[#D9961A]'
                              : item.category === 'lunch'
                              ? 'bg-[#F0F4FF] text-[#6258F5]'
                              : item.category === 'dinner'
                              ? 'bg-[#EFEDFF] text-[#756BFF]'
                              : 'bg-[#E8F8F2] text-[#27AE82]'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[#858BA0]">{item.grams}g</td>

                      <td className="py-3 px-3 text-[#858BA0]">
                        <div>
                          <span className="text-[#20243A] font-medium">P: {item.protein}g</span> · C:{' '}
                          {item.carbohydrates}g · <span className="text-[#20243A] font-medium">F: {item.fat}g</span>
                        </div>
                        {(item.sodiumMg !== undefined || item.sugarG !== undefined) && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#756BFF] font-medium">
                            {item.sodiumMg !== undefined && <span>🧂 Na: {item.sodiumMg}mg</span>}
                            {item.sodiumMg !== undefined && item.sugarG !== undefined && <span>·</span>}
                            {item.sugarG !== undefined && <span>🍬 น้ำตาล: {item.sugarG}g</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#6258F5]">
                        {Math.round(item.calories)} kcal
                      </td>

                      <td className="py-3 px-3 text-right relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(isActionOpen ? null : item.id)
                          }
                          className="p-1 rounded-lg text-[#858BA0] hover:text-[#6258F5] hover:bg-[#EFEDFF]"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isActionOpen && (
                          <div className="absolute right-3 top-8 w-28 bg-white border border-[#E9EAF2] rounded-xl shadow-xl py-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                onEditMealItem(item);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#20243A] hover:bg-[#F0F4FF]"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#6258F5]" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteMealItem(item.id);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#EB6478] hover:bg-[#FFF0F2]"
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
        <div className="pt-3 border-t border-[#E9EAF2] flex flex-col gap-2">
          <span className="text-xs font-bold text-[#20243A]">
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
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-[#F0F4FF] hover:bg-[#EFEDFF] text-[#20243A] border border-[#E9EAF2] hover:border-[#756BFF]/50 rounded-full transition-colors"
                >
                  <Plus className="w-3 h-3 text-[#6258F5]" />
                  <span>{shortName}</span>
                  <span className="text-[#858BA0] text-[10px]">({servingKcal} kcal)</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onProductFound={onOpenConfirmMeal}
        settings={settings}
      />

      {/* Share Daily Summary Card Modal */}
      <ShareSummaryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        date={todayBangkok}
        consumedCalories={summary.consumedCalories}
        targetCalories={goals.calorieTarget}
        remainingCalories={summary.remainingCalories}
        protein={summary.consumedProtein}
        carbs={summary.consumedCarbs}
        fat={summary.consumedFat}
        proteinTarget={goals.proteinTargetG}
        sodiumMg={summary.consumedSodiumMg}
        sugarG={summary.consumedSugarG}
        waterMl={consumedWaterMl}
        waterTargetMl={waterTargetMl}
        streakDays={streakDays}
        netDeficit={energyBalance.netDeficit}
        energyStatus={energyBalance.status}
        fatChangeG={energyBalance.estimatedFatChangeGrams}
        userName={profile.name || 'User'}
      />
    </div>
  );
};
