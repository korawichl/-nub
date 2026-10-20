import React, { useState, useRef, useEffect } from 'react';
import type {
  AppSettings,
  ConfirmMealDraft,
  FoodCatalogItem,
  MealCategory,
} from '../types';
import { getFoodAnalysisProvider } from '../services/aiProvider';
import { db } from '../db/database';
import { getBangkokDateString } from '../utils/date';
import { calculateFoodNutrition } from '../utils/nutritionCalculator';
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
  const provider = getFoodAnalysisProvider(
    settings.aiProviderId,
    settings.aiBackendEndpoint,
    settings.geminiApiKey,
    settings.geminiModel,
    settings.groqApiKey
  );
  const providerStatus = provider.getStatus();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mealCategory, setMealCategory] = useState<MealCategory>('lunch');
  const [scanState, setScanState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleClearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
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

  const handleSelectCatalogForConfirm = async (food: FoodCatalogItem) => {
    const portion = calculateFoodNutrition(
      {
        calories: food.caloriesPer100g,
        protein: food.proteinPer100g,
        carbohydrates: food.carbsPer100g,
        fat: food.fatPer100g,
      },
      food.defaultServingGrams
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

    onOpenConfirmMeal({
      foodName: food.name,
      ingredients: food.name,
      servingGrams: portion.grams,
      calories: portion.calories,
      protein: portion.protein,
      carbohydrates: portion.carbohydrates,
      fat: portion.fat,
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

  const filteredCatalog = catalog.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

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
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={18} /> Take Photo (Camera)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Upload size={18} /> Select Image from Device
              </button>
              <button
                type="button"
                className="btn btn-secondary"
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
            <div className="preview-meta-bar">
              <span>
                {selectedFile?.name} ({Math.round((selectedFile?.size || 0) / 1024)} KB)
              </span>
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
                  className="btn btn-primary btn-full"
                  disabled={scanState === 'loading'}
                  onClick={handleRunAiAnalysis}
                >
                  {scanState === 'loading' ? (
                    <>
                      <Loader2 size={18} className="spin" /> Analyzing Photo (Auto-Failover Active)...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Analyze Photo with Free AI Vision
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

              {scanState === 'error' && errorMessage && (
                <div className="alert-banner alert-danger" style={{ marginTop: '0.75rem' }}>
                  <AlertCircle size={18} />
                  <div>
                    <strong>Analysis Notice</strong>
                    <p>{errorMessage}</p>
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
          <h2 className="section-title">
            <Search size={18} /> Manual Food Search & Confirm
          </h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleManualBlankEntry}
          >
            <Edit3 size={15} /> Custom Meal Entry
          </button>
        </div>

        <div className="search-bar-wrapper">
          <Search size={16} className="search-bar-icon" />
          <input
            type="search"
            className="input-text search-input"
            placeholder="ค้นหาอาหารไทย หรือ English (เช่น ข้าวมันไก่, กะเพรา, อกไก่, เวย์)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-results-list">
          {filteredCatalog.map((food) => {
            const servingKcal = Math.round(
              (food.caloriesPer100g * food.defaultServingGrams) / 100
            );
            return (
              <div key={food.id} className="catalog-item-row">
                <div>
                  <div className="catalog-item-title">{food.name}</div>
                  <div className="catalog-item-sub">
                    Per 100g: {food.caloriesPer100g} kcal · P {food.proteinPer100g}g · C{' '}
                    {food.carbsPer100g}g · F {food.fatPer100g}g
                  </div>
                  <div className="catalog-item-source">{food.sourceLabel}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSelectCatalogForConfirm(food)}
                >
                  Select ({food.defaultServingGrams}g · {servingKcal} kcal)
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn-link" onClick={onNavigateToDiary}>
            Or switch to the full Food Diary screen →
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
