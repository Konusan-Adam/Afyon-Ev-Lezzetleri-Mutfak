import { androidZilAyarla } from './AndroidKopruServisi';

export type ZilSesKimligi =
  | 'enerjik_siparis'
  | 'kasa_bereket'
  | 'neseli_marimba'
  | 'sicak_cingirak'
  | 'ozel_dosya';

export interface ZilSesTanimi {
  kimlik: Exclude<ZilSesKimligi, 'ozel_dosya'>;
  baslik: string;
  aciklama: string;
  sureMs: number;
}

export interface OzelZilDosyasi {
  ad: string;
  boyutBayt: number;
  veriUrl: string;
  eklenmeTarihi: string;
}

const SECILI_ZIL_ANAHTARI = 'afyon_mutfak_secili_zil_v1';
const OZEL_ZIL_ANAHTARI = 'afyon_mutfak_ozel_zil_v1';
const ZIL_SES_SEVIYESI_ANAHTARI = 'afyon_mutfak_zil_ses_seviyesi_v1';

export const HAZIR_ZIL_SESLERI: ZilSesTanimi[] = [
  {
    kimlik: 'enerjik_siparis',
    baslik: 'Enerjik Sipariş Zili',
    aciklama: 'Yükselen parlak akor + çift zil çınlaması (Varsayılan)',
    sureMs: 2200,
  },
  {
    kimlik: 'kasa_bereket',
    baslik: 'Bereketli Kasa (Ka-Ching)',
    aciklama: 'Hareketli kasa açılışı ve parlak altın çınlama',
    sureMs: 1850,
  },
  {
    kimlik: 'neseli_marimba',
    baslik: 'Neşeli Mutfak Fanfarı',
    aciklama: 'Hızlı, tempolu ve heyecan veren marimba ritmi',
    sureMs: 2100,
  },
  {
    kimlik: 'sicak_cingirak',
    baslik: 'Sıcak Restoran Çıngırağı',
    aciklama: 'Klasik servis bankosu çift çınlama sesi',
    sureMs: 1750,
  },
];

export function seciliZilKimliginiGetir(): ZilSesKimligi {
  if (typeof window === 'undefined') return 'enerjik_siparis';
  try {
    const kayitli = localStorage.getItem(SECILI_ZIL_ANAHTARI) as ZilSesKimligi | null;
    if (
      kayitli === 'enerjik_siparis' ||
      kayitli === 'kasa_bereket' ||
      kayitli === 'neseli_marimba' ||
      kayitli === 'sicak_cingirak' ||
      kayitli === 'ozel_dosya'
    ) {
      if (kayitli === 'ozel_dosya' && !ozelZilDosyasiniGetir()) {
        return 'enerjik_siparis';
      }
      return kayitli;
    }
  } catch {}
  return 'enerjik_siparis';
}

export function androidZilTercihiniSenkronizeEt(ozelSilindiMi = false): void {
  if (typeof window === 'undefined') return;
  const secili = seciliZilKimliginiGetir();
  const seviye = zilSesSeviyesiniGetir();
  const ozel = ozelZilDosyasiniGetir();
  const veri = ozelSilindiMi ? 'SIL' : (secili === 'ozel_dosya' && ozel?.veriUrl ? ozel.veriUrl : '');
  androidZilAyarla(secili, seviye, veri);
}

export function seciliZilKimliginiKaydet(kimlik: ZilSesKimligi): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SECILI_ZIL_ANAHTARI, kimlik);
    androidZilTercihiniSenkronizeEt();
  } catch {}
}

export function zilSesSeviyesiniGetir(): number {
  if (typeof window === 'undefined') return 0.9;
  try {
    const ham = Number(localStorage.getItem(ZIL_SES_SEVIYESI_ANAHTARI));
    if (!Number.isNaN(ham) && ham >= 0.2 && ham <= 1) {
      return ham;
    }
  } catch {}
  return 0.9;
}

export function zilSesSeviyesiniKaydet(seviye: number): void {
  if (typeof window === 'undefined') return;
  try {
    const sinirli = Math.max(0.2, Math.min(1, seviye));
    localStorage.setItem(ZIL_SES_SEVIYESI_ANAHTARI, String(sinirli));
    androidZilTercihiniSenkronizeEt();
  } catch {}
}

