import React from 'react';
import { DownloadCloud, X, Loader2, AlertCircle } from 'lucide-react';
import { useApkGuncelleme } from '@/src/MalzemeCekmeceleri/Mutfak/useApkGuncelleme';

export const ApkGuncellemeUyarisi: React.FC = () => {
  const {
    guncellemeVar,
    mevcutSurum,
    yeniSurum,
    surumNotu,
    indiriliyor,
    yuzde,
    durumMesaji,
    hata,
    guncellemeyiBaslat,
    kapat,
  } = useApkGuncelleme();

  if (!guncellemeVar) return null;

  return (
    <div className="w-full px-4 pt-3">
      <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-[#2D0E36] via-[#3A1245] to-[#280B30] border border-amber-400/50 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              {indiriliyor ? (
                <Loader2 className="w-5 h-5 text-amber-300 animate-spin" />
              ) : (
                <DownloadCloud className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white">
                  Yeni Mutfak Güncellemesi Hazır!
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                  v{mevcutSurum} → v{yeniSurum}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-1 leading-relaxed">{surumNotu}</p>

              {indiriliyor && (
                <div className="mt-2.5">
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-200"
                      style={{ width: `${Math.max(5, yuzde)}%` }}
                    />
                  </div>
                  {durumMesaji && (
                    <p className="text-[11px] text-amber-300 font-semibold mt-1">{durumMesaji}</p>
                  )}
                </div>
              )}

              {!indiriliyor && durumMesaji && !hata && (
                <p className="text-[11px] text-emerald-300 font-semibold mt-1.5">{durumMesaji}</p>
              )}

              {hata && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{hata}</span>
                </div>
              )}
            </div>
          </div>

          {!indiriliyor && (
            <button
              type="button"
              onClick={kapat}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-purple-300 transition-colors cursor-pointer shrink-0"
              title="Şimdilik Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {!indiriliyor && (
            <button
              type="button"
              onClick={guncellemeyiBaslat}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Şimdi Güncelle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
