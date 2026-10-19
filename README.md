# Nub — Personal Nutrition Tracker (Local-First PWA)

A local-first, offline-capable Personal Nutrition & Macro Tracker Progressive Web App (PWA) built with **React**, **TypeScript**, **Vite**, and **Dexie.js (IndexedDB)**.

Designed to run **100% locally without an API key, cloud account, or paid service**. Optional AI food photo analysis is architected behind a pluggable provider interface that can be connected to a server-side endpoint in the future without modifying the core application.

---

## 1. Quick Start & Installation

### Prerequisites
- Node.js `v18+` (tested on `v24.14.0`)
- npm `v9+` (tested on `v11.9.0`)

### Install Dependencies
```bash
npm install
```

### Start Local Development Server
```bash
npm run dev
```
Open the local URL displayed in your terminal (typically `http://localhost:5173`). No `.env` file or `GEMINI_API_KEY` is required.

### Run Unit Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## 2. Initial User Profile & Mifflin–St Jeor Nutrition Targets

The application initializes with your exact profile and editable targets stored locally in IndexedDB (`NubNutritionTrackerDB`):

### Profile Defaults
| Parameter | Initial Value |
| :--- | :--- |
| **Age** | `18` |
| **Sex (BMR formula)** | `male` |
| **Height** | `180 cm` |
| **Initial Weight** | `88 kg` |
| **Target Weight** | `80 kg` |
| **Goal** | `fat_loss` |
| **Activity Level** | `high` (`1.725`) |
| **Training** | `swimming and strength training` |
| **Platform / Storage** | `PWA` / `local device only` |
| **Timezone** | `Asia/Bangkok` |

### Nutrition Calculations (`src/utils/nutritionCalculator.ts`)
Using the **Mifflin–St Jeor** equation for males:
$$\text{BMR} = 10 \times \text{weightKg} + 6.25 \times \text{heightCm} - 5 \times \text{age} + 5$$

- **BMR**: $10 \times 88 + 6.25 \times 180 - 5 \times 18 + 5 = 1,920\text{ kcal/day}$
- **Activity Factor**: $1.725$ (High activity: swimming & strength training)
- **Estimated TDEE**: $1,920 \times 1.725 = 3,312\text{ kcal/day}$
- **Initial Calorie Target**: $2,900\text{ kcal/day}$
- **Protein Target**: $170\text{ g/day}$ ($680\text{ kcal}$)
- **Fat Target**: $85\text{ g/day}$ ($765\text{ kcal}$)
- **Carbohydrate Target**: $(2,900 - 680 - 765) / 4 = 363.75\text{ g/day}$ ($1,455\text{ kcal}$)

> **Note**: These are formula estimates, not direct calorimetry measurements. You can freely edit your profile or override any calorie/macro target in **Settings**. Logging a single weight measurement will **never** automatically alter your daily calorie or macro targets.

---

## 3. Application Screens & Features

1. **Today Dashboard (`src/components/TodayDashboard.tsx`)**
   - Displays today's date in `Asia/Bangkok` timezone.
   - Real-time calorie ring and macro progress bars (Protein, Carbohydrates, Fat) computed strictly from saved records.
   - Quick-add buttons for reference/frequent foods and full breakdown of today's logged meals.
2. **Food Scanner (`src/components/FoodScanner.tsx`)**
   - Supports mobile camera capture (`capture="environment"`) and local device image selection.
   - Displays an in-memory image preview without uploading or permanently storing raw photos in IndexedDB.
   - Clearly reports `not_configured` status when no AI provider is connected—never fabricates or fakes AI output.
   - Includes direct manual food catalog search and custom meal entry right below the photo preview.
3. **Confirm Meal (`src/components/ConfirmMeal.tsx`)**
   - Review and edit food name, ingredients, serving weight in grams (with automatic proportional macro scaling), calories, protein, carbs, fat, and meal category (`breakfast`, `lunch`, `dinner`, `snacks`).
   - Enforces explicit user confirmation checkbox when reviewing AI-generated estimates.
