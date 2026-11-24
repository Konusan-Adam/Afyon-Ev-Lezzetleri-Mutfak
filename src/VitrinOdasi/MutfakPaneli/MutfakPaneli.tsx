import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Store,
  Layers,
  Trash2,
  Coffee,
  Package,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { Yemek, CokluMenuTipi } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonuCanliDinle, belgeKaydet, koleksiyonGetir } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { useMusteriSiparisleri } from '@/src/MalzemeCekmeceleri/useMusteriSiparisleri';
import { gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';
import {
  useMutfakCokluMenuleri,
  cokluMenuStokDegistir,
  cokluMenuSil,
} from '@/src/MalzemeCekmeceleri/Mutfak/cokluMenuIslemleri';
import { YeniYemekEklePenceresi } from './YeniYemekEklePenceresi';
import { YemekDuzenlemePenceresi } from './YemekDuzenlemePenceresi';
import { CokluMenuKolajOnizleme } from './CokluMenuKolajOnizleme';
import { CokluMenuOlusturPenceresi } from './CokluMenuOlusturPenceresi';
import { MutfakCuzdanSekmesi } from './MutfakCuzdanSekmesi';
import { MutfakDukkanimSekmesi, DukkanBolumu } from './MutfakDukkanimSekmesi';
import { MutfakAltNavigasyon, MutfakAnaSekme } from './MutfakAltNavigasyon';
import { SiparisIptalPenceresi } from '../Bilesenler/MutfakYonetimi/SiparisIptalPenceresi';
import { MutfakZilButonu } from '../Bilesenler/Mutfak/MutfakZilButonu';
import { SesliAsistanButonu } from '../Bilesenler/Mutfak/SesliAsistanButonu';
import { MutfakTekliSiparisKarti } from '../Bilesenler/Mutfak/MutfakTekliSiparisKarti';
import { MutfakPisirmeOzetiKarti } from '../Bilesenler/Mutfak/MutfakPisirmeOzetiKarti';
import { useMutfakBildirimleri } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakBildirimleri';
import { ekranUyanikTutBaslat } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';
import {
  androidMutfakOturumBildir,
  androidOturumKapatBildir,
} from '@/src/MalzemeCekmeceleri/Mutfak/AndroidKopruServisi';
import { androidZilTercihiniSenkronizeEt } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilMelodileri';
import { MutfakYeniSiparisUyarisi } from '../Bilesenler/Mutfak/MutfakYeniSiparisUyarisi';
import { MutfakSiparisIptalUyarisi } from '../Bilesenler/Mutfak/MutfakSiparisIptalUyarisi';
import { MutfakGirisEkrani } from './MutfakGirisEkrani';
import { ApkGuncellemeUyarisi } from './ApkGuncellemeUyarisi';
import { GunlukStokPlanlayiciPenceresi } from './GunlukStokPlanlayiciPenceresi';
import { MutfakMolaPenceresi } from './MutfakMolaPenceresi';
import {
  yemekStokVeMinSepetAnalizEt,
  siparisStokDusumuUygula,
  siparisStokIadeUygula,
} from '@/src/MalzemeCekmeceleri/Mutfak/gunlukStokIslemleri';
import { MutfakDurumUyariKarti } from './MutfakDurumUyariKarti';
import { mutfakRoluMu } from '@/src/MalzemeCekmeceleri/Mutfak/mutfakKullaniciSorgusu';

function telefonRakamTemizle(tel?: string): string {
  if (!tel) return '';
  const rakam = tel.replace(/\D/g, '');
  if (rakam.startsWith('90') && rakam.length === 12) return rakam.slice(2);
  if (rakam.startsWith('0') && rakam.length === 11) return rakam.slice(1);
  return rakam;
}

function kayitBuMutfagaAitMi(kayitMutfakId: string | undefined, mutfakId: string): boolean {
  if (!kayitMutfakId || !mutfakId) return false;
  return kayitMutfakId === mutfakId;
}

function mutfakDokumaniKullaniciyaAitMi(
  doc: any,
  hedefKimlik: string,
  kullaniciTelefon?: string
): boolean {
  if (!doc) return false;
  const docId = doc.id || doc.kimlik;
  if (kayitBuMutfagaAitMi(docId, hedefKimlik)) return true;
  if (doc.kimlik && kayitBuMutfagaAitMi(doc.kimlik, hedefKimlik)) return true;
  if (doc.sahip_id && kayitBuMutfagaAitMi(doc.sahip_id, hedefKimlik)) return true;
  const temizKullaniciTel = telefonRakamTemizle(kullaniciTelefon);
  const temizDocTel = telefonRakamTemizle(doc.telefon);
  return Boolean(temizKullaniciTel && temizDocTel && temizKullaniciTel === temizDocTel);
}

export const MutfakPaneli: React.FC = () => {
  const { aktifKullanici, cikisYap } = kullaniciHafizasiKullan();
  const [mutfakAcik, setMutfakAcik] = useState(true);
  const [mutfakKaydi, setMutfakKaydi] = useState<any>(null);
  const [tumMutfaklar, setTumMutfaklar] = useState<any[]>([]);

  const [aktifSekme, setAktifSekme] = useState<MutfakAnaSekme>('siparisler');
  const [kazancAltSekme, setKazancAltSekme] = useState<'cuzdan' | 'tamamlanan'>('cuzdan');
  const [yemekModalAcik, setYemekModalAcik] = useState(false);
  const [duzenlenenYemek, setDuzenlenenYemek] = useState<Yemek | null>(null);
  const [iptalModalSiparis, setIptalModalSiparis] = useState<{ id: string; kodu: string } | null>(null);
  const [guncellemeSayaci, setGuncellemeSayaci] = useState(0);
  const [tamamlananKoleksiyonSiparisleri, setTamamlananKoleksiyonSiparisleri] = useState<any[]>([]);
  const [menuArama, setMenuArama] = useState('');
  const [seciliMenuKategori, setSeciliMenuKategori] = useState('Tümü');
  const [stokDegisenYemekId, setStokDegisenYemekId] = useState<string | null>(null);
  const [cokluMenuModalAcik, setCokluMenuModalAcik] = useState(false);
  const [duzenlenecekCokluMenu, setDuzenlenecekCokluMenu] = useState<CokluMenuTipi | null>(null);
  const [stokDegisenCokluMenuId, setStokDegisenCokluMenuId] = useState<string | null>(null);
  const [silinecekCokluMenuId, setSilinecekCokluMenuId] = useState<string | null>(null);
  const [stokPlanlayiciAcik, setStokPlanlayiciAcik] = useState(false);
  const [molaModalAcik, setMolaModalAcik] = useState(false);
  const [dukkanAcikBolumIstegi, setDukkanAcikBolumIstegi] = useState<{
    bolum: DukkanBolumu;
    tetik: number;
  } | null>(null);
  const islenenStokSiparisleriRef = useRef<Set<string>>(new Set());
  const iadeEdilenStokSiparisleriRef = useRef<Set<string>>(new Set());

  const { siparisler: canliSiparisler, yenile: siparisleriYenile } = useMusteriSiparisleri();

  const kullaniciHamMutfakId = aktifKullanici?.kimlik || aktifKullanici?.id || '';
  const mutfakId = mutfakKaydi?.id || mutfakKaydi?.kimlik || kullaniciHamMutfakId;

  const mutfakAdi =
    mutfakKaydi?.mutfak_adi ||
    mutfakKaydi?.ad ||
    (aktifKullanici?.isletme_adi || aktifKullanici?.ad_soyad || 'Afyon Ev Mutfağı');

  const oturumYetkiliMi = Boolean(aktifKullanici && mutfakRoluMu(aktifKullanici.rol));

  // Mutfak kaydını canlı dinle (puan, mahalle, açık/kapalı durumu, onay durumu, teslimat ayarları)
  useEffect(() => {
    if (!oturumYetkiliMi || !canliFirebaseAktifMi()) return;

    const abonelikDurdur = koleksiyonuCanliDinle<any>('mutfaklar', (mutfaklar) => {
      const gecerliMutfaklar = mutfaklar.filter(
        (m) => (m.id || m.kimlik) !== 'yonetici_patron_01'
      );
      setTumMutfaklar(gecerliMutfaklar);

      const bulunan = gecerliMutfaklar.find((m) =>
        mutfakDokumaniKullaniciyaAitMi(m, kullaniciHamMutfakId, aktifKullanici?.telefon)
      );

      if (bulunan) {
        setMutfakKaydi(bulunan);
        if (typeof bulunan.acik_mi === 'boolean') {
          setMutfakAcik(bulunan.acik_mi);
        }
      }
    });

    return () => abonelikDurdur();
  }, [oturumYetkiliMi, kullaniciHamMutfakId, aktifKullanici?.telefon]);

  // 🔔 Canlı Sipariş Zil & İptal Alarmı Dedektörü
  const { yeniSiparisUyarisi, iptalSiparisUyarisi, uyariKapat, iptalUyarisiKapat } = useMutfakBildirimleri(mutfakId, {
    aktifMi: oturumYetkiliMi,
    ekMutfakKimlikleri: [mutfakKaydi?.id, mutfakKaydi?.kimlik].filter(Boolean) as string[],
    tumMutfaklariDinle: false,
  });

  // 🍱 Çoklu Menüler (coklu_menuler koleksiyonu)
  const { menuler: cokluMenuler } = useMutfakCokluMenuleri(mutfakId, oturumYetkiliMi);

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
      tumMutfaklar: false,
    });
    androidZilTercihiniSenkronizeEt();
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

  const askidaMi = Boolean(mutfakKaydi?.askida_mi || (aktifKullanici as any)?.askida_mi);

  const reddedildiMi =
    mutfakKaydi?.onay_durumu === 'reddedildi' ||
    (!mutfakKaydi && (aktifKullanici as any)?.onay_durumu === 'reddedildi');

  const onayBekliyorMu =
    !askidaMi &&
    !reddedildiMi &&
    (
      mutfakKaydi?.onay_durumu === 'beklemede' ||
      mutfakKaydi?.onayli_mi === false ||
      (!mutfakKaydi && ((aktifKullanici as any)?.onay_durumu === 'beklemede' || (aktifKullanici as any)?.onayli_mi === false))
    );

  const operasyonKilitliMi = askidaMi || reddedildiMi || onayBekliyorMu;

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
  const minSiparisTutari = Number(mutfakKaydi?.min_siparis_tutari ?? 100);

  const kritikStokSayisi = useMemo(() => {
    return mutfakYemekleri.filter((y) => {
      const analiz = yemekStokVeMinSepetAnalizEt(y, minSiparisTutari);
      return analiz.kritikAzMi || analiz.minSepetAltindaMi;
    }).length;
  }, [mutfakYemekleri, minSiparisTutari]);

  // Gelen siparişlere göre günlük kalan stoğu otomatik düşür, iptalde geri iade et
  useEffect(() => {
    if (!oturumYetkiliMi || mutfakYemekleri.length === 0 || buMutfaginCanliSiparisleri.length === 0) {
      return;
    }

    buMutfaginCanliSiparisleri.forEach((sip) => {
      if (!sip?.id) return;

      if (
        sip.durum !== 'iptal' &&
        sip.durum !== 'teslim_edildi' &&
        sip.stok_dusuldu_mu !== true &&
        !islenenStokSiparisleriRef.current.has(sip.id)
      ) {
        islenenStokSiparisleriRef.current.add(sip.id);
        siparisStokDusumuUygula(sip, mutfakYemekleri).catch(() => {
          islenenStokSiparisleriRef.current.delete(sip.id);
        });
      }

      if (
        sip.durum === 'iptal' &&
        sip.stok_dusuldu_mu === true &&
        sip.stok_iade_edildi_mi !== true &&
        !iadeEdilenStokSiparisleriRef.current.has(sip.id)
      ) {
        iadeEdilenStokSiparisleriRef.current.add(sip.id);
        siparisStokIadeUygula(sip.id).catch(() => {
          iadeEdilenStokSiparisleriRef.current.delete(sip.id);
        });
      }
    });
  }, [oturumYetkiliMi, buMutfaginCanliSiparisleri, mutfakYemekleri]);

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
    if (operasyonKilitliMi) return;
    const yeniDurum = !mutfakAcik;
    setMutfakAcik(yeniDurum);

    if (canliFirebaseAktifMi() && mutfakId && mutfakId !== 'yonetici_patron_01') {
      try {
        let mutfak = mutfakKaydi;
        if (!mutfak) {
          const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
          mutfak = mutfaklar.find((m) =>
            mutfakDokumaniKullaniciyaAitMi(m, mutfakId, aktifKullanici?.telefon)
          );
        }
        const hedefId = mutfak?.id || mutfak?.kimlik || mutfakId;
        const guncellemeVerisi = yeniDurum
          ? { acik_mi: true, mola_durumu: false, mola_bitis_zamani: null }
          : { acik_mi: false };

        await belgeKaydet(
          'mutfaklar',
          hedefId,
          mutfak
            ? guncellemeVerisi
            : { id: hedefId, ad: mutfakAdi, ...guncellemeVerisi }
        );
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
      const guncelleme: any = {
        stokta_var_mi: yeniSatista,
        tukendi_mi: !yeniSatista,
      };
      if (yeniSatista && yemek.sinirsiz_stok !== true && typeof yemek.gunluk_stok === 'number' && Number(yemek.kalan_stok ?? 0) <= 0) {
        guncelleme.kalan_stok = Math.max(1, Number(yemek.gunluk_stok));
      }
      if (canliFirebaseAktifMi()) {
        await belgeKaydet('yemekler', yemek.id, guncelleme);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
      }
    } finally {
      setStokDegisenYemekId(null);
    }
  };

  const cokluMenuHizliStokDegistir = async (menu: CokluMenuTipi) => {
    const suAnSatista = menu.stokta_var_mi !== false && menu.tukendi_mi !== true;
    setStokDegisenCokluMenuId(menu.id);
    try {
      await cokluMenuStokDegistir(menu.id, !suAnSatista);
    } finally {
      setStokDegisenCokluMenuId(null);
    }
  };

  const cokluMenuKaliciSil = async (menuId: string) => {
    await cokluMenuSil(menuId);
    setSilinecekCokluMenuId(null);
  };

  if (!aktifKullanici || !mutfakRoluMu(aktifKullanici.rol)) {
    return <MutfakGirisEkrani />;
  }

  const mutfakPuani = Number(mutfakKaydi?.puan || 5.0).toFixed(1);
  const mutfakKonumu =
    mutfakKaydi?.mahalle ||
    mutfakKaydi?.adres ||
    `${aktifKullanici?.ilce || 'Merkez'}, Afyonkarahisar`;
  const logoSrc = '/assets/aistudio/image_48081a60_bc73ebae.jpg';

  return (
    <div className="w-full min-h-screen bg-[#0C020E] text-gray-200 select-none pb-24 md:pb-16">
      {/* 🔔 YENİ SİPARİŞ CANLI FLAŞ BİLDİRİMİ & ZİL ALARMI */}
      <MutfakYeniSiparisUyarisi
        uyari={yeniSiparisUyarisi}
        onKapat={uyariKapat}
        onSipariseGit={() => setAktifSekme('siparisler')}
      />

      {/* 🛑 MÜŞTERİ SİPARİŞ İPTAL & İADE ACİL ALARMI */}
      <MutfakSiparisIptalUyarisi
        uyari={iptalSiparisUyarisi}
        onKapat={iptalUyarisiKapat}
        onGecmiseGit={() => {
          setAktifSekme('kazanc');
          setKazancAltSekme('tamamlanan');
        }}
      />

      {/* 📲 APK OTOMATİK GÜNCELLEME UYARISI (Yalnızca Android Uygulamasında Görünür) */}
      <ApkGuncellemeUyarisi />

      {/* Üst Başlık Barı (Mobilde sadece Mutfak Adı + Aç/Kapa butonu, masaüstünde tam kontroller) */}
      <header className="bg-[#180A1F] border-b border-[#3E1646] px-3.5 sm:px-4 py-3.5 sticky top-0 z-30 backdrop-blur-md">
        <div className="anasayfa-genislik flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <img
              src={logoSrc}
              alt="Mutfak Logosu"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover bg-white/10 p-0.5 border border-amber-500/40 shadow-md shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/image_48081a60_bc73ebae.jpg';
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-white font-black text-sm sm:text-base truncate">
                  {mutfakAdi}
                </h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  ★ {mutfakPuani}
                </span>
              </div>
              <p
                className={`text-[11px] sm:text-xs truncate ${
                  askidaMi || reddedildiMi
                    ? 'text-rose-400 font-bold'
                    : onayBekliyorMu
                    ? 'text-amber-400 font-bold'
                    : 'text-purple-300'
                }`}
              >
                {askidaMi
                  ? '⏸ Mutfağınız Geçici Askıda'
                  : reddedildiMi
                  ? '✕ Başvuru Revizyonu Gerekli'
                  : onayBekliyorMu
                  ? '⏳ Patron Onayı Bekleniyor'
                  : `${mutfakKonumu}`}
              </p>
            </div>
          </div>

          {/* Sağ Alan: Masaüstünde Sesli Asistan + Zil + Çıkış, mobilde sadece Aç/Kapa */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              <SesliAsistanButonu />
              <MutfakZilButonu />
            </div>

            {operasyonKilitliMi ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border select-none shadow-xs ${
                  askidaMi || reddedildiMi
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                }`}
                title="Patron incelemesi tamamlandıktan sonra mutfağınız siparişe açılacaktır"
              >
                <Clock className={`w-3.5 h-3.5 ${askidaMi || reddedildiMi ? 'text-rose-400' : 'text-amber-400'}`} />
                <span>
                  {askidaMi ? 'Askıda' : reddedildiMi ? 'Reddedildi' : 'Onay Bekliyor'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleMutfakDurumu}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                  mutfakAcik
                    ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300 shadow-emerald-900/40 shadow-sm'
                    : 'bg-rose-950/90 border border-rose-500 text-rose-300'
                }`}
              >
                <Power className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>
                  {mutfakAcik
                    ? 'Dükkan Açık'
                    : mutfakKaydi?.mola_durumu
                    ? 'Molada'
                    : 'Dükkan Kapalı'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                androidOturumKapatBildir();
                cikisYap();
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 text-xs font-bold transition-all cursor-pointer"
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
        {/* Askıya Alınma / Başvuru Reddi / Onay Bekliyor Uyarı Kartı */}
        <MutfakDurumUyariKarti
          askidaMi={askidaMi}
          reddedildiMi={reddedildiMi}
          onayBekliyorMu={onayBekliyorMu}
          askiGerekcesi={mutfakKaydi?.aski_gerekcesi || mutfakKaydi?.askiya_alma_nedeni}
          redGerekcesi={mutfakKaydi?.red_gerekcesi || mutfakKaydi?.red_nedeni}
          onBelgelerimeGit={() => {
            setAktifSekme('dukkanim');
            setDukkanAcikBolumIstegi({ bolum: 'belgeler', tetik: Date.now() });
          }}
        />

        {/* Masaüstü 4 Ana Sekme (Mobilde aşağıdaki sabit 4'lü bar kullanılır) */}
        <div className="hidden md:flex items-center gap-2.5 pb-2 border-b border-purple-950">
          <button
            type="button"
            onClick={() => setAktifSekme('siparisler')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
              aktifSekme === 'siparisler'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Siparişler ({aktifMutfakSiparisleri.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAktifSekme('menum');
              setYemekModalAcik(false);
              setDuzenlenenYemek(null);
              setCokluMenuModalAcik(false);
              setDuzenlenecekCokluMenu(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
              aktifSekme === 'menum'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <span>Tencere Menüm ({mutfakYemekleri.length + cokluMenuler.length} Çeşit)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('kazanc')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
              aktifSekme === 'kazanc'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Kazancım & Geçmiş ({tamamlananVeGecmisSiparisler.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('dukkanim')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
              aktifSekme === 'dukkanim'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Dükkanım & Ayarlar</span>
          </button>

          <button
            type="button"
            onClick={() => setMolaModalAcik(true)}
            className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap transition-all border ${
              mutfakKaydi?.mola_durumu === true
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                : 'bg-[#180A1F] hover:bg-[#240D2E] border-[#3E1646] text-amber-300'
            }`}
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>{mutfakKaydi?.mola_durumu === true ? 'Molada • Yönet' : 'Mola Ver'}</span>
          </button>
        </div>

        {/* Sekme 1: Aktif Gelen Siparişler */}
        {aktifSekme === 'siparisler' && (
          <div className="space-y-4">
            {/* Aktif Mola Uyarısı */}
            {mutfakKaydi?.mola_durumu === true && (
              <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-300">Mutfağınız Şu An Dinlenme / Mola Modunda</p>
                    <p className="text-[11px] text-amber-200/80">
                      {mutfakKaydi?.mola_bitis_zamani
                        ? `Tahmini bitiş: ${new Date(mutfakKaydi.mola_bitis_zamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • Yeni siparişler duraklatıldı.`
                        : 'Yeni sipariş alımı geçici olarak duraklatıldı.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMolaModalAcik(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs cursor-pointer shrink-0 transition-all"
                >
                  Molayı Yönet / Bitir
                </button>
              </div>
            )}

            {/* Canlı Tencere & Fırın Özeti (Toplu Pişirme Sayacı) */}
            <MutfakPisirmeOzetiKarti siparisler={aktifMutfakSiparisleri} />

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
                  mutfakAdi={mutfakAdi}
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

        {/* Sekme 2: Menüm (Liste görünümü veya tam sayfa Yemek / Çoklu Menü Oluşturma sayfaları) */}
        {aktifSekme === 'menum' && (
          yemekModalAcik ? (
            <YeniYemekEklePenceresi
              mutfakId={mutfakId}
              onKapat={() => {
                setYemekModalAcik(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onEklendi={(yeniYemek) => {
                setCanliYemekler((prev) => [yeniYemek, ...prev]);
                setGuncellemeSayaci((s) => s + 1);
              }}
            />
          ) : duzenlenenYemek ? (
            <YemekDuzenlemePenceresi
              yemek={duzenlenenYemek}
              onKapat={() => {
                setDuzenlenenYemek(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGuncellendi={() => setGuncellemeSayaci((s) => s + 1)}
              onSilindi={() => setGuncellemeSayaci((s) => s + 1)}
            />
          ) : cokluMenuModalAcik ? (
            <CokluMenuOlusturPenceresi
              mutfakId={mutfakId}
              mutfakAdi={mutfakAdi}
              duzenlenecekMenu={duzenlenecekCokluMenu}
              onKapat={() => {
                setCokluMenuModalAcik(false);
                setDuzenlenecekCokluMenu(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
          <div className="space-y-4">
            {/* 1. ÖNCELİK: Kaydırmadan ilk ekranda kocaman "+ Yeni Yemek Ekle" ve altında "+ Çoklu Menü Oluştur" */}
            <div className="flex flex-col gap-3 bg-[#180A1F] border border-purple-900/60 rounded-2xl p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    Tencere Menüm ({mutfakYemekleri.length} Yemek • {cokluMenuler.length} Çoklu Menü)
                  </h2>
                  <p className="text-[11px] text-purple-300/80">
                    Tekli yemek veya 4-15+ çeşitlik özel çoklu menü paketi oluşturabilirsiniz.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setYemekModalAcik(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-5 py-3.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 text-sm sm:text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span>Yeni Yemek Ekle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuzenlenecekCokluMenu(null);
                      setCokluMenuModalAcik(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-[#271033] hover:bg-[#351646] border border-amber-500/50 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>+ Çoklu Menü Oluştur (Sınırsız Çeşit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStokPlanlayiciAcik(true)}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-[#1E0B27] hover:bg-[#2D103A] border border-purple-700/70 text-purple-100 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Günlük Stok &amp; Kota Planla</span>
                    {kritikStokSayisi > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-purple-950 text-[10px] font-black">
                        {kritikStokSayisi}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Çoklu Menüler Listesi */}
            {cokluMenuler.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Çoklu Menülerim ({cokluMenuler.length})</span>
                  </span>
                  <span className="text-[11px] text-purple-300/70">
                    Vitrinde en fazla 6&apos;lı kolaj olarak görünür
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cokluMenuler.map((menu) => {
                    const satistaMi = menu.stokta_var_mi !== false && menu.tukendi_mi !== true;
                    const kalemSayisi = menu.kalemler?.length || 0;
                    const ornekCesitler = (menu.kalemler || []).slice(0, 4).map((k) => k.ad).join(', ');
                    return (
                      <div
                        key={menu.id}
                        className={`p-3.5 rounded-2xl bg-[#180A1F] border transition-all flex items-center justify-between gap-3 ${
                          satistaMi ? 'border-amber-500/35 hover:border-amber-400/70' : 'border-rose-900/60 opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <CokluMenuKolajOnizleme
                            gorseller={menu.kapak_gorselleri}
                            toplamCesitSayisi={kalemSayisi}
                            boyutSinifi="w-16 h-16"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm sm:text-xs font-black text-white truncate">
                                {menu.baslik}
                              </h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                                {kalemSayisi} Çeşit
                              </span>
                            </div>
                            <p className="text-xs sm:text-[11px] text-gray-300 mt-0.5">
                              <strong className="text-amber-300">{menu.fiyat} ₺</strong> • {menu.hazirlanma_suresi || '35-45 dk'}
                            </p>
                            {ornekCesitler && (
                              <p className="text-[10px] text-purple-300/80 truncate mt-0.5">
                                {ornekCesitler}{kalemSayisi > 4 ? ` +${kalemSayisi - 4} diğer` : ''}
                              </p>
                            )}
                            <div className="mt-1.5">
                              {menu.onay_durumu === 'beklemede' || menu.onayli_mi === false ? (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                  ⏳ Patron Onayı Bekliyor
                                </span>
                              ) : menu.onay_durumu === 'reddedildi' ? (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                                  ❌ Reddedildi
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                                  ✅ Vitrinde Yayında
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => cokluMenuHizliStokDegistir(menu)}
                            disabled={stokDegisenCokluMenuId === menu.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              satistaMi
                                ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-600/80 text-emerald-300'
                                : 'bg-rose-950/80 hover:bg-rose-900 border-rose-600 text-rose-300'
                            }`}
                          >
                            {satistaMi ? 'Satışta' : 'Bitti'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDuzenlenecekCokluMenu(menu);
                              setCokluMenuModalAcik(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3 py-1.5 bg-purple-950/80 hover:bg-amber-500 hover:text-purple-950 border border-purple-700/80 text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Düzenle</span>
                          </button>
                          {silinecekCokluMenuId === menu.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => cokluMenuKaliciSil(menu.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                              >
                                Sil
                              </button>
                              <button
                                type="button"
                                onClick={() => setSilinecekCokluMenuId(null)}
                                className="px-2 py-1 rounded-lg bg-purple-900 text-gray-200 text-[10px] font-bold cursor-pointer"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSilinecekCokluMenuId(menu.id)}
                              className="px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Sil</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Arama ve Kategori Filtresi */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3 sm:top-2.5" />
                <input
                  type="text"
                  value={menuArama}
                  onChange={(e) => setMenuArama(e.target.value)}
                  placeholder="Menüde yemek ara..."
                  className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded-xl bg-[#180A1F] border border-purple-900/60 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={seciliMenuKategori}
                  onChange={(e) => setSeciliMenuKategori(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-2.5 sm:py-2 rounded-xl bg-[#180A1F] border border-purple-900/60 text-xs text-purple-200 outline-none focus:border-amber-400"
                >
                  {menuKategorileri.map((kat) => (
                    <option key={kat} value={kat} className="bg-[#1D0A20]">
                      {kat}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-purple-300 shrink-0 px-1">
                  {filtrelenmisYemekler.length} / {mutfakYemekleri.length}
                </span>
              </div>
            </div>

            {filtrelenmisYemekler.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <UtensilsCrossed className="w-7 h-7 mx-auto mb-2 text-amber-400 opacity-50" />
                <p>Arama kriterine uygun yemek bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filtrelenmisYemekler.map((yemek) => {
                  const stokAnalizi = yemekStokVeMinSepetAnalizEt(yemek, minSiparisTutari);
                  const satistaMi = yemek.stokta_var_mi !== false && yemek.tukendi_mi !== true && !stokAnalizi.tukendiMi;
                  const guvenliGorsel = gorselUrlGuvenliYap(yemek.gorsel_url) || logoSrc;
                  return (
                    <div
                      key={yemek.id}
                      className={`p-3.5 rounded-2xl bg-[#180A1F] border transition-all flex items-center justify-between gap-3 group ${
                        satistaMi
                          ? 'border-[#3E1646] hover:border-purple-700'
                          : 'border-rose-900/60 opacity-85'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={guvenliGorsel}
                          alt={yemek.baslik}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (!img.src.endsWith(logoSrc)) {
                              img.src = logoSrc;
                            }
                          }}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-purple-900/60 bg-purple-950/50"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-xs font-bold text-white truncate">{yemek.baslik}</h4>
                          <p className="text-xs sm:text-[11px] text-gray-300 mt-0.5">
                            {yemek.birim || 'Porsiyon'}: <strong className="text-amber-300">{yemek.fiyat} ₺</strong> • {yemek.hazirlanma_suresi || '25 dk'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
                            {stokAnalizi.sinirliMi && (
                              stokAnalizi.tukendiMi ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-200 font-extrabold border border-rose-500/50">
                                  ⛔ Stok Tükendi (0/{stokAnalizi.gunlukStok})
                                </span>
                              ) : stokAnalizi.kritikAzMi ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-black border border-amber-400/60">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span>{stokAnalizi.sonKaldiMetni}!</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-200 font-bold border border-purple-700/50">
                                  📦 Kalan: {stokAnalizi.kalanStok}/{stokAnalizi.gunlukStok} {stokAnalizi.birim}
                                </span>
                              )
                            )}
                            {stokAnalizi.minSepetAltindaMi && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-950/90 text-orange-200 font-bold border border-orange-500/50"
                                title={`Tek başına min. ${stokAnalizi.minSepetTutari} ₺ sepete ulaşmaz (+${stokAnalizi.eksikSepetTutari} ₺ gerekir)`}
                              >
                                <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                                <span>Kalan {stokAnalizi.kalanToplamDeger} ₺ (&lt; Min. {stokAnalizi.minSepetTutari} ₺)</span>
                              </span>
                            )}
                            {yemek.secenek_gruplari && yemek.secenek_gruplari.length > 0 && (
                              <span className="text-[10px] text-amber-300 font-medium">
                                • {yemek.secenek_gruplari.length} Seçenek
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => yemekHizliStokDegistir(yemek)}
                          disabled={stokDegisenYemekId === yemek.id}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            satistaMi
                              ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-600/80 text-emerald-300'
                              : 'bg-rose-950/80 hover:bg-rose-900 border-rose-600 text-rose-300'
                          }`}
                          title="Tek tıkla satışa aç veya bitti yap"
                        >
                          {satistaMi ? 'Satışta' : 'Bitti'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDuzenlenenYemek(yemek);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3.5 py-2 bg-purple-950/80 hover:bg-amber-500 hover:text-purple-950 border border-purple-700/80 hover:border-amber-400 text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
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
          )
        )}

        {/* Sekme 3: Kazancım & Tamamlanan Geçmiş */}
        {aktifSekme === 'kazanc' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#180A1F] border border-purple-900/60">
              <button
                type="button"
                onClick={() => setKazancAltSekme('cuzdan')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  kazancAltSekme === 'cuzdan'
                    ? 'bg-[#6D237A] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Cüzdan & Hakediş</span>
              </button>
              <button
                type="button"
                onClick={() => setKazancAltSekme('tamamlanan')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  kazancAltSekme === 'tamamlanan'
                    ? 'bg-[#6D237A] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Geçmiş ({tamamlananVeGecmisSiparisler.length})</span>
              </button>
            </div>

            {kazancAltSekme === 'cuzdan' ? (
              <MutfakCuzdanSekmesi
                mutfakId={mutfakId}
                mutfakAdi={mutfakAdi}
                toplamSatisTutari={toplamGecerliCiro}
                kayitliKomisyonTutari={toplamKayitliKomisyon}
              />
            ) : (
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
                      mutfakAdi={mutfakAdi}
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
          </div>
        )}

        {/* Sekme 4: Dükkanım (Ayarlar, Afiş, Belgeler, Ses ve Çıkış) */}
        {aktifSekme === 'dukkanim' && (
          <MutfakDukkanimSekmesi
            mutfakId={mutfakId}
            mutfakAdi={mutfakAdi}
            mutfakKaydi={mutfakKaydi}
            mutfakAcik={mutfakAcik}
            onMutfakDurumuDegistir={setMutfakAcik}
            acikBolumIstegi={dukkanAcikBolumIstegi}
            onCikisYap={() => {
              androidOturumKapatBildir();
              cikisYap();
            }}
          />
        )}
      </main>

      {/* Mobilde Sabit 5 Büyük Alt Sekme Barı */}
      <MutfakAltNavigasyon
        aktifSekme={aktifSekme}
        onSekmeSec={(sekme) => {
          setAktifSekme(sekme);
          if (sekme === 'menum') {
            setYemekModalAcik(false);
            setDuzenlenenYemek(null);
            setCokluMenuModalAcik(false);
            setDuzenlenecekCokluMenu(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aktifSiparisSayisi={aktifMutfakSiparisleri.length}
        yemekSayisi={mutfakYemekleri.length + cokluMenuler.length}
        onMolaAc={() => setMolaModalAcik(true)}
        molaAktifMi={mutfakKaydi?.mola_durumu === true}
      />

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

      {/* Günlük Stok & Kota Planlayıcı Modalı */}
      {stokPlanlayiciAcik && (
        <GunlukStokPlanlayiciPenceresi
          yemekler={mutfakYemekleri}
          mutfakAdi={mutfakAdi}
          minSiparisTutari={minSiparisTutari}
          onKapat={() => setStokPlanlayiciAcik(false)}
        />
      )}

      {/* Mutfak Dinlenme / Mola Modu Modalı */}
      {molaModalAcik && (
        <MutfakMolaPenceresi
          mutfakId={mutfakId}
          mutfakKaydi={mutfakKaydi}
          onKapat={() => setMolaModalAcik(false)}
        />
      )}
    </div>
  );
};
