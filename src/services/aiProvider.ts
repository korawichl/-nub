import type { AIProviderStatus } from '../types';
import { estimateRoughNutrition } from '../utils/nutritionCalculator';

export interface IdentifiedFoodItem {
  name: string;
  estimatedGrams: number;
  estimatedCalories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface FoodAnalysisResult {
  mealName: string;
  identifiedFoodItems: IdentifiedFoodItem[];
  estimatedWeightGrams: number;
  estimatedCalories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sodiumMg?: number;
  sugarG?: number;
  uncertainties: string[];
  assumptions: string[];
  requiresUserConfirmation: true;
}

export interface FoodAnalysisProvider {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  getStatus(): AIProviderStatus;
  getStatusMessage(): string;
  analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult>;
  analyzeTextPrompt?(prompt: string): Promise<FoodAnalysisResult>;
}

/**
 * Extracts JSON object even if the model wraps it in markdown ```json ... ``` fences.
 */
export function parseJsonFromModelText(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(candidate);
}

/**
 * Validates any raw object returned by an external AI endpoint to ensure it conforms
 * to the FoodAnalysisResult schema before displaying it in the Confirm Meal screen.
 * Resiliently normalizes field variations across Gemini, Gemma, Groq, and GPT-OSS models.
 */
export function validateFoodAnalysisResult(raw: unknown): FoodAnalysisResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI analysis response: expected an object.');
  }

  const obj = raw as Record<string, unknown>;
  const rawMealName =
    (typeof obj.mealName === 'string' && obj.mealName.trim()) ||
    (typeof obj.foodName === 'string' && obj.foodName.trim()) ||
    (typeof obj.name === 'string' && obj.name.trim()) ||
    (typeof obj.dishName === 'string' && obj.dishName.trim()) ||
    '';

  if (!rawMealName) {
    throw new Error('Invalid AI analysis response: mealName is required.');
  }

  const numFieldWithFallback = (keys: string[], defaultVal?: number): number => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        const val = Number(obj[key]);
        if (Number.isFinite(val) && val >= 0) {
          return Math.round(val * 100) / 100;
        }
      }
    }
    if (defaultVal !== undefined) {
      return defaultVal;
    }
    throw new Error(`Invalid AI analysis response: ${keys[0]} must be a non-negative number.`);
  };

  const itemsRaw = Array.isArray(obj.identifiedFoodItems) ? obj.identifiedFoodItems : [];
  const identifiedFoodItems: IdentifiedFoodItem[] = itemsRaw.map((item: unknown, idx: number) => {
    if (typeof item === 'string' && item.trim()) {
      return {
        name: item.trim(),
        estimatedGrams: 100,
        estimatedCalories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
      };
    }
    if (!item || typeof item !== 'object') {
      return {
        name: `Item ${idx + 1}`,
        estimatedGrams: 100,
        estimatedCalories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
      };
    }
    const rec = item as Record<string, unknown>;
    return {
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : `Item ${idx + 1}`,
      estimatedGrams: Number.isFinite(Number(rec.estimatedGrams ?? rec.grams))
        ? Number(rec.estimatedGrams ?? rec.grams)
        : 100,
      estimatedCalories: Number.isFinite(Number(rec.estimatedCalories ?? rec.calories))
        ? Number(rec.estimatedCalories ?? rec.calories)
        : 0,
      protein: Number.isFinite(Number(rec.protein)) ? Number(rec.protein) : 0,
      carbohydrates: Number.isFinite(Number(rec.carbohydrates ?? rec.carbs))
        ? Number(rec.carbohydrates ?? rec.carbs)
        : 0,
      fat: Number.isFinite(Number(rec.fat)) ? Number(rec.fat) : 0,
    };
  });

  const toStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) {
      return val.filter((v): v is string => typeof v === 'string');
    }
    if (val && typeof val === 'object') {
      return Object.entries(val as Record<string, unknown>).map(
        ([k, v]) => `${k}: ${String(v)}`
      );
    }
    if (typeof val === 'string' && val.trim()) {
      return [val.trim()];
    }
    return [];
  };

  const estimatedCalories = numFieldWithFallback(['estimatedCalories', 'calories', 'kcal']);
  const protein = numFieldWithFallback(['protein', 'proteinGrams', 'proteinG'], Math.round(estimatedCalories * 0.05));
  const carbohydrates = numFieldWithFallback(['carbohydrates', 'carbs', 'carbsGrams', 'carbsG'], Math.round(estimatedCalories * 0.11));
  const rawFat = numFieldWithFallback(['fat', 'fatGrams', 'fatG'], 0);
  const estimatedWeightGrams = numFieldWithFallback(
    ['estimatedWeightGrams', 'servingGrams', 'weightGrams', 'grams'],
    250
  );

  const rawSodium =
    typeof obj.sodiumMg === 'number' && Number.isFinite(obj.sodiumMg) && obj.sodiumMg > 0
      ? Math.round(obj.sodiumMg)
      : undefined;
  const rawSugar =
    typeof obj.sugarG === 'number' && Number.isFinite(obj.sugarG) && obj.sugarG > 0
      ? Math.round(Number(obj.sugarG) * 10) / 10
      : undefined;

  // Apply intelligent rough calculation for fat, sodium, and sugar so they are never omitted
  const estimates = estimateRoughNutrition({
    foodName: rawMealName,
    calories: estimatedCalories,
    protein,
    carbohydrates,
    fat: rawFat,
    sodiumMg: rawSodium,
    sugarG: rawSugar,
  });

  return {
    mealName: rawMealName,
    identifiedFoodItems,
    estimatedWeightGrams,
    estimatedCalories,
    protein,
    carbohydrates,
    fat: estimates.fat,
    sodiumMg: estimates.sodiumMg,
    sugarG: estimates.sugarG,
    uncertainties: toStringArray(obj.uncertainties),
    assumptions: toStringArray(obj.assumptions),
    requiresUserConfirmation: true,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface CompressedImageResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Automatically compresses and resizes a photo client-side before sending to AI Vision models.
 * Reduces 2-5MB smartphone photos down to ~40KB-70KB JPEG with 768px max dimension.
 * Keeps food visual details crisp while ensuring instantaneous upload and avoiding network/token bottleneck.
 */
export async function compressImageBlob(
  blob: Blob,
  maxDimension: number = 768,
  quality: number = 0.72
): Promise<CompressedImageResult> {
  const originalSize = blob.size;

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    // Node/Vitest test environment fallback
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    return {
      blob,
      base64,
      mimeType: blob.type || 'image/jpeg',
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          async (compressedBlob) => {
            if (!compressedBlob) {
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              const base64 = dataUrl.split(',')[1] || '';
              const approxBytes = Math.round((base64.length * 3) / 4);
              resolve({
                blob,
                base64,
                mimeType: 'image/jpeg',
                originalSize,
                compressedSize: approxBytes,
                compressionRatio: Math.max(0, (originalSize - approxBytes) / (originalSize || 1)),
              });
              return;
            }

            try {
              if (typeof FileReader !== 'undefined') {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const dataUrl = (reader.result as string) || '';
                  const base64 = dataUrl.split(',')[1] || '';
                  resolve({
                    blob: compressedBlob,
                    base64,
                    mimeType: 'image/jpeg',
                    originalSize,
                    compressedSize: compressedBlob.size,
                    compressionRatio: Math.max(
                      0,
                      (originalSize - compressedBlob.size) / (originalSize || 1)
                    ),
                  });
                };
                reader.onerror = reject;
                reader.readAsDataURL(compressedBlob);
              } else {
                const arrayBuffer = await compressedBlob.arrayBuffer();
                const base64 = arrayBufferToBase64(arrayBuffer);
                resolve({
                  blob: compressedBlob,
                  base64,
                  mimeType: 'image/jpeg',
                  originalSize,
                  compressedSize: compressedBlob.size,
                  compressionRatio: Math.max(
                    0,
                    (originalSize - compressedBlob.size) / (originalSize || 1)
                  ),
                });
              }
            } catch (err) {
              reject(err);
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        const approxBytes = Math.round((base64.length * 3) / 4);
        resolve({
          blob,
          base64,
          mimeType: 'image/jpeg',
          originalSize,
          compressedSize: approxBytes,
          compressionRatio: Math.max(0, (originalSize - approxBytes) / (originalSize || 1)),
        });
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Compresses and resizes a photo client-side before sending to AI Vision models.
 */
export async function compressImageBlobToBase64(
  blob: Blob,
  maxDimension: number = 768,
  quality: number = 0.72
): Promise<{ base64: string; mimeType: string }> {
  const result = await compressImageBlob(blob, maxDimension, quality);
  return {
    base64: result.base64,
    mimeType: result.mimeType,
  };
}

const NUTRITION_VISION_PROMPT = `Analyze this food or drink photo in detail. Identify the dish/beverage (use Thai + English name if it is Thai food or drink) and estimate its serving weight in grams, total calories, macronutrients (protein, carbohydrates, fat), sodium in mg, and sugar in grams. Always provide realistic non-zero estimates for fat, sugar, and sodium based on the ingredients, cooking method (stir-fried, soup, sauce, etc.).
Return ONLY a valid JSON object matching this exact schema (no markdown explanation):
{
  "mealName": "Dish or drink name (e.g. เกาเหลาเนื้อตุ๋น, โกโก้ปั่นวิปครีม, ข้าวมันไก่ต้ม)",
  "identifiedFoodItems": [
    {
      "name": "Ingredient name",
      "estimatedGrams": 150,
      "estimatedCalories": 250,
      "protein": 25,
      "carbohydrates": 10,
      "fat": 8
    }
  ],
  "estimatedWeightGrams": 350,
  "estimatedCalories": 450,
  "protein": 30,
  "carbohydrates": 45,
  "fat": 15,
  "sodiumMg": 680,
  "sugarG": 4.5,
  "uncertainties": ["e.g. Exact cooking oil or sugar level estimated from appearance"],
  "assumptions": ["e.g. Standard Thai restaurant portion"]
}`;

/**
 * Default provider when no AI backend or credentials are configured.
 */
export class UnconfiguredFoodAnalysisProvider implements FoodAnalysisProvider {
  readonly id = 'none';
  readonly displayName = 'No AI Provider Configured (Local Manual Mode)';
  readonly description =
    'Runs 100% locally without an API key. Photos can be previewed for portion reference while logging manually.';

  getStatus(): AIProviderStatus {
    return 'not_configured';
  }

  getStatusMessage(): string {
    return 'AI image analysis is not configured. No API key or backend endpoint is connected. Use manual food search or custom entry below.';
  }

  async analyzeImage(_imageBlob: Blob): Promise<FoodAnalysisResult> {
    throw new Error(
      'AI analysis is unavailable because no AI provider is configured. Please log the meal manually or search the food catalog.'
    );
  }
}

/**
 * Filters out mobile UI chrome text if the user uploaded a screenshot of a phone screen,
 * keeping only genuine Thai/English food, drink, menu, or brand text.
 */
export function cleanOcrFoodText(rawOcr: string): string {
  if (!rawOcr) return '';
  const uiLineRegex =
    /nub-p37n|onrender\.com|Analyze Photo|Thinking Mode|Remove Photo|บีบอัดอัตโนมัติ|เซิร์ฟเวอร์|เชิร์ฟเวอร์|Free Tier|กรุณากดลองใหม่|บันทึกด่วน|พิมพ์ชื่ออาหาร|บันทึกและคำนวณ|ลองวิเคราะห์ใหม่|กรอกข้อมูลเอง|ละเอียด|Screenshot_|\d{8}_\d{6}|\d+\s*KB|Home|Diary|Scan|Analytics|Settings|Category:|ตอบสนองช้า|\d{1,2}:\d{2}\s*น\./i;

  return rawOcr
    .split(/[\r\n|]+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 2) return false;
      if (uiLineRegex.test(line)) return false;
      if (!/[a-zA-Z\u0E00-\u0E7F]{2,}/.test(line)) return false;
      return true;
    })
    .join(', ');
}

/**
 * Deterministic synthesis fallback that turns visual caption + OCR food text into a structured
 * FoodAnalysisResult if external LLM reasoning is slow or rate-limited.
 */
export function synthesizeNutritionFromVisionAndOcr(
  ocrText: string,
  visualCaption: string,
  fileName?: string
): FoodAnalysisResult {
  const cleanOcr = cleanOcrFoodText(ocrText);
  // Strip screenshot description boilerplate from Florence-2 caption
  const cleanCaption = (visualCaption || '')
    .replace(/the image is a screenshot of a mobile phone screen[^.]*\./gi, '')
    .replace(/at the bottom of the image[^.]*\./gi, '')
    .replace(/below the photo[^.]*\./gi, '')
    .trim();

  const combined = `${cleanOcr} ${cleanCaption} ${fileName || ''}`.toLowerCase();

  let mealName = cleanOcr || 'รายการอาหารจากรูปภาพ (Scanned Meal)';
  let grams = 250;
  let calories = 350;
  let protein = 18;
  let carbs = 40;
  let fat = 12;

  if (/ชานม|ชาไทย|ชาเขียว|คามิเลีย|kamu|milk\s*tea|bubble\s*tea|boba|matcha/i.test(combined)) {
    mealName = cleanOcr ? `${cleanOcr} (Milk Tea / Beverage)` : 'ชานมไข่มุก / ชาผลไม้ (Milk Tea)';
    grams = 300;
    calories = 260;
    protein = 5;
    carbs = 42;
    fat = 8;
  } else if (/coffee|latte|americano|espresso|cocoa|กาแฟ|ลาเต้|โกโก้|คาปู/i.test(combined)) {
    mealName = cleanOcr ? `${cleanOcr} (Cafe Beverage)` : 'กาแฟเย็น / เครื่องดื่มคาเฟ่ (Iced Coffee)';
    grams = 280;
    calories = 190;
    protein = 6;
    carbs = 24;
    fat = 8;
  } else if (/sandwich|burger|toast|bread|แซนด์วิช|เบอร์เกอร์|ขนมปัง/i.test(combined)) {
    mealName = cleanOcr || 'แซนด์วิชแฮมชีส / คลับแซนด์วิช (Club Sandwich)';
    grams = 220;
    calories = 380;
    protein = 20;
    carbs = 38;
    fat = 16;
  } else if (/noodle|soup|ramen|pasta|ก๋วยเตี๋ยว|เกาเหลา|บะหมี่|ราเมง/i.test(combined)) {
    mealName = cleanOcr || 'ก๋วยเตี๋ยว / เกาเหลา (Noodle Soup)';
    grams = 380;
    calories = 390;
    protein = 26;
    carbs = 44;
    fat = 12;
  } else if (/salmon|fish|seafood|sushi|แซลมอน|ปลา|กุ้ง|ซูชิ/i.test(combined)) {
    mealName = cleanOcr || 'เมนูเนื้อปลา / แซลมอน (Salmon / Fish Dish)';
    grams = 220;
    calories = 340;
    protein = 34;
    carbs = 10;
    fat = 18;
  } else if (/salad|vegetable|สลัด|ยำ|ส้มตำ/i.test(combined)) {
    mealName = cleanOcr || 'สลัดผัก / ยำเพื่อสุขภาพ (Fresh Salad)';
    grams = 250;
    calories = 240;
    protein = 14;
    carbs = 22;
    fat = 10;
  } else if (/chicken|pork|beef|rice|กะเพรา|ข้าวมันไก่|ข้าวผัด|ข้าว|ไก่|หมู|เนื้อ/i.test(combined)) {
    mealName = cleanOcr || 'อาหารจานเดียว / ข้าวราดกับ (Thai Rice Dish)';
    grams = 350;
    calories = 520;
    protein = 28;
    carbs = 58;
    fat = 18;
  } else if (/cake|dessert|ice\s*cream|pastry|donut|เค้ก|ขนมหวาน|ไอศกรีม/i.test(combined)) {
    mealName = cleanOcr || 'ของหวาน / เบเกอรี่ (Dessert / Bakery)';
    grams = 160;
    calories = 360;
    protein = 6;
    carbs = 46;
    fat = 17;
  }

  return validateFoodAnalysisResult({
    mealName,
    identifiedFoodItems: [
      {
        name: mealName,
        estimatedGrams: grams,
        estimatedCalories: calories,
        protein,
        carbohydrates: carbs,
        fat,
      },
    ],
    estimatedWeightGrams: grams,
    estimatedCalories: calories,
    protein,
    carbohydrates: carbs,
    fat,
    uncertainties: ['ปริมาณส่วนผสมและเครื่องปรุงประเมินจากภาพถ่าย'],
    assumptions: ['ประเมินตามขนาดเสิร์ฟมาตรฐาน (สามารถปรับกรัมและแคลอรี่ได้ในหน้าถัดไป)'],
  });
}

/**
 * 100% Free, Zero-API-Key-Required AI Vision + Thai/English OCR + Reasoning LLM Pipeline.
 * Combines OCR.space (Thai/Eng), Hugging Face Florence-2 Vision Captioning, and Pollinations GPT-OSS 20B Reasoning.
 */
export async function analyzeImageWithFreeZeroKeyAI(imageBlob: Blob): Promise<FoodAnalysisResult> {
  const { base64, mimeType } = await compressImageBlobToBase64(imageBlob, 768, 0.72);
  const fileName = (imageBlob as File).name || '';

  // Step 1: Run Free Thai+English OCR and HuggingFace Florence-2 Vision in parallel
  const ocrPromise = (async (): Promise<string> => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      try {
        const form = new FormData();
        form.append('apikey', 'helloworld');
        form.append('base64Image', `data:${mimeType};base64,${base64}`);
        form.append('language', 'tha');
        form.append('OCREngine', '2');
        const res = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: form,
          signal: controller.signal,
        });
        if (!res.ok) return '';
        const data = await res.json();
        return cleanOcrFoodText(data.ParsedResults?.[0]?.ParsedText || '');
      } finally {
        clearTimeout(t);
      }
    } catch {
      return '';
    }
  })();

  const captionPromise = (async (): Promise<string> => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 11000);
      try {
        const baseUrl = 'https://prithivmlmods-florence-2-image-caption.hf.space/gradio_api';
        const byteChars = atob(base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArr[i] = byteChars.charCodeAt(i);
        }
        const compactBlob = new Blob([byteArr], { type: mimeType });

        const form = new FormData();
        form.append('files', compactBlob, 'meal.jpg');
        const upRes = await fetch(`${baseUrl}/upload`, {
          method: 'POST',
          body: form,
          signal: controller.signal,
        });
        if (!upRes.ok) return '';
        const upJson = await upRes.json();
        const serverPath = upJson?.[0];
        if (!serverPath) return '';

        const callRes = await fetch(`${baseUrl}/call/describe_image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                path: serverPath,
                orig_name: 'meal.jpg',
                mime_type: mimeType,
                meta: { _type: 'gradio.FileData' },
              },
              'Florence-2-base',
            ],
          }),
          signal: controller.signal,
        });
        if (!callRes.ok) return '';
        const { event_id } = await callRes.json();
        if (!event_id) return '';

        const sseRes = await fetch(`${baseUrl}/call/describe_image/${event_id}`, {
          signal: controller.signal,
        });
        const sseText = await sseRes.text();
        const match = sseText.match(/event:\s*complete[\s\S]*?data:\s*(\[[\s\S]*?\])/);
        if (match) {
          const parsedArr = JSON.parse(match[1]);
          return typeof parsedArr[0] === 'string' ? parsedArr[0] : '';
        }
        return '';
      } finally {
        clearTimeout(t);
      }
    } catch {
      return '';
    }
  })();

  const [cleanedOcr, visualCaption] = await Promise.all([ocrPromise, captionPromise]);

  // Step 2: Reason over visual caption + OCR text with Pollinations Free Reasoning LLM (openai-fast)
  if (cleanedOcr || visualCaption) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12000);
      try {
        const prompt = `Analyze this food or drink photo based on its computer vision description and label text:
- Text detected on food/cup/packaging (OCR): "${cleanedOcr || 'none'}"
- Visual scene description: "${visualCaption || 'food or drink item'}"
Note: Ignore any mobile app UI chrome if the image was a phone screenshot; focus strictly on the food or drink shown.

Identify the dish or drink (use Thai + English name) and estimate realistic serving weight in grams, calories, protein, carbohydrates, fat, sodiumMg, and sugarG.
Return ONLY a valid JSON object matching this exact schema:
{
  "mealName": "Thai + English dish/drink name (e.g. ชานมคามิเลีย KAMU, แซนด์วิชแฮมชีส, ข้าวมันไก่)",
  "identifiedFoodItems": [
    { "name": "Item name", "estimatedGrams": 250, "estimatedCalories": 280, "protein": 8, "carbohydrates": 38, "fat": 9 }
  ],
  "estimatedWeightGrams": 250,
  "estimatedCalories": 280,
  "protein": 8,
  "carbohydrates": 38,
  "fat": 9,
  "sodiumMg": 220,
  "sugarG": 18,
  "uncertainties": ["Estimated from photo appearance"],
  "assumptions": ["Standard serving size"]
}`;

        const llmRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai-fast',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const rawContent = llmData.choices?.[0]?.message?.content || '';
          if (rawContent.trim()) {
            const parsed = parseJsonFromModelText(rawContent);
            return validateFoodAnalysisResult(parsed);
          }
        }
      } finally {
        clearTimeout(t);
      }
    } catch {
      // Fall through to deterministic synthesis
    }
  }

  // Step 3: Guaranteed instant synthesis from Vision + OCR
  return synthesizeNutritionFromVisionAndOcr(cleanedOcr, visualCaption, fileName);
}

/**
 * 100% Free Zero-Key Text Prompt Analysis via Pollinations Reasoning LLM + Local Fallback
 */
export async function analyzeTextWithFreeZeroKeyAI(promptText: string): Promise<FoodAnalysisResult> {
  const cleanPrompt = (promptText || '').trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a food description or meal name.');
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    try {
      const instruction = `Analyze this food description written by the user: "${cleanPrompt}". Identify all dishes/beverages, estimate total serving weight in grams, total calories, macronutrients (protein, carbohydrates, fat), sodium in mg, and sugar in grams. Return ONLY a valid JSON object matching:
{
  "mealName": "Name of dish (e.g. ข้าวมันไก่ต้มพิเศษเนื้อน่อง)",
  "identifiedFoodItems": [
    { "name": "Item name", "estimatedGrams": 150, "estimatedCalories": 250, "protein": 25, "carbohydrates": 10, "fat": 8 }
  ],
  "estimatedWeightGrams": 350,
  "estimatedCalories": 450,
  "protein": 30,
  "carbohydrates": 45,
  "fat": 15,
  "sodiumMg": 650,
  "sugarG": 2,
  "uncertainties": ["Portion estimated based on user description"],
  "assumptions": ["Standard Thai restaurant serving"]
}`;

      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai-fast',
          messages: [{ role: 'user', content: instruction }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || '';
        if (rawText.trim()) {
          const parsed = parseJsonFromModelText(rawText);
          return validateFoodAnalysisResult(parsed);
        }
      }
    } finally {
      clearTimeout(t);
    }
  } catch {
    // Fallback to deterministic synthesis
  }

  return synthesizeNutritionFromVisionAndOcr(cleanPrompt, cleanPrompt);
}

/**
 * 100% Free Built-In AI Vision Provider (Zero API Key Required!)
 */
export class FreeBuiltInVisionProvider implements FoodAnalysisProvider {
  readonly id = 'free_builtin';
  readonly displayName = 'Free Built-in AI Vision (ฟรี 100% ไม่ต้องใช้ API Key)';
  readonly description =
    'Uses free Florence-2 Computer Vision + Thai/English OCR + GPT-OSS 20B Reasoning Mode with zero API key required.';

  private status: AIProviderStatus = 'ready';

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getStatusMessage(): string {
    if (this.status === 'processing') {
      return 'กำลังวิเคราะห์รูปอาหารด้วย Free AI Vision + OCR (Thinking Mode)...';
    }
    return 'พร้อมใช้งานฟรี 100% (Florence-2 Vision + Thai OCR + Reasoning AI ไม่ต้องใช้คีย์)';
  }

  async analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult> {
    this.status = 'processing';
    try {
      const result = await analyzeImageWithFreeZeroKeyAI(imageBlob);
      this.status = 'ready';
      return result;
    } catch (err) {
      this.status = 'ready';
      throw err instanceof Error ? err : new Error('Failed to analyze food image.');
    }
  }

  async analyzeTextPrompt(prompt: string): Promise<FoodAnalysisResult> {
    this.status = 'processing';
    try {
      const result = await analyzeTextWithFreeZeroKeyAI(prompt);
      this.status = 'ready';
      return result;
    } catch (err) {
      this.status = 'ready';
      throw err instanceof Error ? err : new Error('Failed to analyze food description.');
    }
  }
}

/**
 * Multi-Model Free Vision Provider (Google Gemini 3.6/3.5 Flash + Gemma 4 26B Vision + Zero-Key Free AI Failover)
 */
export class DirectGeminiFoodAnalysisProvider implements FoodAnalysisProvider {
  readonly id = 'direct_gemini';
  readonly displayName = 'Google AI Vision + Built-in Free AI Auto-Failover';
  readonly description =
    'Supports Gemini & Gemma Vision models (gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite, gemma-4-26b-a4b-it) and automatically falls back to Built-in Free Vision if Google servers are busy.';

  private apiKey: string;
  private preferredModel: string;
  private status: AIProviderStatus;

  constructor(apiKey?: string, preferredModel?: string) {
    this.apiKey = (apiKey || '').trim();
    this.preferredModel = (preferredModel || 'gemini-3.6-flash').trim();
    this.status = this.apiKey ? 'ready' : 'not_configured';
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getStatusMessage(): string {
    if (this.status === 'not_configured') {
      return 'Google AI Studio API Key is not configured (Free Built-in AI Vision fallback available).';
    }
    if (this.status === 'processing') {
      return `Analyzing food image with ${this.preferredModel} (Thinking Mode & Free Auto-Failover active)...`;
    }
    if (this.status === 'failed') {
      return 'Last analysis request failed. Check your API key or internet connection.';
    }
    return `Ready (${this.preferredModel} + Thinking Mode & Free Zero-Key Auto-Failover).`;
  }

  async analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult> {
    if (!this.apiKey) {
      return analyzeImageWithFreeZeroKeyAI(imageBlob);
    }

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.status = 'failed';
      throw new Error('You are offline. AI analysis requires internet connection.');
    }

    this.status = 'processing';
    try {
      // Automatically compress client-side to ~40-70KB JPEG
      const { base64, mimeType } = await compressImageBlobToBase64(imageBlob);

      const preferred = this.preferredModel || 'gemini-3.6-flash';
      const modelsToTry = [
        preferred,
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemma-4-26b-a4b-it',
        'gemini-2.5-flash',
        'gemini-3.8-flash',
      ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

      const errors: string[] = [];

      for (const modelName of modelsToTry) {
        try {
          const isGemma = modelName.startsWith('gemma-');
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

          // Thinking mode enabled as dynamic thinking. Clean generationConfig.
          // Note: Gemma models do not support responseMimeType: 'application/json' in generationConfig.
          const payload: Record<string, unknown> = {
            contents: [
              {
                parts: [
                  { text: NUTRITION_VISION_PROMPT },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: isGemma
              ? {
                  temperature: 0.2,
                  maxOutputTokens: 4096,
                }
              : {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                  maxOutputTokens: 4096,
                },
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(new Error(`Request timed out after 12s (${modelName})`)),
            12000
          );

          let response: Response;
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `HTTP ${response.status}`;
            errors.push(`${modelName}: ${errMsg}`);
            // If the API key itself is invalid/expired (401/400 API key not valid), break out immediately to Free Zero-Key AI!
            if (response.status === 401 || errMsg.toLowerCase().includes('api key not valid')) {
              break;
            }
            continue;
          }

          const resData = await response.json();
          const parts: Array<{ text?: string; thought?: boolean }> =
            resData.candidates?.[0]?.content?.parts || [];

          // In thinking mode, parts with thought: true contain reasoning.
          // Extract the pure final text parts for valid JSON parsing.
          const nonThoughtText = parts
            .filter((p) => !p.thought && typeof p.text === 'string' && p.text.trim().length > 0)
            .map((p) => p.text)
            .join('\n')
            .trim();

          const rawText = nonThoughtText || parts[parts.length - 1]?.text || '';

          if (!rawText) {
            errors.push(`${modelName}: Empty response candidate`);
            continue;
          }

          const parsed = parseJsonFromModelText(rawText);
          const validated = validateFoodAnalysisResult(parsed);
          this.status = 'ready';
          return validated;
        } catch (innerErr) {
          const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
          errors.push(`${modelName}: ${msg}`);
          continue;
        }
      }

      // Seamless automatic failover to 100% Free Built-In Zero-Key Vision + OCR + Reasoning AI!
      const freeResult = await analyzeImageWithFreeZeroKeyAI(imageBlob);
      this.status = 'ready';
      return freeResult;
    } catch (err) {
      this.status = 'failed';
      throw err instanceof Error
        ? err
        : new Error('Failed to analyze food image.');
    }
  }

  async analyzeTextPrompt(promptText: string): Promise<FoodAnalysisResult> {
    const cleanPrompt = (promptText || '').trim();
    if (!cleanPrompt) {
      throw new Error('Please enter a food description or meal name.');
    }

    if (!this.apiKey) {
      return analyzeTextWithFreeZeroKeyAI(cleanPrompt);
    }

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.status = 'failed';
      throw new Error('You are offline. AI analysis requires internet connection.');
    }

    this.status = 'processing';
    const preferred = this.preferredModel || 'gemini-3.6-flash';
    const modelsToTry = [
      preferred,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemma-4-26b-a4b-it',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    const fullInstruction = `Analyze this food description written by the user: "${cleanPrompt}". Identify all dishes/beverages, estimate total serving weight in grams, total calories, macronutrients (protein, carbohydrates, fat), sodium in mg, and sugar in grams. Return ONLY a valid JSON object matching:
{
  "mealName": "Name of dish (e.g. ข้าวมันไก่ต้มพิเศษเนื้อน่อง)",
  "identifiedFoodItems": [
    { "name": "Item name", "estimatedGrams": 150, "estimatedCalories": 250, "protein": 25, "carbohydrates": 10, "fat": 8 }
  ],
  "estimatedWeightGrams": 350,
  "estimatedCalories": 450,
  "protein": 30,
  "carbohydrates": 45,
  "fat": 15,
  "sodiumMg": 650,
  "sugarG": 2,
  "uncertainties": ["Portion estimated based on user description"],
  "assumptions": ["Standard Thai restaurant serving"]
}`;

    for (const modelName of modelsToTry) {
      try {
        const isGemma = modelName.startsWith('gemma-');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: fullInstruction }] }],
          generationConfig: isGemma
            ? {
                temperature: 0.2,
                maxOutputTokens: 4096,
              }
            : {
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 4096,
              },
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('Timed out')), 12000);
        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          if (response.status === 401) break;
          continue;
        }

        const resData = await response.json();
        const parts: Array<{ text?: string; thought?: boolean }> =
          resData.candidates?.[0]?.content?.parts || [];
        const nonThoughtText = parts
          .filter((p) => !p.thought && typeof p.text === 'string' && p.text.trim().length > 0)
          .map((p) => p.text)
          .join('\n')
          .trim();
        const rawText = nonThoughtText || parts[parts.length - 1]?.text || '';
        if (!rawText) continue;

        const parsed = parseJsonFromModelText(rawText);
        const validated = validateFoodAnalysisResult(parsed);
        this.status = 'ready';
        return validated;
      } catch {
        continue;
      }
    }

    // Fallback to Free Zero-Key Reasoning AI
    const freeRes = await analyzeTextWithFreeZeroKeyAI(cleanPrompt);
    this.status = 'ready';
    return freeRes;
  }
}

/**
 * Optional Groq Free Vision Provider (Llama-4-Scout-17B-16E-Instruct Vision)
 */
export class GroqFreeVisionProvider implements FoodAnalysisProvider {
  readonly id = 'groq_free';
  readonly displayName = 'Groq Cloud Free Vision (Llama 4 Scout Vision)';
  readonly description = 'Ultra-fast free vision analysis via Groq Cloud API key (gsk_...).';

  private apiKey: string;
  private status: AIProviderStatus;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey || '').trim();
    this.status = this.apiKey ? 'ready' : 'not_configured';
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getStatusMessage(): string {
    return this.status === 'ready'
      ? 'Ready (Groq Llama 4 Vision Free Tier).'
      : 'Groq API Key not configured.';
  }

  async analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult> {
    if (!this.apiKey) {
      return analyzeImageWithFreeZeroKeyAI(imageBlob);
    }
    this.status = 'processing';
    try {
      const { base64, mimeType } = await compressImageBlobToBase64(imageBlob);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: NUTRITION_VISION_PROMPT },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
              ],
            },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        return await analyzeImageWithFreeZeroKeyAI(imageBlob);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '{}';
      const parsed = parseJsonFromModelText(rawText);
      const validated = validateFoodAnalysisResult(parsed);
      this.status = 'ready';
      return validated;
    } catch {
      this.status = 'ready';
      return analyzeImageWithFreeZeroKeyAI(imageBlob);
    }
  }
}

/**
 * Server-side proxy adapter
 */
export class BackendProxyFoodAnalysisProvider implements FoodAnalysisProvider {
  readonly id = 'backend_proxy';
  readonly displayName = 'Server-Side AI Proxy (Official API Adapter)';
  readonly description =
    'Connects to an optional user-hosted backend endpoint that holds the API key server-side.';

  private status: AIProviderStatus = 'not_configured';
  private endpointUrl: string;

  constructor(endpointUrl?: string) {
    this.endpointUrl = (endpointUrl || '').trim();
    this.status = this.endpointUrl ? 'ready' : 'not_configured';
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getStatusMessage(): string {
    if (this.status === 'not_configured') {
      return 'Backend proxy URL is not set. Configure a server-side endpoint in Settings.';
    }
    if (this.status === 'processing') {
      return 'Analyzing food image via configured server-side endpoint...';
    }
    if (this.status === 'failed') {
      return 'Last analysis request failed. Check that your server-side proxy is running and reachable.';
    }
    return `Ready to send explicit analysis requests to ${this.endpointUrl}`;
  }

  async analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult> {
    if (!this.endpointUrl) {
      this.status = 'not_configured';
      throw new Error('Backend proxy endpoint is not configured.');
    }

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.status = 'failed';
      throw new Error(
        'You appear to be offline. Optional AI image analysis requires an active network connection to reach your proxy endpoint.'
      );
    }

    this.status = 'processing';
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'meal-photo.jpg');

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Proxy server returned HTTP ${response.status}`);
      }

      const json = await response.json();
      const validated = validateFoodAnalysisResult(json);
      this.status = 'ready';
      return validated;
    } catch (err) {
      this.status = 'failed';
      throw err instanceof Error
        ? err
        : new Error('Failed to analyze image with backend proxy.');
    }
  }
}

export function getFoodAnalysisProvider(
  providerId?: string,
  backendEndpoint?: string,
  geminiApiKey?: string,
  geminiModel?: string,
  groqApiKey?: string
): FoodAnalysisProvider {
  if (providerId === 'free_builtin') {
    return new FreeBuiltInVisionProvider();
  }
  if (providerId === 'direct_gemini') {
    if (geminiApiKey?.trim()) {
      return new DirectGeminiFoodAnalysisProvider(geminiApiKey, geminiModel);
    }
    return new FreeBuiltInVisionProvider();
  }
  if (providerId === 'groq_free') {
    if (groqApiKey?.trim()) {
      return new GroqFreeVisionProvider(groqApiKey);
    }
    return new FreeBuiltInVisionProvider();
  }
  if (providerId === 'backend_proxy' && backendEndpoint?.trim()) {
    return new BackendProxyFoodAnalysisProvider(backendEndpoint);
  }
  return new UnconfiguredFoodAnalysisProvider();
}
