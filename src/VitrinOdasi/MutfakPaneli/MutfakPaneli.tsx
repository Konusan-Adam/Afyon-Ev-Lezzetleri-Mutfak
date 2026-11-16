import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  UtensilsCrossed,
  DollarSign,
  ShieldCheck,
  Plus,
  CheckCircle,
  Clock,
  Power,
  LogOut,
  Edit3,
  Search,
  Sparkles
} from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { Yemek } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonuCanliDinle, belgeKaydet, koleksiyonGetir } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { useMusteriSiparisleri } from '@/src/MalzemeCekmeceleri/useMusteriSiparisleri';
import { gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';
import { YeniYemekEklePenceresi } from './YeniYemekEklePenceresi';
import { YemekDuzenlemePenceresi } from './YemekDuzenlemePenceresi';
import { MutfakCuzdanSekmesi } from './MutfakCuzdanSekmesi';
import { MutfakBelgelerSekmesi } from './MutfakBelgelerSekmesi';
import { MutfakAfisSekmesi } from './MutfakAfisSekmesi';
import { SiparisIptalPenceresi } from '../Bilesenler/MutfakYonetimi/SiparisIptalPenceresi';
import { MutfakZilButonu } from '../Bilesenler/Mutfak/MutfakZilButonu';
import { MutfakTeslimatAyarKarti } from './MutfakTeslimatAyarKarti';
import { MutfakTekliSiparisKarti } from '../Bilesenler/Mutfak/MutfakTekliSiparisKarti';
import { useMutfakBildirimleri } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakBildirimleri';
import { ekranUyanikTutBaslat } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';
import {
  androidMutfakOturumBildir,
  androidOturumKapatBildir,
} from '@/src/MalzemeCekmeceleri/Mutfak/AndroidKopruServisi';
import { MutfakYeniSiparisUyarisi } from '../Bilesenler/Mutfak/MutfakYeniSiparisUyarisi';
import { MutfakGirisEkrani } from './MutfakGirisEkrani';
import { ApkGuncellemeUyarisi } from './ApkGuncellemeUyarisi';

const VARSAYILAN_TEST_MUTFAKLARI = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1', 'm2', 'mutfak-muzaffer'];
const M1_ESLESEN_KIMLIKLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function kayitBuMutfagaAitMi(kayitMutfakId: string | undefined, mutfakId: string): boolean {
  if (!kayitMutfakId) return M1_ESLESEN_KIMLIKLER.includes(mutfakId);
  if (kayitMutfakId === mutfakId) return true;
  return M1_ESLESEN_KIMLIKLER.includes(mutfakId) && M1_ESLESEN_KIMLIKLER.includes(kayitMutfakId);
}

export const MutfakPaneli: React.FC = () => {
  const { aktifKullanici, cikisYap } = kullaniciHafizasiKullan();
  const [mutfakAcik, setMutfakAcik] = useState(true);
  const [mutfakKaydi, setMutfakKaydi] = useState<any>(null);

  const [aktifSekme, setAktifSekme] = useState<'siparisler' | 'menum' | 'afis' | 'kazanc' | 'belgeler' | 'tamamlanan'>('siparisler');
  const [yemekModalAcik, setYemekModalAcik] = useState(false);
  const [duzenlenenYemek, setDuzenlenenYemek] = useState<Yemek | null>(null);
  const [iptalModalSiparis, setIptalModalSiparis] = useState<{ id: string; kodu: string } | null>(null);
  const [guncellemeSayaci, setGuncellemeSayaci] = useState(0);
  const [tamamlananKoleksiyonSiparisleri, setTamamlananKoleksiyonSiparisleri] = useState<any[]>([]);
  const [menuArama, setMenuArama] = useState('');
  const [seciliMenuKategori, setSeciliMenuKategori] = useState('Tümü');
  const [stokDegisenYemekId, setStokDegisenYemekId] = useState<string | null>(null);

  const { siparisler: canliSiparisler, yenile: siparisleriYenile } = useMusteriSiparisleri();

  const mutfakId = aktifKullanici?.kimlik || aktifKullanici?.id || 'm1';
  const mutfakAdi =
    mutfakKaydi?.mutfak_adi ||
    mutfakKaydi?.ad ||
    aktifKullanici?.isletme_adi ||
    aktifKullanici?.ad_soyad ||
    'Afyon Ev Mutfağı';

  const oturumYetkiliMi = Boolean(
    aktifKullanici &&
    (aktifKullanici.rol === 'ev_mutfagi' || aktifKullanici.rol === 'ticari_restoran' || aktifKullanici.rol === 'yonetici')
  );

  // Mutfak kaydını canlı dinle (puan, mahalle, açık/kapalı durumu, onay durumu)
  useEffect(() => {
    if (!oturumYetkiliMi || !canliFirebaseAktifMi() || !mutfakId) return;

    const abonelikDurdur = koleksiyonuCanliDinle<any>('mutfaklar', (mutfaklar) => {
      const bulunan = mutfaklar.find((m) =>
        kayitBuMutfagaAitMi(m.id || m.kimlik, mutfakId)
      );
      if (bulunan) {
        setMutfakKaydi(bulunan);
        if (bulunan.acik_mi !== undefined) {
          setMutfakAcik(Boolean(bulunan.acik_mi));
        }
      }
    });

    return () => abonelikDurdur();
  }, [mutfakId, oturumYetkiliMi]);

  // 🔔 Canlı Sipariş Zil & Bildirim Dedektörü
  const { yeniSiparisUyarisi, uyariKapat } = useMutfakBildirimleri(mutfakId, {
    aktifMi: oturumYetkiliMi,
    ekMutfakKimlikleri: [mutfakKaydi?.id, mutfakKaydi?.kimlik].filter(Boolean) as string[],
    tumMutfaklariDinle: aktifKullanici?.rol === 'yonetici',
  });

  // Mutfak açıkken ekranın otomatik kilitlenmesini önle
  useEffect(() => {
    if (!oturumYetkiliMi || !mutfakAcik) return;
    return ekranUyanikTutBaslat();
  }, [oturumYetkiliMi, mutfakAcik]);

  // Android APK arka plan sipariş dinleme servisini canlı oturumla senkronize et
  useEffect(() => {
    if (!oturumYetkiliMi || !mutfakId) {
      androidOturumKapatBildir();
      return;
    }
    const ekKimlikler = [mutfakKaydi?.id, mutfakKaydi?.kimlik].filter(Boolean) as string[];
    androidMutfakOturumBildir({
      mutfakId,
      mutfakAdi,
      acikMi: mutfakAcik,
      ekKimlikler,
      tumMutfaklar: aktifKullanici?.rol === 'yonetici',
    });
  }, [oturumYetkiliMi, mutfakId, mutfakAdi, mutfakAcik, mutfakKaydi?.id, mutfakKaydi?.kimlik, aktifKullanici?.rol]);

  const [canliYemekler, setCanliYemekler] = useState<Yemek[]>([]);

  useEffect(() => {
    if (!oturumYetkiliMi || !canliFirebaseAktifMi() || !mutfakId) return;

    const abonelikDurdur = koleksiyonuCanliDinle<Yemek>('yemekler', (tum) => {
      const buMutfak = tum.filter((y) => kayitBuMutfagaAitMi(y.mutfak_id, mutfakId));
      setCanliYemekler(buMutfak);
    });

    return () => abonelikDurdur();
  }, [mutfakId, guncellemeSayaci, oturumYetkiliMi]);

  // Tamamlanan siparişleri canlı dinle
  useEffect(() => {
    if (!oturumYetkiliMi || !canliFirebaseAktifMi() || !mutfakId) return;

    const abonelikDurdur = koleksiyonuCanliDinle<any>('tamamlanan_siparisler', (tum) => {
      const buMutfak = tum.filter((s) => kayitBuMutfagaAitMi(s.mutfak_id, mutfakId));
      setTamamlananKoleksiyonSiparisleri(buMutfak);
    });

    return () => abonelikDurdur();
  }, [mutfakId, oturumYetkiliMi]);

  const onayBekliyorMu =
    aktifKullanici?.rol !== 'yonetici' &&
    !VARSAYILAN_TEST_MUTFAKLARI.includes(aktifKullanici?.kimlik || '') &&
    (
      mutfakKaydi?.onay_durumu === 'beklemede' ||
      mutfakKaydi?.onayli_mi === false ||
      (!mutfakKaydi && ((aktifKullanici as any)?.onay_durumu === 'beklemede' || (aktifKullanici as any)?.onayli_mi === false))
    );

  // Bu mutfağa ait siparişler (çapraz mutfak sızıntısı engellendi)
  const buMutfaginCanliSiparisleri = useMemo(
    () => canliSiparisler.filter((s) => kayitBuMutfagaAitMi(s.mutfak_id, mutfakId)),
    [canliSiparisler, mutfakId]
  );

  // Aktif Ocak & Fırın siparişleri (teslim edilmiş ve iptal edilmiş olanlar hariç)
  const aktifMutfakSiparisleri = useMemo(
    () => buMutfaginCanliSiparisleri.filter((s) => s.durum !== 'teslim_edildi' && s.durum !== 'iptal'),
    [buMutfaginCanliSiparisleri]
  );

  // Tamamlanan ve İptal edilen sipariş geçmişi (iki koleksiyondan tekilleştirilmiş)
  const tamamlananVeGecmisSiparisler = useMemo(() => {
    const harita = new Map<string, any>();

    tamamlananKoleksiyonSiparisleri.forEach((s) => {
      const anahtar = s.siparis_kodu || s.siparisKodu || s.id;
      if (anahtar) harita.set(anahtar, s);
    });

    buMutfaginCanliSiparisleri
      .filter((s) => s.durum === 'teslim_edildi' || s.durum === 'iptal')
      .forEach((s) => {
        const anahtar = s.siparis_kodu || s.siparisKodu || s.id;
        if (anahtar && !harita.has(anahtar)) {
          harita.set(anahtar, s);
        }
      });

    return Array.from(harita.values());
  }, [tamamlananKoleksiyonSiparisleri, buMutfaginCanliSiparisleri]);

  // Gerçek toplam ciro & komisyon (iptal edilenler hariç, teslim edilenler DAHİL)
  const { toplamGecerliCiro, toplamKayitliKomisyon } = useMemo(() => {
    const harita = new Map<string, any>();

    [...buMutfaginCanliSiparisleri, ...tamamlananKoleksiyonSiparisleri].forEach((s) => {
      if (s.durum === 'iptal') return;
      const anahtar = s.siparis_kodu || s.siparisKodu || s.id;
      if (anahtar) harita.set(anahtar, s);
    });

    let ciro = 0;
    let komisyon = 0;
    harita.forEach((s) => {
      ciro += Number(s.toplam_tutar || s.toplamTutar || s.tutar || 0);
      komisyon += Number(s.komisyon_tutari || 0) + Number(s.platform_bedeli || 0);
    });

    return {
      toplamGecerliCiro: Math.round(ciro * 100) / 100,
      toplamKayitliKomisyon: Math.round(komisyon * 100) / 100,
    };
  }, [buMutfaginCanliSiparisleri, tamamlananKoleksiyonSiparisleri]);

  const mutfakYemekleri = canliYemekler;

  const menuKategorileri = useMemo(() => {
    const set = new Set<string>(['Tümü']);
    mutfakYemekleri.forEach((y) => {
      if (y.kategori) set.add(y.kategori);
    });
    return Array.from(set);
  }, [mutfakYemekleri]);

  const filtrelenmisYemekler = useMemo(() => {
    const aranan = menuArama.trim().toLowerCase();
    return mutfakYemekleri.filter((y) => {
      const kategoriUygun = seciliMenuKategori === 'Tümü' || y.kategori === seciliMenuKategori;
      const aramaUygun =
        !aranan ||
        (y.baslik || '').toLowerCase().includes(aranan) ||
        (y.kategori || '').toLowerCase().includes(aranan);
      return kategoriUygun && aramaUygun;
    });
  }, [mutfakYemekleri, menuArama, seciliMenuKategori]);

  const toggleMutfakDurumu = async () => {
    const yeniDurum = !mutfakAcik;
    setMutfakAcik(yeniDurum);

    if (canliFirebaseAktifMi() && mutfakId) {
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => kayitBuMutfagaAitMi(m.id || m.kimlik, mutfakId));
        const hedefId = mutfak?.id || mutfak?.kimlik || mutfakId;

        await belgeKaydet('mutfaklar', hedefId, {
          ...(mutfak || {}),
          id: hedefId,
          ad: mutfak?.ad || mutfakAdi,
          acik_mi: yeniDurum
        });
      } catch (err) {
        console.warn('Mutfak durum güncelleme hatası:', err);
      }
    }
  };

  const yemekHizliStokDegistir = async (yemek: Yemek) => {
    const suAnSatista = yemek.stokta_var_mi !== false && yemek.tukendi_mi !== true;
    const yeniSatista = !suAnSatista;
    setStokDegisenYemekId(yemek.id);

    try {
      if (canliFirebaseAktifMi()) {
        await belgeKaydet('yemekler', yemek.id, {
          stokta_var_mi: yeniSatista,
          tukendi_mi: !yeniSatista,
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
      }
    } finally {
      setStokDegisenYemekId(null);
    }
  };

  if (!aktifKullanici || (aktifKullanici.rol !== 'ev_mutfagi' && aktifKullanici.rol !== 'ticari_restoran' && aktifKullanici.rol !== 'yonetici')) {
    return <MutfakGirisEkrani />;
  }

  const mutfakPuani = Number(mutfakKaydi?.puan || 5.0).toFixed(1);
  const mutfakKonumu =
    mutfakKaydi?.mahalle ||
    mutfakKaydi?.adres ||
    `${aktifKullanici?.ilce || 'Merkez'}, Afyonkarahisar`;
  const logoSrc = '/assets/aistudio/image_48081a60_bc73ebae.jpg';

  return (
    <div className="w-full min-h-screen bg-[#0C020E] text-gray-200 select-none pb-16">
      {/* 🔔 YENİ SİPARİŞ CANLI FLAŞ BİLDİRİMİ & ZİL ALARMI */}
      <MutfakYeniSiparisUyarisi
        uyari={yeniSiparisUyarisi}
        onKapat={uyariKapat}
        onSipariseGit={() => setAktifSekme('siparisler')}
      />

      {/* 👑 PATRON ÖNİZLEME BANNERI (Yalnızca Yönetici Hesabında Görünür) */}
      {aktifKullanici?.rol === 'yonetici' && (
        <div className="bg-gradient-to-r from-amber-600 via-purple-900 to-amber-700 text-white px-4 py-2 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span className="font-bold">EV MUTFAĞI & AŞÇI PANELİ (Yönetici Görünümü)</span>
          </div>
          <span className="text-[11px] text-amber-200 font-semibold hidden sm:inline">
            Tam yetkili mutfak denetim modu
          </span>
        </div>
      )}

      {/* 📲 APK OTOMATİK GÜNCELLEME UYARISI (Yalnızca Android Uygulamasında Görünür) */}
      <ApkGuncellemeUyarisi />

      {/* Üst Başlık Barı */}
      <header className="bg-[#180A1F] border-b border-[#3E1646] px-4 py-4">
        <div className="anasayfa-genislik flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Mutfak Logosu"
              className="w-11 h-11 rounded-2xl object-cover bg-white/10 p-0.5 border border-amber-500/40 shadow-md shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/image_48081a60_bc73ebae.jpg';
              }}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white font-black text-sm sm:text-base">
                  {mutfakAdi}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ {mutfakPuani} Puan
                </span>
              </div>
              <p className={`text-xs ${onayBekliyorMu ? 'text-amber-400 font-bold' : 'text-purple-300'}`}>
                {onayBekliyorMu
                  ? '⏳ Başvuru İnceleniyor • Patron Onayı Bekleniyor'
                  : `${mutfakKonumu} • Onaylı Ev Aşçısı`}
              </p>
            </div>
          </div>

          {/* Mutfak Aç/Kapa & Zil & Güvenli Çıkış Butonları */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <MutfakZilButonu />

            {onayBekliyorMu ? (
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-950/70 border border-amber-500/50 text-amber-300 select-none shadow-xs"
                title="Patron onayı tamamlandıktan sonra mutfağınız siparişe açılacaktır"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Onay Bekliyor</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleMutfakDurumu}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mutfakAcik
                    ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-emerald-900/40 shadow-sm'
                    : 'bg-rose-950/80 border border-rose-500 text-rose-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{mutfakAcik ? 'Mutfak Açık' : 'Mutfak Kapalı'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                androidOturumKapatBildir();
                cikisYap();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="Güvenli Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Güvenli Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Gövde ve Sekmeler */}
      <main className="anasayfa-genislik px-4 pt-6 space-y-6">
        {/* ⚠️ ONAY BEKLİYOR BİLGİLENDİRME BANNERI */}
        {onayBekliyorMu && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3.5 text-amber-200 shadow-md">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-300">Mutfak Başvurunuz İnceleniyor (Patron Onayı Bekleniyor)</h4>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Yasal hijyen belgeniz ve esnaf muafiyet evraklarınız Patron Masası tarafından incelenmektedir. Onay işlemi tamamlanana kadar mutfağınız vitrinde listelenmez ve sipariş alımı kilitlidir. Bu esnada aşağıdaki sekmelerden menünüze yemek ekleyebilir ve belgelerinizi kontrol edebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Sekmeler */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-purple-950">
          <button
            type="button"
            onClick={() => setAktifSekme('siparisler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'siparisler'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Ocak & Fırın ({aktifMutfakSiparisleri.length} Sipariş)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('menum')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'menum'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <span>Tencere Menüm ({mutfakYemekleri.length} Çeşit)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('afis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'afis'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mutfak Afişim</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('kazanc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'kazanc'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Hakediş & Kazancım</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('tamamlanan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'tamamlanan'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Tamamlanan ({tamamlananVeGecmisSiparisler.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('belgeler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'belgeler'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>📜 Resmi İzinler & Hijyen / Muafiyet</span>
          </button>
        </div>

        {/* Sekme 1: Aktif Gelen Siparişler */}
        {aktifSekme === 'siparisler' && (
          <div className="space-y-4">
            {aktifMutfakSiparisleri.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-50" />
                <p>Şu an ocakta bekleyen yeni sipariş bulunmuyor.</p>
              </div>
            ) : (
              aktifMutfakSiparisleri.map((sip) => (
                <MutfakTekliSiparisKarti
                  key={sip.id}
                  siparis={sip}
                  onYenile={() => {
                    siparisleriYenile();
                    setGuncellemeSayaci((s) => s + 1);
                  }}
                  onIptalAc={setIptalModalSiparis}
                />
              ))
            )}
          </div>
        )}

        {/* Sekme: Tamamlanan ve İptal Edilen Sipariş Geçmişi */}
        {aktifSekme === 'tamamlanan' && (
          <div className="space-y-4">
            {tamamlananVeGecmisSiparisler.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                <p>Henüz tamamlanmış veya geçmiş sipariş bulunmuyor.</p>
              </div>
            ) : (
              tamamlananVeGecmisSiparisler.map((sip) => (
                <MutfakTekliSiparisKarti
                  key={sip.id}
                  siparis={sip}
                  onYenile={() => {
                    siparisleriYenile();
                    setGuncellemeSayaci((s) => s + 1);
                  }}
                  onIptalAc={() => {}}
                />
              ))
            )}
          </div>
        )}

        {/* Sekme 2: Menüm (Ürün Ekleme & Yönetim) */}
        {aktifSekme === 'menum' && (
          <div className="space-y-4">
            <MutfakTeslimatAyarKarti mutfakId={mutfakId} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={menuArama}
                    onChange={(e) => setMenuArama(e.target.value)}
                    placeholder="Menüde yemek ara..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#180A1F] border border-purple-900/60 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
                  />
                </div>
                <select
                  value={seciliMenuKategori}
                  onChange={(e) => setSeciliMenuKategori(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#180A1F] border border-purple-900/60 text-xs text-purple-200 outline-none focus:border-amber-400"
                >
                  {menuKategorileri.map((kat) => (
                    <option key={kat} value={kat} className="bg-[#1D0A20]">
                      {kat}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-purple-300">
                  {filtrelenmisYemekler.length} / {mutfakYemekleri.length} Çeşit
                </span>
              </div>

              <button
                onClick={() => setYemekModalAcik(true)}
                className="px-3.5 py-2 rounded-xl bg-[#6D237A] hover:bg-[#852C94] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Yemek Ekle</span>
              </button>
            </div>

            {filtrelenmisYemekler.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <UtensilsCrossed className="w-7 h-7 mx-auto mb-2 text-amber-400 opacity-50" />
                <p>Arama kriterine uygun yemek bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtrelenmisYemekler.map((yemek) => {
                  const satistaMi = yemek.stokta_var_mi !== false && yemek.tukendi_mi !== true;
                  return (
                    <div
                      key={yemek.id}
                      className={`p-3.5 rounded-2xl bg-[#180A1F] border transition-all flex items-center justify-between gap-3 group ${
                        satistaMi
                          ? 'border-[#3E1646] hover:border-purple-700'
                          : 'border-rose-900/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={gorselUrlGuvenliYap(yemek.gorsel_url)}
                          alt={yemek.baslik}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-purple-900/60"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">{yemek.baslik}</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {yemek.birim || 'Porsiyon'}: <strong className="text-amber-300">{yemek.fiyat} ₺</strong> • {yemek.hazirlanma_suresi || '25 dk'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {(yemek as any).onay_durumu === 'beklemede' || (yemek as any).onayli_mi === false ? (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                ⏳ Patron Onayı Bekliyor
                              </span>
                            ) : (yemek as any).onay_durumu === 'reddedildi' ? (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                                ❌ Reddedildi
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                                ✅ Vitrinde Yayında
                              </span>
                            )}
                            {yemek.secenek_gruplari && yemek.secenek_gruplari.length > 0 && (
                              <span className="text-[10px] text-amber-300 font-medium">
                                • {yemek.secenek_gruplari.length} Seçenek Grubu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => yemekHizliStokDegistir(yemek)}
                          disabled={stokDegisenYemekId === yemek.id}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            satistaMi
                              ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700/70 text-emerald-300'
                              : 'bg-rose-950/80 hover:bg-rose-900 border-rose-700 text-rose-300'
                          }`}
                          title="Tek tıkla satışa aç veya tükendi yap"
                        >
                          {satistaMi ? 'Satışta' : 'Tükendi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuzenlenenYemek(yemek)}
                          className="px-3 py-1.5 bg-purple-950/80 hover:bg-amber-500 hover:text-purple-950 border border-purple-800/80 hover:border-amber-400 text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sekme: Mutfak Afişim (Ayrı Modül) */}
        {aktifSekme === 'afis' && (
          <MutfakAfisSekmesi
            mutfakId={mutfakId}
            mutfakAdi={mutfakAdi}
          />
        )}

        {/* Sekme 3: Kazanç & Cüzdan */}
        {aktifSekme === 'kazanc' && (
          <MutfakCuzdanSekmesi
            mutfakId={mutfakId}
            mutfakAdi={mutfakAdi}
            toplamSatisTutari={toplamGecerliCiro}
            kayitliKomisyonTutari={toplamKayitliKomisyon}
          />
        )}

        {/* Sekme 4: Resmi İzinler & Hukuki Belgeler */}
        {aktifSekme === 'belgeler' && (
          <MutfakBelgelerSekmesi
            mutfakId={mutfakId}
            mutfakAdi={mutfakAdi}
          />
        )}
      </main>

      {/* Yeni Yemek Ekleme Penceresi */}
      {yemekModalAcik && (
        <YeniYemekEklePenceresi
          mutfakId={mutfakId}
          onKapat={() => setYemekModalAcik(false)}
          onEklendi={(yeniYemek) => {
            setCanliYemekler((prev) => [yeniYemek, ...prev]);
            setGuncellemeSayaci((s) => s + 1);
          }}
        />
      )}

      {/* Mevcut Yemeği Düzenleme Penceresi */}
      {duzenlenenYemek && (
        <YemekDuzenlemePenceresi
          yemek={duzenlenenYemek}
          onKapat={() => setDuzenlenenYemek(null)}
          onGuncellendi={() => setGuncellemeSayaci((s) => s + 1)}
          onSilindi={() => setGuncellemeSayaci((s) => s + 1)}
        />
      )}

      {/* Sipariş İptal Modalı */}
      {iptalModalSiparis && (
        <SiparisIptalPenceresi
          siparisKimligi={iptalModalSiparis.id}
          siparisNo={iptalModalSiparis.kodu}
          onKapat={() => setIptalModalSiparis(null)}
          onBasarili={() => {
            siparisleriYenile();
            setGuncellemeSayaci((s) => s + 1);
          }}
        />
      )}
    </div>
  );
};
