import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Check,
  Music,
  Play,
  Square,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  HAZIR_ZIL_SESLERI,
  OzelZilDosyasi,
  ZilSesKimligi,
  ozelZilDosyasiniGetir,
  ozelZilDosyasiniSil,
  ozelZilDosyasiKaydet,
  seciliZilKimliginiGetir,
  seciliZilKimliginiKaydet,
  zilSesSeviyesiniGetir,
  zilSesSeviyesiniKaydet,
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilMelodileri';
import {
  melodiOnizle,
  mutfakZiliDurdur,
  sesSisteminiKilidiniAc,
  zilCalinmaDurumunuDinle,
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';

interface MutfakZilSeciciPenceresiProps {
  acik: boolean;
  kapat: () => void;
}

export const MutfakZilSeciciPenceresi: React.FC<MutfakZilSeciciPenceresiProps> = ({
  acik,
  kapat,
}) => {
  const dosyaSeciciRef = useRef<HTMLInputElement | null>(null);
  const [seciliKimlik, setSeciliKimlik] = useState<ZilSesKimligi>(() =>
    seciliZilKimliginiGetir()
  );
  const [ozelDosya, setOzelDosya] = useState<OzelZilDosyasi | null>(() =>
    ozelZilDosyasiniGetir()
  );
  const [sesSeviyesi, setSesSeviyesi] = useState<number>(() =>
    zilSesSeviyesiniGetir()
  );
  const [onizlenenKimlik, setOnizlenenKimlik] = useState<ZilSesKimligi | null>(null);
  const [kesintisizTestAcik, setKesintisizTestAcik] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  useEffect(() => {
    if (!acik) {
      mutfakZiliDurdur();
      setOnizlenenKimlik(null);
      setKesintisizTestAcik(false);
      return;
    }
    setSeciliKimlik(seciliZilKimliginiGetir());
    setOzelDosya(ozelZilDosyasiniGetir());
    setSesSeviyesi(zilSesSeviyesiniGetir());
    setHataMesaji(null);

    const abonelik = zilCalinmaDurumunuDinle((caliyor) => {
      if (!caliyor) {
        setOnizlenenKimlik(null);
        setKesintisizTestAcik(false);
      }
    });
    return () => abonelik();
  }, [acik]);

  if (!acik || typeof document === 'undefined') return null;

  const handleMelodiSec = (kimlik: ZilSesKimligi) => {
    setSeciliKimlik(kimlik);
    seciliZilKimliginiKaydet(kimlik);
  };

  const handleDinle = async (kimlik: ZilSesKimligi) => {
    setHataMesaji(null);
    if (onizlenenKimlik === kimlik) {
      mutfakZiliDurdur();
      setOnizlenenKimlik(null);
      setKesintisizTestAcik(false);
      return;
    }

    await sesSisteminiKilidiniAc();
    setOnizlenenKimlik(kimlik);
    setKesintisizTestAcik(false);
    await melodiOnizle(kimlik, { kesintisiz: false });
  };

  const handleKesintisizTest = async () => {
    setHataMesaji(null);
    if (kesintisizTestAcik) {
      mutfakZiliDurdur();
      setKesintisizTestAcik(false);
      setOnizlenenKimlik(null);
      return;
    }

    await sesSisteminiKilidiniAc();
    setOnizlenenKimlik(seciliKimlik);
    setKesintisizTestAcik(true);
    await melodiOnizle(seciliKimlik, { kesintisiz: true });
  };

  const handleDosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setHataMesaji(null);
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;

    const sonuc = await ozelZilDosyasiKaydet(dosya);
    if (!sonuc.basarili || !sonuc.dosyaBilgisi) {
      setHataMesaji(sonuc.hataMesaji || 'Ses dosyası eklenemedi.');
      return;
    }

    setOzelDosya(sonuc.dosyaBilgisi);
    setSeciliKimlik('ozel_dosya');
    await sesSisteminiKilidiniAc();
    setOnizlenenKimlik('ozel_dosya');
    await melodiOnizle('ozel_dosya', { kesintisiz: false });
  };

  const handleOzelDosyaSil = () => {
    mutfakZiliDurdur();
    ozelZilDosyasiniSil();
    setOzelDosya(null);
    setSeciliKimlik('enerjik_siparis');
    setOnizlenenKimlik(null);
    setKesintisizTestAcik(false);
  };

  const handleSesSeviyesiDegistir = (yeni: number) => {
    setSesSeviyesi(yeni);
    zilSesSeviyesiniKaydet(yeni);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#16071D] border border-purple-700/80 rounded-3xl p-5 sm:p-6 text-gray-200 shadow-2xl shadow-purple-950/80 flex flex-col max-h-[88vh]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Sipariş Zili & Sistem Sesleri
              </h3>
              <p className="text-[11px] text-purple-300 mt-0.5">
                Yeni sipariş onaylanana kadar kesintisiz çalacak sesi dinleyip seçin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-3 overflow-y-auto pr-1 flex-1">
          {hataMesaji && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium">
              {hataMesaji}
            </div>
          )}

          {/* Hazır Heyecan Verici Sipariş Sesleri */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              Hazır Sipariş Zil Sesleri
            </p>
            {HAZIR_ZIL_SESLERI.map((ses) => {
              const seciliMi = seciliKimlik === ses.kimlik;
              const caliniyorMu = onizlenenKimlik === ses.kimlik;
              return (
                <div
                  key={ses.kimlik}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    seciliMi
                      ? 'bg-purple-950/70 border-amber-400/70 shadow-md shadow-amber-500/10'
                      : 'bg-[#110417] border-purple-900/50 hover:border-purple-700/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleMelodiSec(ses.kimlik)}
                    className="flex-1 text-left cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {ses.baslik}
                      </span>
                      {seciliMi && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-purple-950 text-[10px] font-extrabold shrink-0">
                          <Check className="w-3 h-3" />
                          Seçili
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                      {ses.aciklama}
                    </p>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDinle(ses.kimlik)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        caliniyorMu
                          ? 'bg-amber-500 text-purple-950'
                          : 'bg-purple-900/60 hover:bg-purple-800/80 text-purple-100 border border-purple-700/50'
                      }`}
                    >
                      {caliniyorMu ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Dur</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Dinle</span>
                        </>
                      )}
                    </button>
                    {!seciliMi && (
                      <button
                        type="button"
                        onClick={() => handleMelodiSec(ses.kimlik)}
                        className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold cursor-pointer"
                      >
                        Seç
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cihazdan / Sistemden Özel Ses Ekleme */}
          <div className="p-3.5 rounded-2xl bg-[#110417] border border-purple-800/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-white">
                  Cihazdan / Sistemden Ses Ekle
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Telefon veya bilgisayarınızdaki .mp3, .wav, .ogg ses dosyasını seçin (maks. 2.5 MB).
                </p>
              </div>
              <input
                ref={dosyaSeciciRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a"
                onChange={handleDosyaSecildi}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => dosyaSeciciRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-[#6D237A] hover:bg-[#852C94] text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>Ses Ekle</span>
              </button>
            </div>

            {ozelDosya && (
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                  seciliKimlik === 'ozel_dosya'
                    ? 'bg-purple-950/70 border-amber-400/70'
                    : 'bg-[#16071D] border-purple-900/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-300 truncate">
                      {ozelDosya.ad}
                    </span>
                    {seciliKimlik === 'ozel_dosya' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-purple-950 text-[10px] font-extrabold shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {(ozelDosya.boyutBayt / 1024).toFixed(0)} KB • Özel ses dosyası
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDinle('ozel_dosya')}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {onizlenenKimlik === 'ozel_dosya' ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>{onizlenenKimlik === 'ozel_dosya' ? 'Dur' : 'Dinle'}</span>
                  </button>
                  {seciliKimlik !== 'ozel_dosya' && (
                    <button
                      type="button"
                      onClick={() => handleMelodiSec('ozel_dosya')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-bold cursor-pointer"
                    >
                      Seç
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOzelDosyaSil}
                    aria-label="Özel sesi sil"
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ses Seviyesi */}
          <div className="p-3.5 rounded-2xl bg-[#110417] border border-purple-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-purple-200">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Zil Ses Seviyesi</span>
              </span>
              <span className="text-amber-300 font-bold">
                %{Math.round(sesSeviyesi * 100)}
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={Math.round(sesSeviyesi * 100)}
              onChange={(e) => handleSesSeviyesiDegistir(Number(e.target.value) / 100)}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-purple-900/50">
          <button
            type="button"
            onClick={handleKesintisizTest}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              kesintisizTestAcik
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-purple-900/70 hover:bg-purple-800 text-amber-300 border border-amber-400/40'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {kesintisizTestAcik
                ? 'Kesintisiz Testi Sustur'
                : 'Kesintisiz Çalmayı Test Et'}
            </span>
          </button>

          <button
            type="button"
            onClick={kapat}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 text-xs font-extrabold cursor-pointer"
          >
            Tamam, Kaydet
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
