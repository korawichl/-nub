import type { MealItem, NutritionGoals, UserProfile } from '../types';
import {
  formatMonthYear,
  getDaysInMonth,
  buildDateString,
  THAI_MONTH_NAMES,
  ENG_MONTH_NAMES,
} from './date';

export interface MonthlyReportParams {
  year: number;
  month: number; // 1-12
  mealItems: MealItem[];
  goals: NutritionGoals;
  profile: UserProfile;
}

export interface DayAggregate {
  date: string;
  dayNumber: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSodiumMg: number;
  totalSugarG: number;
  mealCount: number;
  items: MealItem[];
}

/**
 * Aggregates all meal items for a given year and month into day-by-day buckets.
 */
export function aggregateMonthData(
  year: number,
  month: number,
  mealItems: MealItem[]
): DayAggregate[] {
  const daysInMonth = getDaysInMonth(year, month);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;

  const map = new Map<string, MealItem[]>();
  for (const item of mealItems) {
    if (item.date && item.date.startsWith(monthPrefix)) {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
  }

  const result: DayAggregate[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = buildDateString(year, month, day);
    const items = map.get(dateStr) || [];

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalSodiumMg = 0;
    let totalSugarG = 0;

    for (const i of items) {
      totalCalories += i.calories || 0;
      totalProtein += i.protein || 0;
      totalCarbs += i.carbohydrates || 0;
      totalFat += i.fat || 0;
      totalSodiumMg += i.sodiumMg || 0;
      totalSugarG += i.sugarG || 0;
    }

    result.push({
      date: dateStr,
      dayNumber: day,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      totalSodiumMg: Math.round(totalSodiumMg),
      totalSugarG: Math.round(totalSugarG * 10) / 10,
      mealCount: items.length,
      items,
    });
  }

  return result;
}

/**
 * Generates a clean, GitHub-flavored Markdown file format for archiving nutrition logs.
 */
export function generateMonthlyMarkdownReport({
  year,
  month,
  mealItems,
  goals,
  profile,
}: MonthlyReportParams): string {
  const days = aggregateMonthData(year, month, mealItems);
  const loggedDays = days.filter((d) => d.mealCount > 0);
  const daysInMonth = getDaysInMonth(year, month);
  const thaiMonth = THAI_MONTH_NAMES[month - 1] || '';
  const engMonth = ENG_MONTH_NAMES[month - 1] || '';

  const totalCaloriesSum = loggedDays.reduce((acc, d) => acc + d.totalCalories, 0);
  const totalProteinSum = loggedDays.reduce((acc, d) => acc + d.totalProtein, 0);
  const totalCarbsSum = loggedDays.reduce((acc, d) => acc + d.totalCarbs, 0);
  const totalFatSum = loggedDays.reduce((acc, d) => acc + d.totalFat, 0);

  const avgCalories = loggedDays.length > 0 ? Math.round(totalCaloriesSum / loggedDays.length) : 0;
  const avgProtein = loggedDays.length > 0 ? Math.round((totalProteinSum / loggedDays.length) * 10) / 10 : 0;
  const avgCarbs = loggedDays.length > 0 ? Math.round((totalCarbsSum / loggedDays.length) * 10) / 10 : 0;
  const avgFat = loggedDays.length > 0 ? Math.round((totalFatSum / loggedDays.length) * 10) / 10 : 0;

  const onTargetDays = loggedDays.filter((d) => {
    const diff = Math.abs(d.totalCalories - goals.calorieTarget);
    return diff <= goals.calorieTarget * 0.15;
  }).length;

  const lines: string[] = [];

  // Title and Header
  lines.push(`# 📊 สรุปบันทึกโภชนาการประจำเดือน: ${thaiMonth} ${year} (${engMonth} ${year})`);
  lines.push('');
  lines.push(`> **ผู้ใช้งาน (User)**: ${profile.name || 'Korawich'} | **เป้าหมาย (Goal)**: ${profile.goal} (${profile.initialWeightKg}kg → ${profile.targetWeightKg}kg)`);
  lines.push(`> **เป้าหมายแคลอรี่รายวัน (Target)**: ${goals.calorieTarget} kcal/วัน | **โปรตีน (Protein)**: ${goals.proteinTargetG} g/วัน`);
  lines.push(`> **วันที่ส่งออก (Exported at)**: ${new Date().toISOString()} | **แอปพลิเคชัน**: NUB Nutrition Tracker (PWA)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Monthly Overview Summary
  lines.push('## 📈 ภาพรวมประจำเดือน (Monthly Overview)');
  lines.push(`- **จำนวนวันที่บันทึก (Logged Days)**: ${loggedDays.length} / ${daysInMonth} วัน (${Math.round((loggedDays.length / daysInMonth) * 100)}%)`);
  lines.push(`- **วันที่อยู่ในเกณฑ์เป้าหมาย (On-Target Days ±15%)**: ${onTargetDays} วัน`);
  lines.push(`- **แคลอรี่เฉลี่ยต่อวัน (Avg Calories)**: **${avgCalories} kcal / วัน** (เป้าหมาย: ${goals.calorieTarget} kcal)`);
  lines.push(`- **โปรตีนเฉลี่ยต่อวัน (Avg Protein)**: **${avgProtein} g / วัน** (เป้าหมาย: ${goals.proteinTargetG} g)`);
  lines.push(`- **คาร์โบไฮเดรตเฉลี่ย (Avg Carbs)**: ${avgCarbs} g / วัน`);
  lines.push(`- **ไขมันเฉลี่ย (Avg Fat)**: ${avgFat} g / วัน`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Daily Summary Table
  lines.push('## 📅 ตารางสรุปรายวัน (Daily Log Table)');
  lines.push('');
  lines.push('| วันที่ (Date) | แคลอรี่ (kcal) | โปรตีน (g) | คาร์บ (g) | ไขมัน (g) | โซเดียม (mg) | สถานะแคลอรี่ | มื้ออาหารที่บันทึก (Meals Summary) |');
  lines.push('|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|');

  for (const d of days) {
    if (d.mealCount === 0) {
      lines.push(`| ${d.date} | - | - | - | - | - | *ยังไม่บันทึก* | - |`);
      continue;
    }

    const diff = d.totalCalories - goals.calorieTarget;
    let statusText = '✓ ตรงเป้า';
    if (diff > goals.calorieTarget * 0.15) {
      statusText = `▲ เกินเป้า (+${diff})`;
    } else if (diff < -goals.calorieTarget * 0.15) {
      statusText = `▼ พร่องแคล (${diff})`;
    }

    // Short meal preview string
    const mealSummaries: string[] = [];
    const breakfast = d.items.filter((i) => i.category === 'breakfast').map((i) => i.foodNameSnapshot);
    const lunch = d.items.filter((i) => i.category === 'lunch').map((i) => i.foodNameSnapshot);
    const dinner = d.items.filter((i) => i.category === 'dinner').map((i) => i.foodNameSnapshot);
    const snacks = d.items.filter((i) => i.category === 'snacks').map((i) => i.foodNameSnapshot);

    if (breakfast.length > 0) mealSummaries.push(`[เช้า] ${breakfast.join(', ')}`);
    if (lunch.length > 0) mealSummaries.push(`[เที่ยง] ${lunch.join(', ')}`);
    if (dinner.length > 0) mealSummaries.push(`[เย็น] ${dinner.join(', ')}`);
    if (snacks.length > 0) mealSummaries.push(`[ว่าง] ${snacks.join(', ')}`);

    const summaryText = mealSummaries.join('; ').replace(/\|/g, '/');

    lines.push(
      `| ${d.date} | **${d.totalCalories}** | ${d.totalProtein} | ${d.totalCarbs} | ${d.totalFat} | ${d.totalSodiumMg} | ${statusText} | ${summaryText} |`
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Detailed Breakdown Section
  lines.push('## 📝 รายละเอียดเมนูอาหารรายวัน (Detailed Meal Breakdowns)');
  lines.push('');

  for (const d of days) {
    if (d.mealCount === 0) continue;

    lines.push(`### 🗓️ วันที่ ${d.dayNumber} ${thaiMonth} ${year} (${d.date}) — รวม ${d.totalCalories} kcal`);
    lines.push(`> สารอาหารรวม: **โปรตีน ${d.totalProtein}g** · **คาร์บ ${d.totalCarbs}g** · **ไขมัน ${d.totalFat}g** · โซเดียม ${d.totalSodiumMg}mg · น้ำตาล ${d.totalSugarG}g`);
    lines.push('');

    const categories: { key: string; label: string; icon: string }[] = [
      { key: 'breakfast', label: 'มื้อเช้า (Breakfast)', icon: '🌅' },
      { key: 'lunch', label: 'มื้อเที่ยง (Lunch)', icon: '☀️' },
      { key: 'dinner', label: 'มื้อเย็น (Dinner)', icon: '🌙' },
      { key: 'snacks', label: 'ของว่าง/เครื่องดื่ม (Snacks)', icon: '🥪' },
    ];

    for (const cat of categories) {
      const items = d.items.filter((i) => i.category === cat.key);
      if (items.length === 0) continue;

      const catKcal = Math.round(items.reduce((acc, i) => acc + i.calories, 0));
      const catPro = Math.round(items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
      lines.push(`#### ${cat.icon} ${cat.label} — ${catKcal} kcal (โปรตีน ${catPro}g)`);

      for (const item of items) {
        lines.push(
          `- **${item.foodNameSnapshot}** (${item.grams}g): **${Math.round(item.calories)} kcal** | P: ${item.protein}g, C: ${item.carbohydrates}g, F: ${item.fat}g${
            item.sodiumMg !== undefined ? `, Na: ${item.sodiumMg}mg` : ''
          }${item.sugarG !== undefined ? `, Sugar: ${item.sugarG}g` : ''}`
        );
      }
      lines.push('');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*สร้างอัตโนมัติโดยระบบ NUB Nutrition Tracker — พร้อมคอมมิตลง Git Repository*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates a structured JSON string suitable for Git version control and external scripting.
 */
export function generateMonthlyJsonArchive({
  year,
  month,
  mealItems,
  goals,
  profile,
}: MonthlyReportParams): string {
  const days = aggregateMonthData(year, month, mealItems);
  const loggedDays = days.filter((d) => d.mealCount > 0);

  const payload = {
    app: 'nub-nutrition-tracker',
    version: 1,
    exportType: 'monthly_git_archive',
    exportedAt: new Date().toISOString(),
    month: `${year}-${String(month).padStart(2, '0')}`,
    monthName: formatMonthYear(year, month),
    user: {
      id: profile.id,
      name: profile.name,
      initialWeightKg: profile.initialWeightKg,
      targetWeightKg: profile.targetWeightKg,
      goal: profile.goal,
    },
    targets: {
      calorieTarget: goals.calorieTarget,
      proteinTargetG: goals.proteinTargetG,
      carbsTargetG: goals.carbsTargetG,
      fatTargetG: goals.fatTargetG,
    },
    summary: {
      daysInMonth: days.length,
      loggedDaysCount: loggedDays.length,
      averageCalories:
        loggedDays.length > 0
          ? Math.round(loggedDays.reduce((acc, d) => acc + d.totalCalories, 0) / loggedDays.length)
          : 0,
      averageProtein:
        loggedDays.length > 0
          ? Math.round(
              (loggedDays.reduce((acc, d) => acc + d.totalProtein, 0) / loggedDays.length) * 10
            ) / 10
          : 0,
    },
    days,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Initiates a browser-native file download (works in Safari, Chrome, Edge, Android, iOS PWA).
 */
export function downloadBlobFile(
  filename: string,
  content: string,
  mimeType: string = 'text/markdown;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Optional: Directly commits and pushes a monthly log to a GitHub repository using GitHub's REST API.
 * Requires user's GitHub Personal Access Token (repo scope).
 */
export async function commitMonthlyLogToGitHub(params: {
  token: string;
  repo: string; // e.g. "korawichl/-nub"
  filePath: string; // e.g. "logs/nutrition_2026_10.md"
  content: string;
  commitMessage: string;
  branch?: string;
}): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  const { token, repo, filePath, content, commitMessage, branch = 'main' } = params;

  if (!token.trim()) {
    return { success: false, error: 'กรุณาระบุ GitHub Personal Access Token' };
  }
  if (!repo.trim() || !repo.includes('/')) {
    return { success: false, error: 'กรุณาระบุชื่อ Repository ในรูปแบบ username/repo-name' };
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '');
  const url = `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`;

  try {
    // 1. Check if the file already exists to get its SHA (required for update)
    let sha: string | undefined = undefined;
    const getRes = await fetch(`${url}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      sha = existingData.sha;
    }

    // 2. Base64 encode UTF-8 content
    const utf8Bytes = new TextEncoder().encode(content);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64Content = btoa(binary);

    // 3. Put / commit the file
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage || `chore: update monthly nutrition log for ${filePath}`,
        content: base64Content,
        branch,
        sha,
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        error: errData.message || `GitHub API error: status ${putRes.status}`,
      };
    }

    const data = await putRes.json();
    return {
      success: true,
      commitUrl: data.commit?.html_url || `https://github.com/${cleanRepo}/blob/${branch}/${filePath}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect to GitHub API',
    };
  }
}
