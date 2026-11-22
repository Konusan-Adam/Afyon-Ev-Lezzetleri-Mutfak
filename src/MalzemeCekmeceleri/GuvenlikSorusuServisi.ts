import { Kullanici } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import {
  mutfakKullanicisiniSorgula,
  mutfakRoluMu,
  YETKISIZ_ROL_UYARISI,
} from '@/src/MalzemeCekmeceleri/Mutfak/mutfakKullaniciSorgusu';
import { telefonGecerliMi } from './Dogrulama/telefonDogrulayici';

export const GUVENLIK_SORULARI = [
  'En sevdiğin Afyon yemeği nedir?',
  'Çocukluk mahallen neresiydi?',
  'İlk evcil hayvanının adı nedir?',
  'Unutamadığın tatil yerin neresi?',
] as const;

export const GUVENLIK_SORUSU_ONEM_ACIKLAMASI =
  'Şifrenizi unuttuğunuzda e-posta veya SMS beklemeden, buraya seçeceğiniz soru ve cevabıyla hesabınızı anında geri alabilirsiniz.';

export interface GuvenlikSorusuGetirSonucu {
  basarili: boolean;
  bulundu: boolean;
  guvenlikSorusu?: string;
  kullaniciId?: string;
  adSoyad?: string;
  hataMesaji?: string;
}

export interface SifreSifirlamaSonucu {
  basarili: boolean;
  mesaj?: string;
  hataMesaji?: string;
  kullanici?: Kullanici;
}

export function telefonRakamlariniTemizle(tel: string): string {
  const rakamlar = (tel || '').replace(/\D/g, '');
  if (rakamlar.startsWith('90') && rakamlar.length === 12) {
    return rakamlar.substring(2);
  }
  if (rakamlar.startsWith('0') && rakamlar.length === 11) {
    return rakamlar.substring(1);
  }
  return rakamlar;
}

export function guvenlikCevabiniStandartlastir(cevap: string): string {
  return (cevap || '').trim().toLocaleLowerCase('tr-TR');
}

const MAX_HATALI_DENEME = 5;
const KILIT_SURESI_MS = 5 * 60 * 1000;
const DENEME_KAYIT_ANAHTARI = 'afyon_guvenlik_sorusu_deneme_v1';

interface DenemeDurumu {
  hataliSayisi: number;
  kilitBitisZamani: number;
}

function denemeDurumuGetir(standartTelefon: string): DenemeDurumu {
  try {
    if (typeof localStorage === 'undefined') return { hataliSayisi: 0, kilitBitisZamani: 0 };
    const ham = localStorage.getItem(`${DENEME_KAYIT_ANAHTARI}_${standartTelefon}`);
    return ham ? JSON.parse(ham) : { hataliSayisi: 0, kilitBitisZamani: 0 };
  } catch {
    return { hataliSayisi: 0, kilitBitisZamani: 0 };
  }
}

function denemeDurumuKaydet(standartTelefon: string, durum: DenemeDurumu): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${DENEME_KAYIT_ANAHTARI}_${standartTelefon}`, JSON.stringify(durum));
  } catch {}
}

function denemeDurumuTemizle(standartTelefon: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${DENEME_KAYIT_ANAHTARI}_${standartTelefon}`);
  } catch {}
}

export async function kullaniciGuvenlikSorusuGetir(
  telefon: string
): Promise<GuvenlikSorusuGetirSonucu> {
  const dogrulama = telefonGecerliMi(telefon);
  if (!dogrulama.gecerli) {
    return {
      basarili: false,
      bulundu: false,
      hataMesaji:
        dogrulama.hata || 'Lütfen geçerli bir cep telefonu numarası giriniz.',
    };
  }

  const standartTelefon = telefonRakamlariniTemizle(telefon);

  try {
    const { kullanici: bulunan, yetkisizRolVarMi } = await mutfakKullanicisiniSorgula(standartTelefon);
    if (!bulunan) {
      return {
        basarili: false,
        bulundu: false,
        hataMesaji: yetkisizRolVarMi
          ? YETKISIZ_ROL_UYARISI
          : 'Bu telefon numarası ile kayıtlı bir mutfak hesabı bulunamadı.',
      };
    }

    if (!mutfakRoluMu(bulunan.rol)) {
      return {
        basarili: false,
        bulundu: false,
        hataMesaji: YETKISIZ_ROL_UYARISI,
      };
    }

    const kayitliSoru = (
      bulunan.guvenlik_sorusu ||
      bulunan.guvenlikSorusu ||
      ''
    ).trim();

    if (!kayitliSoru) {
      return {
        basarili: false,
        bulundu: true,
        kullaniciId: bulunan.id || bulunan.kimlik,
        adSoyad: bulunan.ad_soyad,
        hataMesaji:
          'Bu hesapta kayıtlı bir güvenlik sorusu bulunmuyor. Lütfen yönetim destek hattıyla iletişime geçiniz.',
      };
    }

    return {
      basarili: true,
      bulundu: true,
      guvenlikSorusu: kayitliSoru,
      kullaniciId: bulunan.id || bulunan.kimlik,
      adSoyad: bulunan.ad_soyad,
    };
  } catch (hata) {
    console.warn('Güvenlik sorusu getirme hatası:', hata);
    return {
      basarili: false,
      bulundu: false,
      hataMesaji: 'Bilgiler kontrol edilirken bir hata oluştu. Lütfen tekrar deneyiniz.',
    };
  }
}

