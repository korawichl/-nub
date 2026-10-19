import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase } from './db/database';
import {
  DEFAULT_GOALS_ID,
  DEFAULT_PROFILE_ID,
  DEFAULT_SETTINGS_ID,
  createInitialGoals,
  createInitialProfile,
  createInitialSettings,
} from './db/seedData';
import type { ConfirmMealDraft, MealCategory, MealItem } from './types';
import { getBangkokDateString } from './utils/date';
import { TodayDashboard } from './components/TodayDashboard';
import { FoodScanner } from './components/FoodScanner';
import { ConfirmMeal } from './components/ConfirmMeal';
import { FoodDiary } from './components/FoodDiary';
import { ProgressScreen } from './components/ProgressScreen';
import { SettingsScreen } from './components/SettingsScreen';
import {
  LayoutDashboard,
  Camera,
  BookOpen,
  TrendingUp,
  Settings,
  Menu,
  X,
  WifiOff,
  Flame,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'diary' | 'scanner' | 'confirm' | 'progress' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getBangkokDateString());
  const [diaryCategory, setDiaryCategory] = useState<MealCategory>('breakfast');
  const [confirmDraft, setConfirmDraft] = useState<ConfirmMealDraft | null>(null);
  const [editingMealItem, setEditingMealItem] = useState<MealItem | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error('Database initialization error:', err);
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const profile =
    useLiveQuery(() => db.profiles.get(DEFAULT_PROFILE_ID), []) ||
    createInitialProfile();
  const goals =
    useLiveQuery(() => db.goals.get(DEFAULT_GOALS_ID), []) ||
    createInitialGoals();
  const settings =
    useLiveQuery(() => db.settings.get(DEFAULT_SETTINGS_ID), []) ||
    createInitialSettings();

  const todayBangkok = getBangkokDateString();
  const todayItems =
    useLiveQuery(
      () => db.mealItems.where('date').equals(todayBangkok).toArray(),
      [todayBangkok]
    ) || [];

  const todayActivities =
    useLiveQuery(
      () => db.activityLogs.where('date').equals(todayBangkok).toArray(),
      [todayBangkok]
    ) || [];

  const selectedDateItems =
    useLiveQuery(
      () => db.mealItems.where('date').equals(selectedDate).toArray(),
      [selectedDate]
    ) || [];

  const allMealItems = useLiveQuery(() => db.mealItems.toArray(), []) || [];
  const allActivityLogs = useLiveQuery(() => db.activityLogs.toArray(), []) || [];
  const catalog = useLiveQuery(() => db.foodCatalog.toArray(), []) || [];
  const weightLogs = useLiveQuery(() => db.weightLogs.toArray(), []) || [];

  const frequentFoods = [...catalog].sort(
    (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
  );

  const handleOpenConfirmMeal = (draft: ConfirmMealDraft) => {
    setConfirmDraft(draft);
    setActiveTab('confirm');
  };

  const handleNavigateToDiary = (category?: MealCategory) => {
    if (category) {
      setDiaryCategory(category);
    }
    setActiveTab('diary');
  };

  const handleEditFromDashboard = (item: MealItem) => {
    setSelectedDate(item.date);
    setEditingMealItem(item);
    setActiveTab('diary');
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner' as const, label: 'AI Scanner', icon: Camera },
    { id: 'diary' as const, label: 'Food Diary', icon: BookOpen },
    { id: 'progress' as const, label: 'Analytics', icon: TrendingUp },
    { id: 'settings' as const, label: 'Goals & Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 lg:bg-[#E7E7E7] flex items-center justify-center p-0 lg:p-8 font-sans antialiased text-[#171717]">
      {/* Background Subtle Geometry Concentric Rings matching Jobgio */}
      <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden hidden lg:block">
        <svg
          className="absolute -right-40 -top-40 w-[900px] h-[900px]"
          viewBox="0 0 1000 1000"
          fill="none"
        >
          <circle cx="500" cy="500" r="300" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="450" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="600" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="750" stroke="#D1D5DB" strokeWidth="1" />
        </svg>
      </div>

      {/* Main Large White Rounded Container (Full-bleed on mobile, rounded card canvas on desktop) */}
      <div className="relative w-full max-w-[1440px] min-h-screen lg:min-h-[920px] bg-white rounded-none lg:rounded-[36px] shadow-none lg:shadow-2xl border-none lg:border border-[#E0E0E0] flex overflow-hidden z-10">
        {/* Left Sidebar (Jobgio Style) */}
        <>
          {/* Mobile Overlay */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <aside
            className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-[#EEEEEE] flex flex-col justify-between p-6 transition-transform duration-200 lg:static lg:translate-x-0 ${
              isMobileSidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {/* Brand Logo Header */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => setActiveTab('dashboard')}
                >
                  {/* Jobgio-inspired Geometric Logo Mark */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 28 28"
                      fill="none"
                    >
                      <path
                        d="M14 2L2 9L14 16L26 9L14 2Z"
                        stroke="#111111"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 14L14 21L26 14"
                        stroke="#111111"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 19L14 26L26 19"
                        stroke="#111111"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xl font-bold tracking-tight text-[#171717] block leading-tight">
                      Nubcal
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                      Nutrition Tracker
                    </span>
                  </div>
                </div>

                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items with Black Pill Active State */}
              <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'scanner' && activeTab === 'confirm');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-150 text-left w-full ${
                        isActive
                          ? 'bg-[#111111] text-white shadow-xs'
                          : 'text-[#858585] hover:text-[#171717] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-[#858585]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom: User Profile matching Jobgio */}
            <div className="pt-6 border-t border-[#EEEEEE] flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="George"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-100"
                />
                <span className="absolute -top-1 -right-1 bg-[#111111] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white flex items-center gap-0.5">
                  🔥 12
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[#171717] truncate leading-tight">
                  {profile.name || 'Korawich'}
                </span>
                <span className="text-[11px] text-[#858585] truncate leading-normal">
                  {profile.initialWeightKg}kg → {profile.targetWeightKg}kg
                </span>
              </div>
            </div>
          </aside>
        </>

        {/* Right Content Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Top Navbar Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE] bg-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-neutral-700 hover:bg-neutral-100 rounded-xl"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900">
                  {activeTab === 'dashboard'
                    ? 'Dashboard'
                    : activeTab === 'scanner'
                    ? 'AI Food Scanner'
                    : activeTab === 'diary'
                    ? 'Food Diary'
                    : activeTab === 'progress'
                    ? 'Progress & Analytics'
                    : 'Settings'}
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500">
                  Target: {goals.calorieTarget} kcal / day
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isOffline && (
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200 flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1 rounded-full text-xs font-semibold text-neutral-800">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{goals.calorieTarget} kcal Target</span>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-3.5 pb-24 sm:p-6 lg:p-7 sm:pb-7 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <TodayDashboard
                todayItems={todayItems}
                allMealItems={allMealItems}
                todayActivities={todayActivities}
                goals={goals}
                profile={profile}
                frequentFoods={frequentFoods}
                onNavigateToDiary={handleNavigateToDiary}
                onNavigateToScanner={() => setActiveTab('scanner')}
                onOpenConfirmMeal={handleOpenConfirmMeal}
                onEditMealItem={handleEditFromDashboard}
                onQuickLogWeight={() => setActiveTab('progress')}
              />
            )}

            {activeTab === 'scanner' && (
              <FoodScanner
                settings={settings}
                catalog={catalog}
                onOpenConfirmMeal={handleOpenConfirmMeal}
                onNavigateToDiary={() => setActiveTab('diary')}
              />
            )}

            {activeTab === 'confirm' && confirmDraft && (
              <ConfirmMeal
                draft={confirmDraft}
                targetDate={selectedDate}
                onConfirmed={() => {
                  setConfirmDraft(null);
                  setActiveTab('diary');
                }}
                onCancel={() => {
                  setConfirmDraft(null);
                  setActiveTab('scanner');
                }}
              />
            )}

            {activeTab === 'diary' && (
              <FoodDiary
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                dayItems={selectedDateItems}
                goals={goals}
                catalog={catalog}
                initialCategory={diaryCategory}
                editingItem={editingMealItem}
                onClearEditingItem={() => setEditingMealItem(null)}
                onOpenConfirmMeal={handleOpenConfirmMeal}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressScreen
                profile={profile}
                weightLogs={weightLogs}
                allMealItems={allMealItems}
                allActivityLogs={allActivityLogs}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsScreen
                profile={profile}
                goals={goals}
                settings={settings}
                allMealItems={allMealItems}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Dock Navigation Bar (Matching the Mobile Reference Image) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EEEEEE] py-1.5 px-3 flex items-center justify-around shadow-lg lg:hidden"
        aria-label="Mobile Navigation"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-[#111111] font-bold scale-105'
              : 'text-[#858585] hover:text-[#171717]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diary')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'diary'
              ? 'text-[#111111] font-bold scale-105'
              : 'text-[#858585] hover:text-[#171717]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Diary</span>
        </button>

        {/* Center Elevated Action Button for Quick AI Scanner */}
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className="w-13 h-13 -mt-6 rounded-full bg-[#111111] text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform border-4 border-white"
          aria-label="AI Food Scanner"
        >
          <Camera className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'progress'
              ? 'text-[#111111] font-bold scale-105'
              : 'text-[#858585] hover:text-[#171717]'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px]">Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'settings'
              ? 'text-[#111111] font-bold scale-105'
              : 'text-[#858585] hover:text-[#171717]'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
