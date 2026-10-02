import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string>('');
  const [hasDetector, setHasDetector] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const scanningRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if BarcodeDetector is available in window
    if ('BarcodeDetector' in window) {
      setHasDetector(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      scanningRef.current = true;
      runDetectionLoop();
    } catch {
      setError('تعذر تشغيل الكاميرا. يرجى التأكد من إعطاء صلاحية الكاميرا أو استخدام قارئ الباركود اليدوي.');
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const runDetectionLoop = async () => {
    if (!scanningRef.current) return;

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as unknown as {
          BarcodeDetector: new (opts?: { formats: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        }).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });

        const scan = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const code = barcodes[0].rawValue;
                soundManager.playScanBeep();
                onDetected(code);
                onClose();
                return;
              }
            } catch {
              // detection frame error
            }
          }
          requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
        return;
      } catch {
        // fallback
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      soundManager.playScanBeep();
      onDetected(manualCode.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-sm">ماسح الباركود بالكاميرا</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">ملاحظة الكاميرا:</p>
                <p className="text-xs mt-1">{error}</p>
                <p className="text-xs mt-2 text-slate-600">
                  يمكنك استخدام قارئ الباركود اليدوي المتصل بالكمبيوتر مباشرة في أي وقت بدون كاميرا!
                </p>
              </div>
            </div>
          ) : (
            <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Aim guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-emerald-400/80 rounded-lg relative">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
                  <div className="absolute bottom-1 right-2 text-[10px] text-white/90 bg-black/50 px-1 rounded">
                    وجه الباركود هنا
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick manual entry for barcode */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              أو كتابة رقم الباركود يدوياً:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="أدخل أرقام الباركود..."
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-sm"
              >
                تأكيد
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
