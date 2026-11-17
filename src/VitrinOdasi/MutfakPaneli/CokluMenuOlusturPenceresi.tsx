import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Check, Loader2, Layers } from 'lucide-react';
import { CokluMenuKalemiTipi, CokluMenuTipi } from '@/src/veritabani/VeriTipleri';
import { cokluMenuKaydet } from '@/src/MalzemeCekmeceleri/Mutfak/cokluMenuIslemleri';
import { CokluMenuKalemSatiri } from './CokluMenuKalemSatiri';
import { CokluMenuKolajOnizleme } from './CokluMenuKolajOnizleme';

interface CokluMenuOlusturPenceresiProps {
  mutfakId: string;
  mutfakAdi: string;
  duzenlenecekMenu?: CokluMenuTipi | null;
  onKapat: () => void;
}

function bosKalemOlustur(sira: number): CokluMenuKalemiTipi {
  return {
    id: `kalem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sira,
    ad: '',
    aciklama: '',
    fiyat: 0,
    gorsel_url: '',
    not_izinli_mi: true,
    varsayilan_secili: true,
    zorunlu_mu: false,
  };
}

export const CokluMenuOlusturPenceresi: React.FC<CokluMenuOlusturPenceresiProps> = ({
  mutfakId,
  mutfakAdi,
  duzenlenecekMenu,
  onKapat,
}) => {
  const duzenlemeMi = Boolean(duzenlenecekMenu);

  const [baslik, setBaslik] = useState(duzenlenecekMenu?.baslik || '');
  const [aciklama, setAciklama] = useState(duzenlenecekMenu?.aciklama || '');
  const [fiyatTipi, setFiyatTipi] = useState<'paket' | 'kalem_toplam'>(
    duzenlenecekMenu?.fiyat_tipi || 'paket'
  );
  const [paketFiyati, setPaketFiyati] = useState<string>(
    duzenlenecekMenu?.fiyat ? String(duzenlenecekMenu.fiyat) : ''
  );
  const [hazirlanmaSuresi, setHazirlanmaSuresi] = useState(
    duzenlenecekMenu?.hazirlanma_suresi || '35-45 dk'
  );
  const [kalemler, setKalemler] = useState<CokluMenuKalemiTipi[]>(
    duzenlenecekMenu?.kalemler?.length
      ? duzenlenecekMenu.kalemler
      : [bosKalemOlustur(0), bosKalemOlustur(1)]
  );

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kalemlerToplami = useMemo(
    () => kalemler.reduce((t, k) => t + (Number(k.fiyat) || 0), 0),
    [kalemler]
  );

  const onizlemeGorselleri = useMemo(
    () => kalemler.map((k) => k.gorsel_url).filter(Boolean),
    [kalemler]
  );

  const kalemEkle = () => {
    setKalemler((prev) => [...prev, bosKalemOlustur(prev.length)]);
  };

  const kalemGuncelle = (indeks: number, guncel: CokluMenuKalemiTipi) => {
    setKalemler((prev) => prev.map((k, i) => (i === indeks ? guncel : k)));
  };

  const kalemTasi = (indeks: number, yon: -1 | 1) => {
    const hedef = indeks + yon;
    if (hedef < 0 || hedef >= kalemler.length) return;
    setKalemler((prev) => {
      const kopya = [...prev];
      const gecici = kopya[indeks];
      kopya[indeks] = kopya[hedef];
      kopya[hedef] = gecici;
      return kopya.map((k, i) => ({ ...k, sira: i }));
    });
  };

  const kalemSil = (indeks: number) => {
    setKalemler((prev) =>
      prev.filter((_, i) => i !== indeks).map((k, i) => ({ ...k, sira: i }))
    );
  };

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);

    if (!baslik.trim()) {
      setHata('Lütfen menü başlığını yazınız (Örn: Günün 6 Çeşit Ev Menüsü).');
      return;
    }

    const gecerliKalemler = kalemler.filter((k) => k.ad.trim() !== '');
    if (gecerliKalemler.length === 0) {
      setHata('Lütfen menüye en az 1 yemek çeşidi ekleyiniz.');
      return;
    }

    const nihaiFiyat =
      fiyatTipi === 'kalem_toplam' ? kalemlerToplami : Number(paketFiyati) || 0;
    if (nihaiFiyat <= 0) {
      setHata(
        fiyatTipi === 'kalem_toplam'
          ? 'Kalem toplam fiyatı 0 ₺ olamaz; lütfen çeşitlere fiyat giriniz.'
          : 'Lütfen geçerli bir toplam paket fiyatı giriniz.'
      );
      return;
    }

    setKaydediliyor(true);
    try {
      const menuVerisi: CokluMenuTipi = {
        id: duzenlenecekMenu?.id || `menu_${Date.now()}`,
        mutfak_id: mutfakId,
        mutfak_adi: mutfakAdi,
        baslik: baslik.trim(),
        aciklama: aciklama.trim() || `${gecerliKalemler.length} çeşit taze Afyon ev yemeği menüsü`,
        fiyat_tipi: fiyatTipi,
        fiyat: nihaiFiyat,
        hazirlanma_suresi: hazirlanmaSuresi.trim() || '35-45 dk',
        kapak_gorselleri: gecerliKalemler.map((k) => k.gorsel_url).filter(Boolean).slice(0, 6),
        kalemler: gecerliKalemler,
        stokta_var_mi: duzenlenecekMenu?.stokta_var_mi ?? true,
        tukendi_mi: duzenlenecekMenu?.tukendi_mi ?? false,
        onay_durumu: duzenlenecekMenu?.onay_durumu || 'beklemede',
        onayli_mi: duzenlenecekMenu?.onayli_mi ?? false,
        olusturma_tarihi: duzenlenecekMenu?.olusturma_tarihi,
      };

      const basarili = await cokluMenuKaydet(menuVerisi, !duzenlemeMi);
      if (basarili) {
        onKapat();
      } else {
        setHata('Menü Firestore veritabanına kaydedilemedi.');
      }
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-fadeIn">
      {/* Sayfa Üst Geri Dönüş Barı */}
      <div className="bg-[#180A1F] border border-[#3E1646] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onKapat}
            disabled={kaydediliyor}
            className="px-3 py-2 rounded-xl bg-[#271033] hover:bg-[#351646] border border-purple-700/70 text-purple-100 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Menüm&apos;e Dön</span>
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-sm sm:text-base text-white truncate flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline" />
              <span>{duzenlemeMi ? 'Çoklu Menüyü Düzenle' : 'Çoklu Menü Oluştur (Sınırsız Çeşit)'}</span>
            </h2>
            <p className="text-[11px] text-purple-300 truncate">
              Alt alta istediğiniz kadar çeşit ekleyin; vitrinde 6&apos;lı kolaj olarak sergilenir.
            </p>
          </div>
        </div>
      </div>

      {/* Sayfa İçeriği & Form */}
      <div className="bg-[#1D0A20] border border-[#521E5C] rounded-3xl w-full shadow-xl overflow-hidden">
        <form onSubmit={handleKaydet} className="p-4 sm:p-5 space-y-4 text-xs">
          {hata && (
            <div className="bg-rose-950/80 border border-rose-500 text-rose-200 p-3 rounded-xl text-xs font-medium">
              {hata}
            </div>
          )}

          {/* Vitrin Kart Önizlemesi (Canlı 6'lı Kolaj) */}
          <div className="p-3 rounded-2xl bg-[#140519] border border-purple-900/60 flex items-center gap-3.5">
            <CokluMenuKolajOnizleme
              gorseller={onizlemeGorselleri}
              toplamCesitSayisi={kalemler.filter((k) => k.ad.trim()).length || kalemler.length}
              boyutSinifi="w-20 h-20"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Vitrin Kart Önizleme ({kalemler.length} Çeşit)
              </span>
              <h4 className="text-sm font-black text-white truncate mt-0.5">
                {baslik.trim() || 'Menü Başlığı Önizleme'}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                En fazla 6 fotoğraf kareye bölünür; fazlası üzerine basınca sıralanır.
              </p>
            </div>
          </div>

          {/* Menü Genel Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-semibold mb-1">Menü Başlığı *</label>
              <input
                type="text"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                placeholder="Örn: Günün 8 Çeşit Anne Ziyafeti"
                className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:border-amber-400 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Fiyatlandırma Şekli</label>
              <select
                value={fiyatTipi}
                onChange={(e) => setFiyatTipi(e.target.value as 'paket' | 'kalem_toplam')}
                className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none font-semibold"
              >
                <option value="paket">Sabit Paket Fiyatı</option>
                <option value="kalem_toplam">Çeşit Fiyatlarının Toplamı ({kalemlerToplami} ₺)</option>
              </select>
            </div>

            {fiyatTipi === 'paket' ? (
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Toplam Paket Fiyatı (₺) *</label>
                <input
                  type="number"
                  min="1"
                  value={paketFiyati}
                  onChange={(e) => setPaketFiyati(e.target.value)}
                  placeholder="Örn: 450"
                  className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2.5 text-amber-300 font-black focus:border-amber-400 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Otomatik Toplam Tutar</label>
                <div className="w-full bg-[#130713] border border-emerald-700/50 rounded-xl px-3 py-2.5 text-emerald-300 font-black">
                  {kalemlerToplami} ₺
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Hazırlık Süresi</label>
              <input
                type="text"
                value={hazirlanmaSuresi}
                onChange={(e) => setHazirlanmaSuresi(e.target.value)}
                placeholder="Örn: 35-45 dk"
                className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Menü Kısa Notu</label>
              <input
                type="text"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                placeholder="Örn: Çorba, ana yemek, salata ve tatlı dahil"
                className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Sınırsız Yemek Çeşidi Listesi */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 text-xs">
                Menü Çeşitleri ({kalemler.length} Çeşit)
              </span>
              <span className="text-[11px] text-purple-300/70">
                Yukarı / aşağı oklarla sırasını düzenleyebilirsiniz
              </span>
            </div>

            {kalemler.map((kalem, indeks) => (
              <CokluMenuKalemSatiri
                key={kalem.id}
                kalem={kalem}
                indeks={indeks}
                toplamSayi={kalemler.length}
                paketFiyatModu={fiyatTipi === 'paket'}
                onDegistir={(guncel) => kalemGuncelle(indeks, guncel)}
                onYukari={() => kalemTasi(indeks, -1)}
                onAsagi={() => kalemTasi(indeks, 1)}
                onSil={() => kalemSil(indeks)}
              />
            ))}

            <button
              type="button"
              onClick={kalemEkle}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Altına Yeni Çeşit Ekle (Sınırsız)</span>
            </button>
          </div>

          {/* Alt Butonlar */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-900/50">
            <button
              type="button"
              onClick={onKapat}
              disabled={kaydediliyor}
              className="px-4 py-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-gray-300 hover:text-white cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {kaydediliyor ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{duzenlemeMi ? 'Değişiklikleri Kaydet' : 'Çoklu Menüyü Kaydet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
