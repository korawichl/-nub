import React, { useState, useRef } from 'react';
import {
  Share2,
  Copy,
  Download,
  Check,
  X,
  Flame,
  Droplets,
} from 'lucide-react';
import { formatDisplayDate } from '../utils/date';

interface ShareSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  consumedCalories: number;
  targetCalories: number;
  remainingCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget: number;
  sodiumMg: number;
  sugarG: number;
  waterMl: number;
  waterTargetMl: number;
  streakDays: number;
  netDeficit: number;
  energyStatus: 'deficit' | 'surplus' | 'maintenance';
  fatChangeG: number;
  userName: string;
}

export const ShareSummaryModal: React.FC<ShareSummaryModalProps> = ({
  isOpen,
  onClose,
  date,
  consumedCalories,
  targetCalories,
  remainingCalories,
  protein,
  carbs,
  fat,
  proteinTarget,
  sodiumMg,
  sugarG,
  waterMl,
  waterTargetMl,
  streakDays,
  netDeficit,
  energyStatus,
  fatChangeG,
  userName,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const displayDateStr = formatDisplayDate(date);
  const pctCalories = Math.round((consumedCalories / targetCalories) * 100);

  // Formatted Text for LINE / Chat apps
  const shareText = `📊 สรุปโภชนาการ Nubcal Daily Summary
📅 ประจำวันที่ ${displayDateStr}
👤 โดย: ${userName || 'User'}

🔥 แคลอรี่: ${Math.round(consumedCalories)} / ${targetCalories} kcal (คงเหลือ ${Math.round(remainingCalories)} kcal - ${pctCalories}%)
${
  energyStatus === 'deficit'
    ? `📉 Calorie Deficit: -${Math.round(netDeficit)} kcal (เผาผลาญไขมัน ~${fatChangeG}g)`
    : energyStatus === 'surplus'
    ? `📈 Calorie Surplus: +${Math.round(Math.abs(netDeficit))} kcal`
    : `⚖️ Energy Balance: สมดุลพอดี`
}

🥩 โปรตีน: ${Math.round(protein)}g / ${proteinTarget}g
🍚 คาร์บ: ${Math.round(carbs)}g | 🥑 ไขมัน: ${Math.round(fat)}g
🧂 โซเดียม: ${sodiumMg} mg ${sodiumMg > 2000 ? '⚠️ เกินเกณฑ์ WHO' : '✅'}
🍬 น้ำตาล: ${sugarG} g ${sugarG > 24 ? '⚠️ เกินเกณฑ์ WHO' : '✅'}
💧 ดื่มน้ำ: ${waterMl} / ${waterTargetMl} ml

🏆 บันทึกต่อเนื่อง: ${streakDays} วันติดต่อกัน!
#Nubcal #HealthyLiving #NutritionTracker`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGenerateAndDownloadPng = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
      bgGrad.addColorStop(0, '#F6F7FB');
      bgGrad.addColorStop(1, '#ECEEFA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Decorative top circle
      ctx.beginPath();
      ctx.arc(950, 100, 300, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(98, 88, 245, 0.08)';
      ctx.fill();

      // 2. White Card Container
      ctx.save();
      ctx.shadowColor = 'rgba(23, 33, 61, 0.08)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 80, 80, 920, 1190, 48);
      ctx.fill();
      ctx.restore();

      // Card border
      ctx.strokeStyle = '#E9EAF2';
      ctx.lineWidth = 3;
      roundRect(ctx, 80, 80, 920, 1190, 48);
      ctx.stroke();

      // 3. Header: App Logo + Name
      ctx.fillStyle = '#6258F5';
      roundRect(ctx, 140, 140, 60, 60, 18);
      ctx.fill();

      // Simple Logo Shape inside
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(155, 155, 30, 30);

      ctx.fillStyle = '#20243A';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('Nubcal', 220, 178);

      ctx.fillStyle = '#858BA0';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('DAILY NUTRITION REPORT', 220, 208);

      // Streak Pill (Top Right)
      ctx.fillStyle = '#EFEDFF';
      roundRect(ctx, 740, 140, 200, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#6258F5';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(`🔥 ${streakDays} DAYS`, 775, 176);

      // Date & User
      ctx.fillStyle = '#858BA0';
      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(displayDateStr, 140, 260);

      // 4. Hero Calorie Block
      ctx.fillStyle = '#F6F7FB';
      roundRect(ctx, 140, 290, 800, 240, 36);
      ctx.fill();
      ctx.strokeStyle = '#E9EAF2';
      ctx.lineWidth = 2;
      roundRect(ctx, 140, 290, 800, 240, 36);
      ctx.stroke();

      ctx.fillStyle = '#858BA0';
      ctx.font = '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('CALORIES CONSUMED', 180, 345);

      ctx.fillStyle = '#20243A';
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${Math.round(consumedCalories)}`, 180, 425);

      ctx.fillStyle = '#858BA0';
      ctx.font = '500 26px system-ui, -apple-system, sans-serif';
      ctx.fillText(`/ ${targetCalories} kcal`, 180 + ctx.measureText(`${Math.round(consumedCalories)}`).width + 16, 425);

      // Deficit / Surplus Badge inside Hero
      const defBg = energyStatus === 'deficit' ? '#E8F8F2' : energyStatus === 'surplus' ? '#FEF7E8' : '#EFEDFF';
      const defColor = energyStatus === 'deficit' ? '#27AE82' : energyStatus === 'surplus' ? '#D9961A' : '#6258F5';
      ctx.fillStyle = defBg;
      roundRect(ctx, 180, 455, 480, 48, 24);
      ctx.fill();
      ctx.fillStyle = defColor;
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      const defText = energyStatus === 'deficit'
        ? `🔥 Deficit: -${Math.round(netDeficit)} kcal (Fat burn ~${fatChangeG}g)`
        : energyStatus === 'surplus'
        ? `⚠️ Surplus: +${Math.round(Math.abs(netDeficit))} kcal`
        : `⚖️ Maintenance Balance`;
      ctx.fillText(defText, 205, 487);

      // 5. Macronutrients 3 Columns
      const macroBoxY = 560;
      const colW = 250;
      const gap = 25;

      // Protein
      drawMacroBox(ctx, 140, macroBoxY, colW, 160, 'PROTEIN', `${Math.round(protein)}g`, `/ ${proteinTarget}g`, '#6258F5', '#EFEDFF');
      // Carbs
      drawMacroBox(ctx, 140 + colW + gap, macroBoxY, colW, 160, 'CARBS', `${Math.round(carbs)}g`, '', '#27AE82', '#E8F8F2');
      // Fat
      drawMacroBox(ctx, 140 + (colW + gap) * 2, macroBoxY, colW, 160, 'FAT', `${Math.round(fat)}g`, '', '#F2B544', '#FEF7E8');

      // 6. Sodium, Sugar & Hydration Bars
      const barsY = 750;
      // Sodium Bar
      drawMetricBar(ctx, 140, barsY, 385, '🧂 Sodium', `${sodiumMg} mg`, sodiumMg <= 2000 ? 'Normal (WHO ≤ 2000)' : 'High (> 2000mg)', sodiumMg / 2000, sodiumMg > 2000 ? '#EB6478' : '#6258F5');
      // Sugar Bar
      drawMetricBar(ctx, 555, barsY, 385, '🍬 Sugar', `${sugarG} g`, sugarG <= 24 ? 'Normal (WHO ≤ 24g)' : 'High (> 24g)', sugarG / 24, sugarG > 24 ? '#EB6478' : '#27AE82');

      // Hydration Bar Full Width
      drawMetricBar(ctx, 140, barsY + 140, 800, '💧 Hydration (Water)', `${(waterMl / 1000).toFixed(1)}L / ${(waterTargetMl / 1000).toFixed(1)}L`, `${Math.round((waterMl / waterTargetMl) * 100)}% of goal`, waterMl / waterTargetMl, '#756BFF');

      // 7. Footer
      ctx.fillStyle = '#858BA0';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Tracked with Nubcal — Local-First Nutrition & AI Tracker', 140, 1200);

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nubcal-summary-${date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to export canvas png', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17213D]/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-[28px] border border-[#E9EAF2] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E9EAF2]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEDFF] text-[#6258F5] flex items-center justify-center">
              <Share2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20243A]">Share Daily Card</h3>
              <p className="text-xs text-[#858BA0]">Export summary to LINE, IG Story, or Trainer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#858BA0] hover:text-[#20243A] hover:bg-[#F6F7FB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          <div
            ref={cardRef}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#F6F7FB] to-[#EFEDFF]/40 border border-[#E9EAF2] flex flex-col gap-3.5 shadow-xs"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#6258F5] text-white flex items-center justify-center text-xs font-bold">
                  N
                </span>
                <div>
                  <span className="text-xs font-bold text-[#20243A] block">Nubcal Daily</span>
                  <span className="text-[10px] text-[#858BA0]">{displayDateStr}</span>
                </div>
              </div>
              <span className="bg-[#EFEDFF] text-[#6258F5] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#6258F5]/20 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>{streakDays} Days</span>
              </span>
            </div>

            {/* Calorie Stats */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E9EAF2] flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-[#20243A] tracking-tight">
                    {Math.round(consumedCalories)}
                  </span>
                  <span className="text-xs text-[#858BA0] font-medium ml-1">
                    / {targetCalories} kcal
                  </span>
                </div>
                <span className="text-xs font-bold text-[#6258F5]">{pctCalories}%</span>
              </div>

              {/* Deficit badge */}
              <div
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center justify-between ${
                  energyStatus === 'deficit'
                    ? 'bg-[#E8F8F2] text-[#27AE82]'
                    : energyStatus === 'surplus'
                    ? 'bg-[#FEF7E8] text-[#D9961A]'
                    : 'bg-[#EFEDFF] text-[#6258F5]'
                }`}
              >
                <span>
                  {energyStatus === 'deficit'
                    ? `🔥 Net Deficit: -${Math.round(netDeficit)} kcal`
                    : energyStatus === 'surplus'
                    ? `⚠️ Surplus: +${Math.round(Math.abs(netDeficit))} kcal`
                    : `⚖️ Energy Balanced`}
                </span>
                {energyStatus === 'deficit' && (
                  <span className="text-[10px] font-normal">Est. fat burn ~{fatChangeG}g</span>
                )}
              </div>
            </div>

            {/* Macros 3 Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#E9EAF2]">
                <span className="text-[10px] text-[#858BA0] block">Protein</span>
                <span className="text-xs font-bold text-[#6258F5]">{Math.round(protein)}g</span>
                <span className="text-[9px] text-[#858BA0] block mt-0.5">/ {proteinTarget}g</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E9EAF2]">
                <span className="text-[10px] text-[#858BA0] block">Carbs</span>
                <span className="text-xs font-bold text-[#27AE82]">{Math.round(carbs)}g</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E9EAF2]">
                <span className="text-[10px] text-[#858BA0] block">Fat</span>
                <span className="text-xs font-bold text-[#F2B544]">{Math.round(fat)}g</span>
              </div>
            </div>

            {/* Sodium & Sugar Row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-xl border border-[#E9EAF2] flex items-center justify-between">
                <span className="text-[#858BA0] text-[11px]">🧂 Sodium</span>
                <span className={`font-bold text-[11px] ${sodiumMg > 2000 ? 'text-[#EB6478]' : 'text-[#20243A]'}`}>
                  {sodiumMg} mg
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#E9EAF2] flex items-center justify-between">
                <span className="text-[#858BA0] text-[11px]">🍬 Sugar</span>
                <span className={`font-bold text-[11px] ${sugarG > 24 ? 'text-[#EB6478]' : 'text-[#20243A]'}`}>
                  {sugarG} g
                </span>
              </div>
            </div>

            {/* Water row */}
            <div className="bg-white p-2.5 rounded-xl border border-[#E9EAF2] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#756BFF]">
                <Droplets className="w-3.5 h-3.5" />
                <span className="font-semibold text-[#20243A]">Hydration:</span>
              </div>
              <span className="text-xs font-bold text-[#20243A]">
                {(waterMl / 1000).toFixed(1)}L / {(waterTargetMl / 1000).toFixed(1)}L
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopyText}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                copied
                  ? 'bg-[#E8F8F2] text-[#27AE82] border-[#27AE82]/30'
                  : 'bg-[#F0F4FF] hover:bg-[#EFEDFF] text-[#6258F5] border-[#E9EAF2]'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy for LINE / Chat'}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAndDownloadPng}
              disabled={downloading}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#6258F5] hover:bg-[#756BFF] text-white shadow-md shadow-[#6258F5]/25 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Rendering...' : 'Download Image Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas drawing helpers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawMacroBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  val: string,
  sub: string,
  color: string,
  bgColor: string
) {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, 24);
  ctx.fill();

  ctx.fillStyle = '#858BA0';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(title, x + 24, y + 42);

  ctx.fillStyle = color;
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.fillText(val, x + 24, y + 95);

  if (sub) {
    ctx.fillStyle = '#858BA0';
    ctx.font = '500 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(sub, x + 24, y + 130);
  }
}

function drawMetricBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string,
  val: string,
  sub: string,
  pct: number,
  color: string
) {
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, x, y, w, 110, 24);
  ctx.fill();
  ctx.strokeStyle = '#E9EAF2';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, 110, 24);
  ctx.stroke();

  ctx.fillStyle = '#20243A';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(title, x + 24, y + 40);

  ctx.fillStyle = color;
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  const valW = ctx.measureText(val).width;
  ctx.fillText(val, x + w - valW - 24, y + 40);

  // Bar background
  ctx.fillStyle = '#F0F4FF';
  roundRect(ctx, x + 24, y + 60, w - 48, 14, 7);
  ctx.fill();

  // Progress
  const cappedPct = Math.min(Math.max(pct, 0), 1);
  if (cappedPct > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x + 24, y + 60, (w - 48) * cappedPct, 14, 7);
    ctx.fill();
  }

  // Subtext
  ctx.fillStyle = '#858BA0';
  ctx.font = '500 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(sub, x + 24, y + 95);
}
