import React, { useState } from 'react';
import type {
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
  calculateFoodNutrition,
} from '../utils/nutritionCalculator';
import {
  addCatalogFoodToMeal,
  deleteMealItem,
  updateMealItemSnapshot,
} from '../db/database';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Star,
  Search,
  Check,
  X,
  BookOpen,
} from 'lucide-react';
import { MonthlyCalendar } from './MonthlyCalendar';

interface FoodDiaryProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  dayItems: MealItem[];
  allMealItems?: MealItem[];
  goals: NutritionGoals;
  profile?: UserProfile;
  settings?: AppSettings;
  catalog: FoodCatalogItem[];
  initialCategory?: MealCategory;
  editingItem: MealItem | null;
  onClearEditingItem: () => void;
  onOpenConfirmMeal: (draft: ConfirmMealDraft) => void;
}

const CATEGORIES: { key: MealCategory; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

export const FoodDiary: React.FC<FoodDiaryProps> = ({
  selectedDate,
  onChangeDate,
  dayItems,
  allMealItems = [],
  goals,
  profile = {
    id: 'default_profile',
    age: 18,
    sex: 'male',
    heightCm: 180,
    initialWeightKg: 88,
    targetWeightKg: 80,
    goal: 'fat_loss',
    activityLevel: 'high',
    training: 'swimming and strength training',
    platform: 'PWA',
    storage: 'local device only',
    budget: 'free-first',
    updatedAt: new Date().toISOString(),
  },
  settings = {
    id: 'default_settings',
    theme: 'dark',
    timezone: 'Asia/Bangkok',
    aiProviderId: 'free_builtin',
    updatedAt: new Date().toISOString(),
  },
  catalog,
  initialCategory = 'breakfast',
  editingItem,
  onClearEditingItem,
  onOpenConfirmMeal,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [activeCategory, setActiveCategory] =
    useState<MealCategory>(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] =
    useState<string>('ALL');
  const [portionGramsMap, setPortionGramsMap] = useState<Record<string, string>>(
    {}
  );

  // Inline Edit Modal State for an existing MealItem
  const [editId, setEditId] = useState<string | null>(editingItem?.id || null);
  const [editName, setEditName] = useState(editingItem?.foodNameSnapshot || '');
  const [editIngredients, setEditIngredients] = useState(
    editingItem?.ingredientsSnapshot || ''
  );
  const [editGrams, setEditGrams] = useState(String(editingItem?.grams || 100));
  const [editCalories, setEditCalories] = useState(
    String(editingItem?.calories || 0)
  );
  const [editProtein, setEditProtein] = useState(
    String(editingItem?.protein || 0)
  );
  const [editCarbs, setEditCarbs] = useState(
    String(editingItem?.carbohydrates || 0)
  );
  const [editFat, setEditFat] = useState(String(editingItem?.fat || 0));
  const [editSodium, setEditSodium] = useState(
    editingItem?.sodiumMg !== undefined ? String(editingItem.sodiumMg) : ''
  );
  const [editSugar, setEditSugar] = useState(
    editingItem?.sugarG !== undefined ? String(editingItem.sugarG) : ''
  );
  const [editCat, setEditCat] = useState<MealCategory>(
    editingItem?.category || 'breakfast'
  );

  React.useEffect(() => {
    if (editingItem) {
      setEditId(editingItem.id);
      setEditName(editingItem.foodNameSnapshot);
      setEditIngredients(editingItem.ingredientsSnapshot || '');
      setEditGrams(String(editingItem.grams));
      setEditCalories(String(editingItem.calories));
      setEditProtein(String(editingItem.protein));
      setEditCarbs(String(editingItem.carbohydrates));
      setEditFat(String(editingItem.fat));
      setEditSodium(
        editingItem.sodiumMg !== undefined ? String(editingItem.sodiumMg) : ''
      );
      setEditSugar(
        editingItem.sugarG !== undefined ? String(editingItem.sugarG) : ''
      );
      setEditCat(editingItem.category);
    }
  }, [editingItem]);

  const startEditing = (item: MealItem) => {
    setEditId(item.id);
    setEditName(item.foodNameSnapshot);
    setEditIngredients(item.ingredientsSnapshot || '');
    setEditGrams(String(item.grams));
    setEditCalories(String(item.calories));
    setEditProtein(String(item.protein));
    setEditCarbs(String(item.carbohydrates));
    setEditFat(String(item.fat));
    setEditSodium(item.sodiumMg !== undefined ? String(item.sodiumMg) : '');
    setEditSugar(item.sugarG !== undefined ? String(item.sugarG) : '');
    setEditCat(item.category);
  };

  const cancelEditing = () => {
    setEditId(null);
    onClearEditingItem();
  };

  const handleEditGramsScale = (nextGramsStr: string) => {
    const prev = parseFloat(editGrams);
    const next = parseFloat(nextGramsStr);
    setEditGrams(nextGramsStr);
    if (Number.isFinite(prev) && prev > 0 && Number.isFinite(next) && next >= 0) {
      const ratio = next / prev;
      const scale = (s: string) => {
        const n = parseFloat(s);
        return Number.isFinite(n) ? String(Math.round(n * ratio * 100) / 100) : s;
      };
      setEditCalories(scale(editCalories));
      setEditProtein(scale(editProtein));
      setEditCarbs(scale(editCarbs));
      setEditFat(scale(editFat));
      if (editSodium) setEditSodium(String(Math.round(parseFloat(editSodium) * ratio)));
      if (editSugar) setEditSugar(String(Math.round(parseFloat(editSugar) * ratio * 10) / 10));
    }
  };

  const saveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    const g = parseFloat(editGrams);
    const cal = parseFloat(editCalories);
    const pro = parseFloat(editProtein);
    const carb = parseFloat(editCarbs);
    const f = parseFloat(editFat);

    if (!editName.trim() || !Number.isFinite(g) || g <= 0) return;

    const na = editSodium.trim() ? Math.round(parseFloat(editSodium)) : undefined;
    const sug = editSugar.trim() ? Math.round(parseFloat(editSugar) * 10) / 10 : undefined;

    await updateMealItemSnapshot(editId, {
      foodNameSnapshot: editName.trim(),
      ingredientsSnapshot: editIngredients.trim() || undefined,
      grams: Math.round(g * 100) / 100,
      calories: Math.round((Number.isFinite(cal) ? cal : 0) * 100) / 100,
      protein: Math.round((Number.isFinite(pro) ? pro : 0) * 100) / 100,
      carbohydrates: Math.round((Number.isFinite(carb) ? carb : 0) * 100) / 100,
      fat: Math.round((Number.isFinite(f) ? f : 0) * 100) / 100,
      sodiumMg: na,
      sugarG: sug,
      category: editCat,
    });

    cancelEditing();
  };

  const summary = calculateDailySummary(dayItems, {
    calorieTarget: goals.calorieTarget,
    proteinTargetG: goals.proteinTargetG,
    carbsTargetG: goals.carbsTargetG,
    fatTargetG: goals.fatTargetG,
  });

  const frequentCatalog = [...catalog]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 8);

  const catalogCategories = [
    'ALL',
    ...Array.from(new Set(catalog.map((c) => c.category || 'Other'))),
  ];

  const filteredCatalog = catalog.filter((c) => {
    const matchesSearch = c.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesCat =
      selectedCatalogCategory === 'ALL' ||
      (c.category || 'Other') === selectedCatalogCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddFromCatalog = async (food: FoodCatalogItem, overrideGrams?: number) => {
    const rawGrams = portionGramsMap[food.id];
    const grams =
      overrideGrams !== undefined
        ? overrideGrams
        : rawGrams !== undefined
        ? parseFloat(rawGrams)
        : food.defaultServingGrams;
    if (!Number.isFinite(grams) || grams <= 0) return;

    await addCatalogFoodToMeal(food, grams, selectedDate, activeCategory);
  };

  const todayStr = getBangkokDateString();

  return (
    <div className="screen-container">
      {/* Top Segmented Mode Switcher: Daily Log vs. Monthly Calendar */}
      <div className="flex items-center justify-between gap-3 mb-4 bg-white p-2 rounded-2xl border border-[#E9EAF2] shadow-2xs">
        <div className="flex bg-[#EFEDFF]/70 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-[#6258F5] shadow-xs'
                : 'text-[#858BA0] hover:text-[#20243A]'
            }`}
          >
            <BookOpen size={14} />
            <span>บันทึกรายวัน (Daily View)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-[#6258F5] shadow-xs'
                : 'text-[#858BA0] hover:text-[#20243A]'
            }`}
          >
            <Calendar size={14} />
            <span>ปฏิทินย้อนหลัง & Git Archive</span>
          </button>
        </div>

        {viewMode === 'daily' && (
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#6258F5] hover:underline px-2"
          >
            <span>ดูภาพรวมปฏิทินทั้งเดือน →</span>
          </button>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <MonthlyCalendar
          selectedDate={selectedDate}
          onSelectDate={onChangeDate}
          allMealItems={allMealItems}
          goals={goals}
          profile={profile}
          settings={settings}
          onOpenDailyDiary={(date) => {
            onChangeDate(date);
            setViewMode('daily');
          }}
          onBackToDaily={() => setViewMode('daily')}
        />
      ) : (
        <>
          {/* Date Navigation Bar */}
          <header className="card diary-date-bar">
            <div className="date-nav-controls">
              <button
                type="button"
                className="icon-btn"
                onClick={() => onChangeDate(shiftDateString(selectedDate, -1))}
                aria-label="Previous day"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="date-picker-center">
                <Calendar size={16} />
                <input
                  type="date"
                  className="date-input-native"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) onChangeDate(e.target.value);
                  }}
                  aria-label="Select diary date"
                />
                <span className="date-friendly-label">
                  {formatDisplayDate(selectedDate)}
                  {selectedDate === todayStr && (
                    <span className="today-tag">Today</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => onChangeDate(shiftDateString(selectedDate, 1))}
                aria-label="Next day"
              >
                <ChevronRight size={20} />
              </button>
            </div>

        {/* Daily Nutrition Totals Summary Strip */}
        <div className="diary-summary-strip">
          <div className="strip-stat">
            <span className="strip-label">Calories</span>
            <strong className="strip-val">
              {Math.round(summary.consumedCalories)} / {goals.calorieTarget} kcal
            </strong>
          </div>
          <div className="strip-stat">
            <span className="strip-label">Protein</span>
            <strong className="strip-val">
              {summary.consumedProtein} / {goals.proteinTargetG}g
            </strong>
          </div>
          <div className="strip-stat">
            <span className="strip-label">Carbs</span>
            <strong className="strip-val">
              {summary.consumedCarbs} / {goals.carbsTargetG}g
            </strong>
          </div>
          <div className="strip-stat">
            <span className="strip-label">Fat</span>
            <strong className="strip-val">
              {summary.consumedFat} / {goals.fatTargetG}g
            </strong>
          </div>
          <div className="strip-stat">
            <span className="strip-label">Sodium</span>
            <strong
              className="strip-val"
              style={{
                color:
                  summary.consumedSodiumMg > 2000 ? '#EB6478' : undefined,
              }}
            >
              {summary.consumedSodiumMg.toLocaleString()} mg
            </strong>
          </div>
          <div className="strip-stat">
            <span className="strip-label">Sugar</span>
            <strong
              className="strip-val"
              style={{
                color: summary.consumedSugarG > 24 ? '#EB6478' : undefined,
              }}
            >
              {summary.consumedSugarG} g
            </strong>
          </div>
        </div>
      </header>

      {/* Edit Item Modal / Card when editing an existing entry */}
      {editId && (
        <section className="card edit-entry-card">
          <div className="section-header">
            <h2 className="section-title">
              <Edit3 size={18} /> Edit Logged Food Entry
            </h2>
            <button
              type="button"
              className="icon-btn"
              onClick={cancelEditing}
              aria-label="Close edit form"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={saveEditItem} className="form-stack">
            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Food Name</label>
                <input
                  type="text"
                  className="input-text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Meal Category</label>
                <select
                  className="input-select"
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value as MealCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-field">
              <label className="field-label">Ingredients / Notes</label>
              <input
                type="text"
                className="input-text"
                value={editIngredients}
                onChange={(e) => setEditIngredients(e.target.value)}
              />
            </div>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Portion Weight (g)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="input-text"
                  value={editGrams}
                  onChange={(e) => handleEditGramsScale(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Calories (kcal)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  value={editCalories}
                  onChange={(e) => setEditCalories(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-field">
                <label className="field-label">Protein (g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  value={editProtein}
                  onChange={(e) => setEditProtein(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Carbs (g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  value={editCarbs}
                  onChange={(e) => setEditCarbs(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Fat (g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  value={editFat}
                  onChange={(e) => setEditFat(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Sodium (mg)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  placeholder="e.g. 450"
                  value={editSodium}
                  onChange={(e) => setEditSodium(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="field-label">Sugar (g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input-text"
                  placeholder="e.g. 5"
                  value={editSugar}
                  onChange={(e) => setEditSugar(e.target.value)}
                />
              </div>
            </div>
            <div className="cta-row">
              <button type="submit" className="btn btn-primary btn-sm">
                <Check size={16} /> Update Entry
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={cancelEditing}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 4 Meal Sections: Breakfast, Lunch, Dinner, Snacks */}
      <div className="diary-meals-grid">
        {CATEGORIES.map(({ key, label }) => {
          const items = dayItems.filter((i) => i.category === key);
          const catCalories = Math.round(
            items.reduce((acc, c) => acc + c.calories, 0)
          );
          const catProtein =
            Math.round(items.reduce((acc, c) => acc + c.protein, 0) * 10) / 10;

          return (
            <section
              key={key}
              className={`card meal-section-card ${
                activeCategory === key ? 'meal-section-active' : ''
              }`}
            >
              <div className="section-header">
                <div>
                  <h2 className="section-title">{label}</h2>
                  <p className="meal-section-sub">
                    {catCalories} kcal · {catProtein}g protein
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setActiveCategory(key);
                    onOpenConfirmMeal({
                      foodName: '',
                      ingredients: '',
                      servingGrams: 150,
                      calories: 0,
                      protein: 0,
                      carbohydrates: 0,
                      fat: 0,
                      category: key,
                      source: 'user_custom',
                      requiresExplicitConfirmation: false,
                    });
                  }}
                >
                  <Plus size={14} /> Custom {label}
                </button>
              </div>

              {items.length === 0 ? (
                <p className="meal-empty-hint">No {label.toLowerCase()} items logged.</p>
              ) : (
                <div className="meal-items-list">
                  {items.map((item) => (
                    <div key={item.id} className="meal-item-row">
                      <div className="meal-item-info">
                        <div className="meal-item-name">
                          {item.foodNameSnapshot}
                        </div>
                        {item.ingredientsSnapshot && (
                          <div className="meal-item-ingredients">
                            {item.ingredientsSnapshot}
                          </div>
                        )}
                        <div className="meal-item-macros">
                          {item.grams}g · P {item.protein}g · C{' '}
                          {item.carbohydrates}g · F {item.fat}g
                          {(item.sodiumMg !== undefined || item.sugarG !== undefined) && (
                            <span style={{ marginLeft: 6, color: '#6258F5', fontWeight: 500 }}>
                              · {item.sodiumMg !== undefined && `🧂 Na: ${item.sodiumMg}mg `}
                              {item.sugarG !== undefined && `🍬 น้ำตาล: ${item.sugarG}g`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="meal-item-right">
                        <span className="meal-item-kcal">
                          {Math.round(item.calories)} kcal
                        </span>
                        <div className="icon-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => startEditing(item)}
                            aria-label={`Edit ${item.foodNameSnapshot}`}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => deleteMealItem(item.id)}
                            aria-label={`Delete ${item.foodNameSnapshot}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Frequently Used Foods & Reference Catalog Picker */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Star size={18} /> ค้นหาอาหารไทย & วัตถุดิบ (พร้อมหน่วยตวงด่วน)
            </h2>
            <p className="screen-subtitle">
              เลือกมื้ออาหาร กดปุ่มหน่วยตวง (เช่น 1 ทัพพี, 1 จาน, 1 ฟอง) หรือระบุกรัมเองได้เลย
            </p>
          </div>

          <div className="form-row-inline">
            <label htmlFor="diary-target-cat" className="field-label">
              Log to:
            </label>
            <select
              id="diary-target-cat"
              className="input-select"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as MealCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequent Foods Quick Bar */}
        <div style={{ marginBottom: '0.85rem' }}>
          <span className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
            Frequently Used Foods:
          </span>
          <div className="quick-chips-row">
            {frequentCatalog.map((food) => {
              const shortName = food.name.split('/')[0].trim();
              return (
                <button
                  key={food.id}
                  type="button"
                  className="food-chip"
                  onClick={() =>
                    addCatalogFoodToMeal(
                      food,
                      food.defaultServingGrams,
                      selectedDate,
                      activeCategory
                    )
                  }
                >
                  <Plus size={14} />
                  <span>{shortName}</span>
                  <small>{food.defaultServingGrams}g</small>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="quick-chips-row" style={{ marginBottom: '0.85rem' }}>
          {catalogCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${
                selectedCatalogCategory === cat ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => setSelectedCatalogCategory(cat)}
            >
              {cat === 'ALL' ? 'ทั้งหมด (All)' : cat}
            </button>
          ))}
        </div>

        {/* Search Catalog */}
        <div className="search-bar-wrapper">
          <Search size={16} className="search-bar-icon" />
          <input
            type="search"
            className="input-text search-input"
            placeholder="ค้นหาชื่ออาหารภาษาไทย หรือ English (เช่น ข้าวมันไก่, กะเพรา, อกไก่, เวย์)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="catalog-results-list">
          {filteredCatalog.map((food) => {
            const gramsVal =
              portionGramsMap[food.id] !== undefined
                ? portionGramsMap[food.id]
                : String(food.defaultServingGrams);
            const numericGrams = parseFloat(gramsVal);
            const preview =
              Number.isFinite(numericGrams) && numericGrams >= 0
                ? calculateFoodNutrition(
                    {
                      calories: food.caloriesPer100g,
                      protein: food.proteinPer100g,
                      carbohydrates: food.carbsPer100g,
                      fat: food.fatPer100g,
                    },
                    numericGrams
                  )
                : null;

            return (
              <div key={food.id} className="catalog-item-row">
                <div className="catalog-item-main" style={{ flex: 1, minWidth: '240px' }}>
                  <div className="catalog-item-title">{food.name}</div>
                  <div className="catalog-item-sub">
                    Per 100g: {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · C{' '}
                    {food.carbsPer100g}g · F {food.fatPer100g}g
                  </div>

                  {/* Portion Presets Buttons */}
                  {food.portionPresets && food.portionPresets.length > 0 && (
                    <div
                      className="quick-chips-row"
                      style={{ marginTop: '0.45rem', marginBottom: '0.25rem' }}
                    >
                      {food.portionPresets.map((preset) => {
                        const isSelected = Number(gramsVal) === preset.grams;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            className="food-chip"
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.74rem',
                              borderColor: isSelected
                                ? 'var(--color-primary)'
                                : 'var(--border-subtle)',
                              background: isSelected
                                ? '#EFEDFF'
                                : 'var(--bg-input)',
                              color: isSelected ? '#6258F5' : 'var(--text-primary)',
                            }}
                            onClick={() =>
                              setPortionGramsMap((prev) => ({
                                ...prev,
                                [food.id]: String(preset.grams),
                              }))
                            }
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {preview && (
                    <div className="catalog-item-preview">
                      สัดส่วนที่เลือก ({preview.grams}g):{' '}
                      <strong>{preview.calories} kcal</strong> (P: {preview.protein}g, C:{' '}
                      {preview.carbohydrates}g, F: {preview.fat}g)
                    </div>
                  )}
                  <div className="catalog-item-source">{food.sourceLabel}</div>
                </div>

                <div className="catalog-item-controls">
                  <div className="grams-input-group">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="input-text input-grams"
                      value={gramsVal}
                      onChange={(e) =>
                        setPortionGramsMap((prev) => ({
                          ...prev,
                          [food.id]: e.target.value,
                        }))
                      }
                      aria-label={`Grams for ${food.name}`}
                    />
                    <span>g</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddFromCatalog(food)}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
        </>
      )}
    </div>
  );
};
