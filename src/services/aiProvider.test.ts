import { describe, expect, it, vi } from 'vitest';
import {
  BackendProxyFoodAnalysisProvider,
  DirectGeminiFoodAnalysisProvider,
  UnconfiguredFoodAnalysisProvider,
  compressImageBlob,
  getFoodAnalysisProvider,
  parseJsonFromModelText,
  validateFoodAnalysisResult,
} from './aiProvider';
import { generateMealItemsCsv, validateBackupPayload } from '../db/backup';

describe('aiProvider', () => {
  it('defaults to UnconfiguredFoodAnalysisProvider with status not_configured and never fakes output', async () => {
    const provider = getFoodAnalysisProvider();
    expect(provider).toBeInstanceOf(UnconfiguredFoodAnalysisProvider);
    expect(provider.getStatus()).toBe('not_configured');
    expect(provider.getStatusMessage()).toContain('not configured');

    const dummyBlob = new Blob(['test'], { type: 'image/jpeg' });
    await expect(provider.analyzeImage(dummyBlob)).rejects.toThrow(
      /AI analysis is unavailable/
    );
  });

  it('returns BackendProxyFoodAnalysisProvider when endpoint is configured', () => {
    const provider = getFoodAnalysisProvider('backend_proxy', 'http://localhost:8787/api/analyze-food');
    expect(provider).toBeInstanceOf(BackendProxyFoodAnalysisProvider);
    expect(provider.getStatus()).toBe('ready');
  });

  it('returns DirectGeminiFoodAnalysisProvider with correct preferred model and status', () => {
    const provider = getFoodAnalysisProvider('direct_gemini', '', 'AIzaSyTestKey123', 'gemini-3.8-flash');
    expect(provider).toBeInstanceOf(DirectGeminiFoodAnalysisProvider);
    expect(provider.getStatus()).toBe('ready');
    expect(provider.getStatusMessage()).toContain('Thinking Mode');
  });

  it('compresses image blob and returns base64 and dimensions safely', async () => {
    const testBlob = new Blob(['fake-image-binary-data'], { type: 'image/jpeg' });
    const result = await compressImageBlob(testBlob);
    expect(result).toBeDefined();
    expect(result.mimeType).toBe('image/jpeg');
    expect(typeof result.base64).toBe('string');
  });

  it('parses JSON correctly from markdown fences, plain JSON, and text with thinking notes', () => {
    const markdownSample = '```json\n{"mealName": "ข้าวกะเพราไก่ไข่ดาว", "estimatedCalories": 580}\n```';
    expect(parseJsonFromModelText(markdownSample)).toEqual({
      mealName: 'ข้าวกะเพราไก่ไข่ดาว',
      estimatedCalories: 580,
    });

    const plainSample = '{"mealName": "ส้มตำไทย", "estimatedCalories": 120}';
    expect(parseJsonFromModelText(plainSample)).toEqual({
      mealName: 'ส้มตำไทย',
      estimatedCalories: 120,
    });
  });

  it('validates structured AI output and enforces requiresUserConfirmation = true', () => {
    const validated = validateFoodAnalysisResult({
      mealName: 'Grilled Chicken & Rice',
      identifiedFoodItems: [
        {
          name: 'Chicken Breast',
          estimatedGrams: 180,
          estimatedCalories: 297,
          protein: 55.8,
          carbohydrates: 0,
          fat: 6.5,
        },
      ],
      estimatedWeightGrams: 380,
      estimatedCalories: 557,
      protein: 61.2,
      carbohydrates: 56.4,
      fat: 7.1,
      uncertainties: ['Cooking oil amount is visually uncertain'],
      assumptions: ['Assumed skinless chicken breast and steamed jasmine rice'],
    });

    expect(validated.mealName).toBe('Grilled Chicken & Rice');
    expect(validated.requiresUserConfirmation).toBe(true);
    expect(validated.identifiedFoodItems).toHaveLength(1);
    expect(validated.uncertainties).toHaveLength(1);
    expect(validated.fat).toBeGreaterThan(0);
  });

  it('handles Gemini response with Thinking Mode parts correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Thinking Process: The image depicts a club sandwich with sliced turkey, bacon, lettuce and tomato on toasted white bread. Estimated weight is 280g...',
                  thought: true,
                },
                {
                  text: JSON.stringify({
                    mealName: 'คลับแซนด์วิช (Club Sandwich)',
                    identifiedFoodItems: [
                      {
                        name: 'Turkey & Bacon Sandwich',
                        estimatedGrams: 280,
                        estimatedCalories: 450,
                        protein: 28,
                        carbohydrates: 38,
                        fat: 20,
                      },
                    ],
                    estimatedWeightGrams: 280,
                    estimatedCalories: 450,
                    protein: 28,
                    carbohydrates: 38,
                    fat: 20,
                    sodiumMg: 780,
                    sugarG: 3.5,
                    uncertainties: ['Sauce may contain extra mayonnaise'],
                    assumptions: ['Standard double-decker portion'],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const provider = new DirectGeminiFoodAnalysisProvider('AIzaFakeKey', 'gemini-2.5-flash');
      const testBlob = new Blob(['image-bytes'], { type: 'image/jpeg' });
      const result = await provider.analyzeImage(testBlob);

      expect(result.mealName).toBe('คลับแซนด์วิช (Club Sandwich)');
      expect(result.estimatedCalories).toBe(450);
      expect(result.protein).toBe(28);

      // Verify that request was sent with valid responseMimeType and without disabled thinking budget
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const sentPayload = JSON.parse(callArgs[1].body);
      expect(sentPayload.generationConfig.responseMimeType).toBe('application/json');
      expect(sentPayload.generationConfig.thinkingConfig).toBeUndefined();
      expect(sentPayload.generationConfig.thinking_config).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles analyzeTextPrompt with Thinking Mode parts cleanly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Thinking Process: User ate Khao Man Gai with boiled chicken and cucumber slices...',
                  thought: true,
                },
                {
                  text: JSON.stringify({
                    mealName: 'ข้าวมันไก่ต้ม (Khao Man Gai)',
                    identifiedFoodItems: [
                      {
                        name: 'Boiled Chicken Breast',
                        estimatedGrams: 120,
                        estimatedCalories: 200,
                        protein: 28,
                        carbohydrates: 0,
                        fat: 6,
                      },
                      {
                        name: 'Oily Jasmine Rice',
                        estimatedGrams: 200,
                        estimatedCalories: 340,
                        protein: 5,
                        carbohydrates: 58,
                        fat: 10,
                      },
                    ],
                    estimatedWeightGrams: 350,
                    estimatedCalories: 560,
                    protein: 33,
                    carbohydrates: 58,
                    fat: 16,
                    sodiumMg: 720,
                    sugarG: 2,
                    uncertainties: ['Dipping sauce volume estimated at 2 tbsp'],
                    assumptions: ['Standard Hainanese rice prepared with chicken broth'],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const provider = new DirectGeminiFoodAnalysisProvider('AIzaFakeKey', 'gemini-2.5-flash');
      const result = await provider.analyzeTextPrompt('ข้าวมันไก่ต้มพิเศษ');

      expect(result.mealName).toBe('ข้าวมันไก่ต้ม (Khao Man Gai)');
      expect(result.estimatedCalories).toBe(560);
      expect(result.identifiedFoodItems).toHaveLength(2);
      expect(result.requiresUserConfirmation).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.generationConfig.responseMimeType).toBe('application/json');
      expect(payload.generationConfig.maxOutputTokens).toBe(4096);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fails over to secondary model when primary model hits 429 quota exhausted', async () => {
    const mockFetch = vi
      .fn()
      // First attempt (e.g. gemini-2.5-flash) returns 429 Quota Exhausted
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: 'Resource has been exhausted (e.g. check quota).' },
        }),
      })
      // Second attempt (gemini-3.5-flash-lite) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      mealName: 'ก๋วยเตี๋ยวไก่มะระ',
                      identifiedFoodItems: [
                        {
                          name: 'เส้นหมี่ไก่ฉีก',
                          estimatedGrams: 350,
                          estimatedCalories: 380,
                          protein: 25,
                          carbohydrates: 48,
                          fat: 8,
                        },
                      ],
                      estimatedWeightGrams: 350,
                      estimatedCalories: 380,
                      protein: 25,
                      carbohydrates: 48,
                      fat: 8,
                      sodiumMg: 850,
                      sugarG: 3,
                      uncertainties: ['Soup sodium varies by intake'],
                      assumptions: ['Standard street food bowl'],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const provider = new DirectGeminiFoodAnalysisProvider('AIzaFakeKey', 'gemini-2.5-flash');
      const testBlob = new Blob(['image-bytes'], { type: 'image/jpeg' });
      const result = await provider.analyzeImage(testBlob);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.mealName).toBe('ก๋วยเตี๋ยวไก่มะระ');
      expect(result.estimatedCalories).toBe(380);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('backup and CSV utilities', () => {
  it('rejects malformed backup payloads safely', () => {
    expect(() => validateBackupPayload(null)).toThrow(/JSON object/);
    expect(() => validateBackupPayload({ app: 'wrong-app' })).toThrow(
      /unrecognized application/
    );
  });

  it('generates valid CSV for food records with proper escaping', () => {
    const csv = generateMealItemsCsv([
      {
        id: 'item_1',
        mealId: 'meal_1',
        date: '2026-10-19',
        category: 'lunch',
        foodNameSnapshot: 'Chicken Breast, Roasted',
        ingredientsSnapshot: 'Chicken, salt, pepper',
        grams: 200,
        calories: 330,
        protein: 62,
        carbohydrates: 0,
        fat: 7.2,
        sourceSnapshot: 'usda_reference',
        createdAt: '2026-10-19T12:00:00.000Z',
        updatedAt: '2026-10-19T12:00:00.000Z',
      },
    ]);

    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Date,Meal Category,Food Name');
    expect(lines[1]).toContain('"Chicken Breast, Roasted"');
    expect(lines[1]).toContain('330');
  });
});
