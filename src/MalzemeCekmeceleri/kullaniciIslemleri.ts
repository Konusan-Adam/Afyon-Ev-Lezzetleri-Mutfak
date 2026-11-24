import { Kullanici } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import {
  testKullaniciDogrula,
  testKullaniciEkle,
  TestKullaniciKaydi
} from '@/src/veritabani/CanliVeriYardimcisi';
import {
  mutfakKullanicisiniSorgula,
  mutfakRoluMu,
  YETKISIZ_ROL_UYARISI,
} from '@/src/MalzemeCekmeceleri/Mutfak/mutfakKullaniciSorgusu';
import { telefonGecerliMi } from './Dogrulama/telefonDogrulayici';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';
import {
  hukukiSozlesmeleriGetir,
} from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukDeposu';
import { hukukiDelilDamgalaVeKaydet } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukiDelilServisi';
import {
  GUVENLIK_SORULARI,
  GUVENLIK_SORUSU_ONEM_ACIKLAMASI,
  guvenlikCevabiniStandartlastir,
  kullaniciGuvenlikSorusuGetir,
  sifreSifirlaGuvenlikSorusuIle,
  telefonRakamlariniTemizle,
} from './GuvenlikSorusuServisi';

export {
  GUVENLIK_SORULARI,
  GUVENLIK_SORUSU_ONEM_ACIKLAMASI,
  kullaniciGuvenlikSorusuGetir,
  sifreSifirlaGuvenlikSorusuIle,
};

function telefonTemizle(tel: string): string {
  return telefonRakamlariniTemizle(tel);
}

