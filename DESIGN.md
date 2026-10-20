---
name: NubCal
description: Local-first Thai-centric nutrition and calorie tracker
colors:
  primary: "#6258F5"
  primary-hover: "#756BFF"
  primary-deep: "#5146E0"
  secondary: "#EFEDFF"
  navy: "#17213D"
  canvas: "#F6F7FB"
  surface: "#FFFFFF"
  text-primary: "#20243A"
  text-secondary: "#858BA0"
  border: "#E9EAF2"
  success: "#27AE82"
  warning: "#F2B544"
  error: "#EB6478"
  neutral-near-black: "#171717"
  meal-breakfast-bg: "#FEF7E8"
  meal-breakfast-text: "#D9961A"
  meal-lunch-bg: "#F0F4FF"
  meal-lunch-text: "#6258F5"
  meal-dinner-bg: "#EFEDFF"
  meal-dinner-text: "#756BFF"
  meal-snacks-bg: "#E8F8F2"
  meal-snacks-text: "#27AE82"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "14px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: NubCal

## Overview

**Creative North Star: "The Mindful Plate Sanctuary"**

NubCal’s design language marries the clean, authoritative precision of modern European SaaS dashboards (inspired by Jobgio) with the warmth, tactile softness, and high-frequency usability demanded by personal nutrition tracking in Thailand. The interface is light-first, quiet, and profoundly respectful of the user's attention. Rather than assaulting the eye with neon gamification or high-friction spreadsheets, it presents a serene white-and-lavender canvas where critical health metrics stand out effortlessly.

The system is engineered around Mobile-First realities: quick thumb taps, high-contrast daylight readability at food stalls or restaurants, and generous 24px rounded cards that feel soft in the hand. Visual density is calibrated for immediate scanning: calories and macro targets are absorbed in under two seconds, while secondary details (sodium, sugar, individual food ingredients) recede gracefully until requested.

**Key Characteristics:**
- Crisp, airy canvas with a calming cool fog background (`#F6F7FB`) and pure white cards (`#FFFFFF`)
- Distinctive electric purple focal points (`#6258F5`) balanced by deep night navy (`#17213D`)
- Soft, pill-shaped interactive geometry (`rounded-full`) contrasting structured cards (`24px` radius)
- Intentional, functional micro-interactions (fast 150ms transitions, smooth ease-out curves)
- Strict light-theme discipline ensuring universal contrast and no washed-out text

## Colors

The palette balances airy Nordic lightness with energetic lilac-violet accents and grounding navy contrast.

### Primary
- **Electric Lavender-Violet** (`#6258F5`): The signature brand color. Used sparingly on primary action buttons, active navigation states, key metric highlights, and high-value chart bars. Never over-applied as large surface fills.
- **Vibrant Soft Iris** (`#756BFF`): Primary hover state and subtle interactive accents.
- **Deep Iris** (`#5146E0`): Active press state for buttons and selected tab indicators.

### Secondary
- **Soft Lilac Tint** (`#EFEDFF`): The primary companion to `#6258F5`. Used for button backgrounds (secondary), active icon containers, selected table row highlights, and gentle callout badges.
- **Whisper Blue** (`#F0F4FF`): Secondary soft badge background for neutral tags and quick-action containers.

### Neutral
- **Deep Night Navy** (`#17213D`): Anchoring contrast element. Used for high-emphasis tooltips, dark status callouts, and floating badge pills.
- **Charcoal Text Primary** (`#20243A`): The normative reading color for all headings, labels, and primary data values. Pure black (`#000000`) is avoided to eliminate harsh visual glare.
- **Muted Steel Slate** (`#858BA0`): Secondary copy, unit measurements, timestamps, empty state descriptions, and inactive icons.
- **Subtle Platinum Border** (`#E9EAF2`): Clean 1px card boundaries, table separators, and input strokes.
- **Soft Canvas Fog** (`#F6F7FB`): Application-wide viewport background.
- **Pure White Surface** (`#FFFFFF`): Elevated card, drawer, and modal surface background.

