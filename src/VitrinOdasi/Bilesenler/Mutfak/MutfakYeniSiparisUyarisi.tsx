import React from 'react';
import { Bell, ArrowRight, X } from 'lucide-react';
import { type YeniSiparisBildirimi } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakBildirimleri';

export interface MutfakYeniSiparisUyarisiProps {
  uyari: YeniSiparisBildirimi | null;
  onKapat: () => void;
  onSipariseGit: () => void;
}

export const MutfakYeniSiparisUyarisi: React.FC<MutfakYeniSiparisUyarisiProps> = ({
  uyari,
  onKapat,
  onSipariseGit,
}) => {
  if (!uyari) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-300 animate-bounce">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/30 backdrop-blur-md flex items-center justify-center text-amber-200">
            <Bell className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wide">YENİ SİPARİŞ GELDİ! 🍲</span>
              <span className="text-xs bg-black/40 px-2 py-0.5 rounded-full font-bold">#{uyari.siparisKodu}</span>
            </div>
            <p className="text-xs text-amber-100 font-medium">
              {uyari.musteriAdi} • <strong className="text-white text-sm">{uyari.toplamTutar} ₺</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onKapat();
              onSipariseGit();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-amber-100 transition-all flex items-center gap-1 shadow-md cursor-pointer"
          >
            <span>Aç</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onKapat}
            className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
