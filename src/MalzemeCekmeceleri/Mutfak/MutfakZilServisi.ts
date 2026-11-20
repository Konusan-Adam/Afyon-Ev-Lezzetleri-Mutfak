import { sekmeAlarmiBaslat, sekmeAlarmiDurdur } from '@/src/MalzemeCekmeceleri/SekmeAlarmi';
import {
  ZilSesKimligi,
  hazirMelodiSureMsGetir,
  hazirMelodiTekSeferCal,
  ozelZilDosyasiniGetir,
  seciliZilKimliginiGetir,
  zilSesSeviyesiniGetir,
} from './MutfakZilMelodileri';

let ortakAudioContext: AudioContext | null = null;
let ortakZilAudio: HTMLAudioElement | null = null;
let ozelSesAudio: HTMLAudioElement | null = null;
let sesKilidiAcildi = false;
let dinleyiciBaglandi = false;
let aktifSesDurdurZamanlayici: ReturnType<typeof setTimeout> | null = null;
let aktifDonguZamanlayici: ReturnType<typeof setInterval> | null = null;
let aktifOnizlemeZamanlayici: ReturnType<typeof setTimeout> | null = null;
let suAnKesintisizCaliyorMu = false;

const kilitDinleyicileri: Array<(acik: boolean) => void> = [];
const calinmaDinleyicileri: Array<(caliyor: boolean) => void> = [];

function durumBildir(acik: boolean) {
  kilitDinleyicileri.forEach((cb) => {
    try {
      cb(acik);
    } catch {}
  });
}

function calinmaBildir(caliyor: boolean) {
  calinmaDinleyicileri.forEach((cb) => {
    try {
      cb(caliyor);
    } catch {}
  });
}

export function sesKilidiDurumunuDinle(cb: (acik: boolean) => void): () => void {
  kilitDinleyicileri.push(cb);
  cb(sesKilidiAcildi);
  return () => {
    const idx = kilitDinleyicileri.indexOf(cb);
    if (idx >= 0) kilitDinleyicileri.splice(idx, 1);
  };
}

export function zilCalinmaDurumunuDinle(cb: (caliyor: boolean) => void): () => void {
  calinmaDinleyicileri.push(cb);
  cb(suAnKesintisizCaliyorMu);
  return () => {
    const idx = calinmaDinleyicileri.indexOf(cb);
    if (idx >= 0) calinmaDinleyicileri.splice(idx, 1);
  };
}

export function sesKilidiAcikMi(): boolean {
  return sesKilidiAcildi;
}

function tumZamanlayicilariTemizle() {
  if (aktifSesDurdurZamanlayici) {
    clearTimeout(aktifSesDurdurZamanlayici);
    aktifSesDurdurZamanlayici = null;
  }
  if (aktifDonguZamanlayici) {
    clearInterval(aktifDonguZamanlayici);
    aktifDonguZamanlayici = null;
  }
  if (aktifOnizlemeZamanlayici) {
    clearTimeout(aktifOnizlemeZamanlayici);
    aktifOnizlemeZamanlayici = null;
  }
}

function tumAudioElementleriniDurdur() {
  if (ortakZilAudio) {
    try {
      ortakZilAudio.pause();
      ortakZilAudio.currentTime = 0;
    } catch {}
  }
  if (ozelSesAudio) {
    try {
      ozelSesAudio.pause();
      ozelSesAudio.currentTime = 0;
    } catch {}
  }
}

export function mutfakZiliDurdur() {
  tumZamanlayicilariTemizle();
  tumAudioElementleriniDurdur();
  suAnKesintisizCaliyorMu = false;
  calinmaBildir(false);
  sekmeAlarmiDurdur();
}

function ortakSesNesneleriniHazirla() {
  if (typeof window === 'undefined') return;

  if (!ortakAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        ortakAudioContext = new AudioContextClass();
      } catch {}
    }
  }

  if (!ortakZilAudio) {
    try {
      ortakZilAudio = new Audio('/nukleer_siren.mp3');
      ortakZilAudio.preload = 'auto';
      ortakZilAudio.loop = false;
      ortakZilAudio.volume = zilSesSeviyesiniGetir();
    } catch {}
  }
}

/**
 * Tarayıcı otomatik oynatma kilidini ilk kullanıcı etkileşiminde (tıklama/dokunma/tuş) açar.
 */
