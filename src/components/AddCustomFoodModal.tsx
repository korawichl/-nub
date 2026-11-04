import React, { useState } from 'react';
import type { FoodCatalogItem, MealCategory } from '../types';
import { saveCustomCatalogFood, addCatalogFoodToMeal } from '../db/database';
import { getBangkokDateString, getMealCategoryByTime } from '../utils/date';
import { X, Sparkles, Check, Scale, Info, Flame } from 'lucide-react';

interface AddCustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSaved?: (savedItem: FoodCatalogItem) => void;
  initialItem?: FoodCatalogItem | null;
  defaultCategory?: MealCategory;
  targetDate?: string;
}

const CATEGORY_PRESETS = [
  'อาหารของฉัน',
  'อาหารจานเดียว',
  'กับข้าว',
  'คลีน/สุขภาพ',
  'ของว่าง/ขนม',
  'เครื่องดื่ม',
  'อาหารญี่ปุ่น',
  'อื่นๆ',
] as const;

export const AddCustomFoodModal: React.FC<AddCustomFoodModalProps> = ({
  isOpen,
  onClose,
  onFoodSaved,
  initialItem,
  defaultCategory,
  targetDate,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialItem);

  const [foodName, setFoodName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState(
    initialItem?.category || 'อาหารของฉัน'
  );
  const [servingGrams, setServingGrams] = useState(
    String(initialItem?.defaultServingGrams || 200)
  );

  // If initialItem is per 100g, compute default total for the serving
  const initialServing = initialItem?.defaultServingGrams || 200;
  const initialRatio = initialServing / 100;

  const [calories, setCalories] = useState(
    initialItem
      ? String(Math.round(initialItem.caloriesPer100g * initialRatio))
      : ''
  );
  const [protein, setProtein] = useState(
    initialItem
      ? String(Math.round(initialItem.proteinPer100g * initialRatio * 10) / 10)
      : ''
  );
  const [carbs, setCarbs] = useState(
    initialItem
      ? String(Math.round(initialItem.carbsPer100g * initialRatio * 10) / 10)
      : ''
  );
  const [fat, setFat] = useState(
    initialItem
      ? String(Math.round(initialItem.fatPer100g * initialRatio * 10) / 10)
      : ''
  );
  const [sodiumMg, setSodiumMg] = useState(
    initialItem?.sodiumMgPer100g !== undefined
      ? String(Math.round(initialItem.sodiumMgPer100g * initialRatio))
      : ''
  );
  const [sugarG, setSugarG] = useState(
    initialItem?.sugarGPer100g !== undefined
      ? String(Math.round(initialItem.sugarGPer100g * initialRatio * 10) / 10)
      : ''
  );

  const [showOptionalMicros, setShowOptionalMicros] = useState(
    Boolean(sodiumMg || sugarG)
  );

  // Option to log to today immediately
  const [logToDiary, setLogToDiary] = useState(!isEditing);
  const [diaryMealCategory, setDiaryMealCategory] = useState<MealCategory>(
    defaultCategory || getMealCategoryByTime()
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per 100g calculation preview
  const numGrams = parseFloat(servingGrams) || 0;
  const numCal = parseFloat(calories) || 0;
  const numPro = parseFloat(protein) || 0;
  const numCarb = parseFloat(carbs) || 0;
  const numFat = parseFloat(fat) || 0;

  const previewPer100g =
    numGrams > 0
      ? {
          cal: Math.round((numCal * 100) / numGrams),
          pro: Math.round(((numPro * 100) / numGrams) * 10) / 10,
          carb: Math.round(((numCarb * 100) / numGrams) * 10) / 10,
          fat: Math.round(((numFat * 100) / numGrams) * 10) / 10,
        }
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = foodName.trim();
    if (!cleanName) {
      setError('กรุณากรอกชื่ออาหาร');
      return;
    }

    if (!Number.isFinite(numGrams) || numGrams <= 0) {
      setError('กรุณาระบุน้ำหนักต่อเสิร์ฟ (กรัม) ที่ถูกต้อง (มากกว่า 0)');
      return;
    }

    if (
      !Number.isFinite(numCal) ||
      numCal < 0 ||
      !Number.isFinite(numPro) ||
      numPro < 0 ||
      !Number.isFinite(numCarb) ||
      numCarb < 0 ||
      !Number.isFinite(numFat) ||
      numFat < 0
    ) {
      setError('แคลอรี่และสารอาหารหลักต้องเป็นตัวเลขที่ไม่ติดลบ');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSodium = sodiumMg.trim() ? parseFloat(sodiumMg) : undefined;
      const parsedSugar = sugarG.trim() ? parseFloat(sugarG) : undefined;

      const savedFood = await saveCustomCatalogFood({
        id: initialItem?.id,
        name: cleanName,
        category: category.trim() || 'อาหารของฉัน',
        servingGrams: numGrams,
        calories: numCal,
        protein: numPro,
        carbohydrates: numCarb,
        fat: numFat,
        sodiumMg: parsedSodium,
        sugarG: parsedSugar,
      });

      // If user also wants to log it to today's diary right now
      if (logToDiary && !isEditing) {
        const dateToLog = targetDate || getBangkokDateString();
        await addCatalogFoodToMeal(
          savedFood,
          numGrams,
          dateToLog,
          diaryMealCategory
        );
      }

      if (onFoodSaved) {
        onFoodSaved(savedFood);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกอาหาร');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-[28px] shadow-2xl p-5 sm:p-6 text-[#20243A] dark:text-[#F8FAFC] my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E9EAF2] dark:border-[#2A374D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEDFF] dark:bg-[#6258F5]/20 text-[#6258F5] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#20243A] dark:text-[#F8FAFC] tracking-tight">
                {isEditing ? '✏️ แก้ไขเมนูอาหารของฉัน' : '➕ เพิ่มอาหารเอง & บันทึกจำไว้'}
              </h2>
              <p className="text-xs text-[#858BA0] dark:text-[#94A3B8] mt-0.5">
                บันทึกลงในคลังอาหารของคุณ เพื่อค้นหาและเลือกกินซ้ำได้ตลอดเวลา
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#858BA0] hover:text-[#20243A] dark:hover:text-white rounded-xl hover:bg-[#F6F7FB] dark:hover:bg-[#202C3F] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#FFF0F2] dark:bg-[#4C1D24] text-[#EB6478] dark:text-[#FCA5A5] text-xs font-medium rounded-xl border border-[#EB6478]/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Food Name Field */}
          <div>
            <label className="block text-xs font-bold text-[#20243A] dark:text-[#E2E8F0] mb-1.5">
              ชื่ออาหาร (Food Name) <span className="text-[#EB6478]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ข้าวกะเพราคลีนอกไก่ 200g, โปรตีนเชคกล้วยหอม..."
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F6F7FB] dark:bg-[#0F172A] border border-[#E9EAF2] dark:border-[#2A374D] rounded-xl text-[#20243A] dark:text-white placeholder:text-[#858BA0] focus:outline-none focus:border-[#6258F5] focus:bg-white dark:focus:bg-[#0F172A] transition-all"
            />
          </div>

          {/* Category Chips Selection */}
          <div>
            <label className="block text-xs font-bold text-[#20243A] dark:text-[#E2E8F0] mb-1.5">
              หมวดหมู่อาหาร (Category)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      isSelected
                        ? 'bg-[#6258F5] text-white shadow-2xs'
                        : 'bg-[#F6F7FB] dark:bg-[#202C3F] text-[#858BA0] dark:text-[#CBD5E1] hover:text-[#20243A] border border-[#E9EAF2] dark:border-[#2A374D]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Serving Size & Weight */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#20243A] dark:text-[#E2E8F0] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#6258F5]" />
                <span>ปริมาณ 1 เสิร์ฟปกติ (Serving Weight)</span>
                <span className="text-[#EB6478]">*</span>
              </label>
              <span className="text-[11px] text-[#858BA0]">หน่วยเป็นกรัม (g)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="200"
                  value={servingGrams}
                  onChange={(e) => setServingGrams(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#F6F7FB] dark:bg-[#0F172A] border border-[#E9EAF2] dark:border-[#2A374D] rounded-xl text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#858BA0]">
                  g
                </span>
              </div>

              {/* Quick weight buttons */}
              <div className="flex items-center gap-1">
                {[100, 150, 200, 250, 300].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setServingGrams(String(g))}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${
                      Number(servingGrams) === g
                        ? 'bg-[#EFEDFF] text-[#6258F5] border-[#6258F5]'
                        : 'bg-[#F6F7FB] dark:bg-[#202C3F] border-[#E9EAF2] dark:border-[#2A374D] text-[#858BA0]'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Macronutrients Grid for this serving */}
          <div className="p-3.5 bg-[#F6F7FB] dark:bg-[#0F172A]/70 rounded-2xl border border-[#E9EAF2] dark:border-[#2A374D]">
            <span className="block text-xs font-bold text-[#20243A] dark:text-[#E2E8F0] mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>สารอาหารสำหรับ 1 เสิร์ฟ ({servingGrams || '0'}g) นี้</span>
              </span>
              <span className="text-[10px] font-normal text-[#858BA0]">
                กรอกตามฉลากหรือประเมิน
              </span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Calories */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#858BA0]">
                  แคลอรี่ (kcal) <span className="text-[#EB6478]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="350"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                />
              </div>

              {/* Protein */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#6258F5] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6258F5]"></span>
                  <span>โปรตีน (g) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="25"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                />
              </div>

              {/* Carbs */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                  <span>คาร์บ (g) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="30"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                />
              </div>

              {/* Fat */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#F59E0B] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                  <span>ไขมัน (g) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="8"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                />
              </div>
            </div>

            {/* Optional Sodium & Sugar toggle */}
            <div className="mt-2.5 pt-2 border-t border-[#E9EAF2] dark:border-[#2A374D]/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowOptionalMicros(!showOptionalMicros)}
                className="text-[11px] text-[#6258F5] font-semibold hover:underline"
              >
                {showOptionalMicros
                  ? 'ซ่อนโซเดียมและน้ำตาล'
                  : '+ ระบุโซเดียม (mg) และน้ำตาล (g) (ถ้ามี)'}
              </button>
            </div>

            {showOptionalMicros && (
              <div className="grid grid-cols-2 gap-2.5 mt-2 pt-2 border-t border-[#E9EAF2] dark:border-[#2A374D]/60 animate-fadeIn">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#858BA0]">
                    โซเดียม Sodium (mg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="เช่น 450"
                    value={sodiumMg}
                    onChange={(e) => setSodiumMg(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#858BA0]">
                    น้ำตาล Sugar (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="เช่น 3.5"
                    value={sugarG}
                    onChange={(e) => setSugarG(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white focus:outline-none focus:border-[#6258F5]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Auto calculated normalized per 100g preview */}
          {previewPer100g && numCal > 0 && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[#EFEDFF]/60 dark:bg-[#6258F5]/10 border border-[#6258F5]/20 flex items-center justify-between text-xs text-[#20243A] dark:text-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6258F5] dark:text-[#A5B4FC]">
                <Info className="w-3.5 h-3.5" />
                <span>คำนวณต่อ 100g อัตโนมัติ:</span>
              </span>
              <span className="font-bold tabular-nums">
                {previewPer100g.cal} kcal · P {previewPer100g.pro}g · C {previewPer100g.carb}g · F {previewPer100g.fat}g
              </span>
            </div>
          )}

          {/* Option: Log to today right now */}
          {!isEditing && (
            <div className="p-3 rounded-2xl bg-[#F6F7FB] dark:bg-[#0F172A] border border-[#E9EAF2] dark:border-[#2A374D] flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={logToDiary}
                  onChange={(e) => setLogToDiary(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6258F5] focus:ring-[#6258F5]"
                />
                <span className="text-xs font-bold text-[#20243A] dark:text-[#E2E8F0]">
                  บันทึกลงมื้ออาหารของวันนี้ทันทีด้วย
                </span>
              </label>

              {logToDiary && (
                <div className="flex items-center gap-2 pl-6 pt-1">
                  <span className="text-xs text-[#858BA0]">บันทึกเข้ามื้อ:</span>
                  <select
                    value={diaryMealCategory}
                    onChange={(e) => setDiaryMealCategory(e.target.value as MealCategory)}
                    className="text-xs py-1 px-2.5 bg-white dark:bg-[#182234] border border-[#E9EAF2] dark:border-[#2A374D] rounded-lg text-[#20243A] dark:text-white font-semibold focus:outline-none focus:border-[#6258F5]"
                  >
                    <option value="breakfast">🌅 มื้อเช้า (Breakfast)</option>
                    <option value="lunch">☀️ มื้อเที่ยง (Lunch)</option>
                    <option value="dinner">🌙 มื้อเย็น (Dinner)</option>
                    <option value="snacks">🍰 ของว่าง/ขนม (Snacks)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9EAF2] dark:border-[#2A374D]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#858BA0] hover:text-[#20243A] dark:hover:text-white rounded-xl hover:bg-[#F6F7FB] dark:hover:bg-[#202C3F] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#6258F5] hover:bg-[#756BFF] active:scale-98 rounded-xl shadow-md shadow-[#6258F5]/25 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'บันทึกการแก้ไข' : '💾 บันทึกและจดจำเมนูนี้'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
