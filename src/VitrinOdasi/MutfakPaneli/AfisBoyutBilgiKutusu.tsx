import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Maximize2 } from 'lucide-react';
import {
  AFIS_IDEAL_GENISLIK,
  AFIS_IDEAL_YUKSEKLIK,
  AFIS_MIN_GENISLIK,
  AFIS_MIN_YUKSEKLIK,
  AfisBoyutAnalizi,
} from '@/src/MalzemeCekmeceleri/Mutfak/AfisGorselBoyutAnalizi';

interface AfisBoyutBilgiKutusuProps {
  analiz: AfisBoyutAnalizi | null;
}

export const AfisBoyutBilgiKutusu: React.FC<AfisBoyutBilgiKutusuProps> = ({ analiz }) => {
  return (
    <div className="space-y-2">
      {/* Sabit Ölçü Rehberi */}
      <div className="px-3 py-2 rounded-xl bg-[#120614] border border-purple-900/50 flex items-center justify-between gap-2 flex-wrap text-[11px] text-purple-200">
        <div className="flex items-center gap-1.5 font-semibold">
          <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            İdeal Boyut: <strong className="text-amber-300">{AFIS_IDEAL_GENISLIK} × {AFIS_IDEAL_YUKSEKLIK} px</strong> (Yatay 16:9)
          </span>
        </div>
        <span className="text-[10px] text-gray-400">
          Min: {AFIS_MIN_GENISLIK} × {AFIS_MIN_YUKSEKLIK} px
        </span>
      </div>

      {/* Seçilen Görselin Gerçek Piksel Kontrol Sonucu */}
      {analiz && (
        <div
          className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 animate-fadeIn ${
            analiz.durum === 'ideal'
              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
              : analiz.durum === 'uyari'
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
          }`}
        >
          {analiz.durum === 'ideal' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : analiz.durum === 'uyari' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 leading-relaxed">
            <p className="font-bold">{analiz.baslik}</p>
            <p className="text-[10px] opacity-90 mt-0.5">{analiz.mesaj}</p>
          </div>
        </div>
      )}
    </div>
  );
};