export async function sesSisteminiKilidiniAc(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  ortakSesNesneleriniHazirla();

  let basarili = false;

  if (ortakAudioContext) {
    try {
      if (ortakAudioContext.state === 'suspended') {
        await ortakAudioContext.resume();
      }
      if (ortakAudioContext.state === 'running') {
        const buffer = ortakAudioContext.createBuffer(1, 1, 22050);
        const source = ortakAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(ortakAudioContext.destination);
        source.start(0);
        basarili = true;
      }
    } catch {}
  }

  if (ortakZilAudio && !sesKilidiAcildi) {
    try {
      const oncekiMute = ortakZilAudio.muted;
      ortakZilAudio.muted = true;
      const p = ortakZilAudio.play();
      if (p !== undefined) {
        await p;
        ortakZilAudio.pause();
        ortakZilAudio.currentTime = 0;
        basarili = true;
      }
      ortakZilAudio.muted = oncekiMute;
    } catch {
      if (ortakZilAudio) ortakZilAudio.muted = false;
    }
  }

  if (basarili && !sesKilidiAcildi) {
    sesKilidiAcildi = true;
    durumBildir(true);
  }

  return sesKilidiAcildi;
}

if (typeof window !== 'undefined' && !dinleyiciBaglandi) {
  dinleyiciBaglandi = true;
  const ilkEtkilesim = () => {
    sesSisteminiKilidiniAc().then((acik) => {
      if (acik) {
        window.removeEventListener('pointerdown', ilkEtkilesim);
        window.removeEventListener('keydown', ilkEtkilesim);
        window.removeEventListener('touchstart', ilkEtkilesim);
      }
    });
  };
  window.addEventListener('pointerdown', ilkEtkilesim, { passive: true });
  window.addEventListener('keydown', ilkEtkilesim, { passive: true });
  window.addEventListener('touchstart', ilkEtkilesim, { passive: true });
}

async function ozelSesDosyasiCal(donguluMu: boolean): Promise<boolean> {
  const ozel = ozelZilDosyasiniGetir();
  if (!ozel?.veriUrl) return false;
  try {
    if (!ozelSesAudio || ozelSesAudio.src !== ozel.veriUrl) {
      ozelSesAudio = new Audio(ozel.veriUrl);
    }
    ozelSesAudio.loop = donguluMu;
    ozelSesAudio.muted = false;
    ozelSesAudio.volume = zilSesSeviyesiniGetir();
    ozelSesAudio.currentTime = 0;
    const p = ozelSesAudio.play();
    if (p !== undefined) {
      await p;
    }
    sesKilidiAcildi = true;
    durumBildir(true);
    return true;
  } catch (e) {
    console.warn('Özel zil sesi çalınamadı, hazır melodilerden çalınıyor:', e);
    return false;
  }
}

async function mp3YedekZilCal(donguluMu: boolean): Promise<boolean> {
  if (!ortakZilAudio) return false;
  try {
    ortakZilAudio.loop = donguluMu;
    ortakZilAudio.muted = false;
    ortakZilAudio.volume = zilSesSeviyesiniGetir();
    ortakZilAudio.pause();
    ortakZilAudio.currentTime = 0;
    const p = ortakZilAudio.play();
    if (p !== undefined) {
      await p;
    }
    sesKilidiAcildi = true;
    durumBildir(true);
    return true;
  } catch {
    return false;
  }
}

async function melodiBaslat(
  kimlik: ZilSesKimligi,
  donguluMu: boolean
): Promise<void> {
  ortakSesNesneleriniHazirla();
  const sesSeviyesi = zilSesSeviyesiniGetir();

  if (kimlik === 'ozel_dosya') {
    const caldiMi = await ozelSesDosyasiCal(donguluMu);
    if (caldiMi) return;
  }

  // Web Audio ile seçilen heyecan verici melodiyi çal
  if (ortakAudioContext) {
    try {
      if (ortakAudioContext.state === 'suspended') {
        await ortakAudioContext.resume();
      }
      const hazirKimlik: Exclude<ZilSesKimligi, 'ozel_dosya'> =
        kimlik === 'ozel_dosya' ? 'enerjik_siparis' : kimlik;

      hazirMelodiTekSeferCal(ortakAudioContext, hazirKimlik, sesSeviyesi);
      sesKilidiAcildi = true;
      durumBildir(true);

      if (donguluMu) {
        const donguAraligiMs = hazirMelodiSureMsGetir(hazirKimlik);
        aktifDonguZamanlayici = setInterval(() => {
          if (!ortakAudioContext) return;
          if (ortakAudioContext.state === 'suspended') {
            ortakAudioContext.resume().catch(() => {});
          }
          hazirMelodiTekSeferCal(ortakAudioContext, hazirKimlik, zilSesSeviyesiniGetir());
        }, donguAraligiMs);
      }
      return;
    } catch (e) {
      console.warn('Web Audio melodi çalma hatası, MP3 yedek deneniyor:', e);
    }
  }

  await mp3YedekZilCal(donguluMu);
}

