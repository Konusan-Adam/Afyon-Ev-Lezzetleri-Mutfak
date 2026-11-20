import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, AlertTriangle, Save, Loader2, Clock, Truck, MapPin, Power, Briefcase, FileText } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, koleksiyonuCanliDinle, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { useKuryeAyarlari } from '@/src/MalzemeCekmeceleri/useKuryeAyarlari';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';

interface Props {
  mutfakId: string;
  mutfakKaydi?: any;
  mutfakAcik?: boolean;
  onMutfakDurumuDegistir?: (acikMi: boolean) => void;
}

const VARSAYILAN_MUTFAK_IDLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function mutfakBelgesiEslesirMi(doc: any, mutfakId: string): boolean {
  if (!doc || !mutfakId) return false;
  const docId = doc.id || doc.kimlik;
  if (docId === mutfakId || doc.kimlik === mutfakId || doc.sahip_id === mutfakId) return true;
  if (!docId) return false;
  return VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(docId);
}

export const MutfakTeslimatAyarKarti: React.FC<Props> = ({
  mutfakId,
  mutfakKaydi,
  mutfakAcik,
  onMutfakDurumuDegistir,
}) => {
  const { ayarlar: patronKuryeAyarlari } = useKuryeAyarlari();
  const { aktifKullanici, aktifKullaniciBilgisiGuncelle } = kullaniciHafizasiKullan();
  const [minTutar, setMinTutar] = useState<string>('150');
  const [hazirlanmaSuresi, setHazirlanmaSuresi] = useState<string>('25-35 dk');
  const [calismaSaatleri, setCalismaSaatleri] = useState<string>('09:00 - 21:00');
  const [mahalle, setMahalle] = useState<string>('Merkez, Afyonkarahisar');
  const [ilce, setIlce] = useState<string>(aktifKullanici?.ilce || 'Merkez');
  const [adres, setAdres] = useState<string>(aktifKullanici?.adres || '');
  const [aciklama, setAciklama] = useState<string>(mutfakKaydi?.aciklama || '');
  const [calismaModeli, setCalismaModeli] = useState<string>(
    aktifKullanici?.calisma_modeli || 'sadece_site_uygulama'
  );
  const [acikMi, setAcikMi] = useState<boolean>(mutfakAcik ?? true);
  const [canliMutfak, setCanliMutfak] = useState<any>(mutfakKaydi || null);

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState<{ metin: string; tip: 'basari' | 'hata' } | null>(null);

  const formuMutfaktanDoldur = (mutfak: any) => {
    if (!mutfak) return;
    setCanliMutfak(mutfak);
    if (mutfak.min_siparis_tutari !== undefined && mutfak.min_siparis_tutari !== null) {
      setMinTutar(String(Number(mutfak.min_siparis_tutari) || 0));
    }
    if (typeof mutfak.hazirlanma_suresi === 'string' && mutfak.hazirlanma_suresi.trim()) {
      setHazirlanmaSuresi(mutfak.hazirlanma_suresi);
    }
    if (typeof mutfak.calisma_saatleri === 'string' && mutfak.calisma_saatleri.trim()) {
      setCalismaSaatleri(mutfak.calisma_saatleri);
    }
    if (typeof mutfak.mahalle === 'string' && mutfak.mahalle.trim()) {
      setMahalle(mutfak.mahalle);
    } else if (typeof mutfak.adres === 'string' && mutfak.adres.trim()) {
      setMahalle(mutfak.adres);
    }
    if (typeof mutfak.ilce === 'string' && mutfak.ilce.trim()) {
      setIlce(mutfak.ilce);
    }
    if (typeof mutfak.adres === 'string' && mutfak.adres.trim()) {
      setAdres(mutfak.adres);
    }
    if (typeof mutfak.aciklama === 'string') {
      setAciklama(mutfak.aciklama);
    }
    if (typeof mutfak.calisma_modeli === 'string' && mutfak.calisma_modeli.trim()) {
      setCalismaModeli(mutfak.calisma_modeli);
    }
    if (typeof mutfak.acik_mi === 'boolean') {
      setAcikMi(mutfak.acik_mi);
    }
  };

  useEffect(() => {
    if (mutfakKaydi) {
      formuMutfaktanDoldur(mutfakKaydi);
    }
  }, [
    mutfakKaydi?.id,
    mutfakKaydi?.min_siparis_tutari,
    mutfakKaydi?.hazirlanma_suresi,
    mutfakKaydi?.calisma_saatleri,
    mutfakKaydi?.mahalle,
    mutfakKaydi?.ilce,
    mutfakKaydi?.adres,
    mutfakKaydi?.aciklama,
    mutfakKaydi?.calisma_modeli,
    mutfakKaydi?.acik_mi,
  ]);

  useEffect(() => {
    if (typeof mutfakAcik === 'boolean') {
      setAcikMi(mutfakAcik);
    }
  }, [mutfakAcik]);

  useEffect(() => {
    if (!mutfakId) return;

    if (!canliFirebaseAktifMi()) {
      const lokal = localStorage.getItem(`mutfak_ayar_${mutfakId}`);
      if (lokal) {
        try {
          formuMutfaktanDoldur(JSON.parse(lokal));
        } catch {}
      }
      return;
    }

    const abonelikDurdur = koleksiyonuCanliDinle<any>('mutfaklar', (mutfaklar) => {
      const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
      if (mutfak) {
        formuMutfaktanDoldur(mutfak);
      }
    });

    return () => abonelikDurdur();
  }, [mutfakId]);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setKaydediliyor(true);
    setMesaj(null);

    const parsedMinTutar = Number(minTutar);

    // Teslimat ücreti Patron Masası (genel_ayarlar) tarafından yönetilir; mutfak sadece kendi operasyon alanlarını yazar
    const temizIlce = String(ilce || '').trim() || 'Merkez';
    const temizAdres = String(adres || '').trim();
    const temizAciklama = String(aciklama || '').trim().slice(0, 180);
    const gecerliCalismaModeli = ['sube_tedarikcisi', 'sadece_site_uygulama', 'her_ikisi'].includes(calismaModeli)
      ? calismaModeli
      : 'sadece_site_uygulama';

    const senkronVeri = {
      min_siparis_tutari: Number.isFinite(parsedMinTutar) ? Math.max(0, parsedMinTutar) : 0,
      hazirlanma_suresi: String(hazirlanmaSuresi || '').trim() || '25-35 dk',
      calisma_saatleri: String(calismaSaatleri || '').trim() || '09:00 - 21:00',
      mahalle: String(mahalle || '').trim() || `${temizIlce}, Afyonkarahisar`,
      ilce: temizIlce,
      adres: temizAdres || `${temizIlce}, Afyonkarahisar`,
      aciklama: temizAciklama || 'Afyonkarahisar anne eliyle taze pişirilen sıcak ev lezzetleri.',
      calisma_modeli: gecerliCalismaModeli,
      acik_mi: Boolean(acikMi),
    };

    if (!canliFirebaseAktifMi()) {
      localStorage.setItem(`mutfak_ayar_${mutfakId}`, JSON.stringify(senkronVeri));
      onMutfakDurumuDegistir?.(senkronVeri.acik_mi);
      setKaydediliyor(false);
      setMesaj({ metin: 'Çevrimdışı yerel ayar kaydedildi.', tip: 'basari' });
      setTimeout(() => setMesaj(null), 3000);
      return;
    }

    try {
      let mutfak = canliMutfak || mutfakKaydi;
      if (!mutfak) {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
      }

      const hedefId = mutfak?.id || mutfak?.kimlik || mutfakId;

      if (!hedefId || hedefId === 'yonetici_patron_01') {
        setKaydediliyor(false);
        setMesaj({
          metin: 'Hedef mutfak dokümanı bulunamadı! Lütfen üstten düzenlenecek mutfağı seçin.',
          tip: 'hata',
        });
        return;
      }

      // Var olan dokümanda sadece 6 senkron alanını merge et (adres vb. alanları ezme)
      const kayitPaketi = mutfak
        ? senkronVeri
        : {
            id: hedefId,
            ad: 'Afyon Ev Mutfağı',
            ...senkronVeri,
          };

      const basarili = await belgeKaydet('mutfaklar', hedefId, kayitPaketi);

      if (basarili) {
        const kullaniciHedefId =
          mutfak?.sahip_id ||
          aktifKullanici?.kimlik ||
          aktifKullanici?.id ||
          hedefId;
        if (kullaniciHedefId) {
          await belgeKaydet('kullanicilar', kullaniciHedefId, {
            ilce: senkronVeri.ilce,
            adres: senkronVeri.adres,
            calisma_modeli: senkronVeri.calisma_modeli,
          });
        }
        if (aktifKullanici && (aktifKullanici.kimlik === mutfakId || aktifKullanici.id === mutfakId || mutfak?.sahip_id === aktifKullanici.kimlik)) {
          aktifKullaniciBilgisiGuncelle({
            ilce: senkronVeri.ilce,
            adres: senkronVeri.adres,
            calisma_modeli: senkronVeri.calisma_modeli,
          });
        }
        onMutfakDurumuDegistir?.(senkronVeri.acik_mi);
        setMesaj({
          metin: `Ana Vitrin ile senkronize kaydedildi! (${hedefId})`,
          tip: 'basari',
        });
        setTimeout(() => setMesaj(null), 3500);
      } else {
        setMesaj({
          metin: 'Firestore yazma başarısız oldu! Lütfen yetki veya bağlantıyı kontrol edin.',
          tip: 'hata',
        });
      }
    } catch (err) {
      console.warn('Firebase mutfak ayar kaydetme hatası:', err);
      setMesaj({
        metin: 'Kayıt sırasında beklenmeyen bir hata oluştu.',
        tip: 'hata',
      });
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <form onSubmit={kaydet} className="bg-[#1C0722] border border-purple-900/60 rounded-2xl p-4 space-y-4 mb-6 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <ShoppingBag className="w-4 h-4" />
          <span>Mutfak Operasyon & Teslimat Ayarları</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAcikMi((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              acikMi
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/50 text-rose-300'
            }`}
            title="Ana Vitrindeki mutfak açık/kapalı durumu"
          >
            <Power className="w-3 h-3" />
            <span>{acikMi ? 'Vitrin Durumu: Açık' : 'Vitrin Durumu: Kapalı'}</span>
          </button>

          {mesaj && (
            <span
              className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full animate-fadeIn ${
                mesaj.tip === 'basari'
                  ? 'text-emerald-300 bg-emerald-500/20'
                  : 'text-rose-200 bg-rose-500/25 border border-rose-500/40'
              }`}
            >
              {mesaj.tip === 'basari' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{mesaj.metin}</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-purple-300 font-medium block mb-1">Min. Sipariş Tutarı (₺)</label>
          <input
            type="number"
            min="0"
            value={minTutar}
            onChange={(e) => setMinTutar(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-amber-400 outline-none"
            placeholder="500"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Hazırlık Süresi</span>
          </label>
          <input
            type="text"
            value={hazirlanmaSuresi}
            onChange={(e) => setHazirlanmaSuresi(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="25-35 dk"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>Çalışma Saatleri</span>
          </label>
          <input
            type="text"
            value={calismaSaatleri}
            onChange={(e) => setCalismaSaatleri(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="09:00 - 21:00"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>Mahalle / Semt</span>
          </label>
          <input
            type="text"
            value={mahalle}
            onChange={(e) => setMahalle(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="Merkez, Afyonkarahisar"
          />
        </div>
      </div>

      {/* Çalışma Modeli & Açık Adres Yönetimi */}
      <div className="pt-2 border-t border-purple-900/40 space-y-3 text-xs">
        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1.5 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span>Çalışma Modeliniz</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'sube_tedarikcisi', baslik: 'Şube Tedarikçisi', alt: 'Her gün düzenli üretim' },
              { id: 'sadece_site_uygulama', baslik: 'Sadece Site/Uygulama', alt: 'Müsait olduğum saatlerde' },
              { id: 'her_ikisi', baslik: 'Her İkisi de', alt: 'Şube + Site/Uygulama' },
            ].map((secenek) => (
              <button
                key={secenek.id}
                type="button"
                onClick={() => setCalismaModeli(secenek.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  calismaModeli === secenek.id
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                    : 'bg-[#120415] border-purple-900/70 text-gray-300 hover:border-purple-700'
                }`}
              >
                <p className="font-bold text-[11px]">{secenek.baslik}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{secenek.alt}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-purple-300 font-medium block mb-1">İlçe</label>
            <input
              type="text"
              value={ilce}
              onChange={(e) => setIlce(e.target.value)}
              className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
              placeholder="Merkez"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-purple-300 font-medium block mb-1">Açık Mutfak Adresi</label>
            <input
              type="text"
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
              placeholder="Mahalle, cadde/sokak, bina ve daire no"
            />
          </div>
        </div>

        {/* Mutfak Sloganı / Vitrin Açıklaması */}
        <div className="pt-2 border-t border-purple-900/40">
          <div className="flex items-center justify-between mb-1">
            <label className="text-purple-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Mutfak Sloganı / Kısa Açıklama</span>
            </label>
            <span className="text-[10px] text-gray-400">{aciklama.length}/180</span>
          </div>
          <textarea
            rows={2}
            maxLength={180}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none resize-none"
            placeholder="Örn: Afyonkarahisar anne eliyle taze pişirilen sıcak ev lezzetleri."
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Müşteri vitrininde dükkan adınızın hemen altında görünür.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Teslimat Ücreti (Patron Masası): <strong>{Number(patronKuryeAyarlari.taban_ucret) || 35} ₺</strong>
            </span>
          </span>
          <p className="text-[10px] text-purple-400/70">
            Teslimat ücreti yalnızca Süper Admin tarafından yönetilir; mutfak ayarları doğrudan vitrine senkron yazılır.
          </p>
        </div>
        <button
          type="submit"
          disabled={kaydediliyor}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {kaydediliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{kaydediliyor ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
        </button>
      </div>
    </form>
  );
};
