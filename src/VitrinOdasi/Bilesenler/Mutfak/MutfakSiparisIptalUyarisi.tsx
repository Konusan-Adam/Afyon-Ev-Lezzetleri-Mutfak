import React from 'react';
import { OctagonAlert, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { type IptalSiparisBildirimi } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakBildirimleri';

export interface MutfakSiparisIptalUyarisiProps {
  uyari: IptalSiparisBildirimi | null;
  onKapat: () => void;
  onGecmiseGit?: () => void;
}

export const MutfakSiparisIptalUyarisi: React.FC<MutfakSiparisIptalUyarisiProps> = ({
  uyari,
  onKapat,
  onGecmiseGit,
}) => {
  if (!uyari) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#2A0812] via-[#1D060D] to-[#140409] border-2 border-rose-500 rounded-3xl p-6 text-white shadow-2xl shadow-rose-950/80 space-y-4 animate-scaleUp">
        {/* Başlık ve İkon */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950 animate-pulse">
            <OctagonAlert className="w-8 h-8 text-rose-400" />
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black tracking-wider uppercase">
                ACİL UYARI
              </span>
              <span className="text-xs bg-black/50 text-rose-200 px-2 py-0.5 rounded-lg font-mono font-bold border border-rose-900/60">
                #{uyari.siparisKodu}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-rose-100 leading-snug">
              Sipariş Müşteri Tarafından İptal Edildi!
            </h3>
            <p className="text-xs text-rose-300 font-semibold">
              Fırındaki veya ocaktaki hazırlığı lütfen derhal durdurun.
            </p>
          </div>

          <button
            type="button"
            onClick={onKapat}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-200 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detay Bilgi Kartı */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-rose-900/60 space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-300">
            <span>Müşteri:</span>
            <strong className="text-white font-bold">{uyari.musteriAdi}</strong>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Sipariş Tutarı:</span>
            <strong className="text-amber-400 font-bold">{uyari.toplamTutar} ₺</strong>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>İptal Zamanı:</span>
            <strong className="text-rose-300 font-bold">{uyari.zaman}</strong>
          </div>
          {uyari.gerekce && (
            <div className="pt-2 border-t border-rose-950 text-rose-200 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                Gerekçe: <strong>{uyari.gerekce}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Aksiyon Butonları */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {onGecmiseGit && (
            <button
              type="button"
              onClick={() => {
                onKapat();
                onGecmiseGit();
              }}
              className="px-4 py-3 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-200 text-xs font-bold border border-purple-800/60 transition-all cursor-pointer"
            >
              Geçmişte Gör
            </button>
          )}

          <button
            type="button"
            onClick={onKapat}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>ANLADIM, HAZIRLIĞI DURDURDUM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
