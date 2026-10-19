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
  BookOpen,
  Camera,
  TrendingUp,
  Settings,
  WifiOff,
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

  // Apply light/dark theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

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
      {/* Top App Bar */}
      <header className="top-navbar">
        <div className="top-navbar-inner">
          <div
            className="brand-logo"
            onClick={() => setActiveTab('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setActiveTab('dashboard');
            }}
          >
            <span className="brand-badge">N</span>
            <div>
              <span className="brand-name">Nub Tracker</span>
              <span className="brand-tag">Local-First PWA</span>
            </div>
          </div>

          <div className="top-status-pills">
            {isOffline && (
              <span className="badge badge-warning" title="Working offline from IndexedDB">
                <WifiOff size={13} /> Offline Mode (Local DB Active)
              </span>
            )}
            <span className="badge badge-subtle">
              Target: {goals.calorieTarget} kcal · {goals.proteinTargetG}g P
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <TodayDashboard
            todayItems={todayItems}
            todayActivities={todayActivities}
            goals={goals}
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

      {/* Responsive Bottom / Primary Navigation Bar */}
      <nav className="bottom-nav" aria-label="Primary Navigation">
        <button
          type="button"
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Today</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'diary' ? 'active' : ''}`}
          onClick={() => setActiveTab('diary')}
        >
          <BookOpen size={20} />
          <span>Diary</span>
        </button>

        <button
          type="button"
          className={`nav-tab nav-tab-scanner ${
            activeTab === 'scanner' || activeTab === 'confirm' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={20} />
          <span>Scanner</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp size={20} />
          <span>Progress</span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
