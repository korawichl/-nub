import React, { useState } from 'react';
import type {
  ActivityLog,
  ConfirmMealDraft,
  FoodCatalogItem,
  MealCategory,
  MealItem,
  NutritionGoals,
} from '../types';
import { formatDisplayDate, getBangkokDateString } from '../utils/date';
import { calculateDailySummary } from '../utils/nutritionCalculator';
import {
  addActivityLogEntry,
  addCatalogFoodToMeal,
  deleteActivityLogEntry,
  deleteMealItem,
} from '../db/database';
import {
  Camera,
  Plus,
  Flame,
  Utensils,
  Trash2,
  Edit3,
  Scale,
  Dumbbell,
  Clock,
  CheckCircle2,
  Droplets,
  Waves,
  Activity,
} from 'lucide-react';

interface TodayDashboardProps {
  todayItems: MealItem[];
  todayActivities: ActivityLog[];
  goals: NutritionGoals;
  frequentFoods: FoodCatalogItem[];
  onNavigateToDiary: (category?: MealCategory) => void;
  onNavigateToScanner: () => void;
  onOpenConfirmMeal: (draft: ConfirmMealDraft) => void;
  onEditMealItem: (item: MealItem) => void;
  onQuickLogWeight: () => void;
}

const MEAL_ORDER: { key: MealCategory; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  todayItems,
  todayActivities,
  goals,
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

  // Separate water intake logs from workout training logs
  const waterLogs = todayActivities.filter((a) => a.activityType === 'water_intake');
  const workoutLogs = todayActivities.filter((a) => a.activityType !== 'water_intake');

  const consumedWaterMl = waterLogs.reduce(
    (sum, a) => sum + (a.waterMl || a.durationMinutes || 0),
    0
  );
  const waterTargetMl = goals.waterTargetMl || 3000;
  const waterPct = Math.min(100, Math.round((consumedWaterMl / waterTargetMl) * 100));

  // Custom Workout Form State
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutType, setWorkoutType] = useState('Swimming (ว่ายน้ำ)');
  const [workoutDuration, setWorkoutDuration] = useState('60');
  const [workoutIntensity, setWorkoutIntensity] = useState<'low' | 'moderate' | 'high'>('high');
  const [workoutNotes, setWorkoutNotes] = useState('');

  const ringRadius = 64;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const clampedPct = Math.min(100, Math.max(0, summary.calorieProgressPercent));
  const strokeDashoffset =
    ringCircumference - (clampedPct / 100) * ringCircumference;
  const isOverCalories = summary.remainingCalories < 0;

  const handleQuickAddCatalog = async (food: FoodCatalogItem) => {
    await addCatalogFoodToMeal(
      food,
      food.defaultServingGrams,
      todayBangkok,
      'snacks'
    );
  };

  const handleAddWater = async (ml: number) => {
    await addActivityLogEntry({
      date: todayBangkok,
      activityType: 'water_intake',
      durationMinutes: 0,
      waterMl: ml,
      notes: `${ml} ml water`,
    });
  };

  const handleResetTodayWater = async () => {
    await Promise.all(waterLogs.map((w) => deleteActivityLogEntry(w.id)));
  };

  const handleQuickWorkout = async (
    label: string,
    minutes: number,
    intensity: 'low' | 'moderate' | 'high',
    notes?: string
  ) => {
    await addActivityLogEntry({
      date: todayBangkok,
      activityType: label,
      durationMinutes: minutes,
      intensity,
      notes,
    });
  };

  const handleCustomWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(workoutDuration, 10);
    if (!Number.isFinite(mins) || mins <= 0) return;

    await addActivityLogEntry({
      date: todayBangkok,
      activityType: workoutType,
      durationMinutes: mins,
      intensity: workoutIntensity,
      notes: workoutNotes.trim() || undefined,
    });
    setWorkoutNotes('');
    setShowWorkoutForm(false);
  };

  return (
    <div className="screen-container">
      {/* Header Banner */}
      <header className="dashboard-header card">
        <div className="dashboard-header-top">
          <div>
            <span className="badge badge-accent">
              <Clock size={12} /> Asia/Bangkok (ICT)
            </span>
            <h1 className="screen-title">Today Dashboard</h1>
            <p className="screen-subtitle">
              {formatDisplayDate(todayBangkok)} ({todayBangkok})
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onQuickLogWeight}
            title="Log Today's Weight"
          >
            <Scale size={16} /> Log Weight
          </button>
        </div>

        {/* Primary CTA Buttons */}
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateToDiary('breakfast')}
          >
            <Plus size={18} /> Add Food
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={onNavigateToScanner}
          >
            <Camera size={18} /> Take Food Photo
          </button>
        </div>
      </header>

      {/* Calorie & Macro Progress Card */}
      <section className="card nutrition-overview-card">
        <div className="calorie-hero-grid">
          <div className="calorie-ring-wrapper">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                stroke={isOverCalories ? 'var(--color-danger)' : 'var(--color-primary)'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div className="calorie-ring-center">
              <Flame
                size={20}
                color={isOverCalories ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <span className="ring-value">
                {Math.round(Math.abs(summary.remainingCalories)).toLocaleString()}
              </span>
              <span className="ring-label">
                {isOverCalories ? 'kcal over' : 'kcal left'}
              </span>
            </div>
          </div>

          <div className="calorie-stats-column">
            <div className="stat-item">
              <span className="stat-label">Daily Target</span>
              <span className="stat-value">
                {goals.calorieTarget.toLocaleString()} kcal
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Consumed Today</span>
              <span className="stat-value highlight-primary">
                {summary.consumedCalories.toLocaleString()} kcal
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Remaining</span>
              <span
                className={`stat-value ${
                  isOverCalories ? 'text-danger' : 'text-success'
                }`}
              >
                {summary.remainingCalories.toLocaleString()} kcal
              </span>
            </div>
            <div className="stat-footnote">
              <Dumbbell size={13} /> Est. TDEE: {goals.estimatedTdee.toLocaleString()} kcal/day
            </div>
          </div>
        </div>

        {/* Macro Progress Bars */}
        <div className="macros-grid">
          <div className="macro-card">
            <div className="macro-header">
              <span className="macro-title">Protein</span>
              <span className="macro-pct">{summary.proteinProgressPercent}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill fill-protein"
                style={{
                  width: `${Math.min(100, summary.proteinProgressPercent)}%`,
                }}
              />
            </div>
            <div className="macro-numbers">
              <strong>{summary.consumedProtein}g</strong> / {goals.proteinTargetG}g
            </div>
          </div>

          <div className="macro-card">
            <div className="macro-header">
              <span className="macro-title">Carbs</span>
              <span className="macro-pct">{summary.carbsProgressPercent}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill fill-carbs"
                style={{
                  width: `${Math.min(100, summary.carbsProgressPercent)}%`,
                }}
              />
            </div>
            <div className="macro-numbers">
              <strong>{summary.consumedCarbs}g</strong> / {goals.carbsTargetG}g
            </div>
          </div>

          <div className="macro-card">
            <div className="macro-header">
              <span className="macro-title">Fat</span>
              <span className="macro-pct">{summary.fatProgressPercent}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill fill-fat"
                style={{
                  width: `${Math.min(100, summary.fatProgressPercent)}%`,
                }}
              />
            </div>
            <div className="macro-numbers">
              <strong>{summary.consumedFat}g</strong> / {goals.fatTargetG}g
            </div>
          </div>
        </div>
      </section>

      {/* Training (Swimming & Strength) & Hydration Row */}
      <div className="form-grid-2">
        {/* Water & Hydration Card */}
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">
              <Droplets size={18} color="#3b82f6" /> Hydration / ดื่มน้ำวันนี้
            </h2>
            <span className="badge badge-accent">
              {(consumedWaterMl / 1000).toFixed(2)} / {(waterTargetMl / 1000).toFixed(1)} L ({waterPct}%)
            </span>
          </div>

          <div className="progress-track" style={{ height: '10px', marginBottom: '0.75rem' }}>
            <div
              className="progress-fill fill-protein"
              style={{ width: `${waterPct}%` }}
            />
          </div>

          <div className="quick-chips-row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddWater(250)}
            >
              +250 ml (1 แก้ว)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddWater(500)}
            >
              +500 ml (1 ขวดเล็ก)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddWater(750)}
            >
              +750 ml (กระบอกซ้อม)
            </button>
            {consumedWaterMl > 0 && (
              <button
                type="button"
                className="btn-link"
                onClick={handleResetTodayWater}
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Swimming & Strength Training Tracker Card */}
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">
              <Activity size={18} color="#10b981" /> Training Log (ว่ายน้ำ & เวท)
            </h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowWorkoutForm((v) => !v)}
            >
              {showWorkoutForm ? 'Close' : '+ Custom Session'}
            </button>
          </div>

          <div className="quick-chips-row" style={{ marginBottom: '0.65rem' }}>
            <button
              type="button"
              className="food-chip"
              onClick={() =>
                handleQuickWorkout('Swimming (ว่ายน้ำ)', 60, 'high', 'Pool training 60m')
              }
            >
              <Waves size={14} color="#3b82f6" />
              <span>+ ว่ายน้ำ 60 นาที</span>
            </button>
            <button
              type="button"
              className="food-chip"
              onClick={() =>
                handleQuickWorkout(
                  'Strength Training (เวทเทรนนิ่ง)',
                  45,
                  'high',
                  'Weight training 45m'
                )
              }
            >
              <Dumbbell size={14} color="#10b981" />
              <span>+ เวทเทรนนิ่ง 45 นาที</span>
            </button>
          </div>

          {showWorkoutForm && (
            <form
              onSubmit={handleCustomWorkoutSubmit}
              className="form-stack"
              style={{
                background: 'var(--bg-elevated)',
                padding: '0.75rem',
                borderRadius: '10px',
                marginBottom: '0.65rem',
              }}
            >
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="field-label">Activity</label>
                  <select
                    className="input-select"
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value)}
                  >
                    <option value="Swimming (ว่ายน้ำ)">Swimming (ว่ายน้ำ)</option>
                    <option value="Strength Training (เวทเทรนนิ่ง)">
                      Strength Training (เวทเทรนนิ่ง)
                    </option>
                    <option value="Cardio / Running">Cardio / Running</option>
                    <option value="Mobility / Active Recovery">
                      Mobility / Active Recovery
                    </option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label">Duration (mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    className="input-text"
                    value={workoutDuration}
                    onChange={(e) => setWorkoutDuration(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="field-label">Intensity</label>
                  <select
                    className="input-select"
                    value={workoutIntensity}
                    onChange={(e) =>
                      setWorkoutIntensity(e.target.value as 'low' | 'moderate' | 'high')
                    }
                  >
                    <option value="low">Low / Recovery</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High / Intense</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label">Notes (Distance / Sets)</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g., 2,000m freestyle / Upper body"
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Training Session
              </button>
            </form>
          )}

          {workoutLogs.length === 0 ? (
            <p className="meal-empty-hint">
              ยังไม่ได้บันทึกการซ้อมวันนี้ (TDEE คำนวณรวมค่าเฉลี่ยการซ้อมไว้แล้ว)
            </p>
          ) : (
            <div className="meal-items-list">
              {workoutLogs.map((w) => (
                <div key={w.id} className="meal-item-row" style={{ padding: '0.45rem 0.25rem' }}>
                  <div>
                    <div className="meal-item-name">
                      {w.activityType}
                      <span className="source-pill">
                        {w.durationMinutes} mins · {w.intensity || 'high'}
                      </span>
                    </div>
                    {w.notes && <div className="meal-item-ingredients">{w.notes}</div>}
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => deleteActivityLogEntry(w.id)}
                    aria-label="Delete training log"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick-Add Frequent & Thai Reference Foods */}
      {frequentFoods.length > 0 && (
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Quick-Log อาหารไทย & เมนูที่ใช้บ่อย</h2>
            <button
              type="button"
              className="btn-link"
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
            >
              + Custom Meal
            </button>
          </div>
          <div className="quick-chips-row">
            {frequentFoods.slice(0, 8).map((food) => {
              const servingKcal = Math.round(
                (food.caloriesPer100g * food.defaultServingGrams) / 100
              );
              const shortName = food.name.split('/')[0].trim();
              return (
                <button
                  key={food.id}
                  type="button"
                  className="food-chip"
                  onClick={() => handleQuickAddCatalog(food)}
                  title={`Quick add ${food.defaultServingGrams}g to today's Snacks`}
                >
                  <Plus size={14} />
                  <span>{shortName}</span>
                  <small>
                    {food.defaultServingGrams}g · {servingKcal} kcal
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's Food Entries */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Utensils size={18} /> Today's Food Entries ({todayItems.length})
          </h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToDiary()}
          >
            Open Full Diary
          </button>
        </div>

        {todayItems.length === 0 ? (
          <div className="empty-state">
            <Utensils size={32} className="empty-icon" />
            <p className="empty-title">No food entries logged for today yet.</p>
            <p className="empty-desc">
              All totals above are calculated from actual saved records. Tap{' '}
              <strong>Add Food</strong> or select a quick-log food item above to start tracking.
            </p>
            <div className="empty-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onNavigateToDiary('breakfast')}
              >
                <Plus size={16} /> Log First Meal
              </button>
            </div>
          </div>
        ) : (
          <div className="meal-groups-list">
            {MEAL_ORDER.map(({ key, label }) => {
              const items = todayItems.filter((i) => i.category === key);
              if (items.length === 0) return null;
              const groupCalories = Math.round(
                items.reduce((acc, cur) => acc + cur.calories, 0)
              );

              return (
                <div key={key} className="meal-group-block">
                  <div className="meal-group-header">
                    <span className="meal-group-title">{label}</span>
                    <span className="meal-group-kcal">{groupCalories} kcal</span>
                  </div>
                  <div className="meal-items-list">
                    {items.map((item) => (
                      <div key={item.id} className="meal-item-row">
                        <div className="meal-item-info">
                          <div className="meal-item-name">
                            {item.foodNameSnapshot}
                            <span className="source-pill">
                              {item.sourceSnapshot === 'usda_reference' ? (
                                <>
                                  <CheckCircle2 size={11} /> USDA Ref
                                </>
                              ) : item.sourceSnapshot === 'thai_reference' ? (
                                <>
                                  <CheckCircle2 size={11} /> Thai Ref
                                </>
                              ) : item.sourceSnapshot === 'ai_confirmed' ? (
                                'AI Confirmed'
                              ) : (
                                'Custom'
                              )}
                            </span>
                          </div>
                          {item.ingredientsSnapshot && (
                            <div className="meal-item-ingredients">
                              {item.ingredientsSnapshot}
                            </div>
                          )}
                          <div className="meal-item-macros">
                            <span>{item.grams}g</span> ·{' '}
                            <span>P: {item.protein}g</span> ·{' '}
                            <span>C: {item.carbohydrates}g</span> ·{' '}
                            <span>F: {item.fat}g</span>
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
                              onClick={() => onEditMealItem(item)}
                              aria-label={`Edit ${item.foodNameSnapshot}`}
                              title="Edit entry"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => deleteMealItem(item.id)}
                              aria-label={`Delete ${item.foodNameSnapshot}`}
                              title="Delete entry"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
