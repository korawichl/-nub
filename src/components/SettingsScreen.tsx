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
  calculateNutritionTargetsFromProfile,
  calculateTDEE,
} from '../utils/nutritionCalculator';
import { getFoodAnalysisProvider } from '../services/aiProvider';
import {
  User,
  Target,
  Sun,
  Moon,
  CloudMoon,
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
  const [geminiModel, setGeminiModel] = useState(
    !settings.geminiModel || settings.geminiModel === 'gemini-2.5-flash'
      ? 'gemini-3.5-flash-lite'
      : settings.geminiModel
  );
  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || '');
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
    settings.geminiApiKey,
    settings.geminiModel,
    settings.groqApiKey
  );

  // Live computed BMR, TDEE and recommended Calorie Target from profile form inputs
  const currentWeightNum = parseFloat(initialWeightKg) || 0;
  const currentHeightNum = parseFloat(heightCm) || 0;
  const currentAgeNum = parseFloat(age) || 0;
  const hasValidProfileInputs =
    currentWeightNum > 0 && currentHeightNum > 0 && currentAgeNum > 0;

  const liveCalculated = hasValidProfileInputs
    ? calculateNutritionTargetsFromProfile({
        weightKg: currentWeightNum,
        heightCm: currentHeightNum,
        age: currentAgeNum,
        sex,
        activityLevel,
        goalType,
      })
    : null;

  const recalculateAndApply = (override?: {
    w?: number;
    h?: number;
    a?: number;
    s?: Sex;
    act?: ActivityLevel;
    gt?: GoalType;
  }) => {
    const w = override?.w ?? parseFloat(initialWeightKg);
    const h = override?.h ?? parseFloat(heightCm);
    const a = override?.a ?? parseFloat(age);
    const s = override?.s ?? sex;
    const act = override?.act ?? activityLevel;
    const gt = override?.gt ?? goalType;

    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0 || !Number.isFinite(a) || a <= 0) {
      return null;
    }

    const res = calculateNutritionTargetsFromProfile({
      weightKg: w,
      heightCm: h,
      age: a,
      sex: s,
      activityLevel: act,
      goalType: gt,
    });

    setCalorieTarget(String(res.calorieTarget));
    setProteinTargetG(String(res.proteinTargetG));
    setFatTargetG(String(res.fatTargetG));
    setCarbsTargetG(String(res.carbsTargetG));

    return res;
  };

  const handleRecalculateFromFormula = () => {
    const res = recalculateAndApply();
    if (!res) {
      setStatusBanner({
        type: 'error',
        text: 'กรุณากรอกอายุ ส่วนสูง และน้ำหนักเริ่มต้นให้ถูกต้องก่อนคำนวณ',
      });
      return;
    }

    const goalLabel =
      goalType === 'fat_loss'
        ? `ลดไขมัน (Deficit ${res.deficitOrSurplusKcal} kcal)`
        : goalType === 'muscle_gain'
        ? `เพิ่มกล้ามเนื้อ (Surplus +${res.deficitOrSurplusKcal} kcal)`
        : 'รักษาน้ำหนัก (Maintenance)';

    setStatusBanner({
      type: 'success',
      text: `คำนวณแคลอรี่เป้าหมายใหม่สำเร็จ: BMR = ${res.bmr} kcal · TDEE (${activityLevel}) = ${res.tdee} kcal → แคลอรี่เป้าหมาย (${goalLabel}) = ${res.calorieTarget} kcal/วัน (โปรตีน ${res.proteinTargetG}g, ไขมัน ${res.fatTargetG}g, คาร์บ ${res.carbsTargetG}g) ถูกอัปเดตลงในช่องด้านล่างเรียบร้อยแล้ว`,
    });
  };

  const handleActivityLevelChange = (newLevel: ActivityLevel) => {
    setActivityLevel(newLevel);
    recalculateAndApply({ act: newLevel });
  };

  const handleGoalTypeChange = (newGoal: GoalType) => {
    setGoalType(newGoal);
    recalculateAndApply({ gt: newGoal });
  };

  const handleSexChange = (newSex: Sex) => {
    setSex(newSex);
    recalculateAndApply({ s: newSex });
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
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);

    await db.settings.update(settings.id, {
      theme: nextTheme,
      updatedAt: new Date().toISOString(),
    });

    setStatusBanner({
      type: 'success',
      text: `เปลี่ยนธีมเป็น "${
        nextTheme === 'dark'
          ? '1. Deep Dark (โหมดมืดสนิท)'
          : nextTheme === 'twilight'
          ? '2. Twilight Slate (โหมดสเลทผสมผสาน)'
          : '3. Crisp Light (โหมดสว่างใส)'
      }" เรียบร้อยแล้ว`,
    });
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.update(settings.id, {
      aiProviderId,
      geminiModel,
      geminiApiKey: geminiApiKey.trim() || undefined,
      groqApiKey: groqApiKey.trim() || undefined,
      aiBackendEndpoint: aiEndpoint.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setStatusBanner({
      type: 'success',
      text: 'AI Vision configuration saved (Pro & Flash Auto-Failover active).',
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
        <h1 className="screen-title">Budget, Targets & System Settings</h1>
        <p className="screen-subtitle">
          Customize your UI Theme, Mifflin–St Jeor macro budget, Gemini Pro/Flash AI Vision models, and backups.
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

      {/* 3-Mode Theme Switcher matching Reference Image */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Appearance & 3-Mode Dashboard Theme</h2>
            <p className="screen-subtitle">
              Switch between Deep Abyssal Dark, Twilight Slate Hybrid, and Crisp Ice Light modes.
            </p>
          </div>
          <div className="cta-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className={`btn btn-sm ${
                settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => handleToggleTheme('dark')}
            >
              <Moon size={15} /> 1. Deep Dark
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                settings.theme === 'twilight' ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => handleToggleTheme('twilight')}
            >
              <CloudMoon size={15} /> 2. Twilight Slate
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => handleToggleTheme('light')}
            >
              <Sun size={15} /> 3. Crisp Light
            </button>
          </div>
        </div>
      </section>

      {/* AI Integration Status */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Cpu size={18} /> AI Vision Configuration (Gemini Pro & Flash Auto-Failover)
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
                <option value="free_builtin">
                  Free Built-in AI Vision (ฟรี 100% ไม่ต้องใส่ API Key - แนะนำ)
                </option>
                <option value="direct_gemini">
                  Google AI Studio Vision + Free Built-in Auto-Failover
                </option>
                <option value="groq_free">
                  Groq Cloud Free Vision (Llama 4 Scout 17B Vision ฟรี)
                </option>
                <option value="backend_proxy">
                  Server-Side Proxy Endpoint (Official API Adapter)
                </option>
                <option value="none">
                  Local Manual Mode
                </option>
              </select>
            </div>

            {aiProviderId === 'direct_gemini' && (
              <>
                <div className="form-field">
                  <label className="field-label">Preferred Vision Model (Pro / Flash)</label>
                  <select
                    className="input-select"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                  >
                    <option value="gemini-3.6-flash">
                      Gemini 3.6 Flash (แนะนำ: เสถียร แม่นยำสูงด้วย Thinking Mode)
                    </option>
                    <option value="gemini-3.5-flash">
                      Gemini 3.5 Flash (วิเคราะห์อาหารไทยแม่นยำ & โควตาฟรีสูง)
                    </option>
                    <option value="gemini-3.5-flash-lite">
                      Gemini 3.5 Flash Lite (เร็วที่สุด: โควตาฟรีสูง & วิเคราะห์ไว)
                    </option>
                    <option value="gemma-4-26b-a4b-it">
                      Gemma 4 26B Vision (โมเดลเปิดฟรี แยกโควตาอิสระ)
                    </option>
                    <option value="gemini-3.8-flash">
                      Gemini 3.8 Flash (รุ่นล่าสุด วิเคราะห์แม่นยำด้วย Thinking Mode)
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="field-label">Google AI Studio API Key (ไม่บังคับ - มีระบบฟรีสำรองในตัว)</label>
                  <input
                    type="password"
                    className="input-text"
                    placeholder="AIzaSy... (ปล่อยว่างได้ ระบบจะใช้ Free AI ในตัวแทน)"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  <small className="field-hint">
                    หากคีย์หมดอายุ โควต้าเต็ม หรือเซิร์ฟเวอร์ Google หนาแน่น ระบบจะสลับไปใช้ Free Built-in AI Vision (Florence-2 + Thai OCR + Reasoning AI) ให้โดยอัตโนมัติ 100%
                  </small>
                </div>
              </>
            )}

            {aiProviderId === 'groq_free' && (
              <div className="form-field">
                <label className="field-label">Groq Cloud Free API Key (gsk_...)</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                />
                <small className="field-hint">
                  รับคีย์ฟรีได้ที่ console.groq.com (ใช้โมเดล Llama 4 Scout Vision ฟรี)
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

          <button type="submit" className="btn btn-primary btn-sm">
            Save AI Provider Configuration
          </button>
        </form>
      </section>

      {/* Editable Profile & Nutrition Targets */}
      <form onSubmit={handleSaveProfileAndGoals} className="card form-stack">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <User size={18} /> Personal Profile
            </h2>
            <p className="screen-subtitle">
              ข้อมูลร่างกายสำหรับคำนวณ BMR และ TDEE ตามหลักโภชนาการสากล
            </p>
          </div>
          <span className="badge badge-accent">
            BMR: {liveCalculated ? liveCalculated.bmr : goals.bmr} kcal · TDEE: {liveCalculated ? liveCalculated.tdee : goals.estimatedTdee} kcal
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
              onChange={(e) => {
                setAge(e.target.value);
                const nextAge = parseFloat(e.target.value);
                if (nextAge > 0) recalculateAndApply({ a: nextAge });
              }}
              required
            />
          </div>

          <div className="form-field">
            <label className="field-label">Sex (for BMR formula)</label>
            <select
              className="input-select"
              value={sex}
              onChange={(e) => handleSexChange(e.target.value as Sex)}
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
              onChange={(e) => {
                setHeightCm(e.target.value);
                const nextHeight = parseFloat(e.target.value);
                if (nextHeight > 0) recalculateAndApply({ h: nextHeight });
              }}
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
              onChange={(e) => {
                setInitialWeightKg(e.target.value);
                const nextWeight = parseFloat(e.target.value);
                if (nextWeight > 0) recalculateAndApply({ w: nextWeight });
              }}
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
              onChange={(e) => handleGoalTypeChange(e.target.value as GoalType)}
            >
              <option value="fat_loss">Fat Loss (ลดไขมัน/ลดน้ำหนัก)</option>
              <option value="maintenance">Maintenance (รักษาน้ำหนัก)</option>
              <option value="muscle_gain">Muscle Gain (เพิ่มกล้ามเนื้อ)</option>
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
                handleActivityLevelChange(e.target.value as ActivityLevel)
              }
            >
              <option value="sedentary">Sedentary ไม่ออกกำลังกาย (x1.2)</option>
              <option value="light">Light ออกกำลังกายเบา 1-3 วัน/สัปดาห์ (x1.375)</option>
              <option value="moderate">Moderate ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์ (x1.55)</option>
              <option value="high">High ออกกำลังกายหนัก 6-7 วัน/สัปดาห์ (x1.725)</option>
              <option value="extreme">Extreme นักกีฬา/งานใช้แรงกายหนักมาก (x1.9)</option>
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
              <Target size={18} /> Editable Calorie & Macro Targets (แคลอรี่และสารอาหารที่ปรับแก้ได้)
            </h2>
            <p className="screen-subtitle">
              คำนวณจาก TDEE และเป้าหมายให้อัตโนมัติ พร้อมให้คุณพิมพ์แก้ไขตัวเลขเองได้อย่างอิสระ
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRecalculateFromFormula}
          >
            <RefreshCw size={14} /> Recalculate Targets (คำนวณใหม่)
          </button>
        </div>

        {liveCalculated && (
          <div className="p-3.5 bg-[#F0F4FF] rounded-2xl border border-[#E9EAF2] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-[#20243A]">
              <span className="font-bold text-[#6258F5]">คำนวณตามสูตร TDEE:</span>
              <span>BMR: <strong>{liveCalculated.bmr}</strong> kcal</span>
              <span className="text-[#858BA0]">•</span>
              <span>TDEE: <strong>{liveCalculated.tdee}</strong> kcal</span>
              <span className="text-[#858BA0]">•</span>
              <span>
                แคลอรี่เป้าหมาย ({goalType === 'fat_loss' ? 'ลดไขมัน' : goalType === 'muscle_gain' ? 'เพิ่มกล้ามเนื้อ' : 'รักษาน้ำหนัก'}):{' '}
                <strong className="text-[#6258F5] text-sm">{liveCalculated.calorieTarget} kcal/วัน</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleRecalculateFromFormula}
              className="px-3 py-1 bg-[#6258F5] hover:bg-[#756BFF] text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              อัปเดตลงช่องด้านล่าง ➜
            </button>
          </div>
        )}

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
            <strong>Important Browser Data Warning:</strong> Clearing your browser's site
            data/storage may remove your local records. Use{' '}
            <strong>Export Full JSON Backup</strong> regularly to keep a safe copy.
          </li>
        </ul>
      </section>
    </div>
  );
};
