import type { AIProviderStatus } from '../types';

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
    const val = obj[key];
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
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
      estimatedGrams: typeof rec.estimatedGrams === 'number' ? rec.estimatedGrams : 100,
      estimatedCalories: typeof rec.estimatedCalories === 'number' ? rec.estimatedCalories : 0,
      protein: typeof rec.protein === 'number' ? rec.protein : 0,
      carbohydrates: typeof rec.carbohydrates === 'number' ? rec.carbohydrates : 0,
      fat: typeof rec.fat === 'number' ? rec.fat : 0,
    };
  });

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];

  return {
    mealName: obj.mealName.trim(),
    identifiedFoodItems,
    estimatedWeightGrams: numField('estimatedWeightGrams'),
    estimatedCalories: numField('estimatedCalories'),
    protein: numField('protein'),
    carbohydrates: numField('carbohydrates'),
    fat: numField('fat'),
    uncertainties: toStringArray(obj.uncertainties),
    assumptions: toStringArray(obj.assumptions),
    requiresUserConfirmation: true,
  };
}

/**
 * Default provider when no AI backend or credentials are configured.
 * Never fabricates or mocks AI results.
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
 * Optional server-side proxy adapter for future official Gemini API integration.
 * Keeps API keys strictly on a backend proxy server (never in browser localStorage or frontend bundle).
 */
export class BackendProxyFoodAnalysisProvider implements FoodAnalysisProvider {
  readonly id = 'backend_proxy';
  readonly displayName = 'Server-Side AI Proxy (Official API Adapter)';
  readonly description =
    'Connects to an optional user-hosted backend endpoint that holds the Gemini API key server-side.';

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
      return 'Backend proxy URL is not set. Configure a server-side endpoint in Settings when you have a Gemini API key.';
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
  backendEndpoint?: string
): FoodAnalysisProvider {
  if (providerId === 'backend_proxy' && backendEndpoint?.trim()) {
    return new BackendProxyFoodAnalysisProvider(backendEndpoint);
  }
  return new UnconfiguredFoodAnalysisProvider();
}