export async function veritabaninaKullaniciKaydet(
  yeniKullanici: Omit<Kullanici, 'kimlik' | 'onayli_mi' | 'olusturma_tarihi'> & {
    sifre?: string;
    guvenlik_sorusu?: string;
    guvenlik_cevabi?: string;
    adres?: string;
    calisma_modeli?: string;
    hijyen_belgesi_durumu?: string;
    esnaf_muafiyet_durumu?: string;
    belgeler?: any;
    sozlesme_onayli?: boolean;
    kvkk_onayli?: boolean;
  }
): Promise<Kullanici | null> {
  const dogrulama = telefonGecerliMi(yeniKullanici.telefon);
  if (!dogrulama.gecerli) {
    console.warn('Geçersiz telefon numarası ile kayıt reddedildi:', yeniKullanici.telefon);
    return null;
  }

  if (!mutfakRoluMu(yeniKullanici.rol)) {
    console.warn('Bu modülden yalnızca mutfak hesabı oluşturulabilir:', yeniKullanici.rol);
    return null;
  }

  const standartTelefon = telefonTemizle(yeniKullanici.telefon);

  // Aynı telefon numarasıyla yalnızca mutfak rolünde ikinci bir kayıt açılmasını engelle; diğer rollere dokunma
  if (canliFirebaseAktifMi()) {
    try {
      const { kullanici: mevcutMutfak } = await mutfakKullanicisiniSorgula(standartTelefon);
      if (mevcutMutfak) {
        console.warn('Bu telefon numarası ile zaten kayıtlı bir mutfak hesabı var:', standartTelefon);
        return null;
      }
    } catch {}
  }

  const sifreMetni = yeniKullanici.sifre || '1234';
  const duzgunTelefon = standartTelefon.startsWith('0') ? standartTelefon : `0${standartTelefon}`;
  const kimlikId = standartTelefon ? `mutfak_${duzgunTelefon}` : `usr_${Date.now()}`;
  const simdiIso = new Date().toISOString();

  const hijyenVarMi = yeniKullanici.hijyen_belgesi_durumu === 'evet';
  const muafiyetVarMi = yeniKullanici.esnaf_muafiyet_durumu === 'evet';

  const basvuruBelgeleri = yeniKullanici.belgeler || {
    hijyenBelgesiVarMi: hijyenVarMi,
    hijyenOnayDurumu: hijyenVarMi ? 'onay_bekliyor' : 'yuklenmedi',
    esnafMuafiyetVarMi: muafiyetVarMi,
    muafiyetOnayDurumu: muafiyetVarMi ? 'onay_bekliyor' : 'yuklenmedi',
    sonGuncellemeTarihi: simdiIso,
  };

  const tamAdres = (yeniKullanici.adres || '').trim() || `${yeniKullanici.ilce || 'Merkez'}, Afyonkarahisar`;

  const kullaniciKaydi: any = {
    id: kimlikId,
    kimlik: kimlikId,
    ad_soyad: yeniKullanici.ad_soyad ? yeniKullanici.ad_soyad.trim() : 'İsimsiz',
    telefon: duzgunTelefon,
    telefon_numarasi: duzgunTelefon,
    eposta: (yeniKullanici as any).eposta || '',
    sifre: sifreMetni,
    rol: yeniKullanici.rol,
    isletme_adi: yeniKullanici.isletme_adi || '',
    arac_tipi: yeniKullanici.arac_tipi || '',
    ilce: yeniKullanici.ilce || 'Merkez',
    adres: tamAdres,
    calisma_modeli: yeniKullanici.calisma_modeli || 'sadece_site_uygulama',
    hijyen_belgesi_durumu: yeniKullanici.hijyen_belgesi_durumu || 'hayir_alacagim',
    esnaf_muafiyet_durumu: yeniKullanici.esnaf_muafiyet_durumu || 'hayir_alacagim',
    guvenlik_sorusu: (yeniKullanici.guvenlik_sorusu || '').trim(),
    guvenlik_cevabi: guvenlikCevabiniStandartlastir(yeniKullanici.guvenlik_cevabi || ''),
    onayli_mi: yeniKullanici.rol === 'musteri',
    onay_durumu: yeniKullanici.rol === 'musteri' ? 'onaylandi' : 'beklemede',
    askida_mi: false,
    olusturma_tarihi: simdiIso,
  };

  // Yerel test deposuna her zaman kaydet
  testKullaniciEkle(kullaniciKaydi as unknown as TestKullaniciKaydi);

  // Yasal Sözleşme Onaylarını ve Hijyen/Muafiyet Beyanını Zaman Damgasıyla Mühürle
  try {
    const sozlesmeler = hukukiSozlesmeleriGetir();
    const damgaGorevleri: Promise<unknown>[] = [];

    if (yeniKullanici.sozlesme_onayli) {
      damgaGorevleri.push(
        hukukiDelilDamgalaVeKaydet({
          sozlesmeTuru: 'mutfak_kayit_sozlesmesi',
          sozlesmeVersiyonu: sozlesmeler.mutfak_kayit_sozlesmesi?.versiyon || '1.0.0',
          sozlesmeIcerigi: sozlesmeler.mutfak_kayit_sozlesmesi?.icerik,
          ilgiliKayitId: kimlikId,
          kullaniciKimlik: kimlikId,
          kullaniciTelefon: duzgunTelefon,
          kullaniciAdSoyad: kullaniciKaydi.ad_soyad,
          islemTuru: 'kayit',
          onaylandiMi: true,
          ekDetay: {
            isletmeAdi: kullaniciKaydi.isletme_adi,
            calismaModeli: kullaniciKaydi.calisma_modeli,
            hijyenBelgesiDurumu: kullaniciKaydi.hijyen_belgesi_durumu,
            esnafMuafiyetDurumu: kullaniciKaydi.esnaf_muafiyet_durumu,
          },
        })
      );
    }

    if (yeniKullanici.kvkk_onayli) {
      damgaGorevleri.push(
        hukukiDelilDamgalaVeKaydet({
          sozlesmeTuru: 'kvkk_aydinlatma',
          sozlesmeVersiyonu: sozlesmeler.kvkk_aydinlatma?.versiyon || '1.0.0',
          sozlesmeIcerigi: sozlesmeler.kvkk_aydinlatma?.icerik,
          ilgiliKayitId: kimlikId,
          kullaniciKimlik: kimlikId,
          kullaniciTelefon: duzgunTelefon,
          kullaniciAdSoyad: kullaniciKaydi.ad_soyad,
          islemTuru: 'kayit',
          onaylandiMi: true,
          ekDetay: {
            isletmeAdi: kullaniciKaydi.isletme_adi,
          },
        })
      );
    }

    if (yeniKullanici.hijyen_belgesi_durumu || yeniKullanici.esnaf_muafiyet_durumu) {
      const beyanMetni = `Mutfak Basvuru Beyani | Isletme: ${kullaniciKaydi.isletme_adi} | Calisma Modeli: ${kullaniciKaydi.calisma_modeli} | Hijyen Belgesi: ${kullaniciKaydi.hijyen_belgesi_durumu} | Esnaf Muafiyeti: ${kullaniciKaydi.esnaf_muafiyet_durumu}`;
      damgaGorevleri.push(
        hukukiDelilDamgalaVeKaydet({
          sozlesmeTuru: 'hijyen_esnaf_muafiyet_onayi',
          sozlesmeVersiyonu: '1.0.0',
          sozlesmeIcerigi: beyanMetni,
          ilgiliKayitId: kimlikId,
          kullaniciKimlik: kimlikId,
          kullaniciTelefon: duzgunTelefon,
          kullaniciAdSoyad: kullaniciKaydi.ad_soyad,
          islemTuru: 'kayit',
          onaylandiMi: true,
          ekDetay: {
            calismaModeli: kullaniciKaydi.calisma_modeli,
            hijyenBelgesiDurumu: kullaniciKaydi.hijyen_belgesi_durumu,
            esnafMuafiyetDurumu: kullaniciKaydi.esnaf_muafiyet_durumu,
          },
        })
      );
    }

    if (damgaGorevleri.length > 0) {
      await Promise.allSettled(damgaGorevleri);
    }
  } catch (hata) {
    console.warn('Hukuki onay zaman damgası kaydedilemedi:', hata);
  }

  // Patron Canlı Bildirimi Tetikle
  if (yeniKullanici.rol === 'musteri') {
    patronBildirimiEkle('yeni_musteri', 'Yeni Müşteri Kaydı', `${kullaniciKaydi.ad_soyad} (${kullaniciKaydi.telefon}) sisteme üye oldu.`);
  } else if (yeniKullanici.rol === 'ev_mutfagi' || yeniKullanici.rol === 'ticari_restoran') {
    const modelEtiketi =
      kullaniciKaydi.calisma_modeli === 'her_ikisi'
        ? 'Her İkisi de (Şube + Site/Uygulama)'
        : kullaniciKaydi.calisma_modeli === 'sube_tedarikcisi'
        ? 'Şube Tedarikçisi'
        : 'Sadece Site/Uygulama';
    patronBildirimiEkle(
      'yeni_mutfak',
      'Yeni Mutfak Başvurusu ⚠️',
      `${kullaniciKaydi.isletme_adi || kullaniciKaydi.ad_soyad} (${modelEtiketi}) mutfak kaydı oluşturdu. Onay bekliyor.`,
      kimlikId
    );
    if (!hijyenVarMi || !muafiyetVarMi) {
      patronBildirimiEkle(
        'eksik_belge',
        'Mutfak Hijyen / Esnaf Belgesi Kontrolü ⚠️',
        `${kullaniciKaydi.isletme_adi || kullaniciKaydi.ad_soyad} mutfağının resmi evrak beyanını inceleyin.`,
        kimlikId
      );
    }
  } else if (yeniKullanici.rol === 'kurye') {
    patronBildirimiEkle('yeni_kurye', 'Yeni Kurye Başvurusu 🛵', `${kullaniciKaydi.ad_soyad} kurye olmak için başvurdu. Onay bekliyor.`, kimlikId);
  }

  // Canlı Firebase aktifse Firestore'a kaydet
  if (canliFirebaseAktifMi()) {
    try {
      await belgeKaydet('kullanicilar', kimlikId, kullaniciKaydi);

      // Eğer mutfak ise mutfaklar koleksiyonuna ekle (Onay Bekliyor statüsünde)
      if (yeniKullanici.rol === 'ev_mutfagi' || yeniKullanici.rol === 'ticari_restoran') {
        const mutfakIsmi =
          yeniKullanici.isletme_adi && yeniKullanici.isletme_adi.trim() !== ''
            ? yeniKullanici.isletme_adi.trim()
            : yeniKullanici.ad_soyad.trim();

        await belgeKaydet('mutfaklar', kimlikId, {
          id: kimlikId,
          kimlik: kimlikId,
          ad: mutfakIsmi,
          mutfak_adi: mutfakIsmi,
          aciklama: 'Afyonkarahisar anne eliyle taze pişirilen sıcak ev lezzetleri.',
          adres: tamAdres,
          ilce: yeniKullanici.ilce || 'Merkez',
          mahalle: `${yeniKullanici.ilce || 'Merkez'}, Afyonkarahisar`,
          telefon: standartTelefon,
          calisma_modeli: kullaniciKaydi.calisma_modeli,
          min_siparis_tutari: 100,
          hazirlanma_suresi: '25-35 dk',
          calisma_saatleri: '09:00 - 21:00',
          acik_mi: true,
          puan: 5.0,
          gorsel_url: '/assets/aistudio/image_48081a60_bc73ebae.jpg',
          sahip_id: kimlikId,
          onayli_mi: false,
          onay_durumu: 'beklemede',
          askida_mi: false,
          hijyen_onayli_mi: false,
          esnaf_muafiyet_onayli_mi: false,
          belgeler: basvuruBelgeleri,
          olusturma_tarihi: simdiIso,
        });
      }
    } catch (hata) {
      console.warn('Firebase kullanıcı/mutfak kayıt hatası:', hata);
    }
  }

  return kullaniciKaydi;
}

