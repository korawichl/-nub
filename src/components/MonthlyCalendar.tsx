import React, { useState, useMemo } from 'react';
import type { AppSettings, MealItem, NutritionGoals, UserProfile } from '../types';
import {
  aggregateMonthData,
  downloadBlobFile,
  generateMonthlyJsonArchive,
  generateMonthlyMarkdownReport,
  commitMonthlyLogToGitHub,
  type DayAggregate,
} from '../utils/gitExporter';
import {
  formatMonthYear,
  getBangkokDateString,
  getDaysInMonth,
  getFirstDayOfWeek,
  parseDateString,
  formatDisplayDate,
  THAI_MONTH_NAMES,
} from '../utils/date';
import { db } from '../db/database';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  Copy,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Plus,
  Loader2,
  X,
  Check,
} from 'lucide-react';

interface MonthlyCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  allMealItems: MealItem[];
  goals: NutritionGoals;
  profile: UserProfile;
  settings: AppSettings;
  onOpenDailyDiary: (date: string) => void;
  onBackToDaily?: () => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onSelectDate,
  allMealItems,
  goals,
  profile,
  settings,
  onOpenDailyDiary,
  onBackToDaily,
}) => {
  const todayStr = getBangkokDateString();
  const parsedCurrent = parseDateString(selectedDate || todayStr);

  const [viewYear, setViewYear] = useState<number>(parsedCurrent.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedCurrent.month); // 1-12
  const [activeDate, setActiveDate] = useState<string>(selectedDate || todayStr);

  // Git Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeExportTab, setActiveExportTab] = useState<'markdown' | 'json' | 'github'>('markdown');
  const [copiedStatus, setCopiedStatus] = useState(false);

  // GitHub Direct Commit State
  const [ghToken, setGhToken] = useState(settings.githubToken || '');
  const [ghRepo, setGhRepo] = useState(settings.githubRepo || '');
  const [ghBranch, setGhBranch] = useState(settings.githubBranch || 'main');
  const [isPushingToGit, setIsPushingToGit] = useState(false);
  const [gitPushResult, setGitPushResult] = useState<{
    success: boolean;
    commitUrl?: string;
    error?: string;
  } | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const nowParts = parseDateString(todayStr);
    setViewYear(nowParts.year);
    setViewMonth(nowParts.month);
    setActiveDate(todayStr);
    onSelectDate(todayStr);
  };

  // Aggregated data for this month
  const monthDays = useMemo(() => {
    return aggregateMonthData(viewYear, viewMonth, allMealItems);
  }, [viewYear, viewMonth, allMealItems]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth); // 0 = Sunday

  // Monthly summary stats
  const loggedDays = useMemo(() => monthDays.filter((d) => d.mealCount > 0), [monthDays]);
  const avgCalories = useMemo(() => {
    if (loggedDays.length === 0) return 0;
    const sum = loggedDays.reduce((acc, d) => acc + d.totalCalories, 0);
    return Math.round(sum / loggedDays.length);
  }, [loggedDays]);

  const avgProtein = useMemo(() => {
    if (loggedDays.length === 0) return 0;
    const sum = loggedDays.reduce((acc, d) => acc + d.totalProtein, 0);
    return Math.round((sum / loggedDays.length) * 10) / 10;
  }, [loggedDays]);

  const onTargetCount = useMemo(() => {
    return loggedDays.filter((d) => {
      const diff = Math.abs(d.totalCalories - goals.calorieTarget);
      return diff <= goals.calorieTarget * 0.15;
    }).length;
  }, [loggedDays, goals.calorieTarget]);

  // Selected Day Details
  const selectedDayData: DayAggregate | undefined = useMemo(() => {
    return monthDays.find((d) => d.date === activeDate);
  }, [monthDays, activeDate]);

  // Generate Reports
  const markdownReport = useMemo(() => {
    return generateMonthlyMarkdownReport({
      year: viewYear,
      month: viewMonth,
      mealItems: allMealItems,
      goals,
      profile,
    });
  }, [viewYear, viewMonth, allMealItems, goals, profile]);

  const jsonReport = useMemo(() => {
    return generateMonthlyJsonArchive({
      year: viewYear,
      month: viewMonth,
      mealItems: allMealItems,
      goals,
      profile,
    });
  }, [viewYear, viewMonth, allMealItems, goals, profile]);

  const monthFileName = `nutrition_${viewYear}_${String(viewMonth).padStart(2, '0')}`;

  const handleDownloadMarkdown = () => {
    downloadBlobFile(`${monthFileName}.md`, markdownReport, 'text/markdown;charset=utf-8');
  };

  const handleDownloadJson = () => {
    downloadBlobFile(`${monthFileName}.json`, jsonReport, 'application/json;charset=utf-8');
  };

  const handleCopyContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCommitToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushingToGit(true);
    setGitPushResult(null);

    // Save token and repo to settings in IndexedDB for convenience
    await db.settings.update(settings.id, {
      githubToken: ghToken.trim(),
      githubRepo: ghRepo.trim(),
      githubBranch: ghBranch.trim() || 'main',
      updatedAt: new Date().toISOString(),
    });

    const res = await commitMonthlyLogToGitHub({
      token: ghToken,
      repo: ghRepo,
      branch: ghBranch || 'main',
      filePath: `logs/${monthFileName}.md`,
      content: markdownReport,
      commitMessage: `chore(nutrition): monthly log for ${formatMonthYear(viewYear, viewMonth)}`,
    });

    setGitPushResult(res);
    setIsPushingToGit(false);
  };

  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E9EAF2] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EFEDFF] flex items-center justify-center text-[#6258F5] shrink-0">
              <CalendarIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#20243A]">
                  ปฏิทินประวัติอาหาร (Nutrition Calendar)
                </h1>
                {onBackToDaily && (
                  <button
                    type="button"
                    onClick={onBackToDaily}
                    className="text-xs text-[#6258F5] hover:underline font-semibold"
                  >
                    (กลับมุมมองรายวัน)
                  </button>
                )}
              </div>
              <p className="text-xs text-[#858BA0] mt-0.5">
                ดูย้อนหลังรายวันว่าวันที่ 1, 2, ... กินอะไรบ้าง และส่งออกบันทึกลงไฟล์ Git อัตโนมัติเมื่อครบเดือน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#6258F5] hover:bg-[#756BFF] text-white text-xs font-bold shadow-md shadow-[#6258F5]/25 transition-all active:scale-95 flex-1 sm:flex-none cursor-pointer"
            >
              <GitBranch size={16} />
              <span>📦 ส่งออกข้อมูลลง Git ({String(viewMonth).padStart(2, '0')}/{viewYear})</span>
            </button>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="mt-6 pt-5 border-t border-[#E9EAF2] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 rounded-xl border border-[#E9EAF2] hover:bg-[#F6F7FB] text-[#20243A] transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-base sm:text-lg font-bold text-[#20243A] min-w-[210px] text-center">
              {formatMonthYear(viewYear, viewMonth)}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 rounded-xl border border-[#E9EAF2] hover:bg-[#F6F7FB] text-[#20243A] transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#E9EAF2] hover:border-[#6258F5] text-[#6258F5] bg-[#EFEDFF]/40 transition-all cursor-pointer"
            >
              ไปเดือนปัจจุบัน (Today)
            </button>
          </div>
        </div>

        {/* Monthly Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#F1F2F8]">
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
            <span className="text-[11px] text-[#858BA0] block font-medium">บันทึกอาหารแล้ว</span>
            <strong className="text-sm sm:text-base font-bold text-[#20243A]">
              {loggedDays.length} / {daysInMonth} วัน{' '}
              <span className="text-xs font-normal text-[#6258F5]">
                ({Math.round((loggedDays.length / daysInMonth) * 100)}%)
              </span>
            </strong>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
            <span className="text-[11px] text-[#858BA0] block font-medium">แคลอรี่เฉลี่ย / วัน</span>
            <strong className="text-sm sm:text-base font-bold text-[#20243A]">
              {avgCalories > 0 ? `${avgCalories.toLocaleString()} kcal` : '-'}
            </strong>
            <span className="text-[10px] text-[#858BA0] block">เป้าหมาย: {goals.calorieTarget} kcal</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
            <span className="text-[11px] text-[#858BA0] block font-medium">โปรตีนเฉลี่ย / วัน</span>
            <strong className="text-sm sm:text-base font-bold text-[#20243A]">
              {avgProtein > 0 ? `${avgProtein} g` : '-'}
            </strong>
            <span className="text-[10px] text-[#858BA0] block">เป้าหมาย: {goals.proteinTargetG} g</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
            <span className="text-[11px] text-[#858BA0] block font-medium">วันที่อยู่ในเกณฑ์เป้า</span>
            <strong className="text-sm sm:text-base font-bold text-[#36B37E]">
              {onTargetCount} วัน
            </strong>
            <span className="text-[10px] text-[#858BA0] block">ช่วง ±15% แคลอรี่</span>
          </div>
        </div>
      </section>

      {/* Interactive Monthly Calendar Grid */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E9EAF2] shadow-sm">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {dayNames.map((d, index) => {
            const isWeekend = index === 0 || index === 6;
            return (
              <div
                key={d}
                className={`text-center py-2 text-xs font-bold rounded-xl ${
                  isWeekend ? 'text-[#EB6478] bg-[#FFF2F4]' : 'text-[#858BA0] bg-[#F8FAFC]'
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[70px] sm:min-h-[96px] bg-[#FAFBFD]/50 rounded-2xl border border-dashed border-[#F0F1F7]"
            />
          ))}

          {/* Day Cells */}
          {monthDays.map((day) => {
            const isToday = day.date === todayStr;
            const isSelected = day.date === activeDate;
            const hasMeals = day.mealCount > 0;

            const diff = day.totalCalories - goals.calorieTarget;
            const isOnTarget = Math.abs(diff) <= goals.calorieTarget * 0.15;
            const isOver = diff > goals.calorieTarget * 0.15;

            return (
              <div
                key={day.date}
                onClick={() => {
                  setActiveDate(day.date);
                  onSelectDate(day.date);
                }}
                className={`relative min-h-[72px] sm:min-h-[98px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#6258F5] ring-2 ring-[#6258F5]/30 bg-[#F5F4FF]'
                    : isToday
                    ? 'border-[#6258F5]/60 bg-[#FAFAFE]'
                    : hasMeals
                    ? 'border-[#E9EAF2] bg-white hover:border-[#6258F5]/40 hover:bg-[#FAFBFD]'
                    : 'border-[#F1F2F8] bg-[#FAFBFD]/70 hover:bg-white text-[#A0A5BA]'
                }`}
              >
                {/* Day Header: Day Number + Today Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-[#6258F5] text-white'
                        : isSelected
                        ? 'text-[#6258F5] font-black'
                        : 'text-[#20243A]'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {hasMeals && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOnTarget
                          ? 'bg-[#36B37E]'
                          : isOver
                          ? 'bg-[#EB6478]'
                          : 'bg-[#6258F5]'
                      }`}
                      title={
                        isOnTarget
                          ? 'อยู่ในเกณฑ์เป้าหมาย'
                          : isOver
                          ? 'เกินเป้าหมาย'
                          : 'ต่ำกว่าเป้าหมาย'
                      }
                    />
                  )}
                </div>

                {/* Day Content */}
                <div className="mt-1">
                  {hasMeals ? (
                    <div>
                      <div className="text-[11px] sm:text-xs font-black text-[#20243A] leading-tight">
                        {day.totalCalories.toLocaleString()}{' '}
                        <span className="text-[9px] font-normal text-[#858BA0] hidden sm:inline">
                          kcal
                        </span>
                      </div>
                      <div className="text-[9px] text-[#858BA0] mt-0.5 truncate hidden sm:block">
                        {day.mealCount} รายการ
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#C4C7D5] hidden sm:block">-</div>
                  )}
                </div>

                {/* Status Pill on Mobile / Desktop */}
                {hasMeals && (
                  <div className="mt-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold truncate block text-center ${
                        isOnTarget
                          ? 'bg-[#EBFBF4] text-[#27A36D]'
                          : isOver
                          ? 'bg-[#FFF2F4] text-[#E03B53]'
                          : 'bg-[#EFEDFF] text-[#6258F5]'
                      }`}
                    >
                      {isOnTarget ? '✓ พอดี' : isOver ? '▲ เกิน' : '▼ พร่อง'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected Day Food Breakdown Card */}
      {selectedDayData && (
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E9EAF2] shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E9EAF2]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#20243A]">
                  📋 เมนูที่กินวันที่ {selectedDayData.dayNumber} {THAI_MONTH_NAMES[viewMonth - 1]}{' '}
                  {viewYear}
                </h2>
                {selectedDayData.date === todayStr && (
                  <span className="px-2 py-0.5 bg-[#6258F5] text-white text-[10px] font-bold rounded-full">
                    วันนี้
                  </span>
                )}
              </div>
              <p className="text-xs text-[#858BA0] mt-0.5">
                {formatDisplayDate(selectedDayData.date)} • ทั้งหมด {selectedDayData.mealCount} รายการ
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenDailyDiary(selectedDayData.date)}
                className="btn btn-primary btn-sm flex items-center justify-center gap-1.5 w-full sm:w-auto text-xs py-2 px-4 cursor-pointer"
              >
                <BookOpen size={14} />
                <span>เปิดบันทึก/แก้ไขใน Food Diary →</span>
              </button>
            </div>
          </div>

          {/* Selected Day Macros Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-4">
            <div className="bg-[#EFEDFF] p-3 rounded-2xl">
              <span className="text-[10px] text-[#6258F5] font-semibold block">แคลอรี่รวม</span>
              <strong className="text-base font-extrabold text-[#6258F5]">
                {selectedDayData.totalCalories}{' '}
                <span className="text-xs font-normal">/ {goals.calorieTarget} kcal</span>
              </strong>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
              <span className="text-[10px] text-[#858BA0] font-semibold block">โปรตีน</span>
              <strong className="text-base font-extrabold text-[#20243A]">
                {selectedDayData.totalProtein}g
              </strong>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
              <span className="text-[10px] text-[#858BA0] font-semibold block">คาร์โบไฮเดรต</span>
              <strong className="text-base font-extrabold text-[#20243A]">
                {selectedDayData.totalCarbs}g
              </strong>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2]">
              <span className="text-[10px] text-[#858BA0] font-semibold block">ไขมัน</span>
              <strong className="text-base font-extrabold text-[#20243A]">
                {selectedDayData.totalFat}g
              </strong>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E9EAF2] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#858BA0] font-semibold block">โซเดียม / น้ำตาล</span>
              <strong className="text-xs font-bold text-[#20243A]">
                🧂 {selectedDayData.totalSodiumMg}mg · 🍬 {selectedDayData.totalSugarG}g
              </strong>
            </div>
          </div>

          {/* Meals List by Category */}
          {selectedDayData.items.length === 0 ? (
            <div className="text-center py-8 bg-[#FAFBFD] rounded-2xl border border-dashed border-[#E9EAF2]">
              <p className="text-sm text-[#858BA0]">ยังไม่ได้บันทึกรายการอาหารสำหรับวันนี้</p>
              <button
                type="button"
                onClick={() => onOpenDailyDiary(selectedDayData.date)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6258F5] text-white text-xs font-bold shadow-sm"
              >
                <Plus size={14} /> บันทึกอาหารวันนี้
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(
                [
                  { key: 'breakfast', label: 'มื้อเช้า (Breakfast)', icon: '🌅' },
                  { key: 'lunch', label: 'มื้อเที่ยง (Lunch)', icon: '☀️' },
                  { key: 'dinner', label: 'มื้อเย็น (Dinner)', icon: '🌙' },
                  { key: 'snacks', label: 'ของว่าง/เครื่องดื่ม (Snacks)', icon: '🥪' },
                ] as const
              ).map((cat) => {
                const items = selectedDayData.items.filter((i) => i.category === cat.key);
                if (items.length === 0) return null;

                const catCalories = Math.round(items.reduce((acc, i) => acc + i.calories, 0));
                const catProtein =
                  Math.round(items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;

                return (
                  <div key={cat.key} className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E9EAF2]">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E9EAF2]">
                      <span className="text-xs font-bold text-[#20243A] flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span className="text-xs font-semibold text-[#6258F5]">
                        {catCalories} kcal (โปรตีน {catProtein}g)
                      </span>
                    </div>

                    <div className="divide-y divide-[#F1F2F8]">
                      {items.map((item) => (
                        <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#20243A] block truncate">
                              {item.foodNameSnapshot}
                            </span>
                            <span className="text-[10px] text-[#858BA0]">
                              {item.grams}g • P: {item.protein}g · C: {item.carbohydrates}g · F:{' '}
                              {item.fat}g
                              {item.sodiumMg !== undefined && ` · Na: ${item.sodiumMg}mg`}
                              {item.sugarG !== undefined && ` · น้ำตาล: ${item.sugarG}g`}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-[#20243A] shrink-0">
                            {Math.round(item.calories)} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 📦 Git Export & Archive Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#17213D]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E9EAF2] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E9EAF2] flex items-center justify-between bg-[#FAFBFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#6258F5] text-white flex items-center justify-center shrink-0">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#20243A]">
                    บันทึก & ส่งออกข้อมูลโภชนาการสำหรับ Git
                  </h3>
                  <p className="text-xs text-[#858BA0]">
                    เดือน: {formatMonthYear(viewYear, viewMonth)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 text-[#858BA0] hover:text-[#20243A] rounded-xl hover:bg-[#E9EAF2]/50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#E9EAF2] bg-[#F6F7FB] px-5 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveExportTab('markdown')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeExportTab === 'markdown'
                    ? 'border-[#6258F5] text-[#6258F5]'
                    : 'border-transparent text-[#858BA0] hover:text-[#20243A]'
                }`}
              >
                📄 Git Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveExportTab('json')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeExportTab === 'json'
                    ? 'border-[#6258F5] text-[#6258F5]'
                    : 'border-transparent text-[#858BA0] hover:text-[#20243A]'
                }`}
              >
                📦 Git JSON Archive (.json)
              </button>
              <button
                type="button"
                onClick={() => setActiveExportTab('github')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeExportTab === 'github'
                    ? 'border-[#6258F5] text-[#6258F5]'
                    : 'border-transparent text-[#858BA0] hover:text-[#20243A]'
                }`}
              >
                🚀 Commit ขึ้น GitHub โดยตรง
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeExportTab === 'markdown' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#858BA0]">
                    <span>
                      ไฟล์ Markdown มีตารางสรุปรายวันและรายการอาหารครบทุกมื้อ พร้อมสำหรับ Git commit
                    </span>
                    <span className="font-mono bg-[#EFEDFF] text-[#6258F5] px-2 py-0.5 rounded-md">
                      {monthFileName}.md
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      rows={12}
                      className="w-full text-xs font-mono p-3 bg-[#182234] text-[#E2E8F0] rounded-2xl border border-[#334155] focus:outline-hidden"
                      value={markdownReport}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 py-2 px-4 text-xs cursor-pointer"
                    >
                      <Download size={14} /> ดาวน์โหลด {monthFileName}.md
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyContent(markdownReport)}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 py-2 px-4 text-xs cursor-pointer"
                    >
                      {copiedStatus ? <Check size={14} className="text-[#36B37E]" /> : <Copy size={14} />}
                      <span>{copiedStatus ? 'คัดลอกสำเร็จ!' : 'คัดลอก Markdown ทั้งหมด'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeExportTab === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#858BA0]">
                    <span>โครงสร้าง JSON พร้อมสคริปต์ประมวลผลและการจัดเก็บบน Git repository</span>
                    <span className="font-mono bg-[#EFEDFF] text-[#6258F5] px-2 py-0.5 rounded-md">
                      {monthFileName}.json
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      rows={12}
                      className="w-full text-xs font-mono p-3 bg-[#182234] text-[#E2E8F0] rounded-2xl border border-[#334155] focus:outline-hidden"
                      value={jsonReport}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 py-2 px-4 text-xs cursor-pointer"
                    >
                      <Download size={14} /> ดาวน์โหลด {monthFileName}.json
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyContent(jsonReport)}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 py-2 px-4 text-xs cursor-pointer"
                    >
                      {copiedStatus ? <Check size={14} className="text-[#36B37E]" /> : <Copy size={14} />}
                      <span>{copiedStatus ? 'คัดลอกสำเร็จ!' : 'คัดลอก JSON'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeExportTab === 'github' && (
                <form onSubmit={handleCommitToGitHub} className="space-y-4">
                  <div className="p-3 bg-[#EFEDFF] rounded-2xl text-xs text-[#6258F5] flex items-start gap-2">
                    <GitBranch size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Commit ขึ้น GitHub Repository อัตโนมัติ</strong>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#5046E5]">
                        ระบบจะสร้างหรืออัปเดตไฟล์ <code>logs/{monthFileName}.md</code> บน GitHub ของคุณทันทีโดยตรงจากเบราว์เซอร์
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#20243A] mb-1">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <input
                        type="password"
                        className="input-text text-xs py-2 px-3 w-full"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (สิทธิ์ repo)"
                        value={ghToken}
                        onChange={(e) => setGhToken(e.target.value)}
                        required
                      />
                      <span className="text-[10px] text-[#858BA0] mt-0.5 block">
                        สร้างได้ที่ GitHub → Settings → Developer Settings → Personal access tokens
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#20243A] mb-1">
                        GitHub Repository (owner/repo)
                      </label>
                      <input
                        type="text"
                        className="input-text text-xs py-2 px-3 w-full"
                        placeholder="เช่น korawichl/-nub หรือ username/my-nutrition"
                        value={ghRepo}
                        onChange={(e) => setGhRepo(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#20243A] mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        className="input-text text-xs py-2 px-3 w-full"
                        placeholder="main"
                        value={ghBranch}
                        onChange={(e) => setGhBranch(e.target.value)}
                      />
                    </div>
                  </div>

                  {gitPushResult && (
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                        gitPushResult.success
                          ? 'bg-[#EBFBF4] text-[#27A36D] border border-[#A3E7C9]'
                          : 'bg-[#FFF2F4] text-[#E03B53] border border-[#F8B4BD]'
                      }`}
                    >
                      {gitPushResult.success ? (
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      )}
                      <div>
                        {gitPushResult.success ? (
                          <>
                            <strong>Commit ไปยัง GitHub สำเร็จแล้ว!</strong>
                            {gitPushResult.commitUrl && (
                              <a
                                href={gitPushResult.commitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block mt-1 underline font-semibold flex items-center gap-1"
                              >
                                ดูไฟล์บน GitHub <ExternalLink size={12} />
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>ไม่สามารถส่งข้อมูลไปยัง GitHub ได้</strong>
                            <p className="mt-0.5">{gitPushResult.error}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPushingToGit || !ghToken.trim() || !ghRepo.trim()}
                      className="btn btn-primary btn-sm flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs w-full cursor-pointer disabled:opacity-50"
                    >
                      {isPushingToGit ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> กำลังส่งข้อมูลไปยัง GitHub...
                        </>
                      ) : (
                        <>
                          <GitBranch size={14} /> 🚀 Commit & Push ไปยัง GitHub ทันที
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