### Semantic Accents
- **Jade Success** (`#27AE82`): Healthy target completion, positive calorie balance, safe sodium/sugar indicators.
- **Amber Warning** (`#F2B544`): Approaching limits, cautionary feedback, moderate sodium intake warnings.
- **Coral Rose Error** (`#EB6478`): Over-budget warnings, exceeding WHO sodium limits, destructive delete actions.

### Named Rules
**The 90/10 Canvas Rule.** 90% of the visible surface consists of quiet neutrals (`#F6F7FB`, `#FFFFFF`, `#E9EAF2`). The vibrant purple accent (`#6258F5`) never exceeds 10% of any viewport. Its scarcity preserves its signaling power.

**The No Pure Black Rule.** `#000000` is strictly forbidden for typography and strokes. All dark surfaces and text must use `#20243A` or `#17213D` to maintain soft, sophisticated contrast.

## Typography

**Display & Body Font:** System Font Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)

**Character:** Clean, neutral, high-legibility sans-serif with native system font smoothing. Optimized for rapid numeral recognition and bilingual Thai-English clarity.

### Hierarchy
- **Display** (`700`, `1.5rem / 24px`, `1.2`, `-0.02em`): Main screen titles (`TodayDashboard`, `FoodScanner`).
- **Headline** (`700`, `1.25rem / 20px`, `1.3`, `-0.015em`): Card group headers, section titles.
- **Title** (`600`, `1rem / 16px`, `1.4`, `-0.01em`): Meal item names, modal titles, stat metric labels.
- **Body** (`400`, `0.8125rem / 13px`, `1.5`, `normal`): Data tables, ingredient notes, general descriptions.
- **Label / Meta** (`600`, `0.6875rem / 11px`, `1.4`, `0.02em`): Category pills, macro tags, tooltip details, timestamps.

### Named Rules
**The Numeric Prominence Rule.** Calorie counts and macro quantities (`kcal`, `g`, `mg`) must always be rendered in bold (`font-weight: 700`) with explicit units in secondary slate (`#858BA0`), ensuring numbers can be parsed at an arm's length.

## Layout

NubCal employs a responsive single-column layout on mobile (<640px) that expands into a 2-to-3 column dashboard grid on desktop (1024px+).

- **Mobile Viewport (320px–639px)**: Single-column stream with negative edge margins (`-mx-2` / `-mx-4`), sticky bottom navigation bar, card padding `1rem`, and touch-friendly target sizes (min 44px).
- **Tablet Viewport (640px–1023px)**: 2-column card grid, collapsible navigation, table views with responsive horizontal scroll.
- **Desktop Viewport (1024px+)**: Max container width `1440px`, generous outer margins, 3-column macro KPI row, 2-column intake chart alongside quick actions, followed by full food management table.
- **Spacing Rhythm**: 4px base grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).

## Elevation & Depth

NubCal is flat-by-default with ambient, featherweight depth. Heavy drop-shadows and glassmorphism are banned.

### Shadow Vocabulary
- **Ambient Rest** (`box-shadow: 0 2px 8px rgba(23, 33, 61, 0.03)`): Default card elevation against the `#F6F7FB` canvas.
- **Button Glow** (`box-shadow: 0 2px 6px rgba(98, 88, 245, 0.24)`): Primary CTA button resting elevation.
- **Hover Lift** (`box-shadow: 0 4px 14px rgba(98, 88, 245, 0.28)`): Interactive lift when hovering over primary buttons or clickable cards.
- **Modal Depth** (`box-shadow: 0 20px 40px rgba(23, 33, 61, 0.16)`): Dialogs, bottom sheets, and scanner modals.

### Named Rules
**The Ghost Border Rule.** Every elevated surface (`card`, `modal`, `popover`) must carry a crisp 1px stroke of `#E9EAF2` alongside any ambient shadow. The stroke guarantees crisp edge definition regardless of screen brightness or panel calibration.

## Shapes

