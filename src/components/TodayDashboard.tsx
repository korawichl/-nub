import React, { useState } from 'react';
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
  deleteActivityLogEntry,
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
  CheckCircle2,
  Droplets,
  Waves,
  Activity,
  User,
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

const MEAL_SEGMENTS: {
  key: MealCategory;
  label: string;
  thaiLabel: string;
  color: string;
}[] = [
  { key: 'breakfast', label: 'Breakfast', thaiLabel: 'มื้อเช้า', color: '#00f2fe' },
  { key: 'lunch', label: 'Lunch', thaiLabel: 'มื้อเที่ยง', color: '#0ea5e9' },
  { key: 'dinner', label: 'Dinner', thaiLabel: 'มื้อเย็น', color: '#3b82f6' },
  { key: 'snacks', label: 'Snacks', thaiLabel: 'ของว่าง/เวย์', color: '#14b8a6' },
];

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

  // Water & Workout logs
  const waterLogs = todayActivities.filter((a) => a.activityType === 'water_intake');
  const workoutLogs = todayActivities.filter((a) => a.activityType !== 'water_intake');

  const consumedWaterMl = waterLogs.reduce(
    (sum, a) => sum + (a.waterMl || a.durationMinutes || 0),
    0
  );
  const waterTargetMl = goals.waterTargetMl || 3000;
  const waterPct = Math.min(100, Math.round((consumedWaterMl / waterTargetMl) * 100));

  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutType, setWorkoutType] = useState('Swimming (ว่ายน้ำ)');
  const [workoutDuration, setWorkoutDuration] = useState('60');
  const workoutIntensity: 'low' | 'moderate' | 'high' = 'high';
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Build 7-day history for the Compare Intake spline chart & mini bar chart
  const last7Days = Array.from({ length: 7 }, (_, idx) =>
    shiftDateString(todayBangkok, -(6 - idx))
  );

  const dailySeries = last7Days.map((dateStr) => {
    const items = allMealItems.filter((i) => i.date === dateStr);
    const kcal = Math.round(items.reduce((s, x) => s + x.calories, 0));
    const pro = Math.round(items.reduce((s, x) => s + x.protein, 0));
    const shortLabel = dateStr.slice(5); // MM-DD
    return { dateStr, shortLabel, kcal, pro };
  });

  // Multi-segment Donut math (Costs breakdown style)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const totalConsumed = Math.max(1, summary.consumedCalories);
  let accumulatedPercent = 0;

  const segmentBreakdown = MEAL_SEGMENTS.map((seg) => {
    const segItems = todayItems.filter((i) => i.category === seg.key);
    const kcal = Math.round(segItems.reduce((s, i) => s + i.calories, 0));
    const pro = Math.round(segItems.reduce((s, i) => s + i.protein, 0));
    const pct =
      summary.consumedCalories > 0
        ? Math.round((kcal / totalConsumed) * 100)
        : 0;
    const strokeLength = (pct / 100) * circumference;
    const strokeOffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += pct;
    return {
      ...seg,
      kcal,
      pro,
      pct,
      strokeLength,
      strokeOffset,
    };
  });

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

  // Render smooth SVG area curve for Compare Intake (Right bottom panel in reference image)
  const renderCompareSplineChart = () => {
    const w = 540;
    const h = 190;
    const padX = 38;
    const padY = 24;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const maxVal = Math.max(
      goals.calorieTarget * 1.2,
      ...dailySeries.map((d) => d.kcal),
      3200
    );

    const toX = (i: number) => padX + (i / 6) * innerW;
    const toY = (val: number) => padY + innerH - (val / maxVal) * innerH;

    const pts = dailySeries.map((d, i) => ({
      x: toX(i),
      y: toY(d.kcal),
      kcal: d.kcal,
      pro: d.pro,
      label: d.shortLabel,
      isToday: d.dateStr === todayBangkok,
    }));

    // Build smooth cubic bezier path
    const buildSmoothPath = (points: { x: number; y: number }[]) => {
      if (points.length === 0) return '';
      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const ctrlX1 = curr.x + (next.x - curr.x) / 2;
        const ctrlY1 = curr.y;
        const ctrlX2 = curr.x + (next.x - curr.x) / 2;
        const ctrlY2 = next.y;
        d += ` C ${ctrlX1.toFixed(1)} ${ctrlY1.toFixed(1)}, ${ctrlX2.toFixed(1)} ${ctrlY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
      }
      return d;
    };

    const linePath = buildSmoothPath(pts);
    const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(
      padY + innerH
    ).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

    const targetY = toY(goals.calorieTarget);

    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="pf-spline-svg"
        role="img"
        aria-label="7-Day Calorie and Target Curve"
      >
        <defs>
          <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yPos = padY + innerH * (1 - ratio);
          const labelVal = Math.round(maxVal * ratio);
          return (
            <g key={idx}>
              <line
                x1={padX}
                y1={yPos}
                x2={w - padX}
                y2={yPos}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={padX - 6}
                y={yPos + 3}
                fontSize="9"
                fill="var(--text-muted)"
                textAnchor="end"
              >
                {labelVal}
              </text>
            </g>
          );
        })}

        {/* Target Calorie Curve Line */}
        <line
          x1={padX}
          y1={targetY}
          x2={w - padX}
          y2={targetY}
          stroke="#14b8a6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Area & Smooth Curve */}
        <path d={areaPath} fill="url(#cyanAreaGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#00f2fe"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Vertical Pin Drops & Callout Badges like the reference image */}
        {pts.map((pt, i) => (
          <g key={i}>
            <line
              x1={pt.x}
              y1={pt.y}
              x2={pt.x}
              y2={padY + innerH}
              stroke="#00f2fe"
              strokeWidth="1"
              opacity={pt.kcal > 0 ? 0.35 : 0.1}
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.isToday ? 4.5 : 3.5}
              fill={pt.isToday ? '#00f2fe' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {pt.kcal > 0 && (
              <g transform={`translate(${pt.x}, ${Math.max(14, pt.y - 14)})`}>
                <rect
                  x="-22"
                  y="-10"
                  width="44"
                  height="15"
                  rx="4"
                  fill="#f8fafc"
                />
                <text
                  x="0"
                  y="1"
                  fontSize="8.5"
                  fontWeight="800"
                  fill="#061325"
                  textAnchor="middle"
                >
                  {pt.kcal}
                </text>
              </g>
            )}
            <text
              x={pt.x}
              y={h - 5}
              fontSize="9.5"
              fontWeight={pt.isToday ? '800' : '600'}
              fill={pt.isToday ? '#00f2fe' : 'var(--text-muted)'}
              textAnchor="middle"
            >
              {pt.isToday ? 'TODAY' : pt.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="screen-container">
      {/* Main 2-Column Personal Finance Style Grid */}
      <div className="pf-bento-grid">
        {/* LEFT COLUMN: Balance Card + Macro Goals + Weekly Bars */}
        <div className="pf-left-col">
          {/* 1. Balance / Calorie Budget Dark Hero Card */}
          <div className="pf-balance-card">
            <div className="pf-balance-top">
              <div>
                <span className="pf-balance-label">Remaining Budget</span>
                <div className="pf-balance-amount">
                  {Math.round(summary.remainingCalories).toLocaleString()}{' '}
                  <small>kcal</small>
                </div>
              </div>
              <button
                type="button"
                className="pf-avatar-btn"
                onClick={onQuickLogWeight}
                title="Log Body Weight"
              >
                <User size={18} />
              </button>
            </div>

            <div className="pf-card-chip-row">
              <span className="pf-chip-icon" />
              <span className="pf-dots-mask">•••• •••• •••• {profile.targetWeightKg}KG</span>
            </div>

            <div className="pf-flow-row">
              <div>
                <div className="pf-flow-val">
                  {Math.round(summary.consumedCalories).toLocaleString()} kcal
                </div>
                <div className="pf-flow-sub">Consumed Today ({formatDisplayDate(todayBangkok)})</div>
              </div>

              <div className="pf-load-ring-box">
                <span className="pf-load-label">Budget Load</span>
                <div className="pf-mini-circle">
                  {Math.min(999, Math.round(summary.calorieProgressPercent))}%
                </div>
              </div>
            </div>

            {/* Decorative Sparkline Wave inside Balance Card */}
            <svg viewBox="0 0 260 54" className="pf-mini-wave">
              <path
                d="M 0 42 Q 45 34, 85 28 T 175 18 T 260 12"
                fill="none"
                stroke="#00f2fe"
                strokeWidth="2"
              />
              <path
                d="M 0 46 Q 60 40, 120 35 T 260 26"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <circle cx="175" cy="18" r="4" fill="#00f2fe" stroke="#fff" strokeWidth="1.5" />
            </svg>

            <div className="pf-actual-change">
              Est. TDEE Expenditure <strong>{goals.estimatedTdee.toLocaleString()} kcal/d</strong>
            </div>

            {/* Primary Action Buttons inside Hero */}
            <div className="pf-hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => onNavigateToDiary('breakfast')}
              >
                <Plus size={15} /> Add Food
              </button>
              <button
                type="button"
                className="btn btn-accent btn-sm"
                style={{ flex: 1 }}
                onClick={onNavigateToScanner}
              >
                <Camera size={15} /> AI Photo Scan
              </button>
            </div>
          </div>

          {/* 2. Goals Progress List (Protein, Carbs, Fat, Hydration) */}
          <div className="pf-card pf-goals-card">
            <div className="pf-goals-header">
              <span>
                Goals{' '}
                <strong>
                  {Math.round(summary.consumedCalories)} / {goals.calorieTarget}
                </strong>
              </span>
              <span className="pf-goals-pct">
                {Math.min(100, Math.round(summary.calorieProgressPercent))}%
              </span>
            </div>
            <div className="pf-thin-bar" style={{ marginBottom: '0.9rem' }}>
              <div
                className="pf-thin-fill"
                style={{
                  width: `${Math.min(100, summary.calorieProgressPercent)}%`,
                }}
              />
            </div>

            <div className="pf-goal-rows">
              <div className="pf-goal-item">
                <div className="pf-goal-icon">P</div>
                <div className="pf-goal-body">
                  <div className="pf-goal-line">
                    <span>Protein</span>
                    <span>
                      {summary.consumedProtein}g / {goals.proteinTargetG}g
                    </span>
                    <strong>{summary.proteinProgressPercent}%</strong>
                  </div>
                  <div className="pf-thin-bar">
                    <div
                      className="pf-thin-fill"
                      style={{
                        width: `${Math.min(100, summary.proteinProgressPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pf-goal-item">
                <div className="pf-goal-icon">C</div>
                <div className="pf-goal-body">
                  <div className="pf-goal-line">
                    <span>Carbs</span>
                    <span>
                      {summary.consumedCarbs}g / {goals.carbsTargetG}g
                    </span>
                    <strong>{summary.carbsProgressPercent}%</strong>
                  </div>
                  <div className="pf-thin-bar">
                    <div
                      className="pf-thin-fill"
                      style={{
                        width: `${Math.min(100, summary.carbsProgressPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pf-goal-item">
                <div className="pf-goal-icon">F</div>
                <div className="pf-goal-body">
                  <div className="pf-goal-line">
                    <span>Fat</span>
                    <span>
                      {summary.consumedFat}g / {goals.fatTargetG}g
                    </span>
                    <strong>{summary.fatProgressPercent}%</strong>
                  </div>
                  <div className="pf-thin-bar">
                    <div
                      className="pf-thin-fill"
                      style={{
                        width: `${Math.min(100, summary.fatProgressPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pf-goal-item">
                <div className="pf-goal-icon">W</div>
                <div className="pf-goal-body">
                  <div className="pf-goal-line">
                    <span>Water</span>
                    <span>
                      {consumedWaterMl} / {waterTargetMl} ml
                    </span>
                    <strong>{waterPct}%</strong>
                  </div>
                  <div className="pf-thin-bar">
                    <div
                      className="pf-thin-fill"
                      style={{ width: `${waterPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Annual / Weekly Plans Vertical Bar Chart Card */}
          <div className="pf-card pf-plans-card">
            <div className="pf-card-title">Weekly Protein Adherence</div>
            <div className="pf-bars-container">
              {dailySeries.slice(-4).map((d, idx) => {
                const pct = Math.min(
                  100,
                  Math.max(12, Math.round((d.pro / goals.proteinTargetG) * 100))
                );
                const isToday = d.dateStr === todayBangkok;
                return (
                  <div key={idx} className="pf-bar-col">
                    <span className="pf-bar-top-val">{d.pro}g</span>
                    <div className="pf-bar-pair">
                      <div
                        className={`pf-bar-Main ${isToday ? 'neon' : ''}`}
                        style={{ height: `${pct}%` }}
                      />
                      <div className="pf-bar-Target" style={{ height: '85%' }} />
                    </div>
                    <span className={`pf-bar-label ${isToday ? 'active' : ''}`}>
                      {isToday ? 'Today' : d.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Multi-Segment Donut Breakdown + Compare Spline Chart */}
        <div className="pf-right-col">
          {/* 1. Top Right: Multi-Segment Donut Chart & Meal Category Breakdown */}
          <div className="pf-card pf-donut-card">
            <div className="pf-donut-header">
              <span className="pf-card-title">Calories by Meal</span>
              <span className="pf-total-highlight">
                {Math.round(summary.consumedCalories).toLocaleString()} kcal
              </span>
            </div>

            <div className="pf-donut-body">
              <div className="pf-donut-svg-wrap">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="22"
                  />
                  {summary.consumedCalories > 0 &&
                    segmentBreakdown.map((seg) => (
                      <circle
                        key={seg.key}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="22"
                        strokeDasharray={`${seg.strokeLength} ${circumference}`}
                        strokeDashoffset={seg.strokeOffset}
                        transform="rotate(-90 80 80)"
                      />
                    ))}
                </svg>
                <div className="pf-donut-center">
                  <strong>
                    {Math.round(summary.consumedCalories).toLocaleString()}
                  </strong>
                  <span>Total kcal</span>
                </div>
              </div>

              <div className="pf-donut-table">
                {segmentBreakdown.map((seg) => (
                  <div
                    key={seg.key}
                    className="pf-donut-row"
                    onClick={() => onNavigateToDiary(seg.key)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="pf-dot-name">
                      <i
                        className="pf-color-dot"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.label} <small>({seg.thaiLabel})</small>
                    </span>
                    <span className="pf-dot-pct">{seg.pct}%</span>
                    <span className="pf-dot-val">{seg.kcal} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Bottom Right: Compare Intake 7-Day Smooth Spline Curve */}
          <div className="pf-card pf-compare-card">
            <div className="pf-compare-header">
              <div className="pf-compare-title-group">
                <span className="pf-card-title">Compare Intake</span>
                <strong className="pf-cyan-val">
                  {Math.round(summary.consumedCalories).toLocaleString()} kcal
                </strong>
              </div>

              <div className="pf-compare-pills">
                <span className="pf-toggle-pill">
                  Target <strong>{goals.calorieTarget}</strong>
                  <i className="pf-pill-dot cyan" />
                </span>
                <span className="pf-toggle-pill">
                  Protein <strong>{summary.consumedProtein}g</strong>
                  <i className="pf-pill-dot teal" />
                </span>
              </div>
            </div>

            {renderCompareSplineChart()}
          </div>
        </div>
      </div>

      {/* Bottom Row: Hydration + Swimming/Strength Log + Quick Thai Foods + Today's Entries */}
      <div className="form-grid-2">
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">
              <Droplets size={18} color="#00f2fe" /> Hydration / ดื่มน้ำวันนี้
            </h2>
            <span className="badge badge-accent">
              {(consumedWaterMl / 1000).toFixed(2)} / {(waterTargetMl / 1000).toFixed(1)} L
            </span>
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
              +500 ml (1 ขวด)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddWater(750)}
            >
              +750 ml (กระบอกซ้อม)
            </button>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">
              <Activity size={18} color="#00f2fe" /> Training (ว่ายน้ำ & เวทเทรนนิ่ง)
            </h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowWorkoutForm((v) => !v)}
            >
              {showWorkoutForm ? 'Close' : '+ Custom'}
            </button>
          </div>

          <div className="quick-chips-row">
            <button
              type="button"
              className="food-chip"
              onClick={() =>
                handleQuickWorkout('Swimming (ว่ายน้ำ)', 60, 'high', 'Pool training 60m')
              }
            >
              <Waves size={14} color="#00f2fe" />
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
              <Dumbbell size={14} color="#14b8a6" />
              <span>+ เวทเทรนนิ่ง 45 นาที</span>
            </button>
            <button
              type="button"
              className="food-chip"
              onClick={onQuickLogWeight}
            >
              <Scale size={14} color="#38bdf8" />
              <span>ชั่งน้ำหนัก ({profile.initialWeightKg}→{profile.targetWeightKg}kg)</span>
            </button>
          </div>

          {showWorkoutForm && (
            <form
              onSubmit={handleCustomWorkoutSubmit}
              className="form-stack"
              style={{ marginTop: '0.75rem' }}
            >
              <div className="form-grid-2">
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
                </select>
                <input
                  type="number"
                  min="5"
                  max="300"
                  className="input-text"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                  placeholder="Minutes"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Session
              </button>
            </form>
          )}

          {workoutLogs.length > 0 && (
            <div className="meal-items-list" style={{ marginTop: '0.5rem' }}>
              {workoutLogs.map((w) => (
                <div key={w.id} className="meal-item-row" style={{ padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {w.activityType} ({w.durationMinutes} mins)
                  </span>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => deleteActivityLogEntry(w.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick-Log Thai & Frequent Foods */}
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
              >
                <Plus size={14} color="#00f2fe" />
                <span>{shortName}</span>
                <small>
                  {food.defaultServingGrams}g · {servingKcal} kcal
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's Logged Food Entries */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Utensils size={18} color="#00f2fe" /> Today's Logged Food ({todayItems.length})
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
            <p className="empty-title">ยังไม่มีรายการอาหารที่บันทึกในวันนี้</p>
            <p className="empty-desc">
              กดปุ่ม Add Food, เลือกเมนูอาหารไทยด่วนด้านบน หรือใช้ AI Photo Scan เพื่อเริ่มบันทึก
            </p>
          </div>
        ) : (
          <div className="meal-items-list">
            {todayItems.map((item) => (
              <div key={item.id} className="meal-item-row">
                <div className="meal-item-info">
                  <div className="meal-item-name">
                    {item.foodNameSnapshot}
                    <span className="source-pill">
                      {item.sourceSnapshot === 'ai_confirmed' ? (
                        'AI Vision'
                      ) : (
                        <>
                          <CheckCircle2 size={11} /> {item.category}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="meal-item-macros">
                    {item.grams}g · P: {item.protein}g · C: {item.carbohydrates}g · F:{' '}
                    {item.fat}g
                  </div>
                </div>
                <div className="meal-item-right">
                  <span className="meal-item-kcal">{Math.round(item.calories)} kcal</span>
                  <div className="icon-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onEditMealItem(item)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => deleteMealItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
