import React, { useState } from 'react';
import { ArrowLeft, Plus, Check, Loader2 } from 'lucide-react';
import { kategorileriGetir } from '@/src/MalzemeCekmeceleri/kategorileriGetir';
import { testYeniYemekEkle } from '@/src/veritabani/CanliVeriYardimcisi';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { Yemek } from '@/src/veritabani/VeriTipleri';
import { type SecenekGrubu } from '@/src/MalzemeCekmeceleri';
import { YemekSecenekDuzenleyici } from '@/src/VitrinOdasi/Bilesenler';
import { YemekGorselSecici } from './YemekGorselSecici';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';
import { porsiyonBelirle } from '@/src/MalzemeCekmeceleri';

interface YeniYemekEklePenceresiOzellikleri {
  mutfakId: string;
  onKapat: () => void;
  onEklendi: (yemek: Yemek) => void;
}

export const YeniYemekEklePenceresi: React.FC<YeniYemekEklePenceresiOzellikleri> = ({
  mutfakId,
  onKapat,
  onEklendi,
}) => {
  const { kategoriler, altKategoriler } = kategorileriGetir();
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [fiyat, setFiyat] = useState<number | ''>('');
  const [birim, setBirim] = useState('Porsiyon');
  const [stokTipi, setStokTipi] = useState<'sinirsiz' | 'sinirli'>('sinirsiz');
  const [gunlukStok, setGunlukStok] = useState<number | ''>(10);
  const [kategori, setKategori] = useState(kategoriler[1]?.ad || 'Hamur İşleri & Bükme');
  const [altKategori, setAltKategori] = useState<string>('');
  const [hazirlanmaSuresi, setHazirlanmaSuresi] = useState('20-30 dk');

  // Seçilen kategoriye ait alt kategoriler
  const seciliKategoriNesnesi = kategoriler.find(k => k.ad === kategori);
  const bagliAltlar = seciliKategoriNesnesi
    ? altKategoriler.filter(a => a.ust_kategori_id === seciliKategoriNesnesi.id)
    : [];
  const [gorselUrl, setGorselUrl] = useState('');
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [secenekGruplari, setSecenekGruplari] = useState<SecenekGrubu[]>([]);
  const [hata, setHata] = useState('');

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gorselYukleniyor) {
      setHata('Fotoğrafınız cPanel sunucusuna yükleniyor, lütfen birkaç saniye bekleyin...');
      return;
    }
    if (!baslik.trim()) {
      setHata('Lütfen yemek adını yazınız.');
      return;
    }
    if (!fiyat || Number(fiyat) <= 0) {
      setHata('Lütfen geçerli bir porsiyon fiyatı giriniz.');
      return;
    }
    if (!gorselUrl.trim()) {
      setHata('Lütfen yemeğinize ait gerçek bir fotoğraf yükleyiniz. Hazır görsel kullanılamaz.');
      return;
    }

    const secilenGorsel = gorselUrl.trim();

    const yemekId = `yemek-${Date.now()}`;
    const temizYemekVerisi = {
      id: yemekId,
      mutfak_id: mutfakId,
      baslik: baslik.trim(),
      aciklama: aciklama.trim() || 'Anne eliyle taze pişirilmiş Afyon ev lezzeti.',
      fiyat: Number(fiyat),
      birim: birim || 'Porsiyon',
      gunluk_stok: stokTipi === 'sinirli' ? (Number(gunlukStok) || 10) : undefined,
      kalan_stok: stokTipi === 'sinirli' ? (Number(gunlukStok) || 10) : undefined,
      sinirsiz_stok: stokTipi === 'sinirsiz',
      kategori,
      alt_kategori: altKategori ? altKategori.trim() : '',
      hazirlanma_suresi: hazirlanmaSuresi,
      gorsel_url: secilenGorsel,
      populer: true,
      puan: 5.0,
      stokta_var_mi: true,
      tukendi_mi: false,
      onay_durumu: 'beklemede', // Admin onayı bekliyor!
      onayli_mi: false,
      secenek_gruplari: secenekGruplari || []
    };

    if (stokTipi === 'sinirli') {
      const miktar = Number(gunlukStok) || 10;
      porsiyonBelirle(yemekId, miktar, miktar, birim, false);
    } else {
      porsiyonBelirle(yemekId, 999, 999, birim, true);
    }

    if (canliFirebaseAktifMi()) {
      await belgeKaydet('yemekler', yemekId, temizYemekVerisi);
    }

    patronBildirimiEkle(
      'yeni_yemek',
      'Mutfaktan Yeni Yemek Eklendi 🍲',
      `Bir mutfak menüsüne yeni yemek ekledi: "${temizYemekVerisi.baslik}" (${temizYemekVerisi.fiyat} ₺). Onay bekliyor.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
    }

    onEklendi(temizYemekVerisi as unknown as Yemek);
    onKapat();
  };

  return (
    <div className="space-y-4 pb-6 animate-fadeIn">
      {/* Sayfa Üst Geri Dönüş Barı */}
      <div className="bg-[#180A1F] border border-[#3E1646] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onKapat}
            disabled={gorselYukleniyor}
            className="px-3 py-2 rounded-xl bg-[#271033] hover:bg-[#351646] border border-purple-700/70 text-purple-100 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Menüm&apos;e Dön</span>
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-sm sm:text-base text-white truncate flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline stroke-[3]" />
              <span>Yeni Tencere Yemeği &amp; Varyasyon Ekle</span>
            </h2>
            <p className="text-[11px] text-purple-300 truncate">
              Fotoğraf, fiyat, porsiyon ve isteğe bağlı seçenekleri ekleyip yayına alın.
            </p>
          </div>
        </div>
      </div>

      {/* Sayfa İçeriği & Form */}
      <div className="bg-[#1D0A20] border border-[#521E5C] rounded-3xl w-full shadow-xl overflow-hidden">
        <form onSubmit={kaydet} className="p-4 sm:p-5 space-y-4 text-xs">
          {hata && (
            <div className="bg-rose-950/80 border border-rose-500 text-rose-200 p-2.5 rounded-xl text-xs">
              {hata}
            </div>
          )}

          {/* Yemek Adı */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Yemek / Lezzet Adı</label>
            <input
              type="text"
              value={baslik}
              onChange={(e) => { setBaslik(e.target.value); setHata(''); }}
              placeholder="Örn: Hakiki Haşhaşlı Katmer (2 Adet)"
              className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none"
            />
          </div>

          {/* Kategori, Fiyat ve Satış Birimi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Ana Kategori</label>
              <select
                value={kategori}
                onChange={(e) => {
                  setKategori(e.target.value);
                  setAltKategori('');
                }}
                className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
              >
                {kategoriler.filter(k => k.id !== 'hepsi').map((k) => (
                  <option key={k.id} value={k.ad} className="bg-[#1D0A20] text-white">
                    {k.ad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Birim Fiyatı (₺)</label>
              <input
                type="number"
                min="10"
                value={fiyat}
                onChange={(e) => { setFiyat(e.target.value ? Number(e.target.value) : ''); setHata(''); }}
                placeholder="Örn: 140"
                className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Satış Birimi</label>
              <select
                value={birim}
                onChange={(e) => setBirim(e.target.value)}
                className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none font-medium"
              >
                <option value="Porsiyon">Porsiyon</option>
                <option value="Adet">Adet</option>
                <option value="Kg">Kg (Kilogram)</option>
                <option value="Gram">Gram</option>
                <option value="Litre">Litre</option>
                <option value="Dilim">Dilim</option>
                <option value="Tepsi">Tepsi</option>
                <option value="Kavanoz">Kavanoz</option>
                <option value="Tabak">Tabak</option>
                <option value="Paket">Paket</option>
              </select>
            </div>
          </div>

          {/* Günlük Hazırlık & Stok Durumu */}
          <div className="bg-[#18081A] border border-purple-900/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-semibold text-xs">Günlük Üretim & Stok Durumu</span>
              <div className="flex items-center gap-1 bg-[#120514] p-1 rounded-xl border border-purple-900/40">
                <button
                  type="button"
                  onClick={() => setStokTipi('sinirsiz')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    stokTipi === 'sinirsiz'
                      ? 'bg-purple-700 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Taze Pişer (Sınırsız)
                </button>
                <button
                  type="button"
                  onClick={() => setStokTipi('sinirli')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    stokTipi === 'sinirli'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Sınırlı Günlük Stok
                </button>
              </div>
            </div>

            {stokTipi === 'sinirli' ? (
              <div className="flex items-center gap-2 pt-1 border-t border-purple-900/30">
                <label className="text-gray-400 text-xs whitespace-nowrap">Günlük Üretim:</label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={gunlukStok}
                  onChange={(e) => setGunlukStok(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Örn: 10"
                  className="w-20 bg-[#130713] border border-amber-500/60 rounded-lg px-2.5 py-1 text-white font-bold text-center outline-none focus:border-amber-400 text-xs"
                />
                <span className="text-amber-300 font-bold text-xs">{birim}</span>
                <span className="text-gray-500 text-[10px] ml-auto">
                  (3 {birim.toLowerCase()} kaldığında kartta acil rozeti görünür)
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-purple-300/60">
                Sipariş geldikçe taze pişirilir. Kart üzerinde sahte stok uyarısı gösterilmez.
              </p>
            )}
          </div>

          {/* Alt Kategori Seçimi (Dinamik) */}
          {bagliAltlar.length > 0 && (
            <div>
              <label className="block text-gray-300 font-semibold mb-1 text-xs">
                Alt Kategori / Çeşit (İsteğe Bağlı)
              </label>
              <select
                value={altKategori}
                onChange={(e) => setAltKategori(e.target.value)}
                className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-2.5 py-2 text-white text-xs focus:border-amber-400 outline-none"
              >
                <option value="">-- Genel / Belirtilmemiş --</option>
                {bagliAltlar.map((alt) => (
                  <option key={alt.id} value={alt.ad} className="bg-[#1D0A20] text-white">
                    {alt.ad}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hazırlık Süresi */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Tahmini Pişirme / Hazırlık Süresi</label>
            <input
              type="text"
              value={hazirlanmaSuresi}
              onChange={(e) => setHazirlanmaSuresi(e.target.value)}
              placeholder="Örn: 20-30 dk"
              className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none"
            />
          </div>

          {/* Cihazdan / Galeriden Fotoğraf Seçici */}
          <YemekGorselSecici
            secilenGorsel={gorselUrl}
            onGorselSec={setGorselUrl}
            onYukleniyor={setGorselYukleniyor}
          />

          {/* Varyasyon ve Porsiyon Düzenleyici (Yemeksepeti Modeli) */}
          <YemekSecenekDuzenleyici
            kategori={kategori}
            secenekGruplari={secenekGruplari}
            onChange={setSecenekGruplari}
          />

          {/* Açıklama */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Lezzet Tarifi & Malzeme Notu</label>
            <textarea
              rows={2}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Örn: Hakiki Afyon manda kaymağı ve yerli tohum haşhaş ile taze taze açılmıştır."
              className="w-full bg-[#130713] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none resize-none"
            />
          </div>

          {/* Kaydet Butonu */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onKapat}
              disabled={gorselYukleniyor}
              className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-800 text-gray-300 hover:text-white cursor-pointer disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={gorselYukleniyor}
              className={`px-5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 shadow-lg transition-all ${
                gorselYukleniyor
                  ? 'bg-amber-600/60 text-black/70 cursor-wait animate-pulse shadow-none'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 cursor-pointer'
              }`}
            >
              {gorselYukleniyor ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Fotoğraf Sunucuya Yükleniyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Menüye Ekle & Yayına Al</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
