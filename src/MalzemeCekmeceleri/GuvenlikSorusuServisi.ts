import { Kullanici } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import {
  belgeGetir,
  belgeKaydet,
  koleksiyonGetir,
} from '@/src/veritabani/FirebaseKoleksiyonServisi';
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

async function telefonIleKullaniciBul(standartTelefon: string): Promise<any | null> {
  if (!canliFirebaseAktifMi()) return null;

  const duzgunTelefon = standartTelefon.startsWith('0')
    ? standartTelefon
    : `0${standartTelefon}`;
  const olasiBelgeKimligi = `tel_${duzgunTelefon}`;

  const dogrudanBelge = await belgeGetir<any>('kullanicilar', olasiBelgeKimligi);
  if (dogrudanBelge) {
    return dogrudanBelge;
  }

  const tumKullanicilar = await koleksiyonGetir<any>('kullanicilar');
  return (
    tumKullanicilar.find(
      (k) => telefonRakamlariniTemizle(k.telefon || '') === standartTelefon
    ) || null
  );
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
    const bulunan = await telefonIleKullaniciBul(standartTelefon);
    if (!bulunan) {
      return {
        basarili: false,
        bulundu: false,
        hataMesaji: 'Bu telefon numarası ile kayıtlı bir mutfak hesabı bulunamadı.',
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

  try {
    const bulunan = await telefonIleKullaniciBul(standartTelefon);
    if (!bulunan) {
      return {
        basarili: false,
        hataMesaji: 'Bu telefon numarası ile kayıtlı hesap bulunamadı.',
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
      return {
        basarili: false,
        hataMesaji: 'Güvenlik sorusu cevabı hatalı. Lütfen kontrol edip tekrar deneyiniz.',
      };
    }

    const belgeKimligi =
      bulunan.id || bulunan.kimlik || `tel_0${standartTelefon}`;
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
