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
import type { ConfirmMealDraft, MealCategory, MealItem, ThemeMode } from './types';
import { getBangkokDateString } from './utils/date';
import { TodayDashboard } from './components/TodayDashboard';
import { FoodScanner } from './components/FoodScanner';
import { ConfirmMeal } from './components/ConfirmMeal';
import { FoodDiary } from './components/FoodDiary';
import { ProgressScreen } from './components/ProgressScreen';
import { SettingsScreen } from './components/SettingsScreen';
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  TrendingUp,
  Settings,
  WifiOff,
  Moon,
  CloudMoon,
  Sun,
  Flame,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'diary' | 'scanner' | 'confirm' | 'progress' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getBangkokDateString());
  const [diaryCategory, setDiaryCategory] = useState<MealCategory>('breakfast');
  const [confirmDraft, setConfirmDraft] = useState<ConfirmMealDraft | null>(null);
  const [editingMealItem, setEditingMealItem] = useState<MealItem | null>(null);
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

  // Apply 3-mode theme ('dark' | 'twilight' | 'light') attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  const handleSetTheme = async (theme: ThemeMode) => {
    await db.settings.update(settings.id, {
      theme,
      updatedAt: new Date().toISOString(),
    });
  };

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

  return (
    <div className="app-shell">
      {/* Outer Frame matching the Personal Finance reference UI */}
      <div className="pf-dashboard-frame">
        {/* Top Header Bar with Pill Navigation & 3-Mode Theme Switcher */}
        <header className="pf-topbar">
          <div
            className="pf-brand"
            onClick={() => setActiveTab('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setActiveTab('dashboard');
            }}
          >
            <div className="pf-brand-icon">
              <Flame size={18} />
            </div>
            <div>
              <span className="pf-brand-title">Personal Nutrition</span>
              <span className="pf-brand-sub">NUB BIO-TRACKER</span>
            </div>
          </div>

          {/* Center Pill Navigation (Desktop / Tablet) */}
          <nav className="pf-pill-nav" aria-label="Dashboard Sections">
            <button
              type="button"
              className={`pf-pill-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`pf-pill-btn ${activeTab === 'diary' ? 'active' : ''}`}
              onClick={() => setActiveTab('diary')}
            >
              Food Diary
            </button>
            <button
              type="button"
              className={`pf-pill-btn ${
                activeTab === 'scanner' || activeTab === 'confirm' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('scanner')}
            >
              AI Scanner
            </button>
            <button
              type="button"
              className={`pf-pill-btn ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              Analytics
            </button>
            <button
              type="button"
              className={`pf-pill-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Budget & Settings
            </button>
          </nav>

          {/* Right Status & 3-Mode Theme Switcher (Moon / CloudMoon / Sun) */}
          <div className="pf-topbar-right">
            {isOffline && (
              <span className="badge badge-warning" title="Offline Mode Active">
                <WifiOff size={12} /> Offline
              </span>
            )}
            <div className="pf-target-tags">
              <span className="pf-year-tag">{profile.initialWeightKg}kg</span>
              <span className="pf-year-tag active">→ {profile.targetWeightKg}kg</span>
              <span className="pf-year-tag">{goals.calorieTarget} kcal</span>
            </div>

            <div className="pf-theme-toggles" role="group" aria-label="Theme Mode">
              <button
                type="button"
                className={`pf-theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleSetTheme('dark')}
                title="Deep Abyssal Dark Mode"
              >
                <Moon size={15} />
              </button>
              <button
                type="button"
                className={`pf-theme-btn ${
                  settings.theme === 'twilight' ? 'active' : ''
                }`}
                onClick={() => handleSetTheme('twilight')}
                title="Twilight Slate Hybrid Mode"
              >
                <CloudMoon size={15} />
              </button>
              <button
                type="button"
                className={`pf-theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleSetTheme('light')}
                title="Crisp Ice Light Mode"
              >
                <Sun size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Screen Container */}
        <main className="main-content">
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

      {/* Mobile Bottom Dock Navigation */}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'diary' ? 'active' : ''}`}
          onClick={() => setActiveTab('diary')}
        >
          <BookOpen size={19} />
          <span>Diary</span>
        </button>

        <button
          type="button"
          className={`nav-tab nav-tab-scanner ${
            activeTab === 'scanner' || activeTab === 'confirm' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={19} />
          <span>Scanner</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp size={19} />
          <span>Analytics</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