export async function sifreSifirlaGuvenlikSorusuIle(
  telefon: string,
  guvenlikCevabi: string,
  yeniSifre: string
): Promise<SifreSifirlamaSonucu> {
  const dogrulama = telefonGecerliMi(telefon);
  if (!dogrulama.gecerli) {
    return {
      basarili: false,
      hataMesaji:
        dogrulama.hata || 'Lütfen geçerli bir cep telefonu numarası giriniz.',
    };
  }

  const temizCevap = guvenlikCevabiniStandartlastir(guvenlikCevabi);
  if (!temizCevap) {
    return {
      basarili: false,
      hataMesaji: 'Lütfen güvenlik sorusunun cevabını giriniz.',
    };
  }

  const temizYeniSifre = (yeniSifre || '').trim();
  if (temizYeniSifre.length < 4) {
    return {
      basarili: false,
      hataMesaji: 'Yeni şifreniz en az 4 karakter olmalıdır.',
    };
  }

  const standartTelefon = telefonRakamlariniTemizle(telefon);
  const mevcutDeneme = denemeDurumuGetir(standartTelefon);
  if (mevcutDeneme.kilitBitisZamani > Date.now()) {
    const kalanDakika = Math.max(1, Math.ceil((mevcutDeneme.kilitBitisZamani - Date.now()) / 60000));
    return {
      basarili: false,
      hataMesaji: `Çok fazla hatalı deneme yapıldı. Güvenlik için ${kalanDakika} dakika sonra tekrar deneyiniz.`,
    };
  }

  try {
    const { kullanici: bulunan, yetkisizRolVarMi } = await mutfakKullanicisiniSorgula(standartTelefon);
    if (!bulunan) {
      return {
        basarili: false,
        hataMesaji: yetkisizRolVarMi
          ? YETKISIZ_ROL_UYARISI
          : 'Bu telefon numarası ile kayıtlı yetkili mutfak hesabı bulunamadı.',
      };
    }

    if (!mutfakRoluMu(bulunan.rol)) {
      return {
        basarili: false,
        hataMesaji: YETKISIZ_ROL_UYARISI,
      };
    }

    const kayitliCevap = guvenlikCevabiniStandartlastir(
      bulunan.guvenlik_cevabi ?? bulunan.guvenlikCevabi ?? ''
    );

    if (!kayitliCevap) {
      return {
        basarili: false,
        hataMesaji: 'Bu hesap için güvenlik cevabı tanımlanmamış.',
      };
    }

    if (temizCevap !== kayitliCevap) {
      const yeniSayac = (mevcutDeneme.kilitBitisZamani > 0 ? 0 : mevcutDeneme.hataliSayisi) + 1;
      if (yeniSayac >= MAX_HATALI_DENEME) {
        denemeDurumuKaydet(standartTelefon, {
          hataliSayisi: yeniSayac,
          kilitBitisZamani: Date.now() + KILIT_SURESI_MS,
        });
        return {
          basarili: false,
          hataMesaji: '5 kez hatalı güvenlik cevabı girildi. Hesap güvenliği için 5 dakika bekleyiniz.',
        };
      }
      denemeDurumuKaydet(standartTelefon, { hataliSayisi: yeniSayac, kilitBitisZamani: 0 });
      return {
        basarili: false,
        hataMesaji: `Güvenlik sorusu cevabı hatalı. Kalan deneme hakkı: ${MAX_HATALI_DENEME - yeniSayac}`,
      };
    }

    denemeDurumuTemizle(standartTelefon);

    const belgeKimligi = bulunan.id || bulunan.kimlik;
    if (!belgeKimligi || !canliFirebaseAktifMi()) {
      return {
        basarili: false,
        hataMesaji: 'Mutfak hesap kimliği doğrulanamadı.',
      };
    }

    const guncellendi = await belgeKaydet('kullanicilar', belgeKimligi, {
      sifre: temizYeniSifre,
      guncellenme_zamani: new Date().toISOString(),
    });

    if (!guncellendi) {
      return {
        basarili: false,
        hataMesaji: 'Şifre güncellenemedi. Lütfen internet bağlantınızı kontrol ediniz.',
      };
    }

    return {
      basarili: true,
      mesaj: 'Şifreniz başarıyla sıfırlandı. Otomatik giriş yapılıyor...',
      kullanici: { ...bulunan, sifre: temizYeniSifre } as Kullanici,
    };
  } catch (hata) {
    console.warn('Güvenlik sorusu ile şifre sıfırlama hatası:', hata);
    return {
      basarili: false,
      hataMesaji: 'Şifre sıfırlama sırasında bir hata oluştu. Lütfen tekrar deneyiniz.',
    };
  }
}
