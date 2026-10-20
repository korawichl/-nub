import React, { useState, useRef, useEffect, useMemo } from 'react';
import type {
  AppSettings,
  ConfirmMealDraft,
  FoodCatalogItem,
  MealCategory,
} from '../types';
import {
  getFoodAnalysisProvider,
  compressImageBlob,
  analyzeTextWithFreeZeroKeyAI,
  type CompressedImageResult,
} from '../services/aiProvider';
import { db } from '../db/database';
import { getBangkokDateString } from '../utils/date';
import { calculateFoodNutrition, estimateRoughNutrition } from '../utils/nutritionCalculator';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import {
  Camera,
  Upload,
  AlertCircle,
  Search,
  Edit3,
  Trash2,
  Sparkles,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ScanBarcode,
} from 'lucide-react';

interface FoodScannerProps {
  settings: AppSettings;
  catalog: FoodCatalogItem[];
  onOpenConfirmMeal: (draft: ConfirmMealDraft) => void;
  onNavigateToDiary: () => void;
}

export const FoodScanner: React.FC<FoodScannerProps> = ({
  settings,
  catalog,
  onOpenConfirmMeal,
  onNavigateToDiary,
}) => {
  const effectiveProviderId =
    !settings.aiProviderId || settings.aiProviderId === 'none'
      ? 'free_builtin'
      : settings.aiProviderId;

  const provider = getFoodAnalysisProvider(
    effectiveProviderId,
    settings.aiBackendEndpoint,
    settings.geminiApiKey,
    settings.geminiModel,
    settings.groqApiKey
  );
  const providerStatus = provider.getStatus();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedInfo, setCompressedInfo] = useState<CompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [mealCategory, setMealCategory] = useState<MealCategory>('lunch');
  const [scanState, setScanState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisineTab, setSelectedCuisineTab] = useState<string>('ALL');
  const [isEstimatingQuery, setIsEstimatingQuery] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [quickMealInput, setQuickMealInput] = useState('');

  const handleQuickLogFromPhoto = (mealName: string) => {
    const clean = (mealName || '').trim();
    if (!clean) return;

    const catalogMatch = catalog.find(
      (c) =>
        c.name.toLowerCase().includes(clean.toLowerCase()) ||
        clean.toLowerCase().includes(c.name.toLowerCase())
    );

    const grams = catalogMatch?.defaultServingGrams || 250;
    const calories = catalogMatch
      ? Math.round((catalogMatch.caloriesPer100g * grams) / 100)
      : /แซลมอน|ปลา/i.test(clean)
      ? 320
      : /กะเพรา|หมูสับ/i.test(clean)
      ? 550
      : /ไก่|อกไก่/i.test(clean)
      ? 240
      : /ไข่/i.test(clean)
      ? 180
      : 360;

    const protein = catalogMatch
      ? Math.round((catalogMatch.proteinPer100g * grams) / 100)
      : /แซลมอน|ปลา/i.test(clean)
      ? 34
      : /ไก่|อกไก่/i.test(clean)
      ? 30
      : /กะเพรา/i.test(clean)
      ? 25
      : Math.round(calories * 0.05);

    const carbs = catalogMatch
      ? Math.round((catalogMatch.carbsPer100g * grams) / 100)
      : /แซลมอน|ปลา/i.test(clean)
      ? 8
      : /กะเพรา|ข้าว/i.test(clean)
      ? 55
      : 35;

    const fat = catalogMatch
      ? Math.round((catalogMatch.fatPer100g * grams) / 100)
      : /แซลมอน|ปลา/i.test(clean)
      ? 16
      : /กะเพรา/i.test(clean)
      ? 24
      : 12;

    const rough = estimateRoughNutrition({
      foodName: clean,
      calories,
      protein,
      carbohydrates: carbs,
      fat,
    });

    onOpenConfirmMeal({
      foodName: clean,
      ingredients: clean,
      servingGrams: grams,
      calories,
      protein,
      carbohydrates: carbs,
      fat: rough.fat,
      sodiumMg: rough.sodiumMg,
      sugarG: rough.sugarG,
      category: mealCategory,
      source: 'user_estimated',
      requiresExplicitConfirmation: true,
    });
  };

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextUrl);
    setScanState('idle');
    setErrorMessage(null);
    setCompressedInfo(null);
    setIsCompressing(true);

    try {
      // Automatically compress client-side to lightweight JPEG
      const res = await compressImageBlob(file, 768, 0.72);
      setCompressedInfo(res);
      const optimizedFile = new File([res.blob], file.name, {
        type: res.mimeType,
      });
      setSelectedFile(optimizedFile);
    } catch (err) {
      console.warn('Auto compression fallback note:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressedInfo(null);
    setScanState('idle');
    setErrorMessage(null);
  };

  const handleRunAiAnalysis = async () => {
    if (!selectedFile) return;

    setScanState('loading');
    setErrorMessage(null);

    try {
      const result = await provider.analyzeImage(selectedFile);
      setScanState('success');

      await db.scanLogs.put({
        id: `scan_${Date.now()}`,
        date: getBangkokDateString(),
        status: 'analyzed',
        mealName: result.mealName,
        estimatedGrams: result.estimatedWeightGrams,
        estimatedCalories: result.estimatedCalories,
        providerId: provider.id,
        createdAt: new Date().toISOString(),
      });

      const ingredientsText = result.identifiedFoodItems
        .map((i) => `${i.name} (~${i.estimatedGrams}g)`)
        .join(', ');

      onOpenConfirmMeal({
        foodName: result.mealName,
        ingredients: ingredientsText,
        servingGrams: result.estimatedWeightGrams,
        calories: result.estimatedCalories,
        protein: result.protein,
        carbohydrates: result.carbohydrates,
        fat: result.fat,
        sodiumMg: result.sodiumMg,
        sugarG: result.sugarG,
        category: mealCategory,
        source: 'ai_confirmed',
        uncertainties: result.uncertainties,
        assumptions: result.assumptions,
        requiresExplicitConfirmation: true,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'AI image analysis failed or is not configured.';
      setScanState('error');
      setErrorMessage(msg);

      await db.scanLogs.put({
        id: `scan_${Date.now()}`,
        date: getBangkokDateString(),
        status: 'failed',
        providerId: provider.id,
        notes: msg,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleSelectCatalogForConfirm = async (
    food: FoodCatalogItem,
    overrideGrams?: number
  ) => {
    const servingGrams = overrideGrams && overrideGrams > 0 ? overrideGrams : food.defaultServingGrams;
    const portion = calculateFoodNutrition(
      {
        calories: food.caloriesPer100g,
        protein: food.proteinPer100g,
        carbohydrates: food.carbsPer100g,
        fat: food.fatPer100g,
      },
      servingGrams
    );

    if (selectedFile) {
      await db.scanLogs.put({
        id: `scan_${Date.now()}`,
        date: getBangkokDateString(),
        status: 'manual_fallback',
        mealName: food.name,
        estimatedGrams: portion.grams,
        estimatedCalories: portion.calories,
        providerId: provider.id,
        notes: 'Logged manually alongside photo preview',
        createdAt: new Date().toISOString(),
      });
    }

    const ratio = portion.grams / 100;
    const initialSodium =
      food.sodiumMgPer100g !== undefined
        ? Math.round(food.sodiumMgPer100g * ratio)
        : undefined;
    const initialSugar =
      food.sugarGPer100g !== undefined
        ? Math.round(food.sugarGPer100g * ratio * 10) / 10
        : undefined;

    onOpenConfirmMeal({
      foodName: food.name,
      ingredients: food.name,
      servingGrams: portion.grams,
      calories: portion.calories,
      protein: portion.protein,
      carbohydrates: portion.carbohydrates,
      fat: portion.fat,
      sodiumMg: initialSodium,
      sugarG: initialSugar,
      category: mealCategory,
      source: food.source,
      requiresExplicitConfirmation: false,
    });
  };

  const handleManualBlankEntry = () => {
    onOpenConfirmMeal({
      foodName: '',
      ingredients: '',
      servingGrams: 200,
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      category: mealCategory,
      source: 'user_estimated',
      requiresExplicitConfirmation: false,
    });
  };

  const handleManualCustomMealWithName = (name: string) => {
    const clean = name.trim();
    onOpenConfirmMeal({
      foodName: clean,
      ingredients: clean,
      servingGrams: 200,
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      category: mealCategory,
      source: 'user_estimated',
      requiresExplicitConfirmation: false,
    });
  };

  const handleInstantSearchQueryAI = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    setIsEstimatingQuery(true);
    try {
      let result;
      if (provider.analyzeTextPrompt) {
        result = await provider.analyzeTextPrompt(clean);
      } else {
        result = await analyzeTextWithFreeZeroKeyAI(clean);
      }

      onOpenConfirmMeal({
        foodName: result.mealName || clean,
        ingredients:
          result.identifiedFoodItems?.map((i) => `${i.name} (~${i.estimatedGrams}g)`).join(', ') ||
          clean,
        servingGrams: result.estimatedWeightGrams || 250,
        calories: result.estimatedCalories,
        protein: result.protein,
        carbohydrates: result.carbohydrates,
        fat: result.fat,
        sodiumMg: result.sodiumMg,
        sugarG: result.sugarG,
        category: mealCategory,
        source: 'ai_confirmed',
        uncertainties: result.uncertainties,
        assumptions: result.assumptions,
        requiresExplicitConfirmation: true,
      });
    } catch {
      // Local zero-cost fallback
      handleQuickLogFromPhoto(clean);
    } finally {
      setIsEstimatingQuery(false);
    }
  };

  const CUISINE_TABS = [
    { id: 'ALL', label: 'ทั้งหมด (All)' },
    { id: 'JAPANESE', label: '🇯🇵 ญี่ปุ่น' },
    { id: 'INDIAN', label: '🇮🇳 อินเดีย' },
    { id: 'KOREAN', label: '🇰🇷 เกาหลี' },
    { id: 'THAI', label: '🇹🇭 อาหารไทย' },
    { id: 'WESTERN', label: '🥩 ตะวันตก' },
    { id: 'FITNESS', label: '🥗 คลีน/สุขภาพ' },
    { id: 'DRINKS', label: '☕ เครื่องดื่ม/ขนม' },
  ] as const;

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedCuisineTab === 'ALL') return true;

      const cat = (item.category || '').toLowerCase();
      const name = item.name.toLowerCase();

      if (selectedCuisineTab === 'JAPANESE') {
        return (
          cat.includes('ญี่ปุ่น') ||
          cat.includes('japanese') ||
          /ซูชิ|ซาชิมิ|ราเมง|กิวด้ง|คัตสึ|อุด้ง|มิโซะ|ทาโกะ|โอโคโนมิ|เกี๊ยวซ่า|คาราเกะ|ถั่วแระ/i.test(name)
        );
      }
      if (selectedCuisineTab === 'INDIAN') {
        return (
          cat.includes('อินเดีย') ||
          cat.includes('indian') ||
          /บริยานี|บัตเตอร์ชิกเก้น|ทิกก้า|นาน|โรตี|ดาล|ปาเนียร์|ซาโมซา|ชานา|ทันดูรี|มาซาลา/i.test(name)
        );
      }
      if (selectedCuisineTab === 'KOREAN') {
        return (
          cat.includes('เกาหลี') ||
          cat.includes('korean') ||
          /บิบิมบับ|กิมจิ|ซุนดูบู|สามชั้น|ซัมกยอบซัล|ต๊อกบกกี|จาจัง|คิมบับ|ยังนยอม|บุลโกกิ/i.test(name)
        );
      }
      if (selectedCuisineTab === 'THAI') {
        return (
          cat.includes('ไทย') ||
          cat.includes('thai') ||
          /ข้าวมันไก่|กะเพรา|สุกี้|ขาหมู|หมูปิ้ง|ข้าวเหนียว|แกงจืด|หมูกรอบ|ผัดไทย|ข้าวผัด|ส้มตำ|ลาบ|ต้มยำ|ก๋วยเตี๋ยว|ผัดซีอิ๊ว|ข้าวซอย/i.test(name)
        );
      }
      if (selectedCuisineTab === 'WESTERN') {
        return (
          cat.includes('ตะวันตก') ||
          cat.includes('western') ||
          /สเต๊ก|พอร์คชอป|สปาเกตตี|คาโบนาร่า|โบโลเนส|เบอร์เกอร์|พิซซ่า|ซีซาร์|เฟรนช์ฟรายส์/i.test(name)
        );
      }
      if (selectedCuisineTab === 'FITNESS') {
        return (
          cat.includes('คลีน') ||
          cat.includes('สุขภาพ') ||
          cat.includes('fitness') ||
          cat.includes('protein') ||
          cat.includes('supplement') ||
          /อกไก่|ไข่ต้ม|เวย์|โอ๊ต|กล้วย|กรีกโยเกิร์ต|บรอกโคลี|เนยถั่ว/i.test(name)
        );
      }
      if (selectedCuisineTab === 'DRINKS') {
        return (
          cat.includes('เครื่องดื่ม') ||
          cat.includes('ของหวาน') ||
          cat.includes('cafe') ||
          cat.includes('sweet') ||
          /ชานม|ชาไทย|มัทฉะ|อเมริกาโน่|ลาเต้|ข้าวเหนียวมะม่วง/i.test(name)
        );
      }

      return true;
    });
  }, [catalog, searchQuery, selectedCuisineTab]);

  return (
    <div className="screen-container">
      <header className="card">
        <div className="section-header">
          <div>
            <h1 className="screen-title">AI Food Vision Scanner</h1>
            <p className="screen-subtitle">
              Automatic image compression + Multi-Model Free Failover (`gemini-3.6-flash` / `3.5-flash` / `gemma-4-26b`)
            </p>
          </div>
          <span
            className={`badge ${
              providerStatus === 'ready' ? 'badge-success' : 'badge-warning'
            }`}
          >
            AI Status: {providerStatus}
          </span>
        </div>

        {providerStatus === 'not_configured' && (
          <div className="alert-banner alert-info">
            <ShieldAlert size={20} className="alert-icon" />
            <div>
              <strong>AI Vision Not Configured Yet</strong>
              <p>
                Open <strong>Budget & Settings</strong> to paste your free Google AI Studio key or Groq key, or log your meal manually below while previewing your photo.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Camera & Gallery Selection Card */}
      <section className="card">
        <div className="form-row-inline" style={{ marginBottom: '1rem' }}>
          <label htmlFor="scanner-meal-category" className="field-label">
            Target Meal Category:
          </label>
          <select
            id="scanner-meal-category"
            className="input-select"
            value={mealCategory}
            onChange={(e) => setMealCategory(e.target.value as MealCategory)}
          >
            <option value="breakfast">Breakfast (มื้อเช้า)</option>
            <option value="lunch">Lunch (มื้อเที่ยง)</option>
            <option value="dinner">Dinner (มื้อเย็น)</option>
            <option value="snacks">Snacks (ของว่าง/เครื่องดื่ม)</option>
          </select>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {!previewUrl ? (
          <div className="scanner-dropzone">
            <Camera size={40} className="scanner-icon" />
            <h3>Capture or Choose a Food / Drink Photo</h3>
            <p>
              Photos are automatically compressed in-memory for instant free AI vision analysis.
            </p>
            <div className="cta-row flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="btn btn-primary min-h-[44px]"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={18} /> Take Photo (Camera)
              </button>
              <button
                type="button"
                className="btn btn-secondary min-h-[44px]"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Upload size={18} /> Choose from Library
              </button>
              <button
                type="button"
                className="btn btn-secondary min-h-[44px]"
                onClick={() => setIsBarcodeOpen(true)}
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                <ScanBarcode size={18} /> สแกนบาร์โค้ด (Barcode)
              </button>
            </div>
          </div>
        ) : (
          <div className="scanner-preview-box">
            <div className="preview-image-container">
              <img
                src={previewUrl}
                alt="Selected meal preview"
                className="scanner-preview-img"
              />
            </div>
            <div className="preview-meta-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-semibold text-sm truncate max-w-[280px]">
                  {selectedFile?.name || 'Food Photo'}
                </span>
                {compressedInfo ? (
                  <span className="text-xs text-[#059669] dark:text-[#34D399] font-medium flex items-center gap-1">
                    <Sparkles size={13} /> บีบอัดอัตโนมัติ: {Math.round(compressedInfo.originalSize / 1024)} KB → {Math.round(compressedInfo.compressedSize / 1024)} KB (ประหยัด {Math.round(compressedInfo.compressionRatio * 100)}%)
                  </span>
                ) : isCompressing ? (
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <Loader2 size={12} className="spin" /> กำลังบีบอัดรูปภาพอัตโนมัติ...
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {Math.round((selectedFile?.size || 0) / 1024)} KB
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleClearImage}
              >
                <Trash2 size={14} /> Remove Photo
              </button>
            </div>

            <div className="ai-action-panel">
              {providerStatus === 'ready' ? (
                <button
                  type="button"
                  className="btn btn-primary btn-full min-h-[48px]"
                  disabled={scanState === 'loading' || isCompressing}
                  onClick={handleRunAiAnalysis}
                >
                  {scanState === 'loading' ? (
                    <>
                      <Loader2 size={18} className="spin" /> วิเคราะห์ด้วย Thinking Mode & Auto-Failover...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Analyze Photo with Free AI Vision (Thinking Mode)
                    </>
                  )}
                </button>
              ) : (
                <div className="unconfigured-ai-box">
                  <div className="unconfigured-ai-header">
                    <AlertCircle size={18} />
                    <span>Optional AI Image Analysis: Not Configured</span>
                  </div>
                  <p>
                    No AI provider is active. Use the manual food search or custom meal
                    builder below while viewing your photo preview.
                  </p>
                  <div className="cta-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleManualBlankEntry}
                    >
                      <Edit3 size={15} /> Enter Meal Details Manually
                    </button>
                  </div>
                </div>
              )}

              {scanState === 'error' && (
                <div
                  className="alert-banner alert-danger flex flex-col gap-3 p-4 rounded-2xl"
                  style={{ marginTop: '0.75rem' }}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={20} className="shrink-0 text-[#EB6478] mt-0.5" />
                    <div>
                      <strong className="block text-sm font-bold text-[#EB6478]">
                        เซิร์ฟเวอร์ AI มีผู้ใช้งานหนาแน่น หรือโควต้า Free Tier เต็ม
                      </strong>
                      <p className="text-xs text-[#858BA0] mt-0.5 leading-relaxed">
                        {errorMessage?.includes('โควต้า') || errorMessage?.includes('หนาแน่น')
                          ? errorMessage
                          : 'ระบบ AI ตอบสนองช้ากว่าปกติ คุณสามารถพิมพ์ชื่ออาหารเพื่อบันทึกด่วนพร้อมรูปถ่ายนี้ได้ทันที'}
                      </p>
                    </div>
                  </div>

                  {/* Instant 1-Tap Fallback: Type meal name & auto-estimate macros */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickLogFromPhoto(quickMealInput);
                    }}
                    className="flex flex-col sm:flex-row gap-2 w-full pt-1"
                  >
                    <input
                      type="text"
                      className="input-text text-xs py-2 px-3 flex-1 rounded-xl"
                      placeholder="พิมพ์ชื่ออาหาร เช่น แซลมอนดองซีอิ๊ว, ข้าวกะเพรา..."
                      value={quickMealInput}
                      onChange={(e) => setQuickMealInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!quickMealInput.trim()}
                      className="btn btn-primary btn-sm py-2 px-4 whitespace-nowrap"
                    >
                      ⚡ บันทึกและคำนวณด่วน
                    </button>
                  </form>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm text-[11px]"
                      onClick={handleRunAiAnalysis}
                    >
                      🔄 ลองวิเคราะห์ใหม่อีกครั้ง
                    </button>
                    <button
                      type="button"
                      className="btn btn-link text-[11px]"
                      onClick={handleManualBlankEntry}
                    >
                      ✏️ กรอกข้อมูลเองแบบละเอียด
                    </button>
                  </div>
                </div>
              )}

              {scanState === 'success' && (
                <div className="alert-banner alert-success" style={{ marginTop: '0.75rem' }}>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Analysis Complete</strong>
                    <p>Proceeding to meal confirmation.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Manual Food Search & Fallback Entry */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Search size={18} /> ค้นหาเมนูอาหารหลากหลาย (Manual Food Search)
            </h2>
            <p className="screen-subtitle">
              มีอาหารญี่ปุ่น, อินเดีย, เกาหลี, อาหารไทยยอดนิยม, สเต๊กตะวันตก, คลีน, เครื่องดื่มคาเฟ่ และของหวาน
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleManualBlankEntry}
          >
            <Edit3 size={15} /> กรอกเมนูเอง
          </button>
        </div>

        {/* Cuisine Filter Pills */}
        <div
          className="quick-chips-row"
          style={{ marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}
        >
          {CUISINE_TABS.map((tab) => {
            const isActive = selectedCuisineTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                }}
                onClick={() => setSelectedCuisineTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="search-bar-wrapper">
          <Search size={16} className="search-bar-icon" />
          <input
            type="search"
            className="input-text search-input"
            placeholder="ค้นหาชื่ออาหาร เช่น ซูชิ, ราเมง, บริยานี, บัตเตอร์ชิกเก้น, บิบิมบับ, กะเพรา, ชานม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Zero Results Instant AI Estimation Fallback */}
        {filteredCatalog.length === 0 ? (
          <div
            className="alert-banner alert-info"
            style={{
              marginTop: '0.75rem',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '16px',
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#36B37E]" />
              <strong>
                {searchQuery.trim()
                  ? `ไม่พบ "${searchQuery}" ในรายการที่บันทึกไว้`
                  : 'ไม่มีรายการอาหารในหมวดหมู่นี้'}
              </strong>
            </div>
            {searchQuery.trim() ? (
              <>
                <p className="text-xs text-[#858BA0] leading-relaxed">
                  ไม่ต้องถ่ายรูป! ให้ระบบคำนวณแคลอรี่และสารอาหารสำหรับ{' '}
                  <strong>"{searchQuery}"</strong> อัตโนมัติ หรือกรอกตัวเลขเองได้ทันที
                </p>
                <div className="flex flex-wrap gap-2 pt-1 w-full">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    disabled={isEstimatingQuery}
                    onClick={() => handleInstantSearchQueryAI(searchQuery)}
                  >
                    {isEstimatingQuery ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> กำลังประมวลผล...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> ⚡ คำนวณสารอาหารทันใจด้วย AI
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleManualCustomMealWithName(searchQuery)}
                  >
                    <Edit3 size={14} /> กรอกตัวเลขเอง
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#858BA0]">
                ลองเลือกหมวดหมู่อื่น หรือพิมพ์ชื่ออาหารในช่องค้นหาด้านบน
              </p>
            )}
          </div>
        ) : (
          <div className="catalog-results-list">
            {filteredCatalog.map((food) => {
              const servingKcal = Math.round(
                (food.caloriesPer100g * food.defaultServingGrams) / 100
              );
              return (
                <div key={food.id} className="catalog-item-row">
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="catalog-item-title">{food.name}</span>
                      {food.category && (
                        <span
                          className="badge badge-info"
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '12px',
                          }}
                        >
                          {food.category}
                        </span>
                      )}
                    </div>
                    <div className="catalog-item-sub">
                      ต่อ 100g: {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · C{' '}
                      {food.carbsPer100g}g · F {food.fatPer100g}g
                      {(food.sodiumMgPer100g !== undefined ||
                        food.sugarGPer100g !== undefined) && (
                        <span style={{ marginLeft: 6, color: '#6258F5', fontWeight: 500 }}>
                          ·{' '}
                          {food.sodiumMgPer100g !== undefined &&
                            `🧂 Na ${food.sodiumMgPer100g}mg `}
                          {food.sugarGPer100g !== undefined &&
                            `🍬 น้ำตาล ${food.sugarGPer100g}g`}
                        </span>
                      )}
                    </div>
                    <div className="catalog-item-source">{food.sourceLabel}</div>

                    {/* Portion presets quick click pills */}
                    {food.portionPresets && food.portionPresets.length > 0 && (
                      <div
                        className="quick-chips-row"
                        style={{ marginTop: '0.45rem', marginBottom: '0.25rem', gap: '0.35rem' }}
                      >
                        {food.portionPresets.map((preset) => {
                          const pKcal = Math.round(
                            (food.caloriesPer100g * preset.grams) / 100
                          );
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              className="food-chip"
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '14px',
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                handleSelectCatalogForConfirm(food, preset.grams)
                              }
                            >
                              + {preset.label} ({pKcal} kcal)
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="catalog-item-controls">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSelectCatalogForConfirm(food)}
                    >
                      เลือก ({food.defaultServingGrams}g · {servingKcal} kcal)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn-link" onClick={onNavigateToDiary}>
            ไปยังหน้า Food Diary แบบเต็ม →
          </button>
        </div>
      </section>

      <BarcodeScannerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onProductFound={onOpenConfirmMeal}
        defaultCategory={mealCategory}
        settings={settings}
      />
    </div>
  );
};
