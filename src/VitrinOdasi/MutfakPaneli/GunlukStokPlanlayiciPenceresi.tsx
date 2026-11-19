import React, { useState, useMemo, useEffect } from 'react';
import { X, Package, Search, Flame, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Yemek } from '@/src/veritabani/VeriTipleri';
import {
  yemekGunlukStokKaydet,
  yemekStokVeMinSepetAnalizEt,
} from '@/src/MalzemeCekmeceleri/Mutfak/gunlukStokIslemleri';
import { GunlukStokSatirKarti, StokTaslakDegeri } from './GunlukStokSatirKarti';

interface GunlukStokPlanlayiciPenceresiProps {
  yemekler: Yemek[];
  mutfakAdi: string;
  minSiparisTutari: number;
  onKapat: () => void;
}

type StokFiltre = 'tumu' | 'sinirli' | 'kritik' | 'tukendi';

function baslangicTaslagiOlustur(yemek: Yemek): StokTaslakDegeri {
  const sinirliMi =
    yemek.sinirsiz_stok !== true &&
    (typeof yemek.gunluk_stok === 'number' || typeof yemek.kalan_stok === 'number');

  if (!sinirliMi) {
    return { sinirsizMi: true, gunlukStok: 10, kalanStok: 10 };
  }

  const gunlukStok = Math.max(1, Number(yemek.gunluk_stok ?? yemek.kalan_stok ?? 10));
  const kalanStok = Math.max(0, Number(yemek.kalan_stok ?? yemek.gunluk_stok ?? 0));
  return { sinirsizMi: false, gunlukStok, kalanStok };
}

