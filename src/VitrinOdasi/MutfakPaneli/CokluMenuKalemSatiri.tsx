import React, { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Camera, Loader2, MessageSquarePlus } from 'lucide-react';
import { CokluMenuKalemiTipi } from '@/src/veritabani/VeriTipleri';
import { sunucuyaGorselYukle, gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';

interface CokluMenuKalemSatiriProps {
  kalem: CokluMenuKalemiTipi;
  indeks: number;
  toplamSayi: number;
  paketFiyatModu: boolean;
  onDegistir: (guncel: CokluMenuKalemiTipi) => void;
  onYukari: () => void;
  onAsagi: () => void;
  onSil: () => void;
}

export const CokluMenuKalemSatiri: React.FC<CokluMenuKalemSatiriProps> = ({
  kalem,
  indeks,
  toplamSayi,
  paketFiyatModu,
  onDegistir,
  onYukari,
  onAsagi,
  onSil,
}) => {
  const dosyaInputRef = useRef<HTMLInputElement>(null);
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);

  const handleDosyaSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    setGorselYukleniyor(true);
    try {
      const sonuc = await sunucuyaGorselYukle(dosya, 'yemekler');
      if (sonuc.basarili && sonuc.url) {
        onDegistir({ ...kalem, gorsel_url: sonuc.url });
      }
    } finally {
      setGorselYukleniyor(false);
      if (dosyaInputRef.current) dosyaInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-[#140519] border border-purple-900/60 space-y-3">
      {/* Üst Satır: Sıra Numarası + Yukarı/Aşağı + Sil */}
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black">
          #{indeks + 1}. Çeşit
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onYukari}
            disabled={indeks === 0}
            className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-200 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Yukarı taşı"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onAsagi}
            disabled={indeks === toplamSayi - 1}
            className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-200 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Aşağı taşı"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          {toplamSayi > 1 && (
            <button
              type="button"
              onClick={onSil}
              className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-300 hover:bg-rose-900 cursor-pointer"
              title="Bu çeşidi kaldır"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fotoğraf + Ad / Fiyat / Açıklama */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="file"
          ref={dosyaInputRef}
          onChange={handleDosyaSec}
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => !gorselYukleniyor && dosyaInputRef.current?.click()}
          className="w-full sm:w-24 h-24 rounded-xl border-2 border-dashed border-purple-800/80 hover:border-amber-400 bg-[#1B0822] flex flex-col items-center justify-center gap-1 overflow-hidden shrink-0 cursor-pointer relative group"
        >
          {gorselYukleniyor ? (
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          ) : kalem.gorsel_url ? (
            <>
              <img
                src={gorselUrlGuvenliYap(kalem.gorsel_url)}
                alt={kalem.ad || 'Yemek'}
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/75 text-[10px] text-amber-300 font-bold py-0.5 text-center">
                Değiştir
              </span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] text-purple-200 font-semibold px-1 text-center">
                Fotoğraf Ekle
              </span>
            </>
          )}
        </button>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={kalem.ad}
                onChange={(e) => onDegistir({ ...kalem, ad: e.target.value })}
                placeholder="Yemek adı (Örn: Mercimek Çorbası)"
                className="w-full bg-[#1C0722] border border-purple-900/70 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none font-bold"
              />
            </div>
            <div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={kalem.fiyat || ''}
                  onChange={(e) =>
                    onDegistir({ ...kalem, fiyat: e.target.value ? Number(e.target.value) : 0 })
                  }
                  placeholder={paketFiyatModu ? 'Dahil / 0 ₺' : 'Fiyat (₺)'}
                  className="w-full bg-[#1C0722] border border-purple-900/70 rounded-xl px-3 py-2 pr-7 text-xs text-amber-300 font-bold placeholder-gray-500 focus:border-amber-400 outline-none"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-amber-400 font-bold">₺</span>
              </div>
            </div>
          </div>

          <input
            type="text"
            value={kalem.aciklama}
            onChange={(e) => onDegistir({ ...kalem, aciklama: e.target.value })}
            placeholder="Açıklama / malzeme bilgisi (Örn: Kavrulmuş soğan ve tereyağlı sos içerir)"
            className="w-full bg-[#1C0722] border border-purple-900/70 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-amber-400 outline-none"
          />

          <label className="inline-flex items-center gap-2 text-[11px] text-purple-200 cursor-pointer pt-0.5 select-none">
            <input
              type="checkbox"
              checked={kalem.not_izinli_mi !== false}
              onChange={(e) => onDegistir({ ...kalem, not_izinli_mi: e.target.checked })}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Müşteri bu yemek için not yazabilsin (Örn: &quot;Soğan olmasın&quot;)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