/**
 * Seçili melodiyi veya özel ses dosyasını menüden tek tıkla dinlemek için kullanılır.
 */
export async function melodiOnizle(
  kimlik: ZilSesKimligi,
  secenekler?: { kesintisiz?: boolean }
): Promise<void> {
  tumZamanlayicilariTemizle();
  tumAudioElementleriniDurdur();

  const kesintisiz = Boolean(secenekler?.kesintisiz);
  suAnKesintisizCaliyorMu = kesintisiz;
  calinmaBildir(true);

  await melodiBaslat(kimlik, kesintisiz);

  if (!kesintisiz) {
    const beklemeMs = kimlik === 'ozel_dosya' ? 5000 : hazirMelodiSureMsGetir(kimlik) + 150;
    aktifOnizlemeZamanlayici = setTimeout(() => {
      suAnKesintisizCaliyorMu = false;
      calinmaBildir(false);
      aktifOnizlemeZamanlayici = null;
    }, beklemeMs);
  }
}

/**
 * Mutfak Sipariş Alarmı
 * kesintisiz: true olduğunda aşçı siparişi kabul edene/susturana kadar kesintisiz çalar.
 */
export const mutfakZiliCal = (
  baslik?: string,
  detay?: string,
  secenekler?: { sureSn?: number; kesintisiz?: boolean }
) => {
  const kesintisiz = secenekler?.kesintisiz ?? false;
  const sureMs = Math.max(1500, Math.round((secenekler?.sureSn ?? 5) * 1000));

  sekmeAlarmiBaslat('🚨 (1) YENİ SİPARİŞ GELİYOR!');

  tumZamanlayicilariTemizle();
  tumAudioElementleriniDurdur();

  suAnKesintisizCaliyorMu = kesintisiz;
  calinmaBildir(true);

  const seciliKimlik = seciliZilKimliginiGetir();
  melodiBaslat(seciliKimlik, kesintisiz);

  if (!kesintisiz) {
    aktifSesDurdurZamanlayici = setTimeout(() => {
      tumAudioElementleriniDurdur();
      suAnKesintisizCaliyorMu = false;
      calinmaBildir(false);
      aktifSesDurdurZamanlayici = null;
    }, sureMs);
  }

  // Arka Plan & Masaüstü/Telefon Bildirimi & Titreşim
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const bildirimBaslik = baslik || '🔔 YENİ MUTFAK SİPARİŞİ!';
    const bildirimDetay = detay || 'Yeni taze sipariş düştü! Onaylamak için tıklayın.';
    const bildirimSecenekleri: any = {
      body: bildirimDetay,
      icon: '/assets/aistudio/image_48081a60_bc73ebae.jpg',
      badge: '/assets/aistudio/image_48081a60_bc73ebae.jpg',
      tag: 'afyon-mutfak-siparis-zili',
      renotify: true,
      silent: false,
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((kayit) => {
          kayit
            .showNotification(bildirimBaslik, {
              ...bildirimSecenekleri,
              vibrate: [500, 150, 500, 150, 700] as any,
            })
            .catch(() => {
              try {
                new Notification(bildirimBaslik, bildirimSecenekleri);
              } catch {}
            });
        })
        .catch(() => {
          try {
            new Notification(bildirimBaslik, bildirimSecenekleri);
          } catch {}
        });
    } else {
      try {
        const bildirim = new Notification(bildirimBaslik, bildirimSecenekleri);
        bildirim.onclick = () => {
          window.focus();
          bildirim.close();
        };
      } catch {}
    }
  }
};

/**
 * Mutfak açıkken telefon/tablet ekranının otomatik kapanmasını önler (Screen Wake Lock API).
 */
export function ekranUyanikTutBaslat(): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return () => {};
  }

  let kilit: any = null;
  let durduruldu = false;

  const kilitAl = async () => {
    if (durduruldu || document.visibilityState !== 'visible') return;
    try {
      const wakeLock = (navigator as any).wakeLock;
      if (wakeLock?.request) {
        kilit = await wakeLock.request('screen');
      }
    } catch {}
  };

  const gorunurlukDegisti = () => {
    if (document.visibilityState === 'visible') {
      kilitAl();
    }
  };

  kilitAl();
  document.addEventListener('visibilitychange', gorunurlukDegisti);

  return () => {
    durduruldu = true;
    document.removeEventListener('visibilitychange', gorunurlukDegisti);
    if (kilit?.release) {
      kilit.release().catch(() => {});
    }
  };
}
