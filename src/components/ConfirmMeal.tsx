import React, { useState } from 'react';
import type { ConfirmMealDraft, MealCategory } from '../types';
import { addMealItemSnapshot, db } from '../db/database';
import {
  getBangkokDateString,
  getMealCategoryByTime,
  isSnackOrBeverageFood,
} from '../utils/date';
import { estimateRoughNutrition } from '../utils/nutritionCalculator';
import { Check, X, AlertTriangle, Info, UtensilsCrossed } from 'lucide-react';

interface ConfirmMealProps {
  draft: ConfirmMealDraft;
  targetDate?: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

export const ConfirmMeal: React.FC<ConfirmMealProps> = ({
  draft,
  targetDate,
  onConfirmed,
  onCancel,
}) => {
  // Calculate rough estimates for fat, sodium, and sugar if missing or zero
  const initialEstimates = estimateRoughNutrition({
    foodName: draft.foodName,
    calories: draft.calories || 0,
    protein: draft.protein || 0,
    carbohydrates: draft.carbohydrates || 0,
    fat: draft.fat,
    sodiumMg: draft.sodiumMg,
    sugarG: draft.sugarG,
  });

  const [foodName, setFoodName] = useState(draft.foodName);
  const [ingredients, setIngredients] = useState(draft.ingredients);
  const [servingGrams, setServingGrams] = useState(String(draft.servingGrams || 100));
  const [calories, setCalories] = useState(String(draft.calories || 0));
  const [protein, setProtein] = useState(String(draft.protein || 0));
  const [carbohydrates, setCarbohydrates] = useState(
    String(draft.carbohydrates || 0)
  );
  const [fat, setFat] = useState(String(initialEstimates.fat || 0));
  const [sodiumMg, setSodiumMg] = useState(
    initialEstimates.sodiumMg > 0 ? String(initialEstimates.sodiumMg) : ''
  );
  const [sugarG, setSugarG] = useState(
    initialEstimates.sugarG > 0 ? String(initialEstimates.sugarG) : ''
  );
  const [category, setCategory] = useState<MealCategory>(draft.category);
  const [categoryReason, setCategoryReason] = useState<
    'time' | 'snack_detected' | 'manual'
  >(() => {
    if (draft.autoCategorizedReason) return draft.autoCategorizedReason;
    return isSnackOrBeverageFood(`${draft.foodName} ${draft.ingredients}`)
      ? 'snack_detected'
      : 'time';
  });
  const [saveToCatalog, setSaveToCatalog] = useState(Boolean(draft.saveToCatalog));
  const [explicitlyConfirmed, setExplicitlyConfirmed] = useState(
    !draft.requiresExplicitConfirmation
  );
  const [error, setError] = useState<string | null>(null);

  const dateToUse = targetDate || getBangkokDateString();

  // Scale nutrition proportionally if user wants to recalculate from current per-gram ratio
  const handleScalePortion = (newGramsStr: string) => {
    const prevGrams = parseFloat(servingGrams);
    const nextGrams = parseFloat(newGramsStr);
    setServingGrams(newGramsStr);

    if (
      Number.isFinite(prevGrams) &&
      prevGrams > 0 &&
      Number.isFinite(nextGrams) &&
      nextGrams >= 0
    ) {
      const ratio = nextGrams / prevGrams;
      const scaleVal = (valStr: string) => {
        const num = parseFloat(valStr);
        if (!Number.isFinite(num)) return valStr;
        return String(Math.round(num * ratio * 100) / 100);
      };
      setCalories(scaleVal(calories));
      setProtein(scaleVal(protein));
      setCarbohydrates(scaleVal(carbohydrates));
      setFat(scaleVal(fat));
      if (sodiumMg) setSodiumMg(scaleVal(sodiumMg));
      if (sugarG) setSugarG(scaleVal(sugarG));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = foodName.trim();
    if (!trimmedName) {
      setError('Food name is required.');
      return;
    }

    const g = parseFloat(servingGrams);
    const cal = parseFloat(calories);
    const pro = parseFloat(protein);
    const carb = parseFloat(carbohydrates);
    const f = parseFloat(fat);

    if (!Number.isFinite(g) || g <= 0) {
      setError('Serving weight in grams must be a positive number.');
      return;
    }
    if (
      !Number.isFinite(cal) ||
      cal < 0 ||
      !Number.isFinite(pro) ||
      pro < 0 ||
      !Number.isFinite(carb) ||
      carb < 0 ||
      !Number.isFinite(f) ||
      f < 0
    ) {
      setError('Calories and macronutrients must be non-negative numbers.');
      return;
    }

    if (draft.requiresExplicitConfirmation && !explicitlyConfirmed) {
      setError(
        'Please check the confirmation box to verify you have reviewed these AI-estimated values before saving.'
      );
      return;
    }

    const na = sodiumMg.trim() ? parseFloat(sodiumMg) : undefined;
    const sug = sugarG.trim() ? parseFloat(sugarG) : undefined;

    let catalogId: string | undefined;

    if (saveToCatalog) {
      const factor = 100 / g;
      const now = new Date().toISOString();
      catalogId = `custom_${Date.now()}`;
      await db.foodCatalog.put({
        id: catalogId,
        name: trimmedName,
        category: 'User Custom',
        defaultServingGrams: Math.round(g),
        caloriesPer100g: Math.round(cal * factor * 100) / 100,
        proteinPer100g: Math.round(pro * factor * 100) / 100,
        carbsPer100g: Math.round(carb * factor * 100) / 100,
        fatPer100g: Math.round(f * factor * 100) / 100,
        sodiumMgPer100g: na !== undefined ? Math.round(na * factor) : undefined,
        sugarGPer100g: sug !== undefined ? Math.round(sug * factor * 10) / 10 : undefined,
        barcode: draft.barcode,
        source: draft.source === 'ai_confirmed' ? 'ai_confirmed' : 'user_custom',
        sourceLabel:
          draft.source === 'ai_confirmed'
            ? 'AI Estimate (User Confirmed)'
            : 'User Provided / Custom Entry',
        usageCount: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    await addMealItemSnapshot({
      date: dateToUse,
      category,
      foodCatalogId: catalogId,
      foodName: trimmedName,
      ingredients: ingredients.trim(),
      grams: g,
      calories: cal,
      protein: pro,
      carbohydrates: carb,
      fat: f,
      sodiumMg: na,
      sugarG: sug,
      source: draft.source,
    });

    onConfirmed();
  };

  return (
    <div className="screen-container">
      <div className="card">
        <div className="section-header">
          <div>
            <h1 className="screen-title">
              <UtensilsCrossed size={20} /> Confirm Meal Details
            </h1>
            <p className="screen-subtitle">
              Review and edit portion weight, ingredients, and nutrition before saving to{' '}
              <strong>{dateToUse}</strong>.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onCancel}
            aria-label="Cancel meal confirmation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Display AI Uncertainties and Assumptions if present */}
        {((draft.uncertainties && draft.uncertainties.length > 0) ||
          (draft.assumptions && draft.assumptions.length > 0)) && (
          <div className="alert-banner alert-warning" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={20} className="alert-icon" />
            <div>
              <strong>AI Estimation Notes & Uncertainties</strong>
              {draft.uncertainties && draft.uncertainties.length > 0 && (
                <ul className="compact-list">
                  {draft.uncertainties.map((u, idx) => (
                    <li key={idx}>Uncertainty: {u}</li>
                  ))}
                </ul>
              )}
              {draft.assumptions && draft.assumptions.length > 0 && (
                <ul className="compact-list">
                  {draft.assumptions.map((a, idx) => (
                    <li key={idx}>Assumption: {a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="alert-banner alert-danger" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="confirm-food-name" className="field-label">
                Food Name *
              </label>
              <input
                id="confirm-food-name"
                type="text"
                className="input-text"
                placeholder="e.g., Grilled Chicken Breast with Rice"
                value={foodName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setFoodName(nextName);
                  if (categoryReason !== 'manual') {
                    const snackDetected = isSnackOrBeverageFood(
                      `${nextName} ${ingredients}`
                    );
                    if (snackDetected) {
                      setCategory('snacks');
                      setCategoryReason('snack_detected');
                    } else {
                      setCategory(getMealCategoryByTime());
                      setCategoryReason('time');
                    }
                  }
                }}
                required
              />
            </div>

            <div className="form-field">
              <label
                htmlFor="confirm-meal-cat"
                className="field-label flex items-center justify-between gap-2"
              >
                <span>Meal Category *</span>
                {categoryReason === 'snack_detected' && (
                  <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                    🍰 จัดหมวดขนมอัตโนมัติ (เปลี่ยนได้)
                  </span>
                )}
                {categoryReason === 'time' && (
                  <span className="text-[11px] font-semibold text-[#6258F5] bg-[#EFEDFF] px-2 py-0.5 rounded-full">
                    🕒 อิงตามเวลาอัตโนมัติ (เปลี่ยนได้)
                  </span>
                )}
                {categoryReason === 'manual' && (
                  <span className="text-[11px] font-semibold text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-full">
                    📌 เลือกมื้อเอง
                  </span>
                )}
              </label>
              <select
                id="confirm-meal-cat"
                className="input-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as MealCategory);
                  setCategoryReason('manual');
                }}
              >
                <option value="breakfast">🌅 Breakfast (มื้อเช้า)</option>
                <option value="lunch">☀️ Lunch (มื้อเที่ยง)</option>
                <option value="dinner">🌙 Dinner (มื้อเย็น)</option>
                <option value="snacks">🍰 Snacks (ของว่าง/ขนม)</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="confirm-ingredients" className="field-label">
              Ingredients / Preparation Notes
            </label>
            <textarea
              id="confirm-ingredients"
              className="input-textarea"
              rows={2}
              placeholder="e.g., 150g chicken breast, 200g jasmine rice, 1 tsp olive oil"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="confirm-grams" className="field-label">
                Estimated Serving Weight (grams) *
              </label>
              <input
                id="confirm-grams"
                type="number"
                step="any"
                min="1"
                className="input-text"
                value={servingGrams}
                onChange={(e) => handleScalePortion(e.target.value)}
                required
              />
              <small className="field-hint">
                Changing grams scales current macro values proportionally.
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="confirm-calories" className="field-label">
                Calories (kcal) *
              </label>
              <input
                id="confirm-calories"
                type="number"
                step="any"
                min="0"
                className="input-text"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-field">
              <label htmlFor="confirm-protein" className="field-label">
                Protein (g) *
              </label>
              <input
                id="confirm-protein"
                type="number"
                step="any"
                min="0"
                className="input-text"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirm-carbs" className="field-label">
                Carbohydrates (g) *
              </label>
              <input
                id="confirm-carbs"
                type="number"
                step="any"
                min="0"
                className="input-text"
                value={carbohydrates}
                onChange={(e) => setCarbohydrates(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirm-fat" className="field-label">
                Fat (g) *
              </label>
              <input
                id="confirm-fat"
                type="number"
                step="any"
                min="0"
                className="input-text"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="confirm-sodium" className="field-label">
                Sodium (mg) <span className="text-[11px] text-[#6258F5] font-normal">(คำนวณคร่าวๆ / แก้ไขได้)</span>
              </label>
              <input
                id="confirm-sodium"
                type="number"
                step="any"
                min="0"
                className="input-text"
                placeholder="e.g. 650"
                value={sodiumMg}
                onChange={(e) => setSodiumMg(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirm-sugar" className="field-label">
                Sugar (g) <span className="text-[11px] text-[#6258F5] font-normal">(คำนวณคร่าวๆ / แก้ไขได้)</span>
              </label>
              <input
                id="confirm-sugar"
                type="number"
                step="any"
                min="0"
                className="input-text"
                placeholder="e.g. 5"
                value={sugarG}
                onChange={(e) => setSugarG(e.target.value)}
              />
            </div>
          </div>

          <div className="checkbox-row">
            <input
              id="save-catalog-check"
              type="checkbox"
              checked={saveToCatalog}
              onChange={(e) => setSaveToCatalog(e.target.checked)}
            />
            <label htmlFor="save-catalog-check">
              Also save this food (normalized per 100g) to my local Food Catalog for future
              reuse
            </label>
          </div>

          {draft.requiresExplicitConfirmation && (
            <div className="checkbox-row confirmation-highlight">
              <input
                id="explicit-ai-confirm-check"
                type="checkbox"
                checked={explicitlyConfirmed}
                onChange={(e) => setExplicitlyConfirmed(e.target.checked)}
              />
              <label htmlFor="explicit-ai-confirm-check">
                <strong>Required Confirmation:</strong> I have reviewed and verified these
                estimated food weights and nutrition numbers.
              </label>
            </div>
          )}

          <div className="info-footnote">
            <Info size={14} />
            <span>
              Saving stores a permanent snapshot of this food's name and macros in your
              diary so editing the catalog later will never alter past days.
            </span>
          </div>

          <div className="cta-row flex flex-col sm:flex-row gap-2 mt-2">
            <button type="submit" className="btn btn-primary w-full sm:w-auto min-h-[44px]">
              <Check size={18} /> Confirm & Save Meal
            </button>
            <button type="button" className="btn btn-secondary w-full sm:w-auto min-h-[44px]" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
