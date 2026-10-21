import { describe, it, expect } from 'vitest';
import { getInitialFoodCatalog } from '../db/seedData';
import { CURRENT_DB_SCHEMA_VERSION } from '../db/database';

describe('Expanded Food Catalog & Multi-Cuisine Search', () => {
  const catalog = getInitialFoodCatalog();

  it('contains over 50 items with diverse international cuisines', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(50);
  });

  it('includes popular Japanese dishes (Sushi, Ramen, Gyudon, Katsudon, Miso)', () => {
    const japaneseItems = catalog.filter((item) =>
      item.category?.includes('ญี่ปุ่น') ||
      /salmon sushi|ramen|gyudon|katsudon|miso soup|takoyaki|okonomiyaki|edamame/i.test(item.name)
    );
    expect(japaneseItems.length).toBeGreaterThanOrEqual(25);

    // Verify Donburi Bowls
    expect(catalog.some((i) => i.id === 'food_jp_gyudon_beef_bowl')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_gyudon_onsen_egg')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_butadon_pork')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_katsudon_pork')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_ebi_katsudon')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_sake_ikura_don')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_kaisen_don')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_tekkadon_maguro')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_negitoro_don')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_wagyu_steak_don')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_aburi_chashudon')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_saba_teriyaki_don')).toBe(true);

    // Verify Sushi Varieties (Nigiri, Gunkan, Rolls)
    expect(catalog.some((i) => i.id === 'food_jp_salmon_sushi_nigiri')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_aburi_salmon_saikyo')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_salmon_toro_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_maguro_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_hamachi_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_hotate_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_unagi_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_tamago_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_aburi_wagyu_sushi')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_ikura_gunkan')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_tobiko_gunkan')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_california_roll')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_spicy_salmon_roll')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_jp_inari_sushi')).toBe(true);
  });

  it('includes popular Indian dishes (Biryani, Butter Chicken, Tikka Masala, Naan, Dal)', () => {
    const indianItems = catalog.filter((item) =>
      item.category?.includes('อินเดีย') ||
      /biryani|butter chicken|tikka masala|naan|roti|dal|samosa|paneer/i.test(item.name)
    );
    expect(indianItems.length).toBeGreaterThanOrEqual(8);

    const hasBiryani = catalog.some((i) => i.id === 'food_in_chicken_biryani');
    const hasButterChicken = catalog.some((i) => i.id === 'food_in_butter_chicken');
    const hasNaan = catalog.some((i) => i.id === 'food_in_garlic_naan');
    expect(hasBiryani).toBe(true);
    expect(hasButterChicken).toBe(true);
    expect(hasNaan).toBe(true);
  });

  it('includes popular Korean dishes (Bibimbap, Sundubu, Samgyeopsal, Tteokbokki, Jajangmyeon)', () => {
    const koreanItems = catalog.filter((item) =>
      item.category?.includes('เกาหลี') ||
      /bibimbap|sundubu|samgyeopsal|tteokbokki|jajangmyeon|gimbap/i.test(item.name)
    );
    expect(koreanItems.length).toBeGreaterThanOrEqual(6);

    const hasBibimbap = catalog.some((i) => i.id === 'food_kr_bibimbap');
    const hasSundubu = catalog.some((i) => i.id === 'food_kr_sundubu_jjigae');
    const hasSamgyeopsal = catalog.some((i) => i.id === 'food_kr_samgyeopsal');
    expect(hasBibimbap).toBe(true);
    expect(hasSundubu).toBe(true);
    expect(hasSamgyeopsal).toBe(true);
  });

  it('includes Thai favorites, Western dishes, and Cafe beverages/desserts', () => {
    const thaiItems = catalog.filter((item) => item.category?.includes('ไทย'));
    const westernItems = catalog.filter((item) => item.category?.includes('ตะวันตก'));
    const drinksItems = catalog.filter((item) => item.category?.includes('เครื่องดื่ม'));

    expect(thaiItems.length).toBeGreaterThanOrEqual(10);
    expect(westernItems.length).toBeGreaterThanOrEqual(6);
    expect(drinksItems.length).toBeGreaterThanOrEqual(5);

    // Check specific popular staples
    expect(catalog.some((i) => i.id === 'food_thai_khao_moo_krob')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_west_spaghetti_carbonara')).toBe(true);
    expect(catalog.some((i) => i.id === 'food_bev_boba_milk_tea')).toBe(true);
  });

  it('validates macro profiles and portion presets for all catalog entries', () => {
    for (const item of catalog) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.defaultServingGrams).toBeGreaterThan(0);
      expect(item.caloriesPer100g).toBeGreaterThanOrEqual(0);
      expect(item.proteinPer100g).toBeGreaterThanOrEqual(0);
      expect(item.carbsPer100g).toBeGreaterThanOrEqual(0);
      expect(item.fatPer100g).toBeGreaterThanOrEqual(0);

      if (item.portionPresets) {
        expect(item.portionPresets.length).toBeGreaterThan(0);
        for (const preset of item.portionPresets) {
          expect(preset.label).toBeTruthy();
          expect(preset.grams).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has database schema version bumped to 4', () => {
    expect(CURRENT_DB_SCHEMA_VERSION).toBe(4);
  });
});
