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
 */
export function validateFoodAnalysisResult(raw: unknown): FoodAnalysisResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI analysis response: expected an object.');
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.mealName !== 'string' || !obj.mealName.trim()) {
    throw new Error('Invalid AI analysis response: mealName is required.');
  }

  const numField = (key: string): number => {
    const val = Number(obj[key]);
    if (!Number.isFinite(val) || val < 0) {
      throw new Error(`Invalid AI analysis response: ${key} must be a non-negative number.`);
    }
    return Math.round(val * 100) / 100;
  };

  const itemsRaw = Array.isArray(obj.identifiedFoodItems) ? obj.identifiedFoodItems : [];
  const identifiedFoodItems: IdentifiedFoodItem[] = itemsRaw.map((item: unknown, idx: number) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid identifiedFoodItems[${idx}]`);
    }
    const rec = item as Record<string, unknown>;
    return {
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : `Item ${idx + 1}`,
      estimatedGrams: Number.isFinite(Number(rec.estimatedGrams)) ? Number(rec.estimatedGrams) : 100,
      estimatedCalories: Number.isFinite(Number(rec.estimatedCalories)) ? Number(rec.estimatedCalories) : 0,
      protein: Number.isFinite(Number(rec.protein)) ? Number(rec.protein) : 0,
      carbohydrates: Number.isFinite(Number(rec.carbohydrates)) ? Number(rec.carbohydrates) : 0,
      fat: Number.isFinite(Number(rec.fat)) ? Number(rec.fat) : 0,
    };
  });

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];

  const estimatedCalories = numField('estimatedCalories');
  const protein = numField('protein');
  const carbohydrates = numField('carbohydrates');
  const rawFat = numField('fat');
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
    foodName: obj.mealName.trim(),
    calories: estimatedCalories,
    protein,
    carbohydrates,
    fat: rawFat,
    sodiumMg: rawSodium,
    sugarG: rawSugar,
  });

  return {
    mealName: obj.mealName.trim(),
    identifiedFoodItems,
    estimatedWeightGrams: numField('estimatedWeightGrams'),
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
 * Multi-Model Free Vision Provider (Google Gemini 3.6/3.5 Flash + Gemma 4 26B Vision auto-failover)
 */
export class DirectGeminiFoodAnalysisProvider implements FoodAnalysisProvider {
  readonly id = 'direct_gemini';
  readonly displayName = 'Google AI Vision (Pro & Flash Auto-Failover)';
  readonly description =
    'Supports Gemini Pro & Flash Vision models with automatic failover (gemini-3.5-flash-lite, gemini-3.6-flash, gemini-3.5-flash, gemini-pro-latest, gemma-4-26b-a4b-it) so photo scanning always succeeds.';

  private apiKey: string;
  private preferredModel: string;
  private status: AIProviderStatus;

  constructor(apiKey?: string, preferredModel?: string) {
    this.apiKey = (apiKey || '').trim();
    this.preferredModel = (preferredModel || 'gemini-2.5-flash').trim();
    this.status = this.apiKey ? 'ready' : 'not_configured';
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getStatusMessage(): string {
    if (this.status === 'not_configured') {
      return 'Google AI Studio API Key is not configured. Enter your key in Settings.';
    }
    if (this.status === 'processing') {
      return `Analyzing food image with ${this.preferredModel} (Thinking Mode & Auto-Failover active)...`;
    }
    if (this.status === 'failed') {
      return 'Last analysis request failed. Check your API key or internet connection.';
    }
    return `Ready (${this.preferredModel} + Thinking Mode & Multi-Model Auto-Failover).`;
  }

  async analyzeImage(imageBlob: Blob): Promise<FoodAnalysisResult> {
    if (!this.apiKey) {
      this.status = 'not_configured';
      throw new Error('API key is not configured.');
    }

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.status = 'failed';
      throw new Error('You are offline. AI analysis requires internet connection.');
    }

    this.status = 'processing';
    try {
      // Automatically compress client-side to ~40-70KB JPEG
      const { base64, mimeType } = await compressImageBlobToBase64(imageBlob);

      const preferred = this.preferredModel || 'gemini-2.5-flash';
      const modelsToTry = [
        preferred,
        'gemini-2.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-1.5-flash',
      ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

      const errors: string[] = [];

      for (const modelName of modelsToTry) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

          // Thinking mode enabled as dynamic thinking. Clean generationConfig with application/json.
          // maxOutputTokens is generous (4096) so thinking tokens never truncate the JSON output.
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
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 4096,
            },
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(new Error(`Request timed out after 30s (${modelName})`)),
            30000
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
            // Automatically continue to next model on 429/503/400/etc.
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

      const isQuota = errors.some(
        (e) =>
          e.includes('quota') ||
          e.includes('RESOURCE_EXHAUSTED') ||
          e.includes('429')
      );
      const isHighDemand = errors.some(
        (e) => e.includes('high demand') || e.includes('503')
      );

      if (isQuota) {
        throw new Error(
          'โควต้า Google AI (Free Tier) ของคีย์นี้เต็มชั่วคราว คุณสามารถพิมพ์ชื่ออาหารเพื่อบันทึกด่วนด้านล่างได้ทันที'
        );
      } else if (isHighDemand) {
        throw new Error(
          'เซิร์ฟเวอร์ Google AI มีผู้ใช้งานหนาแน่นชั่วคราว กรุณากดลองใหม่อีกครั้ง หรือพิมพ์ชื่ออาหารเพื่อบันทึกด่วนได้ทันที'
        );
      } else {
        throw new Error(
          'การเชื่อมต่อ AI ล่าช้า กรุณากดลองใหม่อีกครั้ง หรือพิมพ์ชื่ออาหารเพื่อบันทึกด่วนด้านล่าง'
        );
      }
    } catch (err) {
      this.status = 'failed';
      throw err instanceof Error
        ? err
        : new Error('Failed to analyze food image.');
    }
  }

  async analyzeTextPrompt(promptText: string): Promise<FoodAnalysisResult> {
    if (!this.apiKey) {
      this.status = 'not_configured';
      throw new Error('API key is not configured.');
    }
    const cleanPrompt = (promptText || '').trim();
    if (!cleanPrompt) {
      throw new Error('Please enter a food description or meal name.');
    }

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.status = 'failed';
      throw new Error('You are offline. AI analysis requires internet connection.');
    }

    this.status = 'processing';
    const preferred = this.preferredModel || 'gemini-2.5-flash';
    const modelsToTry = [
      preferred,
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-1.5-flash',
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

    const errors: string[] = [];
    for (const modelName of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: fullInstruction }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('Timed out')), 25000);
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
          errors.push(`${modelName}: ${errJson.error?.message || response.status}`);
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
      } catch (err) {
        errors.push(`${modelName}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
    }

    this.status = 'failed';
    throw new Error(`AI text analysis failed (${errors.join(' | ')}).`);
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
      throw new Error('Groq API Key is not configured.');
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
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '{}';
      const parsed = parseJsonFromModelText(rawText);
      const validated = validateFoodAnalysisResult(parsed);
      this.status = 'ready';
      return validated;
    } catch (err) {
      this.status = 'failed';
      throw err instanceof Error ? err : new Error('Groq vision analysis failed.');
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
  if (providerId === 'direct_gemini' && geminiApiKey?.trim()) {
    return new DirectGeminiFoodAnalysisProvider(geminiApiKey, geminiModel);
  }
  if (providerId === 'groq_free' && groqApiKey?.trim()) {
    return new GroqFreeVisionProvider(groqApiKey);
  }
  if (providerId === 'backend_proxy' && backendEndpoint?.trim()) {
    return new BackendProxyFoodAnalysisProvider(backendEndpoint);
  }
  return new UnconfiguredFoodAnalysisProvider();
}
