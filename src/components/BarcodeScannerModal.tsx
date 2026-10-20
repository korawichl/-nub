import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { AppSettings, ConfirmMealDraft, MealCategory } from '../types';
import { db } from '../db/database';
import { getFoodAnalysisProvider } from '../services/aiProvider';
import {
  ScanBarcode,
  Camera,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Upload,
  Sparkles,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (draft: ConfirmMealDraft) => void;
  defaultCategory?: MealCategory;
  settings?: AppSettings;
}

interface ProductNutrition {
  name: string;
  brand?: string;
  imageUrl?: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodiumMg?: number;
  sugarG?: number;
  barcode: string;
  sourceLabel?: string;
}

// Built-in verified Thai retail products database for instant & offline recognition
export const VERIFIED_THAI_BARCODES: Record<
  string,
  {
    name: string;
    brand: string;
    servingGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sodiumMg: number;
    sugarG: number;
    imageUrl?: string;
  }
> = {
  '8850653799682': {
    name: 'อกไก่นุ่ม (Tender Chicken Breast)',
    brand: 'CP Delight (ซีพี ดีไลท์)',
    servingGrams: 80,
    calories: 80,
    protein: 17,
    carbs: 0,
    fat: 1.5,
    sodiumMg: 390,
    sugarG: 0,
    imageUrl: 'https://images.openfoodfacts.org/images/products/885/065/379/9682/front_th.11.200.jpg',
  },
  '8850329120116': {
    name: 'นมสดพาสเจอร์ไรส์ รสจืด 200ml',
    brand: 'CP Meiji (ซีพี เมจิ)',
    servingGrams: 200,
    calories: 140,
    protein: 6,
    carbs: 10,
    fat: 8,
    sodiumMg: 90,
    sugarG: 10,
  },
  '8850188800018': {
    name: 'นมสดพาสเจอร์ไรส์ รสจืด 225ml',
    brand: 'Dutch Mill (ดัชมิลล์ ซีเล็คเต็ด)',
    servingGrams: 225,
    calories: 150,
    protein: 7,
    carbs: 11,
    fat: 8.5,
    sodiumMg: 105,
    sugarG: 11,
  },
  '8850987150098': {
    name: 'บะหมี่กึ่งสำเร็จรูป คาโบนาราเบคอน (Oriental Kitchen)',
    brand: 'MAMA OK (มาม่า โอเค)',
    servingGrams: 85,
    calories: 390,
    protein: 8,
    carbs: 52,
    fat: 17,
    sodiumMg: 1120,
    sugarG: 6,
  },
  '8850987101058': {
    name: 'บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง',
    brand: 'MAMA (มาม่า)',
    servingGrams: 55,
    calories: 260,
    protein: 5,
    carbs: 36,
    fat: 11,
    sodiumMg: 1280,
    sugarG: 4,
  },
  '8854761951413': {
    name: 'นมอัลมอนด์ สูตรอันสวีตเทนด์ (Unsweetened Almond Milk)',
    brand: '137 Degrees (137 ดีกรี)',
    servingGrams: 180,
    calories: 60,
    protein: 2,
    carbs: 2,
    fat: 5,
    sodiumMg: 45,
    sugarG: 0,
  },
  '8859473101309': {
    name: 'นมโปรตีนสูง แลคโตสฟรี รสช็อกโกแลต 340ml',
    brand: 'Sunshine Dairy (ซันไชน์ เดลี่)',
    servingGrams: 340,
    calories: 260,
    protein: 28,
    carbs: 18,
    fat: 7,
    sodiumMg: 190,
    sugarG: 12,
  },
  '8850228000156': {
    name: 'นมถั่วเหลืองยูเอชที รสหวานคลาสสิค 300ml',
    brand: 'Lactasoy (แลคตาซอย)',
    servingGrams: 300,
    calories: 220,
    protein: 9,
    carbs: 27,
    fat: 9,
    sodiumMg: 125,
    sugarG: 21,
  },
  '8850029011122': {
    name: 'เครื่องดื่มมอลต์รสช็อกโกแลต UHT 180ml',
    brand: 'Ovaltine (โอวัลติน)',
    servingGrams: 180,
    calories: 130,
    protein: 3,
    carbs: 22,
    fat: 3.5,
    sodiumMg: 85,
    sugarG: 16,
  },
  '8850999001001': {
    name: 'น้ำดื่มสิงห์ 600ml',
    brand: 'Singha (สิงห์)',
    servingGrams: 600,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sodiumMg: 0,
    sugarG: 0,
  },
  '8858684502585': {
    name: 'โบโลน่าไก่ผสมอกไก่ รสพริกสด',
    brand: 'CP More / 7-Eleven',
    servingGrams: 65,
    calories: 90,
    protein: 8,
    carbs: 2,
    fat: 6,
    sodiumMg: 450,
    sugarG: 1,
  },
  '8851351132283': {
    name: 'เบอร์เกอร์ ข้าวกล้องไก่แซ่บ',
    brand: '7-Fresh (7-Eleven)',
    servingGrams: 117,
    calories: 240,
    protein: 11,
    carbs: 34,
    fat: 6,
    sodiumMg: 680,
    sugarG: 4,
  },
  '8850653110029': {
    name: 'ไข่ต้มปอกเปลือกพร้อมทาน (2 ฟอง)',
    brand: 'CP (ซีพี)',
    servingGrams: 90,
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    sodiumMg: 130,
    sugarG: 0,
  },
};

