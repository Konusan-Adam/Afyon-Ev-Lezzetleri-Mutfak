import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle2, ArrowDown } from 'lucide-react';
import { HukukiSozlesme } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/tipler';

interface MutfakSozlesmeOkumaModaliProps {
  sozlesme: HukukiSozlesme | null;
  kapat: () => void;
  onaylaVeKapat?: () => void;
}

export const MutfakSozlesmeOkumaModali: React.FC<MutfakSozlesmeOkumaModaliProps> = ({
  sozlesme,
  kapat,
  onaylaVeKapat,
}) => {
  const metinKutusuRef = useRef<HTMLDivElement | null>(null);
  const [sonunaKadarOkundu, setSonunaKadarOkundu] = useState(false);

  useEffect(() => {
    if (!sozlesme) {
      setSonunaKadarOkundu(false);
      return;
    }
    setSonunaKadarOkundu(false);
    const zamanlayici = window.setTimeout(() => {
      const kutu = metinKutusuRef.current;
      if (!kutu) return;
      if (kutu.scrollHeight <= kutu.clientHeight + 16) {
        setSonunaKadarOkundu(true);
      }
    }, 60);

    return () => window.clearTimeout(zamanlayici);
  }, [sozlesme]);

  if (!sozlesme || typeof document === 'undefined') return null;

  const kaydirmaKontrolEt = () => {
    const kutu = metinKutusuRef.current;
    if (!kutu) return;
    if (kutu.scrollTop + kutu.clientHeight >= kutu.scrollHeight - 20) {
      setSonunaKadarOkundu(true);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#16071D] border border-purple-700/80 rounded-3xl p-5 sm:p-6 text-gray-200 shadow-2xl shadow-purple-950/80 flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-snug">
                {sozlesme.baslik}
              </h3>
              <p className="text-[11px] text-purple-300 mt-0.5">
                Sürüm: {sozlesme.versiyon} • Güncelleme: {sozlesme.guncellenmeTarihi}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Sözleşmeyi Kapat"
            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={metinKutusuRef}
          onScroll={kaydirmaKontrolEt}
          className="my-4 p-4 rounded-2xl bg-[#100415] border border-purple-900/50 overflow-y-auto flex-1 text-xs text-gray-200 leading-relaxed whitespace-pre-line"
        >
          {sozlesme.icerik}
        </div>

        {!sonunaKadarOkundu && onaylaVeKapat && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center justify-center gap-1.5">
            <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
            <span>Onaylamak için sözleşme metnini sonuna kadar okuyup aşağı kaydırın.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={kapat}
            className="px-4 py-2.5 rounded-xl bg-[#100415] border border-purple-900/60 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            Kapat
          </button>
          {onaylaVeKapat && (
            <button
              type="button"
              disabled={!sonunaKadarOkundu}
              onClick={onaylaVeKapat}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                sonunaKadarOkundu
                  ? 'bg-amber-500 hover:bg-amber-400 text-purple-950 cursor-pointer shadow-lg shadow-amber-500/20'
                  : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Okudum, Onaylıyorum</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