export const GunlukStokPlanlayiciPenceresi: React.FC<GunlukStokPlanlayiciPenceresiProps> = ({
  yemekler,
  mutfakAdi,
  minSiparisTutari,
  onKapat,
}) => {
  const [taslaklar, setTaslaklar] = useState<Record<string, StokTaslakDegeri>>({});
  const [degisenIdler, setDegisenIdler] = useState<Set<string>>(new Set());
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<StokFiltre>('tumu');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basariMesaji, setBasariMesaji] = useState<string | null>(null);

  useEffect(() => {
    setTaslaklar((onceki) => {
      const guncel: Record<string, StokTaslakDegeri> = {};
      yemekler.forEach((y) => {
        if (degisenIdler.has(y.id) && onceki[y.id]) {
          guncel[y.id] = onceki[y.id];
        } else {
          guncel[y.id] = baslangicTaslagiOlustur(y);
        }
      });
      return guncel;
    });
  }, [yemekler, degisenIdler]);

  const ozet = useMemo(() => {
    let sinirliSayisi = 0;
    let kritikSayisi = 0;
    let minSepetUyariSayisi = 0;
    let tukenenSayisi = 0;

    yemekler.forEach((y) => {
      const taslak = taslaklar[y.id] || baslangicTaslagiOlustur(y);
      const analiz = yemekStokVeMinSepetAnalizEt(
        {
          ...y,
          sinirsiz_stok: taslak.sinirsizMi,
          gunluk_stok: taslak.sinirsizMi ? undefined : taslak.gunlukStok,
          kalan_stok: taslak.sinirsizMi ? undefined : taslak.kalanStok,
          stokta_var_mi: taslak.sinirsizMi ? true : taslak.kalanStok > 0,
          tukendi_mi: taslak.sinirsizMi ? false : taslak.kalanStok <= 0,
        },
        minSiparisTutari
      );

      if (analiz.sinirliMi) sinirliSayisi++;
      if (analiz.kritikAzMi) kritikSayisi++;
      if (analiz.minSepetAltindaMi) minSepetUyariSayisi++;
      if (analiz.tukendiMi) tukenenSayisi++;
    });

    return { sinirliSayisi, kritikSayisi, minSepetUyariSayisi, tukenenSayisi };
  }, [yemekler, taslaklar, minSiparisTutari]);

  const filtrelenmisYemekler = useMemo(() => {
    const aranan = arama.trim().toLowerCase();
    return yemekler.filter((y) => {
      const aramaUygun =
        !aranan ||
        (y.baslik || '').toLowerCase().includes(aranan) ||
        (y.kategori || '').toLowerCase().includes(aranan);
      if (!aramaUygun) return false;

      const taslak = taslaklar[y.id] || baslangicTaslagiOlustur(y);
      const analiz = yemekStokVeMinSepetAnalizEt(
        {
          ...y,
          sinirsiz_stok: taslak.sinirsizMi,
          gunluk_stok: taslak.sinirsizMi ? undefined : taslak.gunlukStok,
          kalan_stok: taslak.sinirsizMi ? undefined : taslak.kalanStok,
          stokta_var_mi: taslak.sinirsizMi ? true : taslak.kalanStok > 0,
          tukendi_mi: taslak.sinirsizMi ? false : taslak.kalanStok <= 0,
        },
        minSiparisTutari
      );

      if (filtre === 'sinirli') return analiz.sinirliMi;
      if (filtre === 'kritik') return analiz.kritikAzMi;
      if (filtre === 'tukendi') return analiz.tukendiMi;
      return true;
    });
  }, [yemekler, taslaklar, arama, filtre, minSiparisTutari]);

  const satiriGuncelle = (yemekId: string, yeni: StokTaslakDegeri) => {
    setTaslaklar((prev) => ({ ...prev, [yemekId]: yeni }));
    setDegisenIdler((prev) => {
      const next = new Set(prev);
      next.add(yemekId);
      return next;
    });
    setBasariMesaji(null);
  };

  const tumDegisiklikleriKaydet = async () => {
    if (degisenIdler.size === 0) {
      onKapat();
      return;
    }

    setKaydediliyor(true);
    try {
      const hedefler = yemekler.filter((y) => degisenIdler.has(y.id));
      await Promise.all(
        hedefler.map((y) => {
          const taslak = taslaklar[y.id];
          if (!taslak) return Promise.resolve(true);
          return yemekGunlukStokKaydet(y, {
            sinirsizMi: taslak.sinirsizMi,
            gunlukStok: taslak.gunlukStok,
            kalanStok: taslak.kalanStok,
          });
        })
      );
      setDegisenIdler(new Set());
      setBasariMesaji(`${hedefler.length} ürünün günlük stoğu vitrin ile senkronize kaydedildi!`);
      setTimeout(() => {
        onKapat();
      }, 900);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#180A1F] border border-purple-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Üst Başlık */}
        <div className="p-4 border-b border-purple-900/60 flex items-center justify-between gap-3 bg-[#240C28]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white truncate">
                Günlük Stok &amp; Kota Planlayıcı
              </h3>
              <p className="text-[11px] text-purple-300 truncate">
                {mutfakAdi} • Min. Sipariş Tutarı: <strong className="text-amber-300">{minSiparisTutari} ₺</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Özet Kartları + Arama + Filtre */}
        <div className="p-3.5 sm:p-4 border-b border-purple-900/50 space-y-3 bg-[#15081B]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-[#1D0A24] border border-purple-900/60 text-center">
              <span className="text-gray-400 block">Kotalı Ürün</span>
              <strong className="text-sm text-white">{ozet.sinirliSayisi} Çeşit</strong>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center">
              <span className="text-amber-200 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Son 5 &amp; Az
              </span>
              <strong className="text-sm text-amber-300">{ozet.kritikSayisi} Ürün</strong>
            </div>
            <div className="p-2 rounded-xl bg-orange-950/60 border border-orange-500/40 text-center">
              <span className="text-orange-200 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-400" /> Min. Sepet Altı
              </span>
              <strong className="text-sm text-orange-300">{ozet.minSepetUyariSayisi} Ürün</strong>
            </div>
            <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-center">
              <span className="text-rose-200 block">Tükenen</span>
              <strong className="text-sm text-rose-300">{ozet.tukenenSayisi} Ürün</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Menüde yemek ara (ör. Bükme, Kuru Fasulye)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#120416] border border-purple-900/70 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'tumu', label: 'Tümü' },
                  { id: 'sinirli', label: 'Kotalılar' },
                  { id: 'kritik', label: 'Son 5 Kaldı' },
                  { id: 'tukendi', label: 'Tükenen' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltre(item.id)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer border transition-all ${
                    filtre === item.id
                      ? 'bg-[#6D237A] border-purple-500 text-white'
                      : 'bg-[#120416] border-purple-900/60 text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Yemek Listesi */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {filtrelenmisYemekler.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              Seçili filtreye uygun yemek bulunamadı. Menüm sekmesinden yemek ekleyebilirsiniz.
            </div>
          ) : (
            filtrelenmisYemekler.map((yemek) => (
              <GunlukStokSatirKarti
                key={yemek.id}
                yemek={yemek}
                taslak={taslaklar[yemek.id] || baslangicTaslagiOlustur(yemek)}
                minSiparisTutari={minSiparisTutari}
                degistiMi={degisenIdler.has(yemek.id)}
                onDegistir={(yeni) => satiriGuncelle(yemek.id, yeni)}
              />
            ))
          )}
        </div>

        {/* Alt Kaydet Çubuğu */}
        <div className="p-3.5 sm:p-4 border-t border-purple-900/60 bg-[#240C28] space-y-2">
          {basariMesaji && (
            <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold text-center">
              {basariMesaji}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-purple-200">
              {degisenIdler.size > 0
                ? `${degisenIdler.size} üründe değişiklik bekliyor`
                : 'Sipariş geldikçe kalan stok otomatik düşer'}
            </span>
            <button
              type="button"
              onClick={tumDegisiklikleriKaydet}
              disabled={kaydediliyor}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-60 shrink-0"
            >
              {kaydediliyor ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {degisenIdler.size > 0
                      ? `Kaydet & Vitrini Güncelle (${degisenIdler.size})`
                      : 'Tamam'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