// Popular sample barcodes for rapid 1-click testing
const SAMPLE_BARCODES = [
  { name: 'อกไก่นุ่ม CP Delight', code: '8850653799682' },
  { name: 'นมสด CP Meiji รสจืด', code: '8850329120116' },
  { name: 'นมดัชมิลล์ ซีเล็คเต็ด', code: '8850188800018' },
  { name: 'มาม่า OK คาโบนารา', code: '8850987150098' },
  { name: 'แลคตาซอย 300ml', code: '8850228000156' },
  { name: 'นมอัลมอนด์ 137 ดีกรี', code: '8854761951413' },
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
  defaultCategory = 'lunch',
  settings,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ProductNutrition | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>(defaultCategory);

  // Camera video stream state using html5-qrcode
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Fallback state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState('');

  // Stop camera when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedProduct(null);
      setNotFoundBarcode(null);
      setError(null);
      setAiError(null);
      setBarcodeInput('');
      setAiHint('');
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    setNotFoundBarcode(null);
    setCameraActive(true);

    // Give DOM a tick to render #nubcal-barcode-reader
    setTimeout(async () => {
      try {
        const container = document.getElementById('nubcal-barcode-reader');
        if (!container) return;

        // Clean up previous instance if any
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode('nubcal-barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        // Try environment (rear) camera first, with automatic fallback
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            // Haptic vibration feedback if supported
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(100);
              } catch {}
            }
            stopCamera();
            setBarcodeInput(decodedText);
            fetchProduct(decodedText);
          },
          () => {
            // Ignore frame-by-frame parse attempts
          }
        );
      } catch (err) {
        setCameraActive(false);
        setError(
          'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง (Allow Camera Permissions) หรือถ่ายรูปบาร์โค้ดแล้วอัปโหลดแทน'
        );
      }
    }, 150);
  };

  // Image Upload Barcode Decoder
  const handleUploadBarcodeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setNotFoundBarcode(null);
    setLoading(true);

    try {
      // Create temporary scanner instance for file decode
      const tempScanner = new Html5Qrcode('nubcal-temp-file-scanner', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();

      setBarcodeInput(decodedText);
      await fetchProduct(decodedText);
    } catch (err) {
      setError(
        'ไม่พบบาร์โค้ดในรูปภาพที่เลือก กรุณาถ่ายภาพบาร์โค้ดให้ชัดเจน แสงสว่างเพียงพอ หรือพิมพ์ตัวเลข 13 หลักโดยตรง'
      );
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Multi-Layer Product Resolver (Local DB -> Built-in Thai DB -> OpenFoodFacts -> AI / Manual)
  const fetchProduct = async (code: string) => {
    const cleanCode = code.trim().replace(/[^0-9]/g, '');
    if (!cleanCode) {
      setError('กรุณากรอกตัวเลขบาร์โค้ด (เฉพาะตัวเลข 8-13 หลัก)');
      return;
    }

    setLoading(true);
    setError(null);
    setAiError(null);
    setScannedProduct(null);
    setNotFoundBarcode(null);

    // 1. Check user's local Dexie database foodCatalog
    try {
      const localMatches = await db.foodCatalog
        .filter((f) => f.barcode === cleanCode)
        .toArray();
      if (localMatches.length > 0) {
        const item = localMatches[0];
        const serving = item.defaultServingGrams || 100;
        const ratio = serving / 100;
        setScannedProduct({
          name: item.name,
          brand: item.sourceLabel || 'บันทึกส่วนตัว',
          servingGrams: serving,
          calories: Math.round((item.caloriesPer100g || 0) * ratio),
          protein: Math.round((item.proteinPer100g || 0) * ratio * 10) / 10,
          carbs: Math.round((item.carbsPer100g || 0) * ratio * 10) / 10,
          fat: Math.round((item.fatPer100g || 0) * ratio * 10) / 10,
          sodiumMg: item.sodiumMgPer100g
            ? Math.round(item.sodiumMgPer100g * ratio)
            : undefined,
          sugarG: item.sugarGPer100g
            ? Math.round(item.sugarGPer100g * ratio * 10) / 10
            : undefined,
          barcode: cleanCode,
          sourceLabel: 'ฐานข้อมูลอาหารของคุณ',
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Local food catalog lookup error:', err);
    }

    // 2. Check built-in verified Thai retail products
    if (VERIFIED_THAI_BARCODES[cleanCode]) {
      const p = VERIFIED_THAI_BARCODES[cleanCode];
      setScannedProduct({
        ...p,
        barcode: cleanCode,
        sourceLabel: 'ฐานข้อมูลสินค้าไทย 7-Eleven / ซูเปอร์มาร์เก็ต',
      });
      setLoading(false);
      return;
    }

    // 3. Query OpenFoodFacts API (World and Thai endpoints)
    try {
      const endpoints = [
        `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
        `https://th.openfoodfacts.org/api/v0/product/${cleanCode}.json`,
      ];

      let foundProduct: any = null;
      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Nubcal-Nutrition-App/1.0' },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 1 && data.product) {
              foundProduct = data.product;
              break;
            }
          }
        } catch {
          // Continue to next endpoint
        }
      }

      if (foundProduct) {
        const p = foundProduct;
        const nutriments = p.nutriments || {};

        let servingGrams = 100;
        if (typeof p.serving_quantity === 'number' && p.serving_quantity > 0) {
          servingGrams = Math.round(p.serving_quantity);
        } else if (p.serving_size) {
          const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
          if (match) {
            servingGrams = Math.round(parseFloat(match[1]));
          }
        }

        const cal100g =
          nutriments['energy-kcal_100g'] ??
          (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0);
        const pro100g = nutriments.proteins_100g ?? 0;
        const carb100g = nutriments.carbohydrates_100g ?? 0;
        const fat100g = nutriments.fat_100g ?? 0;

        let sodiumMg: number | undefined;
        if (nutriments.sodium_100g !== undefined) {
          const sodiumPer100 = parseFloat(nutriments.sodium_100g) * 1000;
          sodiumMg = Math.round((sodiumPer100 * servingGrams) / 100);
        }

        let sugarG: number | undefined;
        if (nutriments.sugars_100g !== undefined) {
          const sugarPer100 = parseFloat(nutriments.sugars_100g);
          sugarG = Math.round(((sugarPer100 * servingGrams) / 100) * 10) / 10;
        }

        const ratio = servingGrams / 100;
        const productName =
          p.product_name_th ||
          p.product_name ||
          p.product_name_en ||
          `Product #${cleanCode}`;

        setScannedProduct({
          name: productName,
          brand: p.brands || p.brand_owner || 'OpenFoodFacts',
          imageUrl: p.image_front_small_url || p.image_url,
          servingGrams,
          calories: Math.round(cal100g * ratio),
          protein: Math.round(pro100g * ratio * 10) / 10,
          carbs: Math.round(carb100g * ratio * 10) / 10,
          fat: Math.round(fat100g * ratio * 10) / 10,
          sodiumMg,
          sugarG,
          barcode: cleanCode,
          sourceLabel: 'OpenFoodFacts Global Database',
        });
        return;
      }

      // Not found in OpenFoodFacts -> Trigger helpful fallback UI
      setNotFoundBarcode(cleanCode);
    } catch (err) {
      setNotFoundBarcode(cleanCode);
    } finally {
      setLoading(false);
    }
  };

  // AI Gemini Lookup Fallback
  const handleAiLookupFallback = async () => {
    const code = notFoundBarcode || barcodeInput.trim();
    if (!code) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const provider = getFoodAnalysisProvider(
        settings?.aiProviderId || 'gemini-direct',
        settings?.aiBackendEndpoint,
        settings?.geminiApiKey,
        settings?.geminiModel,
        settings?.groqApiKey
      );

      if (!provider.analyzeTextPrompt) {
        throw new Error('AI prompt analysis is not supported.');
      }

      const prompt = `ผู้ใช้สแกนบาร์โค้ดสินค้าในประเทศไทย: "${code}" ${
        aiHint.trim() ? `โดยระบุข้อมูลสินค้าเพิ่มเติมว่า: "${aiHint.trim()}"` : ''
      }.
ให้ระบุหรือประมาณการอาหาร/เครื่องดื่มนี้สำหรับ 1 หน่วยบริโภค พร้อมคำนวณ:
1. น้ำหนักหน่วยบริโภค (serving weight in grams)
2. แคลอรี่ (estimatedCalories)
3. โปรตีน (protein in grams)
4. คาร์โบไฮเดรต (carbohydrates in grams)
5. ไขมัน (fat in grams)
6. โซเดียม (sodiumMg in mg)
7. น้ำตาล (sugarG in grams)`;

      const result = await provider.analyzeTextPrompt(prompt);

      setScannedProduct({
        name: result.mealName,
        brand: 'AI วิเคราะห์โภชนาการ',
        servingGrams: result.estimatedWeightGrams,
        calories: result.estimatedCalories,
        protein: result.protein,
        carbs: result.carbohydrates,
        fat: result.fat,
        sodiumMg: result.sodiumMg,
        sugarG: result.sugarG,
        barcode: code,
        sourceLabel: 'Gemini AI Intelligent Estimation',
      });
      setNotFoundBarcode(null);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถให้ AI วิเคราะห์ได้ กรุณาลองกรอกชื่อสินค้า หรือบันทึกเอง'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Manual fallback: prefill barcode into ConfirmMeal
  const handleManualAddFallback = () => {
    const code = notFoundBarcode || barcodeInput.trim();
    onProductFound({
      foodName: aiHint.trim() || `สินค้าบาร์โค้ด ${code}`,
      ingredients: `Barcode: ${code}`,
      servingGrams: 100,
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      category: selectedCategory,
      source: 'barcode',
      barcode: code,
      requiresExplicitConfirmation: false,
      saveToCatalog: true,
    });
    onClose();
  };

  const handleConfirmProduct = () => {
    if (!scannedProduct) return;

    onProductFound({
      foodName: scannedProduct.brand
        ? `${scannedProduct.brand} - ${scannedProduct.name}`
        : scannedProduct.name,
      ingredients: `Barcode: ${scannedProduct.barcode}`,
      servingGrams: scannedProduct.servingGrams,
      calories: scannedProduct.calories,
      protein: scannedProduct.protein,
      carbohydrates: scannedProduct.carbs,
      fat: scannedProduct.fat,
      sodiumMg: scannedProduct.sodiumMg,
      sugarG: scannedProduct.sugarG,
      category: selectedCategory,
      source: 'barcode',
      barcode: scannedProduct.barcode,
      requiresExplicitConfirmation: false,
      saveToCatalog: true,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#17213D]/50 backdrop-blur-xs">
      {/* Hidden container for temp file scanning */}
      <div id="nubcal-temp-file-scanner" className="hidden" />

      <div className="bg-white w-full max-w-lg rounded-[28px] border border-[#E9EAF2] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E9EAF2] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEDFF] text-[#6258F5] flex items-center justify-center shadow-xs">
              <ScanBarcode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20243A]">สแกนบาร์โค้ดอาหาร (Barcode)</h3>
              <p className="text-xs text-[#858BA0]">กล้องสแกนสด, อัปโหลดภาพ หรือกรอกตัวเลข</p>
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Camera Scanner View */}
          {cameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[260px] border border-[#6258F5]/30 shadow-inner">
              {/* html5-qrcode target container */}
              <div id="nubcal-barcode-reader" className="w-full h-full min-h-[260px]" />

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-[#27AE82] animate-pulse"></span>
                <span>กล้องกำลังตรวจจับบาร์โค้ด...</span>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-semibold bg-white text-[#20243A] rounded-full shadow-lg hover:bg-[#F6F7FB] transition-all"
              >
                ปิดกล้อง
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Open Camera button */}
              <button
                type="button"
                onClick={startCamera}
                className="py-3 px-3 rounded-2xl border-2 border-dashed border-[#6258F5]/30 hover:border-[#6258F5] bg-[#EFEDFF]/40 hover:bg-[#EFEDFF]/80 text-[#6258F5] flex items-center justify-center gap-2 text-xs font-bold transition-all group"
              >
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>เปิดกล้องสแกน (Live Camera)</span>
              </button>

              {/* Upload image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-2xl border-2 border-dashed border-[#E9EAF2] hover:border-[#756BFF] bg-[#F6F7FB] hover:bg-[#F0F4FF] text-[#20243A] flex items-center justify-center gap-2 text-xs font-bold transition-all group"
              >
                <Upload className="w-4 h-4 text-[#756BFF] group-hover:scale-110 transition-transform" />
                <span>เลือกภาพบาร์โค้ดจากเครื่อง</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadBarcodeImage}
                className="hidden"
              />
            </div>
          )}

          {/* Barcode Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchProduct(barcodeInput);
            }}
            className="flex flex-col gap-1.5"
          >
            <label className="text-xs font-semibold text-[#20243A]">
              หรือกรอกตัวเลขบาร์โค้ด (EAN-13 / 885...):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#858BA0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="เช่น 8850653799682"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F6F7FB] border border-[#E9EAF2] rounded-xl text-[#20243A] font-mono focus:outline-none focus:border-[#6258F5] focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6258F5] hover:bg-[#756BFF] disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-[#6258F5]/25 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>ค้นหา</span>}
              </button>
            </div>
          </form>

          {/* Quick Demo Samples */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#858BA0]">
              ตัวอย่างสินค้าไทยคลิกทดสอบได้ทันที:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_BARCODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(item.code);
                    fetchProduct(item.code);
                  }}
                  className="text-[11px] font-medium px-2.5 py-1 bg-[#F0F4FF] hover:bg-[#EFEDFF] text-[#20243A] rounded-lg border border-[#E9EAF2] transition-colors flex items-center gap-1"
                >
                  <Package className="w-3 h-3 text-[#6258F5]" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#FFF0F2] border border-[#EB6478]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#EB6478]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Not Found in Database Fallback Card */}
          {notFoundBarcode && !scannedProduct && (
            <div className="p-4 bg-[#FEF7E8] border border-[#F2B544]/40 rounded-2xl flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-[#D9961A] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-[#20243A]">
                    ยังไม่มีข้อมูลบาร์โค้ด {notFoundBarcode} ในฐานข้อมูลสาธารณะ
                  </h4>
                  <p className="text-[11px] text-[#858BA0] mt-0.5">
                    คุณสามารถให้ AI ช่วยค้นหา หรือกรอกข้อมูลครั้งเดียวเพื่อบันทึกจำไว้ใช้งานถาวรได้ครับ
                  </p>
                </div>
              </div>

              {/* Optional hint input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#20243A]">
                  ชื่อสินค้า (ไม่บังคับ แต่ช่วยให้ AI แม่นยำขึ้น):
                </label>
                <input
                  type="text"
                  value={aiHint}
                  onChange={(e) => setAiHint(e.target.value)}
                  placeholder="เช่น ชาเขียวอิชิตัน, ขนมปังโฮลวีท..."
                  className="px-3 py-1.5 text-xs bg-white border border-[#E9EAF2] rounded-xl text-[#20243A] focus:outline-none focus:border-[#6258F5]"
                />
              </div>

              {aiError && (
                <div className="text-[11px] text-[#EB6478] bg-white p-2 rounded-lg border border-[#EB6478]/30">
                  {aiError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAiLookupFallback}
                  disabled={aiLoading}
                  className="flex-1 py-2 px-3 bg-[#6258F5] hover:bg-[#756BFF] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>AI กำลังค้นหา...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ให้ AI ค้นหา & ประเมินให้</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleManualAddFallback}
                  className="flex-1 py-2 px-3 bg-white hover:bg-[#F6F7FB] border border-[#E9EAF2] text-[#20243A] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#6258F5]" />
                  <span>บันทึกข้อมูลเมนูนี้เอง</span>
                </button>
              </div>
            </div>
          )}

          {/* Scanned Product Result Card */}
          {scannedProduct && (
            <div className="p-4 bg-[#F0F4FF]/70 border border-[#6258F5]/30 rounded-2xl flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-[#E9EAF2] shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white border border-[#E9EAF2] flex items-center justify-center text-[#6258F5] shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[#6258F5] uppercase tracking-wider">
                      {scannedProduct.brand || 'Verified Product'}
                    </span>
                    {scannedProduct.sourceLabel && (
                      <span className="text-[9px] bg-white text-[#858BA0] px-1.5 py-0.5 rounded border border-[#E9EAF2]">
                        {scannedProduct.sourceLabel}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[#20243A] truncate mt-0.5">
                    {scannedProduct.name}
                  </h4>
                  <span className="text-xs text-[#858BA0]">
                    ขนาดบริโภค: {scannedProduct.servingGrams} กรัม / มล.
                  </span>
                </div>
              </div>

              {/* Macro Pills */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">แคลอรี่</span>
                  <span className="text-xs font-bold text-[#6258F5]">
                    {scannedProduct.calories} kcal
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">โปรตีน</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.protein}g</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">คาร์บ</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.carbs}g</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">ไขมัน</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.fat}g</span>
                </div>
              </div>

              {/* Sodium & Sugar */}
              <div className="flex items-center justify-between text-xs text-[#858BA0] px-1">
                <span>
                  🧂 โซเดียม:{' '}
                  <strong className="text-[#20243A]">{scannedProduct.sodiumMg ?? 0} mg</strong>
                </span>
                <span>
                  🍬 น้ำตาล:{' '}
                  <strong className="text-[#20243A]">{scannedProduct.sugarG ?? 0} g</strong>
                </span>
              </div>

              {/* Category Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-[#6258F5]/15">
                <span className="text-xs font-semibold text-[#20243A]">มื้ออาหาร:</span>
                <div className="flex gap-1">
                  {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-medium capitalize transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#6258F5] text-white'
                          : 'bg-white text-[#858BA0] border border-[#E9EAF2]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={handleConfirmProduct}
                className="w-full py-2.5 bg-[#6258F5] hover:bg-[#756BFF] text-white rounded-xl text-xs font-bold shadow-md shadow-[#6258F5]/25 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกเมนูนี้ ({scannedProduct.calories} kcal)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