export function ozelZilDosyasiniGetir(): OzelZilDosyasi | null {
  if (typeof window === 'undefined') return null;
  try {
    const ham = localStorage.getItem(OZEL_ZIL_ANAHTARI);
    if (!ham) return null;
    const ayrilmis = JSON.parse(ham) as OzelZilDosyasi;
    if (ayrilmis?.veriUrl) return ayrilmis;
  } catch {}
  return null;
}

export function ozelZilDosyasiniSil(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OZEL_ZIL_ANAHTARI);
    if (seciliZilKimliginiGetir() === 'ozel_dosya') {
      seciliZilKimliginiKaydet('enerjik_siparis');
    }
    androidZilTercihiniSenkronizeEt(true);
  } catch {}
}

export function ozelZilDosyasiKaydet(dosya: File): Promise<{
  basarili: boolean;
  dosyaBilgisi?: OzelZilDosyasi;
  hataMesaji?: string;
}> {
  return new Promise((resolve) => {
    if (!dosya) {
      resolve({ basarili: false, hataMesaji: 'Ses dosyası seçilmedi.' });
      return;
    }

    const gecerliTip =
      dosya.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(dosya.name);
    if (!gecerliTip) {
      resolve({
        basarili: false,
        hataMesaji: 'Lütfen geçerli bir ses dosyası (.mp3, .wav, .ogg, .m4a) seçiniz.',
      });
      return;
    }

    const azamiBayt = 2.5 * 1024 * 1024;
    if (dosya.size > azamiBayt) {
      resolve({
        basarili: false,
        hataMesaji: 'Ses dosyası en fazla 2.5 MB boyutunda olabilir.',
      });
      return;
    }

    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const veriUrl = typeof okuyucu.result === 'string' ? okuyucu.result : '';
      if (!veriUrl) {
        resolve({ basarili: false, hataMesaji: 'Ses dosyası okunamadı.' });
        return;
      }

      const bilgi: OzelZilDosyasi = {
        ad: dosya.name,
        boyutBayt: dosya.size,
        veriUrl,
        eklenmeTarihi: new Date().toISOString(),
      };

      try {
        localStorage.setItem(OZEL_ZIL_ANAHTARI, JSON.stringify(bilgi));
        seciliZilKimliginiKaydet('ozel_dosya');
        resolve({ basarili: true, dosyaBilgisi: bilgi });
      } catch {
        resolve({
          basarili: false,
          hataMesaji: 'Tarayıcı hafızası dolu, lütfen daha küçük boyutlu bir ses dosyası seçin.',
        });
      }
    };
    okuyucu.onerror = () => {
      resolve({ basarili: false, hataMesaji: 'Ses dosyası yüklenirken hata oluştu.' });
    };
    okuyucu.readAsDataURL(dosya);
  });
}

function notaCal(
  sesMerkezi: AudioContext,
  baslamaZamani: number,
  frekans: number,
  sureSn: number,
  kazancTepe: number,
  dalgaTipi: OscillatorType = 'triangle',
  harmonikCarpan = 2
) {
  const osilator = sesMerkezi.createOscillator();
  const ustHarmonik = sesMerkezi.createOscillator();
  const kazanc = sesMerkezi.createGain();
  const ustKazanc = sesMerkezi.createGain();

  osilator.type = dalgaTipi;
  osilator.frequency.setValueAtTime(frekans, baslamaZamani);

  ustHarmonik.type = 'sine';
  ustHarmonik.frequency.setValueAtTime(frekans * harmonikCarpan, baslamaZamani);

  kazanc.gain.setValueAtTime(0.001, baslamaZamani);
  kazanc.gain.linearRampToValueAtTime(kazancTepe, baslamaZamani + 0.015);
  kazanc.gain.exponentialRampToValueAtTime(0.001, baslamaZamani + sureSn);

  ustKazanc.gain.setValueAtTime(0.001, baslamaZamani);
  ustKazanc.gain.linearRampToValueAtTime(kazancTepe * 0.28, baslamaZamani + 0.01);
  ustKazanc.gain.exponentialRampToValueAtTime(0.001, baslamaZamani + sureSn * 0.65);

  osilator.connect(kazanc);
  ustHarmonik.connect(ustKazanc);
  kazanc.connect(sesMerkezi.destination);
  ustKazanc.connect(sesMerkezi.destination);

  osilator.start(baslamaZamani);
  ustHarmonik.start(baslamaZamani);
  osilator.stop(baslamaZamani + sureSn + 0.02);
  ustHarmonik.stop(baslamaZamani + sureSn + 0.02);
}