export interface MutfakGirisSonucu {
  kullanici: Kullanici | null;
  hataMesaji?: string;
}

export async function veritabanindanKullaniciGirisYaptirDetayli(
  telefon: string,
  sifre: string
): Promise<MutfakGirisSonucu> {
  const dogrulama = telefonGecerliMi(telefon);
  if (!dogrulama.gecerli) {
    console.warn('Geçersiz telefon formatı ile giriş denemesi:', telefon);
    return {
      kullanici: null,
      hataMesaji: dogrulama.hata || 'Lütfen geçerli bir cep telefonu numarası giriniz.',
    };
  }

  const standartTelefon = telefonTemizle(telefon);
  const girilenSifre = sifre.trim();

  // Önce Firebase'den yalnızca telefon + mutfak rolü şartıyla sorgula (Canlı Otorite)
  if (canliFirebaseAktifMi()) {
    try {
      const { kullanici: bulunan, yetkisizRolVarMi } = await mutfakKullanicisiniSorgula(standartTelefon);
      if (bulunan) {
        if (!mutfakRoluMu(bulunan.rol)) {
          return { kullanici: null, hataMesaji: YETKISIZ_ROL_UYARISI };
        }
        if ((bulunan as any).sifre && (bulunan as any).sifre !== girilenSifre) {
          console.warn('Hatalı şifre girişi:', standartTelefon);
          return {
            kullanici: null,
            hataMesaji: 'Giriş başarısız! Telefon numarası veya şifre hatalı, lütfen kontrol edin.',
          };
        }
        return { kullanici: bulunan as Kullanici };
      }

      if (yetkisizRolVarMi) {
        console.warn('Yetkisiz rol ile mutfak paneline giriş engellendi:', standartTelefon);
        return { kullanici: null, hataMesaji: YETKISIZ_ROL_UYARISI };
      }

      console.warn('Firebase veritabanında bu telefonla kayıtlı mutfak hesabı bulunamadı:', standartTelefon);
      return {
        kullanici: null,
        hataMesaji: 'Giriş başarısız! Telefon numarası veya şifre hatalı, lütfen kontrol edin.',
      };
    } catch (hata) {
      console.warn('Firebase kullanıcı giriş okuma hatası:', hata);
    }
  }

  // Yalnızca Firebase çevrimdışı ise yerel test deposundan kontrol et (rol kilidiyle)
  const yerelKullanici = testKullaniciDogrula(standartTelefon, girilenSifre) as Kullanici | null;
  if (yerelKullanici && !mutfakRoluMu(yerelKullanici.rol)) {
    return { kullanici: null, hataMesaji: YETKISIZ_ROL_UYARISI };
  }
  return { kullanici: yerelKullanici };
}

export async function veritabanindanKullaniciGirisYaptir(
  telefon: string,
  sifre: string
): Promise<Kullanici | null> {
  const sonuc = await veritabanindanKullaniciGirisYaptirDetayli(telefon, sifre);
  return sonuc.kullanici;
}
