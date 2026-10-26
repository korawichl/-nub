import type { MealCategory } from '../types';

export const BANGKOK_TIMEZONE = 'Asia/Bangkok';

/**
 * Returns YYYY-MM-DD in Asia/Bangkok timezone for a given Date (defaults to now).
 */
export function getBangkokDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns the hour (0-23) in Asia/Bangkok timezone for a given Date (defaults to now).
 */
export function getBangkokHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  const hourStr = formatter.format(date);
  const hour = parseInt(hourStr, 10);
  if (Number.isNaN(hour)) {
    return date.getHours();
  }
  return hour === 24 ? 0 : hour;
}

/**
 * Returns formatted time string "HH:mm น." in Asia/Bangkok timezone.
 */
export function getBangkokTimeFormatted(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatter.format(date)} น.`;
}

/**
 * Determines the default main MealCategory ('breakfast' | 'lunch' | 'dinner') based on current time in Asia/Bangkok:
 * - 04:00 - 10:59 -> 'breakfast' (มื้อเช้า)
 * - 11:00 - 15:59 -> 'lunch' (มื้อเที่ยง)
 * - 16:00 - 03:59 -> 'dinner' (มื้อเย็น)
 */
export function getMealCategoryByTime(date: Date = new Date()): MealCategory {
  const hour = getBangkokHour(date);
  if (hour >= 4 && hour < 11) {
    return 'breakfast';
  }
  if (hour >= 11 && hour < 16) {
    return 'lunch';
  }
  return 'dinner';
}

const MAIN_SAVORY_DISH_REGEX =
  /ข้าวผัด|ข้าวมันไก่|ข้าวกะเพรา|กะเพรา|ข้าวหมู|ข้าวไก่|ข้าวเนื้อ|ข้าวเป็ด|ข้าวคลุกกะปิ|ข้าวหน้า|ข้าวด้ง|กิวด้ง|คัตสึด้ง|โอยาโกะด้ง|เทนด้ง|บูตะด้ง|อูนางิด้ง|ซาเกะด้ง|ข้าวซอย|ข้าวขาหมู|ข้าวหมก|ข้าวต้ม|โจ๊ก|ข้าวเหนียวหมู|ข้าวเหนียวไก่|ข้าวเหนียวส้มตำ|ข้าวเหนียวลาบ|ก๋วยเตี๋ยว|เกาเหลา|บะหมี่|ราเมง|อุด้ง|โซบะ|ผัดไทย|ผัดซีอิ๊ว|ราดหน้า|คั่วไก่|สุกี้|ชาบู|หมูกระทะ|ส้มตำ|ลาบ|น้ำตก|ต้มยำ|ต้มข่า|แกง|พะแนง|มัสมั่น|เขียวหวาน|สเต๊ก|พอร์คชอป|อกไก่|แซลมอนย่าง|ปลากะพง|ซาชิมิ|ซูชิ|บิบิมบับ|กิมจิ|ซัมกยอบซัล|บริยานี|บัตเตอร์ชิกเก้น|ทิกก้ามาซาลา|แกงกะหรี่|ไข่เจียว|ไข่ดาว|ไข่ต้ม|ไข่ตุ๋น/i;

const SNACK_DESSERT_DRINK_REGEX =
  /ขนม|ของว่าง|ของหวาน|เบเกอรี่|เค้ก|ชีสเค้ก|คัพเค้ก|มัฟฟิน|คุกกี้|บราวนี่|ครัวซองต์|วาฟเฟิล|แพนเค้ก|ฮันนี่โทสต์|โทสต์|ปังปิ้ง|ขนมปังปิ้ง|ปังเย็น|โดนัท|พาย|ทาร์ต|ชูครีม|เอแคลร์|มาการอง|มูส|พุดดิ้ง|พานาคอตต้า|ทีรามิสุ|ไอศกรีม|ไอติม|เจลาโต้|ซอร์เบท|บิงซู|น้ำแข็งไส|ทับทิมกรอบ|บัวลอย|ลอดช่อง|เฉาก๊วย|เต้าฮวย|เต้าทึง|ข้าวเหนียวมะม่วง|ข้าวเหนียวทุเรียน|ข้าวเหนียวสังขยา|กล้วยบวชชี|กล้วยทอด|กล้วยปิ้ง|ทองหยิบ|ทองหยอด|ฝอยทอง|เม็ดขนุน|ลูกชุบ|ขนมครก|ขนมเบื้อง|ขนมถ้วย|ขนมชั้น|ขนมต้ม|โรตีสายไหม|โรตีกล้วย|โรตีนมข้น|มันฝรั่งทอด|เฟรนช์ฟรายส์|เลย์|ข้าวเกรียบ|ข้าวแต๋น|ป๊อปคอร์น|ข้าวโพดคั่ว|ถั่วอบ|อัลมอนด์|เม็ดมะม่วงหิมพานต์|พิสตาชิโอ|เยลลี่|กัมมี่|ช็อกโกแลต|ลูกอม|เวเฟอร์|บิสกิต|แครกเกอร์|พัฟ|ไดฟูกุ|โมจิ|ดังโงะ|ไทยากิ|โดรายากิ|วาราบิโมจิ|ชานม|ชาไข่มุก|บับเบิ้ลที|ชาไทย|ชาเขียว|ชาผลไม้|ชามะนาว|ชาพีช|มัทฉะ|โฮจิฉะ|กาแฟ|อเมริกาโน่|ลาเต้|คาปูชิโน่|เอสเพรสโซ่|มอคค่า|มัคคิอาโต้|โกโก้|ไมโล|โอวัลติน|นมชมพู|นมสดปั่น|น้ำอัดลม|โค้ก|เป๊ปซี่|สไปรท์|แฟนต้า|น้ำผลไม้|สมูทตี้|น้ำปั่น|เวย์โปรตีน|โปรตีนเชค|โปรตีนบาร์|กราโนล่าบาร์|โยเกิร์ต|กรีกโยเกิร์ต|snack|dessert|sweet|bakery|cake|cheesecake|cupcake|muffin|cookie|brownie|croissant|waffle|pancake|toast|donut|doughnut|pastry|pie|tart|macaron|tiramisu|pudding|mousse|ice\s*cream|gelato|sorbet|bingsu|shaved\s*ice|mango\s*sticky\s*rice|chocolate|candy|jelly|gummy|chips|crisps|french\s*fries|popcorn|pretzel|cracker|biscuit|wafer|mochi|daifuku|dango|taiyaki|dorayaki|milk\s*tea|bubble\s*tea|boba|thai\s*tea|matcha|hojicha|coffee|americano|latte|cappuccino|espresso|mocha|frappe|cocoa|smoothie|milkshake|soda|cola|pepsi|sprite|juice|whey|protein\s*shake|protein\s*bar|granola\s*bar|yogurt/i;

/**
 * Detects whether a food item or AI photo result is a snack, dessert, bakery item, or beverage.
 */
export function isSnackOrBeverageFood(
  textOrName: string,
  categoryHint?: string,
  isAiSnackFlag?: boolean
): boolean {
  const combined = `${textOrName || ''}`.trim();
  const cat = `${categoryHint || ''}`.trim().toLowerCase();

  // If categoryHint explicitly says drink/dessert/snack
  if (
    cat.includes('ของหวาน') ||
    cat.includes('เครื่องดื่ม') ||
    cat.includes('ของว่าง') ||
    cat.includes('ขนม') ||
    cat.includes('snack') ||
    cat.includes('dessert') ||
    cat.includes('sweet') ||
    cat.includes('drink') ||
    cat.includes('beverage') ||
    cat.includes('cafe')
  ) {
    return true;
  }

  // If it clearly matches a main savory dish (e.g., ข้าวมันไก่, กะเพรา, ราเมง, สเต๊ก), keep it as a main meal
  if (MAIN_SAVORY_DISH_REGEX.test(combined)) {
    return false;
  }

  if (isAiSnackFlag === true) {
    return true;
  }

  if (SNACK_DESSERT_DRINK_REGEX.test(combined)) {
    return true;
  }

  return false;
}

/**
 * Resolves the target MealCategory smartly:
 * - If user manually selected a category (`isAutoMode === false`), use `manualCategory`.
 * - If in Auto Mode (`isAutoMode === true`):
 *   - If the food/photo is detected as a snack/dessert/beverage -> returns `'snacks'`.
 *   - Otherwise -> returns the time-of-day category (`'breakfast'`, `'lunch'`, or `'dinner'`).
 */
export function resolveSmartMealCategory(options: {
  isAutoMode: boolean;
  manualCategory: MealCategory;
  foodName?: string;
  ingredients?: string;
  categoryHint?: string;
  isAiSnack?: boolean;
  date?: Date;
}): MealCategory {
  if (!options.isAutoMode) {
    return options.manualCategory;
  }

  const textToInspect = `${options.foodName || ''} ${options.ingredients || ''}`.trim();
  if (
    isSnackOrBeverageFood(textToInspect, options.categoryHint, options.isAiSnack)
  ) {
    return 'snacks';
  }

  return getMealCategoryByTime(options.date);
}

/**
 * Formats a YYYY-MM-DD string into a human-friendly representation (e.g., "Mon, Oct 19, 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate);
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export const ENG_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Returns number of days in a given year and month (month: 1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Returns the day of week for the 1st of the given month (0 = Sunday, 1 = Monday, ... 6 = Saturday).
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/**
 * Parses YYYY-MM-DD into { year, month, day }.
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    year: year || new Date().getFullYear(),
    month: month || new Date().getMonth() + 1,
    day: day || 1,
  };
}

/**
 * Builds a YYYY-MM-DD string from year, month (1-12), day (1-31).
 */
export function buildDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Formats Month & Year into friendly bilingual text, e.g. "ตุลาคม 2026 (October 2026)".
 */
export function formatMonthYear(year: number, month: number): string {
  const thaiName = THAI_MONTH_NAMES[month - 1] || '';
  const engName = ENG_MONTH_NAMES[month - 1] || '';
  return `${thaiName} ${year} (${engName} ${year})`;
}
