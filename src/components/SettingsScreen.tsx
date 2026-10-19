import React, { useState, useRef } from 'react';
import type {
  ActivityLevel,
  AppSettings,
  GoalType,
  MealItem,
  NutritionGoals,
  Sex,
  ThemeMode,
  UserProfile,
} from '../types';
import { db, resetAllDataToInitial } from '../db/database';
import {
  exportDatabaseToJson,
  generateMealItemsCsv,
  restoreDatabaseFromBackup,
} from '../db/backup';
import {
  ACTIVITY_FACTORS,
  calculateBMR,
  calculateMacros,
  calculateTDEE,
} from '../utils/nutritionCalculator';
import { getFoodAnalysisProvider } from '../services/aiProvider';
import {
  User,
  Target,
  Sun,
  Moon,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface SettingsScreenProps {
  profile: UserProfile;
  goals: NutritionGoals;
  settings: AppSettings;
  allMealItems: MealItem[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  goals,
  settings,
  allMealItems,
}) => {
  // Editable Profile State
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [initialWeightKg, setInitialWeightKg] = useState(
    String(profile.initialWeightKg)
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    String(profile.targetWeightKg)
  );
  const [goalType, setGoalType] = useState<GoalType>(profile.goal);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile.activityLevel
  );
  const [training, setTraining] = useState(profile.training);
  const [targetDate, setTargetDate] = useState(profile.targetDate || '');

  // Editable Nutrition Targets State
  const [calorieTarget, setCalorieTarget] = useState(String(goals.calorieTarget));
  const [proteinTargetG, setProteinTargetG] = useState(
    String(goals.proteinTargetG)
  );
  const [fatTargetG, setFatTargetG] = useState(String(goals.fatTargetG));
  const [carbsTargetG, setCarbsTargetG] = useState(String(goals.carbsTargetG));

  // Optional AI Provider Config State
  const [aiProviderId, setAiProviderId] = useState(settings.aiProviderId);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [aiEndpoint, setAiEndpoint] = useState(
    settings.aiBackendEndpoint || ''
  );

  // Feedback & Delete Confirmation State
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClearStep, setConfirmClearStep] = useState(false);

  const fileImportRef = useRef<HTMLInputElement | null>(null);

  const provider = getFoodAnalysisProvider(
    settings.aiProviderId,
    settings.aiBackendEndpoint,
    settings.geminiApiKey
  );

  // Recalculate BMR, TDEE, and remaining Carbs from current form inputs
  const handleRecalculateFromFormula = () => {
    const w = parseFloat(initialWeightKg);
    const h = parseFloat(heightCm);
    const a = parseFloat(age);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(a)) return;

    const newBmr = calculateBMR({ weightKg: w, heightCm: h, age: a, sex });
    const newTdee = calculateTDEE(newBmr, activityLevel);
    // Keep current calorieTarget or default -412 kcal deficit
    const cal = parseFloat(calorieTarget) || Math.max(1200, newTdee - 412);
    const pro = parseFloat(proteinTargetG) || 170;
    const fat = parseFloat(fatTargetG) || 85;
    const macros = calculateMacros({
      calorieTarget: cal,
      proteinGrams: pro,
      fatGrams: fat,
    });

    setCarbsTargetG(String(macros.carbsGrams));
    setStatusBanner({
      type: 'success',
      text: `Formula calculated: BMR = ${newBmr} kcal/day, Est. TDEE = ${newTdee} kcal/day, Carbs = ${macros.carbsGrams} g/day.`,
    });
  };

  const handleSaveProfileAndGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseInt(age, 10);
    const h = parseFloat(heightCm);
    const initW = parseFloat(initialWeightKg);
    const targW = parseFloat(targetWeightKg);

    const cal = parseFloat(calorieTarget);
    const pro = parseFloat(proteinTargetG);
    const fat = parseFloat(fatTargetG);
    const carb = parseFloat(carbsTargetG);

    if (
      !Number.isFinite(a) ||
      a <= 0 ||
      !Number.isFinite(h) ||
      h <= 0 ||
      !Number.isFinite(initW) ||
      initW <= 0 ||
      !Number.isFinite(targW) ||
      targW <= 0 ||
      !Number.isFinite(cal) ||
      cal <= 0
    ) {
      setStatusBanner({
        type: 'error',
        text: 'Please provide valid positive numbers for profile and calorie targets.',
      });
      return;
    }

    const bmr = calculateBMR({ weightKg: initW, heightCm: h, age: a, sex });
    const factor = ACTIVITY_FACTORS[activityLevel];
    const tdee = calculateTDEE(bmr, factor);

    const now = new Date().toISOString();

    await db.profiles.put({
      ...profile,
      age: a,
      sex,
      heightCm: h,
      initialWeightKg: initW,
      targetWeightKg: targW,
      goal: goalType,
      activityLevel,
      training: training.trim(),
      targetDate: targetDate.trim() || undefined,
      updatedAt: now,
    });

    await db.goals.put({
      ...goals,
      bmr,
      activityFactor: factor,
      estimatedTdee: tdee,
      calorieTarget: Math.round(cal * 100) / 100,
      proteinTargetG: Math.round((Number.isFinite(pro) ? pro : 0) * 100) / 100,
      fatTargetG: Math.round((Number.isFinite(fat) ? fat : 0) * 100) / 100,
      carbsTargetG: Math.round((Number.isFinite(carb) ? carb : 0) * 100) / 100,
      updatedAt: now,
    });

    setStatusBanner({
      type: 'success',
      text: 'Profile and nutrition targets saved to local IndexedDB.',
    });
  };

  const handleToggleTheme = async (nextTheme: ThemeMode) => {
    await db.settings.update(settings.id, {
      theme: nextTheme,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.update(settings.id, {
      aiProviderId,
      geminiApiKey: geminiApiKey.trim() || undefined,
      aiBackendEndpoint: aiEndpoint.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setStatusBanner({
      type: 'success',
      text: 'AI integration configuration updated.',
    });
  };

  const handleExportJson = async () => {
    try {
      const payload = await exportDatabaseToJson();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nub-nutrition-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusBanner({
        type: 'success',
        text: 'JSON backup exported successfully.',
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export JSON backup.',
      });
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await restoreDatabaseFromBackup(text);
      setStatusBanner({
        type: 'success',
        text: `Backup restored: ${res.mealItemsRestored} food entries, ${res.weightLogsRestored} weight records, and ${res.catalogItemsRestored} catalog items.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to restore JSON backup.',
      });
    } finally {
      if (fileImportRef.current) fileImportRef.current.value = '';
    }
  };

  const handleExportCsv = () => {
    const csvContent = generateMealItemsCsv(allMealItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nub-food-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusBanner({
      type: 'success',
      text: `Exported ${allMealItems.length} food diary record(s) to CSV.`,
    });
  };

  const handleConfirmClearAll = async () => {
    await resetAllDataToInitial();
    setConfirmClearStep(false);
    setStatusBanner({
      type: 'success',
      text: 'All local food entries and weight logs have been cleared and defaults restored.',
    });
  };

  return (
    <div className="screen-container">
      <header className="card">
        <h1 className="screen-title">Settings, Targets & Data Backup</h1>
        <p className="screen-subtitle">
          Manage your profile, Mifflin–St Jeor macro targets, theme, backups, and
          local-first privacy.
        </p>
      </header>

      {statusBanner && (
        <div
          className={`alert-banner ${
            statusBanner.type === 'success' ? 'alert-success' : 'alert-danger'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Theme Switcher */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Appearance & Theme</h2>
          <div className="cta-row">
            <button
              type="button"
              className={`btn btn-sm ${
                settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => handleToggleTheme('dark')}
            >
              <Moon size={15} /> Dark Theme
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => handleToggleTheme('light')}
            >
              <Sun size={15} /> Light Theme
            </button>
          </div>
        </div>
      </section>

      {/* Editable Profile & Nutrition Targets */}
      <form onSubmit={handleSaveProfileAndGoals} className="card form-stack">
        <div className="section-header">
          <h2 className="section-title">
            <User size={18} /> Personal Profile
          </h2>
          <span className="badge badge-accent">
            BMR: {goals.bmr} kcal · Est. TDEE: {goals.estimatedTdee} kcal
          </span>
        </div>

        <div className="form-grid-3">
          <div className="form-field">
            <label className="field-label">Age</label>
            <input
              type="number"
              min="10"
              max="120"
              className="input-text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Sex (for BMR formula)</label>
            <select
              className="input-select"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
            >
              <option value="male">Male (+5)</option>
              <option value="female">Female (-161)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="field-label">Height (cm)</label>
            <input
              type="number"
              step="any"
              min="100"
              max="250"
              className="input-text"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-field">
            <label className="field-label">Initial Weight (kg)</label>
            <input
              type="number"
              step="any"
              min="25"
              max="350"
              className="input-text"
              value={initialWeightKg}
              onChange={(e) => setInitialWeightKg(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Target Weight (kg)</label>
            <input
              type="number"
              step="any"
              min="25"
              max="350"
              className="input-text"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Primary Goal</label>
            <select
              className="input-select"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
            >
              <option value="fat_loss">Fat Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-field">
            <label className="field-label">Activity Level</label>
            <select
              className="input-select"
              value={activityLevel}
              onChange={(e) =>
                setActivityLevel(e.target.value as ActivityLevel)
              }
            >
              <option value="sedentary">Sedentary (1.2)</option>
              <option value="light">Light (1.375)</option>
              <option value="moderate">Moderate (1.55)</option>
              <option value="high">High (1.725)</option>
              <option value="extreme">Extreme (1.9)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="field-label">Training Regimen</label>
            <input
              type="text"
              className="input-text"
              value={training}
              onChange={(e) => setTraining(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="field-label">Target Date (Optional)</label>
            <input
              type="date"
              className="input-text"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        <hr className="divider" />

        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Target size={18} /> Editable Calorie & Macro Targets
            </h2>
            <p className="screen-subtitle">
              Mifflin–St Jeor estimates (not measured expenditure). Adjust freely anytime.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRecalculateFromFormula}
          >
            <RefreshCw size={14} /> Recalculate Remaining Carbs
          </button>
        </div>

        <div className="form-grid-4">
          <div className="form-field">
            <label className="field-label">Calorie Target (kcal/day)</label>
            <input
              type="number"
              step="any"
              min="800"
              className="input-text"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Protein Target (g/day)</label>
            <input
              type="number"
              step="any"
              min="0"
              className="input-text"
              value={proteinTargetG}
              onChange={(e) => setProteinTargetG(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Fat Target (g/day)</label>
            <input
              type="number"
              step="any"
              min="0"
              className="input-text"
              value={fatTargetG}
              onChange={(e) => setFatTargetG(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Carbohydrates (g/day)</label>
            <input
              type="number"
              step="any"
              min="0"
              className="input-text"
              value={carbsTargetG}
              onChange={(e) => setCarbsTargetG(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="cta-row">
          <button type="submit" className="btn btn-primary">
            Save Profile & Nutrition Targets
          </button>
        </div>
      </form>

      {/* Data Backup, Import & CSV Export */}
      <section className="card">
        <h2 className="section-title">Data Backup, Export & Restoration</h2>
        <p className="screen-subtitle" style={{ marginBottom: '1rem' }}>
          Export a complete JSON snapshot of all 9 IndexedDB tables, restore from a
          previous backup, or download food diary entries as a spreadsheet-ready CSV.
        </p>

        <input
          ref={fileImportRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleImportJson}
        />

        <div className="cta-row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportJson}
          >
            <Download size={16} /> Export Full JSON Backup
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileImportRef.current?.click()}
          >
            <Upload size={16} /> Import JSON Backup
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
          >
            <FileSpreadsheet size={16} /> Export Food Records (CSV)
          </button>
        </div>

        <hr className="divider" />

        {/* Clear All Data with Confirmation */}
        <div className="danger-zone">
          <div>
            <h3 className="danger-title">Clear All Local Data</h3>
            <p className="screen-subtitle">
              Permanently deletes all logged meals, custom foods, weight logs, and resets
              profile targets to initial defaults.
            </p>
          </div>

          {!confirmClearStep ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmClearStep(true)}
            >
              <Trash2 size={15} /> Clear All Data...
            </button>
          ) : (
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmClearAll}
              >
                Confirm Permanent Deletion
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmClearStep(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      {/* AI Integration Status */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Cpu size={18} /> Optional AI Integration Status
          </h2>
          <span
            className={`badge ${
              provider.getStatus() === 'ready' ? 'badge-success' : 'badge-warning'
            }`}
          >
            {provider.getStatus()}
          </span>
        </div>

        <p className="screen-subtitle" style={{ marginBottom: '0.75rem' }}>
          {provider.getStatusMessage()}
        </p>

        <form onSubmit={handleSaveAiSettings} className="form-stack">
          <div className="form-grid-2">
            <div className="form-field">
              <label className="field-label">Provider Mode</label>
              <select
                className="input-select"
                value={aiProviderId}
                onChange={(e) => setAiProviderId(e.target.value)}
              >
                <option value="none">
                  Disabled / Local Manual Mode (No API Key Required)
                </option>
                <option value="direct_gemini">
                  Google Gemini API (ใส่ API Key โดยตรง)
                </option>
                <option value="backend_proxy">
                  Server-Side Proxy Endpoint (Official API Adapter)
                </option>
              </select>
            </div>

            {aiProviderId === 'direct_gemini' && (
              <div className="form-field">
                <label className="field-label">Gemini API Key</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <small className="field-hint">
                  รับคีย์ฟรีได้จาก <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Google AI Studio</a> (บันทึกในเครื่องคุณเท่านั้น)
                </small>
              </div>
            )}

            {aiProviderId === 'backend_proxy' && (
              <div className="form-field">
                <label className="field-label">Backend Proxy Endpoint URL</label>
                <input
                  type="url"
                  className="input-text"
                  placeholder="http://localhost:8787/api/analyze-food"
                  value={aiEndpoint}
                  onChange={(e) => setAiEndpoint(e.target.value)}
                />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Save AI Provider Mode
          </button>
        </form>
      </section>

      {/* Local-Storage Privacy Information */}
      <section className="card privacy-card">
        <div className="section-header">
          <h2 className="section-title">
            <ShieldCheck size={18} /> Local-First Storage & Privacy Information
          </h2>
        </div>
        <ul className="privacy-list">
          <li>
            <strong>100% On-Device Database:</strong> All food diary entries, macro
            snapshots, and weight logs are stored strictly inside your browser's local{' '}
            <code>IndexedDB</code> (`NubNutritionTrackerDB`).
          </li>
          <li>
            <strong>No Cloud Sync or Accounts:</strong> No login is required, and no
            nutrition records or photos are uploaded to external servers by default.
          </li>
          <li>
            <strong>No Frontend Secrets:</strong> API credentials are never stored in{' '}
            <code>localStorage</code> or bundled into frontend assets.
          </li>
          <li>
            <strong>Important Browser Data Warning:</strong> Because data lives exclusively
            on this device, clearing your browser's site data/storage or uninstalling the
            browser may remove your local records. Use <strong>Export Full JSON Backup</strong>{' '}
            regularly to keep a safe copy.
          </li>
        </ul>
      </section>
    </div>
  );
};
