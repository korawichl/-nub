import React, { useState, useEffect, useRef } from 'react';
import type { ConfirmMealDraft, MealCategory } from '../types';
import {
  ScanBarcode,
  Camera,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (draft: ConfirmMealDraft) => void;
  defaultCategory?: MealCategory;
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
}

// Popular sample barcodes for rapid testing without physical packaging
const SAMPLE_BARCODES = [
  { name: 'Dutch Mill Selected Milk', code: '8850188800018', category: 'Dairy' },
  { name: 'Mama Tom Yum Shrimp', code: '8850987101058', category: 'Noodles' },
  { name: 'Lactasoy Plain Soy Milk', code: '8850228000156', category: 'Drink' },
  { name: 'Ovaltine Malt UHT', code: '8850029011122', category: 'Drink' },
  { name: 'Singha Drinking Water', code: '8850999001001', category: 'Water' },
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
  defaultCategory = 'lunch',
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ProductNutrition | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>(defaultCategory);

  // Camera video stream state
  const [cameraActive, setCameraActive] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setHasBarcodeDetector(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedProduct(null);
      setError(null);
      setBarcodeInput('');
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start detecting barcodes if BarcodeDetector is supported
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedCode = barcodes[0].rawValue;
                stopCamera();
                setBarcodeInput(detectedCode);
                fetchProduct(detectedCode);
              }
            } catch {
              // Ignore single-frame detection errors
            }
          }
        }, 500);
      }
    } catch (err) {
      setError(
        'Unable to access camera. Please allow camera permissions or enter the barcode numbers manually.'
      );
      stopCamera();
    }
  };

  const fetchProduct = async (code: string) => {
    const cleanCode = code.trim().replace(/[^0-9]/g, '');
    if (!cleanCode) {
      setError('Please enter valid barcode digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setScannedProduct(null);

    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Nubcal-Nutrition-App/1.0' } });
      
      if (!res.ok) {
        throw new Error(`OpenFoodFacts responded with status ${res.status}`);
      }

      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        throw new Error('Product not found in OpenFoodFacts database. You can add it manually!');
      }

      const p = data.product;
      const nutriments = p.nutriments || {};

      // Calculate serving size
      let servingGrams = 100;
      if (typeof p.serving_quantity === 'number' && p.serving_quantity > 0) {
        servingGrams = Math.round(p.serving_quantity);
      } else if (p.serving_size) {
        const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
        if (match) {
          servingGrams = Math.round(parseFloat(match[1]));
        }
      }

      // Read per 100g or per serving
      const cal100g = nutriments['energy-kcal_100g'] ?? (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0);
      const pro100g = nutriments.proteins_100g ?? 0;
      const carb100g = nutriments.carbohydrates_100g ?? 0;
      const fat100g = nutriments.fat_100g ?? 0;

      // Sodium in mg (OpenFoodFacts stores sodium in grams or sodium_100g in grams)
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
      const calories = Math.round(cal100g * ratio);
      const protein = Math.round(pro100g * ratio * 10) / 10;
      const carbs = Math.round(carb100g * ratio * 10) / 10;
      const fat = Math.round(fat100g * ratio * 10) / 10;

      const productName =
        p.product_name_th ||
        p.product_name ||
        p.product_name_en ||
        `Product #${cleanCode}`;

      const brand = p.brands || p.brand_owner;

      setScannedProduct({
        name: productName,
        brand,
        imageUrl: p.image_front_small_url || p.image_url,
        servingGrams,
        calories,
        protein,
        carbs,
        fat,
        sodiumMg,
        sugarG,
        barcode: cleanCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve barcode information.');
    } finally {
      setLoading(false);
    }
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
      requiresExplicitConfirmation: false,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17213D]/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-[28px] border border-[#E9EAF2] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E9EAF2]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEDFF] text-[#6258F5] flex items-center justify-center">
              <ScanBarcode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20243A]">Barcode Nutrition Lookup</h3>
              <p className="text-xs text-[#858BA0]">Scan or enter barcode for instant macro data</p>
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
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* Camera Scanner View */}
          {cameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay target reticle */}
              <div className="absolute inset-0 border-2 border-[#6258F5]/60 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-white text-xs bg-black/60 px-3 py-1 rounded-full">
                  Align Barcode Inside Box
                </span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute bottom-3 right-3 px-3 py-1 text-xs font-semibold bg-white/90 text-[#20243A] rounded-full shadow-md hover:bg-white"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#6258F5]/30 hover:border-[#6258F5] bg-[#EFEDFF]/40 hover:bg-[#EFEDFF]/80 text-[#6258F5] flex items-center justify-center gap-2 text-sm font-semibold transition-all group"
            >
              <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Open Camera Scanner {hasBarcodeDetector ? '(Live Auto-detect)' : ''}</span>
            </button>
          )}

          {/* Barcode Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchProduct(barcodeInput);
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-semibold text-[#20243A]">
              Or enter barcode digits (EAN-13 / UPC):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#858BA0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. 8850188800018"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F6F7FB] border border-[#E9EAF2] rounded-xl text-[#20243A] font-mono focus:outline-none focus:border-[#6258F5] focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6258F5] hover:bg-[#756BFF] disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-[#6258F5]/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
              </button>
            </div>
          </form>

          {/* Sample Thai Products quick buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#858BA0]">
              Quick Demo Samples (Click to test):
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

          {/* Scanned Product Result Card */}
          {scannedProduct && (
            <div className="p-4 bg-[#F0F4FF]/70 border border-[#6258F5]/30 rounded-2xl flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-[#E9EAF2]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white border border-[#E9EAF2] flex items-center justify-center text-[#6258F5]">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#6258F5] uppercase tracking-wider block">
                    {scannedProduct.brand || 'Verified Product'}
                  </span>
                  <h4 className="text-sm font-bold text-[#20243A] truncate">
                    {scannedProduct.name}
                  </h4>
                  <span className="text-xs text-[#858BA0]">
                    Portion: {scannedProduct.servingGrams}g / ml
                  </span>
                </div>
              </div>

              {/* Macro Pills */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">Calories</span>
                  <span className="text-xs font-bold text-[#6258F5]">
                    {scannedProduct.calories} kcal
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">Protein</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.protein}g</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">Carbs</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.carbs}g</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#E9EAF2]">
                  <span className="text-[10px] text-[#858BA0] block">Fat</span>
                  <span className="text-xs font-bold text-[#20243A]">{scannedProduct.fat}g</span>
                </div>
              </div>

              {/* Sodium & Sugar */}
              <div className="flex items-center justify-between text-xs text-[#858BA0] px-1">
                <span>
                  🧂 Sodium: <strong className="text-[#20243A]">{scannedProduct.sodiumMg ?? 0} mg</strong>
                </span>
                <span>
                  🍬 Sugar: <strong className="text-[#20243A]">{scannedProduct.sugarG ?? 0} g</strong>
                </span>
              </div>

              {/* Category Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-[#6258F5]/15">
                <span className="text-xs font-semibold text-[#20243A]">Meal Time:</span>
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
                <span>Log This Item ({scannedProduct.calories} kcal)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
