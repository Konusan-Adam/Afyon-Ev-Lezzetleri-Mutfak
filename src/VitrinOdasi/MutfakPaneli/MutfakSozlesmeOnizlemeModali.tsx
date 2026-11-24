import React from 'react';
import {
  X,
  Download,
  FileCode2,
  Printer,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { HukukiOnayLogu, HukukiSozlesme } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/tipler';
import {
  MutfakKimlikOzeti,
  damgaDurumuEtiketi,
  sozlesmeBelgesiHtmlIndir,
  sozlesmeBelgesiYazdir,
  tsaTokenDosyasiIndir,
} from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/mutfakSozlesmeIndirmeServisi';

interface MutfakSozlesmeOnizlemeModaliProps {
  sozlesme: HukukiSozlesme;
  onayLogu: HukukiOnayLogu | null;
  mutfakBilgisi: MutfakKimlikOzeti;
  damgalaniyor?: boolean;
  onSimdiOnayla?: () => void;
  onKapat: () => void;
}

export const MutfakSozlesmeOnizlemeModali: React.FC<MutfakSozlesmeOnizlemeModaliProps> = ({
  sozlesme,
  onayLogu,
  mutfakBilgisi,
  damgalaniyor = false,
  onSimdiOnayla,
  onKapat,
}) => {
  const damgaEtiketi = onayLogu ? damgaDurumuEtiketi(onayLogu.damgaDurumu) : null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#180A1F] border border-purple-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Başlık */}
        <div className="px-4 py-3.5 border-b border-purple-900/60 flex items-start justify-between gap-3 bg-[#1F0E29]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                v{onayLogu?.sozlesmeVersiyonu || sozlesme.versiyon}
              </span>
              {damgaEtiketi ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${damgaEtiketi.renkSinifi}`}>
                  {damgaEtiketi.metin}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-amber-500/10 text-amber-300 border-amber-500/30">
                  Zaman Damgası Bekliyor
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white mt-1 leading-snug">
              {sozlesme.baslik}
            </h3>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-gray-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-4 overflow-y-auto space-y-4">
          {onayLogu ? (
            <div className="rounded-xl bg-[#120618] border border-emerald-500/30 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zaman Damgası ve Hukuki Kanıt Özeti</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400">Onay Tarihi (TR): </span>
                  <span className="text-white font-semibold">{onayLogu.tarihSaat}</span>
                </div>
                <div>
                  <span className="text-gray-400">Sunucu UTC: </span>
                  <span className="text-purple-200 font-mono">{onayLogu.sunucuUtc || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">IP Adresi: </span>
                  <span className="text-purple-200 font-mono">{onayLogu.ipAdresi}</span>
                </div>
                <div>
                  <span className="text-gray-400">TSA Sağlayıcı: </span>
                  <span className="text-white font-semibold">{onayLogu.tsaSaglayici || '-'}</span>
                </div>
              </div>
              {onayLogu.ozetHash && (
                <div className="text-[11px] pt-1 border-t border-purple-900/50">
                  <span className="text-gray-400 block">SHA-256 İşlem Özeti:</span>
                  <span className="text-emerald-200 font-mono break-all">{onayLogu.ozetHash}</span>
                </div>
              )}
              {onayLogu.sozlesmeMetinHash && (
                <div className="text-[11px]">
                  <span className="text-gray-400 block">SHA-256 Sözleşme Metni Özeti:</span>
                  <span className="text-purple-200 font-mono break-all">{onayLogu.sozlesmeMetinHash}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5 text-xs text-amber-200">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                <p>
                  Bu sözleşme için hesabınızda henüz RFC 3161 zaman damgalı onay kaydı bulunmuyor. İsterseniz şimdi zaman damgası oluşturarak resmileştirebilirsiniz.
                </p>
              </div>
              {onSimdiOnayla && (
                <button
                  type="button"
                  onClick={onSimdiOnayla}
                  disabled={damgalaniyor}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  {damgalaniyor ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Zaman Damgasıyla Onayla</span>
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl bg-[#110617] border border-purple-900/50 p-4 text-xs sm:text-[13px] text-gray-200 whitespace-pre-wrap leading-relaxed">
            {sozlesme.icerik}
          </div>
        </div>

        {/* Alt İndirme Butonları */}
        <div className="px-4 py-3 border-t border-purple-900/60 bg-[#1F0E29] flex items-center justify-end gap-2 flex-wrap">
          {onayLogu?.tsaTokenBase64 && (
            <button
              type="button"
              onClick={() => tsaTokenDosyasiIndir(onayLogu)}
              className="px-3 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 border border-purple-600/50 text-purple-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-300" />
              <span>.tsr Damga Dosyası</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => sozlesmeBelgesiYazdir(sozlesme, onayLogu, mutfakBilgisi)}
            className="px-3 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-gray-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Yazdır / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => sozlesmeBelgesiHtmlIndir(sozlesme, onayLogu, mutfakBilgisi)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Belgeyi İndir (.html)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