4. **Food Diary (`src/components/FoodDiary.tsx`)**
   - Date selector with quick previous/next day navigation.
   - Organized into **Breakfast**, **Lunch**, **Dinner**, and **Snacks**.
   - Add from catalog (`nutrientTotal = nutrientPer100g * grams / 100`), edit existing entries inline, or delete entries.
   - Stores immutable snapshots (`foodNameSnapshot`, `calories`, `protein`, `carbohydrates`, `fat`) on every `mealItems` record so future catalog edits never corrupt historical logs.
5. **Progress (`src/components/ProgressScreen.tsx`)**
   - Log daily body weight measurements (`weightLogs`).
   - Displays latest weight, change from `88 kg` baseline, progress toward the `80 kg` target, 7-day rolling average (when $\ge 7$ days of logs exist), and average daily calorie/protein intake.
   - Shows honest empty states when insufficient data exists—never fabricates historical weight records.
6. **Settings (`src/components/SettingsScreen.tsx`)**
   - Edit personal profile and daily calorie/macro targets.
   - Switch between **Dark** and **Light** themes.
   - Export full database backup as JSON, restore from JSON backup with schema validation, Export food records to CSV, or Clear all local data with confirmation.

---

## 4. IndexedDB Schema (`src/db/database.ts`)

Managed via **Dexie.js** (`NubNutritionTrackerDB`, schema version `2`) with 9 tables:
- `profiles`: User demographic & training profile
- `goals`: BMR, TDEE, and daily calorie/macro targets
- `foodCatalog`: Reference foods (USDA FoodData Central) and user-saved custom foods per 100g with explicit `source` and `sourceLabel`
- `meals`: Meal headers indexed by `[date+category]`
- `mealItems`: Individual logged food portions with historical nutrition snapshots
- `weightLogs`: Daily body weight records
- `activityLogs`: Training & activity records
- `scanLogs`: Audit log of scanner actions (`manual_fallback`, `analyzed`, `failed`)
- `settings`: Theme, timezone (`Asia/Bangkok`), and optional AI provider status

---

## 5. Data Backup, Restoration & Local-First Privacy

- **Zero Cloud Dependency**: All records live inside your browser's IndexedDB on your device.
- **Browser Data Caution**: Clearing your browser's site data or uninstalling the browser can erase IndexedDB storage. Use **Settings → Export Full JSON Backup** regularly to save a portable `.json` file.
- **Safe Restoration**: Importing a JSON backup validates the schema and restores all 9 tables inside an atomic Dexie transaction.
- **CSV Export**: Export all logged meal items to `.csv` for external spreadsheet analysis.

---

## 6. Future Optional AI Setup (When You Have a Gemini API Key)

By design, this application **does not** require `GEMINI_API_KEY`, **does not** scrape consumer web interfaces, and **does not** reuse CLI OAuth tokens.

When you later obtain an official `GEMINI_API_KEY` from Google AI Studio and wish to enable automated photo estimation:

1. **Create a lightweight backend proxy endpoint** (for example, a small local Node/Express server, Cloudflare Worker, or Cloud Run function) that holds `GEMINI_API_KEY` in its server environment variables. **Never place `GEMINI_API_KEY` in frontend code or `localStorage`.**
2. Have your backend endpoint accept `POST` `multipart/form-data` with field `image`, call the official `@google/genai` SDK (`ai.models.generateContent` with `gemini-2.5-flash` and a structured JSON schema), and return JSON matching `FoodAnalysisResult` (`src/services/aiProvider.ts`):
   ```json
   {
     "mealName": "Grilled Chicken Breast with Jasmine Rice",
     "identifiedFoodItems": [
       {
         "name": "Chicken Breast, Cooked",
         "estimatedGrams": 160,
         "estimatedCalories": 264,
         "protein": 49.6,
         "carbohydrates": 0,
         "fat": 5.8
       }
     ],
     "estimatedWeightGrams": 360,
     "estimatedCalories": 524,
     "protein": 55.0,
     "carbohydrates": 56.4,
     "fat": 6.4,
     "uncertainties": ["Exact cooking oil quantity cannot be visually verified"],
     "assumptions": ["Assumed skinless chicken breast and steamed white jasmine rice"],
     "requiresUserConfirmation": true
   }
   ```
3. In the app, open **Settings → Optional AI Integration Status**, switch Provider Mode to **Server-Side Proxy Endpoint**, and enter your endpoint URL (e.g., `http://localhost:8787/api/analyze-food`).
