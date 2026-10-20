import React, { useState } from 'react';
import type { ActivityLog, MealItem, UserProfile, WeightLog } from '../types';
import { calculateWeightTrend } from '../utils/nutritionCalculator';
import { getBangkokDateString } from '../utils/date';
import { db, deleteActivityLogEntry } from '../db/database';
import {
  Scale,
  TrendingDown,
  Target,
  Flame,
  Dumbbell,
  Plus,
  Trash2,
  Info,
  Activity,
} from 'lucide-react';

interface ProgressScreenProps {
  profile: UserProfile;
  weightLogs: WeightLog[];
  allMealItems: MealItem[];
  allActivityLogs: ActivityLog[];
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  profile,
  weightLogs,
  allMealItems,
  allActivityLogs,
}) => {
  const [logDate, setLogDate] = useState(getBangkokDateString());
  const [weightInput, setWeightInput] = useState(
    weightLogs.length > 0
      ? String(weightLogs[weightLogs.length - 1].weightKg)
      : String(profile.initialWeightKg)
  );
  const [notesInput, setNotesInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trend = calculateWeightTrend(
    weightLogs.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    profile.initialWeightKg,
    profile.targetWeightKg
  );

  // Calculate average daily calorie and protein intake across logged days
  const dailyTotalsByDate = new Map<
    string,
    { calories: number; protein: number }
  >();
  for (const item of allMealItems) {
    const existing = dailyTotalsByDate.get(item.date) || {
      calories: 0,
      protein: 0,
    };
    existing.calories += item.calories;
    existing.protein += item.protein;
    dailyTotalsByDate.set(item.date, existing);
  }

  const loggedDaysCount = dailyTotalsByDate.size;
  let avgDailyCalories: number | null = null;
  let avgDailyProtein: number | null = null;

  if (loggedDaysCount > 0) {
    let totalCal = 0;
    let totalPro = 0;
    for (const day of dailyTotalsByDate.values()) {
      totalCal += day.calories;
      totalPro += day.protein;
    }
    avgDailyCalories = Math.round(totalCal / loggedDaysCount);
    avgDailyProtein = Math.round((totalPro / loggedDaysCount) * 10) / 10;
  }

  const workoutHistory = [...allActivityLogs]
    .filter((a) => a.activityType !== 'water_intake')
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalTrainingMinutes = workoutHistory.reduce(
    (sum, a) => sum + (a.durationMinutes || 0),
    0
  );

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseFloat(weightInput);
    if (!Number.isFinite(val) || val <= 20 || val > 400) {
      setError('Please enter a valid body weight between 20 kg and 400 kg.');
      return;
    }

    const existingForDate = await db.weightLogs
      .where('date')
      .equals(logDate)
      .first();

    await db.weightLogs.put({
      id: existingForDate ? existingForDate.id : `weight_${logDate}`,
      date: logDate,
      weightKg: Math.round(val * 100) / 100,
      notes: notesInput.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setNotesInput('');
  };

  const handleDeleteWeight = async (id: string) => {
    await db.weightLogs.delete(id);
  };

  // Render lightweight SVG chart if at least 2 points exist
  const renderWeightChart = () => {
    const pts = trend.points;
    if (pts.length < 2) return null;

    const width = 620;
    const height = 220;
    const padX = 44;
    const padY = 28;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const weights = pts.map((p) => p.weightKg);
    const minW = Math.min(...weights, profile.targetWeightKg) - 1;
    const maxW = Math.max(...weights, profile.initialWeightKg) + 1;
    const rangeW = Math.max(1, maxW - minW);

    const toX = (idx: number) =>
      padX + (idx / Math.max(1, pts.length - 1)) * innerW;
    const toY = (w: number) => padY + innerH - ((w - minW) / rangeW) * innerH;

    const linePath = pts
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.weightKg).toFixed(1)}`
      )
      .join(' ');

    const avgPts = pts
      .map((p, i) =>
        p.movingAverage7d !== null ? { i, val: p.movingAverage7d } : null
      )
      .filter((x): x is { i: number; val: number } => x !== null);

    const avgPath =
      avgPts.length >= 2
        ? avgPts
            .map(
              (pt, idx) =>
                `${idx === 0 ? 'M' : 'L'} ${toX(pt.i).toFixed(1)} ${toY(pt.val).toFixed(1)}`
            )
            .join(' ')
        : null;

    const targetY = toY(profile.targetWeightKg);

    return (
      <div className="chart-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="weight-svg-chart"
          role="img"
          aria-label="Weight history and trend chart"
        >
          {/* Target Weight Dashed Line */}
          <line
            x1={padX}
            y1={targetY}
            x2={width - padX}
            y2={targetY}
            stroke="#27AE82"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            opacity="0.85"
          />
          <text
            x={width - padX - 4}
            y={targetY - 6}
            fill="#27AE82"
            fontSize="11"
            textAnchor="end"
          >
            Target: {profile.targetWeightKg} kg
          </text>

          {/* Daily Weight Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#6258F5"
            strokeWidth="2.5"
          />

          {/* 7-Day Moving Average Line */}
          {avgPath && (
            <path
              d={avgPath}
              fill="none"
              stroke="#F2B544"
              strokeWidth="2.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points */}
          {pts.map((p, i) => (
            <g key={p.date}>
              <circle
                cx={toX(i)}
                cy={toY(p.weightKg)}
                r="4"
                fill="#6258F5"
              />
              <text
                x={toX(i)}
                y={toY(p.weightKg) - 8}
                fontSize="10"
                fill="#858BA0"
                textAnchor="middle"
              >
                {p.weightKg}
              </text>
            </g>
          ))}
        </svg>
        <div className="chart-legend">
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ background: '#6258F5' }}
            />
            Logged Weight (kg)
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#F2B544' }} />
            7-Day Rolling Average
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ background: '#27AE82' }}
            />
            Target ({profile.targetWeightKg} kg)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="screen-container">
      <header className="card">
        <h1 className="screen-title">Progress & Body Weight Trend</h1>
        <p className="screen-subtitle">
          Starting weight: <strong>{profile.initialWeightKg} kg</strong> · Target weight:{' '}
          <strong>{profile.targetWeightKg} kg</strong> ({profile.goal.replace('_', ' ')})
        </p>
      </header>

      {/* Log Weight Card */}
      <section className="card">
        <h2 className="section-title">
          <Scale size={18} /> Log Weight Measurement
        </h2>
        <p className="info-footnote" style={{ marginBottom: '0.75rem' }}>
          <Info size={14} />
          <span>
            Note: Single weight measurements fluctuate with hydration and glycogen. Your
            daily calorie and macro targets are never automatically altered from a single
            weigh-in.
          </span>
        </p>

        {error && (
          <div
            className="alert-banner alert-danger"
            style={{ marginBottom: '0.75rem' }}
          >
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveWeight} className="weight-log-form">
          <div className="form-grid-3">
            <div className="form-field">
              <label htmlFor="weight-date" className="field-label">
                Date
              </label>
              <input
                id="weight-date"
                type="date"
                className="input-text"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="weight-kg" className="field-label">
                Weight (kg)
              </label>
              <input
                id="weight-kg"
                type="number"
                step="0.1"
                min="20"
                max="400"
                className="input-text"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="weight-notes" className="field-label">
                Notes (optional)
              </label>
              <input
                id="weight-notes"
                type="text"
                className="input-text"
                placeholder="e.g., Morning post-swim"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary min-h-[44px] px-5 text-xs font-semibold">
            <Plus size={16} /> Save Weight Record
          </button>
        </form>
      </section>

      {/* Key Metrics Overview */}
      <section className="stats-cards-grid">
        <div className="card metric-box">
          <div className="metric-header">
            <Scale size={16} />
            <span>Latest Weight</span>
          </div>
          <div className="metric-main">
            {trend.latestWeightKg !== null
              ? `${trend.latestWeightKg} kg`
              : 'No data'}
          </div>
          <div className="metric-sub">
            {trend.totalChangeKg !== null
              ? `${trend.totalChangeKg > 0 ? '+' : ''}${trend.totalChangeKg} kg vs initial (${profile.initialWeightKg} kg)`
              : `Initial baseline: ${profile.initialWeightKg} kg`}
          </div>
        </div>

        <div className="card metric-box">
          <div className="metric-header">
            <TrendingDown size={16} />
            <span>7-Day Average</span>
          </div>
          <div className="metric-main">
            {trend.hasEnoughDataFor7DayAvg && trend.sevenDayAverageKg !== null
              ? `${trend.sevenDayAverageKg} kg`
              : 'Insufficient data'}
          </div>
          <div className="metric-sub">
            {trend.hasEnoughDataFor7DayAvg
              ? 'Rolling 7-entry mean'
              : `Log ${Math.max(0, 7 - trend.points.length)} more day(s) for 7-day avg`}
          </div>
        </div>

        <div className="card metric-box">
          <div className="metric-header">
            <Target size={16} />
            <span>Goal Progress ({profile.targetWeightKg} kg)</span>
          </div>
          <div className="metric-main">
            {trend.progressTowardTargetPercent !== null
              ? `${trend.progressTowardTargetPercent}%`
              : '0%'}
          </div>
          <div className="metric-sub">
            {trend.remainingToTargetKg !== null
              ? `${Math.max(0, trend.remainingToTargetKg)} kg remaining to target`
              : `Target: ${profile.initialWeightKg} kg → ${profile.targetWeightKg} kg`}
          </div>
        </div>

        <div className="card metric-box">
          <div className="metric-header">
            <Flame size={16} />
            <span>Avg Daily Intake</span>
          </div>
          <div className="metric-main">
            {avgDailyCalories !== null
              ? `${avgDailyCalories} kcal`
              : 'No meals logged'}
          </div>
          <div className="metric-sub">
            <Dumbbell size={12} />{' '}
            {avgDailyProtein !== null
              ? `Avg Protein: ${avgDailyProtein}g/day (${loggedDaysCount} d)`
              : 'Log meals to compute averages'}
          </div>
        </div>
      </section>

      {/* Weight History & Trend Section */}
      <section className="card">
        <h2 className="section-title">Weight History & Trend</h2>

        {trend.points.length === 0 ? (
          <div className="empty-state">
            <Scale size={32} className="empty-icon" />
            <p className="empty-title">No weight measurements recorded yet.</p>
            <p className="empty-desc">
              We never fabricate historical weight records. Log your first weight
              measurement above to start tracking your trend toward{' '}
              <strong>{profile.targetWeightKg} kg</strong>.
            </p>
          </div>
        ) : (
          <>
            {trend.points.length < 2 ? (
              <div
                className="alert-banner alert-info"
                style={{ marginBottom: '1rem' }}
              >
                <Info size={18} />
                <span>
                  1 weight record saved ({trend.points[0].weightKg} kg on{' '}
                  {trend.points[0].date}). Log at least 2 days to plot a trend line, and 7
                  days to compute a 7-day rolling average.
                </span>
              </div>
            ) : (
              renderWeightChart()
            )}

            <div className="weight-history-list">
              {[...weightLogs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((log) => (
                  <div key={log.id} className="meal-item-row">
                    <div>
                      <div className="meal-item-name">{log.date}</div>
                      {log.notes && (
                        <div className="meal-item-ingredients">{log.notes}</div>
                      )}
                    </div>
                    <div className="meal-item-right">
                      <span className="meal-item-kcal">{log.weightKg} kg</span>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleDeleteWeight(log.id)}
                        aria-label={`Delete weight record for ${log.date}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </section>

      {/* Training & Workout History Section */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Activity size={18} /> Swimming & Strength Training History
          </h2>
          <span className="badge badge-accent">
            {workoutHistory.length} session(s) · {totalTrainingMinutes} mins total
          </span>
        </div>

        {workoutHistory.length === 0 ? (
          <p className="meal-empty-hint">
            No training sessions logged yet. Use the Training Log on the Today Dashboard
            to record swimming or strength training sessions.
          </p>
        ) : (
          <div className="meal-items-list">
            {workoutHistory.map((w) => (
              <div key={w.id} className="meal-item-row">
                <div>
                  <div className="meal-item-name">
                    {w.date} — {w.activityType}
                    <span className="source-pill">
                      {w.durationMinutes} mins · {w.intensity || 'high'}
                    </span>
                  </div>
                  {w.notes && (
                    <div className="meal-item-ingredients">{w.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => deleteActivityLogEntry(w.id)}
                  aria-label="Delete workout record"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
