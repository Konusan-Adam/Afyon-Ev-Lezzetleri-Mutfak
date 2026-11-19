import React from 'react';
import { Flame, AlertTriangle, CheckCircle2, RotateCcw, Plus, Minus } from 'lucide-react';
import { Yemek } from '@/src/veritabani/VeriTipleri';
import { gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';
import { yemekStokVeMinSepetAnalizEt } from '@/src/MalzemeCekmeceleri/Mutfak/gunlukStokIslemleri';

export interface StokTaslakDegeri {
  sinirsizMi: boolean;
  gunlukStok: number;
  kalanStok: number;
}

interface GunlukStokSatirKartiProps {
  yemek: Yemek;
  taslak: StokTaslakDegeri;
  minSiparisTutari: number;
  degistiMi: boolean;
  onDegistir: (yeni: StokTaslakDegeri) => void;
}

const VARSAYILAN_LOGO = '/assets/aistudio/image_48081a60_bc73ebae.jpg';

export const GunlukStokSatirKarti: React.FC<GunlukStokSatirKartiProps> = ({
  yemek,
  taslak,
  minSiparisTutari,
  degistiMi,
  onDegistir,
}) => {
  const guvenliGorsel = gorselUrlGuvenliYap(yemek.gorsel_url) || VARSAYILAN_LOGO;
  const birim = yemek.birim || 'Porsiyon';

  const onizlemeYemegi: Yemek = {
    ...yemek,
    sinirsiz_stok: taslak.sinirsizMi,
    gunluk_stok: taslak.sinirsizMi ? undefined : taslak.gunlukStok,
    kalan_stok: taslak.sinirsizMi ? undefined : taslak.kalanStok,
    stokta_var_mi: taslak.sinirsizMi ? true : taslak.kalanStok > 0,
    tukendi_mi: taslak.sinirsizMi ? false : taslak.kalanStok <= 0,
  };

  const analiz = yemekStokVeMinSepetAnalizEt(onizlemeYemegi, minSiparisTutari);

  const kotaModunaGec = () => {
    const baz = Math.max(1, taslak.gunlukStok || 10);
    onDegistir({
      sinirsizMi: false,
      gunlukStok: baz,
      kalanStok: taslak.sinirsizMi ? baz : Math.min(baz, Math.max(0, taslak.kalanStok)),
    });
  };

  const gunlukKotaAyarla = (yeniKota: number) => {
    const guvenliKota = Math.max(1, Math.min(999, Math.floor(yeniKota || 1)));
    const fark = guvenliKota - taslak.gunlukStok;
    const yeniKalan = taslak.sinirsizMi
      ? guvenliKota
      : Math.max(0, Math.min(guvenliKota, taslak.kalanStok + fark));
    onDegistir({
      sinirsizMi: false,
      gunlukStok: guvenliKota,
      kalanStok: yeniKalan,
    });
  };

  const kalanStokAyarla = (yeniKalan: number) => {
    const guvenliKalan = Math.max(0, Math.min(999, Math.floor(yeniKalan || 0)));
    onDegistir({
      sinirsizMi: false,
      gunlukStok: Math.max(taslak.gunlukStok, guvenliKalan, 1),
      kalanStok: guvenliKalan,
    });
  };

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
        degistiMi
          ? 'bg-[#250E2F] border-amber-400/80 shadow-md'
          : 'bg-[#130617] border-purple-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            src={guvenliGorsel}
            alt={yemek.baslik}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.src.endsWith(VARSAYILAN_LOGO)) img.src = VARSAYILAN_LOGO;
            }}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-purple-800/60"
          />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
              {yemek.baslik}
            </h4>
            <p className="text-[11px] text-purple-300">
              <strong className="text-amber-300">{yemek.fiyat} ₺</strong> / {birim} • {yemek.kategori}
            </p>
          </div>
        </div>

        {/* Mod Anahtarı: Sınırsız vs Günlük Kota */}
        <div className="flex items-center gap-1 bg-[#1D0A24] p-1 rounded-xl border border-purple-900/60 shrink-0">
          <button
            type="button"
            onClick={() =>
              onDegistir({
                sinirsizMi: true,
                gunlukStok: taslak.gunlukStok || 10,
                kalanStok: taslak.kalanStok || 10,
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              taslak.sinirsizMi
                ? 'bg-purple-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sınırsız
          </button>
          <button
            type="button"
            onClick={kotaModunaGec}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              !taslak.sinirsizMi
                ? 'bg-amber-500 text-purple-950 font-black shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Günlük Kota
          </button>
        </div>
      </div>

      {!taslak.sinirsizMi && (
        <div className="space-y-2 pt-2 border-t border-purple-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Bugün Toplam Çıkacak */}
            <div className="flex items-center justify-between gap-2 bg-[#1A0820] px-3 py-2 rounded-xl border border-purple-900/50">
              <span className="text-[11px] font-semibold text-purple-200">Günlük Hedef:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => gunlukKotaAyarla(taslak.gunlukStok - 1)}
                  className="w-7 h-7 rounded-lg bg-purple-950 hover:bg-purple-800 text-white flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={taslak.gunlukStok}
                  onChange={(e) => gunlukKotaAyarla(Number(e.target.value))}
                  className="w-14 bg-[#110415] border border-purple-700/70 rounded-lg py-1 text-center text-white font-black text-xs outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => gunlukKotaAyarla(taslak.gunlukStok + 1)}
                  className="w-7 h-7 rounded-lg bg-purple-950 hover:bg-purple-800 text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Kalan Stok (Anlık) */}
            <div className="flex items-center justify-between gap-2 bg-[#1A0820] px-3 py-2 rounded-xl border border-amber-500/30">
              <span className="text-[11px] font-semibold text-amber-300">Kalan {birim}:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => kalanStokAyarla(taslak.kalanStok - 1)}
                  className="w-7 h-7 rounded-lg bg-purple-950 hover:bg-rose-900 text-white flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={taslak.kalanStok}
                  onChange={(e) => kalanStokAyarla(Number(e.target.value))}
                  className="w-14 bg-[#110415] border border-amber-500/60 rounded-lg py-1 text-center text-amber-300 font-black text-xs outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => kalanStokAyarla(taslak.kalanStok + 1)}
                  className="w-7 h-7 rounded-lg bg-purple-950 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onDegistir({
                      sinirsizMi: false,
                      gunlukStok: Math.max(1, taslak.gunlukStok),
                      kalanStok: Math.max(1, taslak.gunlukStok),
                    })
                  }
                  title="Kalan stoğu günlük hedefe eşitle (Yenile)"
                  className="w-7 h-7 rounded-lg bg-emerald-950/70 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-300 flex items-center justify-center cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Canlı Vitrin & Minimum Sepet Analizi */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {analiz.tukendiMi ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 font-bold">
                ⛔ Tükendi — Vitrinde siparişe kapalı
              </span>
            ) : analiz.kritikAzMi ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 text-amber-300 font-black flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Vitrin Rozeti: {analiz.sonKaldiMetni}!</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Vitrinde Yayında ({analiz.kalanStok} {birim})</span>
              </span>
            )}

            {!analiz.tukendiMi && analiz.minSepetAltindaMi && (
              <span className="px-2.5 py-1 rounded-lg bg-orange-950/80 border border-orange-500/60 text-orange-200 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>
                  Kalan toplam {analiz.kalanToplamDeger} ₺ &lt; Min. {analiz.minSepetTutari} ₺ sepet (+{analiz.eksikSepetTutari} ₺ yan ürün gerekir)
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