- **Cards & Surface Containers**: Generous `24px` radius (`rounded-[24px]` / `rounded-3xl`).
- **Modals & Dialogs**: Soft `28px` radius (`rounded-[28px]`).
- **Form Inputs & Search**: Soft `16px` radius (`rounded-2xl` / `1rem`).
- **Interactive Triggers (Buttons, Pills, Badges)**: Fully rounded `9999px` (`rounded-full`).

### Named Rules
**The Pill vs. Container Rule.** Micro-surfaces (buttons, filter chips, meal tags, status badges) must ALWAYS use fully rounded pill geometry (`rounded-full`). Macro-surfaces (cards, panels, modals) must ALWAYS use rounded rectangular geometry (`20px–28px`). Mixing these roles (e.g. sharp square buttons or pill-shaped cards) is forbidden.

## Components

### Buttons
- **Shape:** Fully rounded pill (`rounded-full`).
- **Primary:** Background `#6258F5`, text `#FFFFFF`, padding `8px 16px` (sm) or `10px 20px` (md), shadow `0 2px 6px rgba(98,88,245,0.24)`.
- **Secondary:** Background `#EFEDFF`, text `#6258F5`, border `1px solid #E2DFFF`, padding `8px 16px`.
- **Danger:** Background `#FFF0F2`, text `#EB6478`, border `1px solid #FAD1D8`.
- **Hover/Active:** Fast 150ms ease-out color shift, subtle 1px translate up on hover.

### Chips & Badges
- **Shape:** Fully rounded pill (`rounded-full`), text `11px`, font-weight `600`.
- **Breakfast:** Background `#FEF7E8`, text `#D9961A`.
- **Lunch:** Background `#F0F4FF`, text `#6258F5`.
- **Dinner:** Background `#EFEDFF`, text `#756BFF`.
- **Snacks:** Background `#E8F8F2`, text `#27AE82`.

### Cards & Containers
- **Corner Style:** `24px` radius with `1px solid #E9EAF2` border.
- **Background:** `#FFFFFF`.
- **Internal Padding:** `1.5rem` (24px) on desktop, `1rem` (16px) on mobile.
- **Hover:** Border shifts to `#D6D9EC` over 150ms.

### Inputs & Fields
- **Style:** Background `#F6F7FB`, border `1px solid #E9EAF2`, radius `16px`, padding `10px 14px`, text `#20243A`.
- **Focus:** Background shifts to `#FFFFFF`, border shifts to `#6258F5`, focus ring `0 0 0 3px rgba(98, 88, 245, 0.14)`.
- **Placeholder:** Muted slate `#858BA0`.

### Navigation
- **Desktop Sidebar:** Sticky left nav, `#FFFFFF` surface, `1px solid #E9EAF2` right border, active item highlighted with `#6258F5` text and `#EFEDFF` pill background.
- **Mobile Bottom Bar:** Fixed bottom bar, `#FFFFFF` with top border `#E9EAF2`, backdrop blur, 4 key navigation icons with active indicator pill.

### Signature Component: The Daily Balance Arc / Gauge
- Custom SVG circular / linear progress rings featuring `#6258F5` filled track against a `#EFEDFF` background track, centered around bold calorie totals with immediate percentage feedback.

## Do's and Don'ts

### Do:
- **Do** maintain the 90/10 canvas ratio: keep backgrounds and cards predominantly white and light gray.
- **Do** use pill buttons (`rounded-full`) for all action triggers and category selectors.
- **Do** show Thai and English names in bilingual harmony for local food dishes.
- **Do** use smooth ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for all state transitions under 200ms.
- **Do** keep touch targets on mobile at a minimum of 44×44px.

### Don't:
- **Don't** use pure black (`#000000`) for text or background fills.
- **Don't** introduce heavy gradient backgrounds, glassmorphism, or multi-colored glow effects.
- **Don't** use bounce or elastic easing animations; motion must be refined and professional.
- **Don't** hide sodium and sugar metrics behind deep submenus; keep them visible on meal logs.
- **Don't** allow cards on mobile to clip or trigger horizontal scrolling.
