import { describe, expect, it } from 'vitest';
import {
  BackendProxyFoodAnalysisProvider,
  UnconfiguredFoodAnalysisProvider,
  getFoodAnalysisProvider,
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