export function hazirMelodiSureMsGetir(kimlik: ZilSesKimligi): number {
  const bulunan = HAZIR_ZIL_SESLERI.find((z) => z.kimlik === kimlik);
  return bulunan ? bulunan.sureMs : 2200;
}

export function hazirMelodiTekSeferCal(
  sesMerkezi: AudioContext,
  kimlik: Exclude<ZilSesKimligi, 'ozel_dosya'>,
  sesSeviyesi = 0.9
): void {
  const simdi = sesMerkezi.currentTime + 0.02;
  const g = Math.max(0.15, Math.min(1, sesSeviyesi));

  if (kimlik === 'kasa_bereket') {
    // Hareketli kasa "Ka-Ching" + parlak çift çınlama
    notaCal(sesMerkezi, simdi + 0.0, 987.77, 0.16, 0.42 * g, 'triangle', 2); // B5
    notaCal(sesMerkezi, simdi + 0.1, 1318.51, 0.55, 0.55 * g, 'sine', 2); // E6
    notaCal(sesMerkezi, simdi + 0.24, 1567.98, 0.65, 0.45 * g, 'sine', 2.5); // G6
    notaCal(sesMerkezi, simdi + 0.72, 1318.51, 0.5, 0.4 * g, 'sine', 2); // E6
    notaCal(sesMerkezi, simdi + 0.85, 1975.53, 0.8, 0.48 * g, 'sine', 2); // B6
    return;
  }

  if (kimlik === 'neseli_marimba') {
    // Tempolu mutfak fanfarı (G4 -> B4 -> D5 -> G5 -> D5 -> G5)
    notaCal(sesMerkezi, simdi + 0.0, 392.0, 0.28, 0.45 * g, 'triangle', 2);
    notaCal(sesMerkezi, simdi + 0.14, 493.88, 0.28, 0.45 * g, 'triangle', 2);
    notaCal(sesMerkezi, simdi + 0.28, 587.33, 0.28, 0.48 * g, 'triangle', 2);
    notaCal(sesMerkezi, simdi + 0.42, 783.99, 0.45, 0.55 * g, 'sine', 2);
    notaCal(sesMerkezi, simdi + 0.82, 587.33, 0.25, 0.42 * g, 'triangle', 2);
    notaCal(sesMerkezi, simdi + 0.98, 987.77, 0.75, 0.52 * g, 'sine', 2);
    return;
  }

  if (kimlik === 'sicak_cingirak') {
    // Klasik restoran bankosu çift çınlama
    notaCal(sesMerkezi, simdi + 0.0, 880.0, 0.65, 0.52 * g, 'sine', 2); // A5
    notaCal(sesMerkezi, simdi + 0.22, 1318.51, 0.75, 0.55 * g, 'sine', 2); // E6
    notaCal(sesMerkezi, simdi + 0.75, 880.0, 0.5, 0.45 * g, 'sine', 2); // A5
    notaCal(sesMerkezi, simdi + 0.94, 1318.51, 0.75, 0.52 * g, 'sine', 2); // E6
    return;
  }

  // Varsayılan: 'enerjik_siparis' (C5 -> E5 -> G5 -> C6 + parlak G5 -> C6 çift çınlama)
  notaCal(sesMerkezi, simdi + 0.0, 523.25, 0.35, 0.45 * g, 'triangle', 2);
  notaCal(sesMerkezi, simdi + 0.13, 659.25, 0.35, 0.45 * g, 'triangle', 2);
  notaCal(sesMerkezi, simdi + 0.26, 783.99, 0.4, 0.5 * g, 'sine', 2);
  notaCal(sesMerkezi, simdi + 0.39, 1046.5, 0.75, 0.56 * g, 'sine', 2);
  notaCal(sesMerkezi, simdi + 1.02, 783.99, 0.35, 0.42 * g, 'sine', 2);
  notaCal(sesMerkezi, simdi + 1.16, 1046.5, 0.85, 0.56 * g, 'sine', 2);
}
