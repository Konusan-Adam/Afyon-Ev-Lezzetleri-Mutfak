import { sekmeAlarmiBaslat, sekmeAlarmiDurdur } from '@/src/MalzemeCekmeceleri/SekmeAlarmi';

let ortakAudioContext: AudioContext | null = null;
let ortakSirenAudio: HTMLAudioElement | null = null;
let sesKilidiAcildi = false;
let dinleyiciBaglandi = false;
let aktifSesDurdurZamanlayici: ReturnType<typeof setTimeout> | null = null;

const kilitDinleyicileri: Array<(acik: boolean) => void> = [];

function durumBildir(acik: boolean) {
  kilitDinleyicileri.forEach((cb) => {
    try {
      cb(acik);
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

export function sesKilidiAcikMi(): boolean {
  return sesKilidiAcildi;
}

export function mutfakZiliDurdur() {
  if (aktifSesDurdurZamanlayici) {
    clearTimeout(aktifSesDurdurZamanlayici);
    aktifSesDurdurZamanlayici = null;
  }
  if (ortakSirenAudio) {
    try {
      ortakSirenAudio.pause();
      ortakSirenAudio.currentTime = 0;
    } catch {}
  }
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

  if (!ortakSirenAudio) {
    try {
      ortakSirenAudio = new Audio('/nukleer_siren.mp3');
      ortakSirenAudio.preload = 'auto';
      ortakSirenAudio.loop = false;
      ortakSirenAudio.volume = 0.85;
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

  if (ortakSirenAudio && !sesKilidiAcildi) {
    try {
      const oncekiMute = ortakSirenAudio.muted;
      ortakSirenAudio.muted = true;
      const p = ortakSirenAudio.play();
      if (p !== undefined) {
        await p;
        ortakSirenAudio.pause();
        ortakSirenAudio.currentTime = 0;
        basarili = true;
      }
      ortakSirenAudio.muted = oncekiMute;
    } catch {
      if (ortakSirenAudio) ortakSirenAudio.muted = false;
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

/**
 * Mutfak Sipariş Alarmı (MP3 + Web Audio Sentetizör, süreli otomatik durdurma)
 */
export const mutfakZiliCal = (
  baslik?: string,
  detay?: string,
  secenekler?: { sureSn?: number }
) => {
  const sureMs = Math.max(1500, Math.round((secenekler?.sureSn ?? 5) * 1000));

  // 1. Sekme Başlığında Flaş Sönen Alarm
  sekmeAlarmiBaslat('🚨 (1) YENİ SİPARİŞ GELİYOR!');

  ortakSesNesneleriniHazirla();

  if (aktifSesDurdurZamanlayici) {
    clearTimeout(aktifSesDurdurZamanlayici);
    aktifSesDurdurZamanlayici = null;
  }

  // 2. Ses Dosyası MP3 Çalma (Kilit açılmış paylaşımlı Audio nesnesi üzerinden)
  const calMP3 = async () => {
    if (!ortakSirenAudio) {
      webAudioSirenCal();
      return;
    }

    try {
      ortakSirenAudio.loop = false;
      ortakSirenAudio.muted = false;
      ortakSirenAudio.volume = 0.85;
      ortakSirenAudio.pause();
      ortakSirenAudio.currentTime = 0;
      const playPromise = ortakSirenAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
        sesKilidiAcildi = true;
        durumBildir(true);
      }
      aktifSesDurdurZamanlayici = setTimeout(() => {
        if (ortakSirenAudio) {
          try {
            ortakSirenAudio.pause();
            ortakSirenAudio.currentTime = 0;
          } catch {}
        }
        aktifSesDurdurZamanlayici = null;
      }, sureMs);
    } catch (e) {
      console.warn('MP3 çalınamadı, Web Audio Sentetizörü devreye giriyor:', e);
      webAudioSirenCal();
    }
  };

  calMP3();

  // 3. Arka Plan & Masaüstü/Telefon Bildirimi & Titreşim Pattern'i
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const bildirimBaslik = baslik || '🔔 YENİ MUTFAK SİPARİŞİ!';
    const bildirimDetay = detay || 'Acil taze sipariş düştü! Hemen tencereye alın.';
    const bildirimSecenekleri: any = {
      body: bildirimDetay,
      icon: '/assets/aistudio/image_48081a60_bc73ebae.jpg',
      badge: '/assets/aistudio/image_48081a60_bc73ebae.jpg',
      tag: 'afyon-mutfak-siparis-nukleer',
      renotify: true,
      silent: false,
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((kayit) => {
        kayit.showNotification(bildirimBaslik, {
          ...bildirimSecenekleri,
          vibrate: [600, 200, 600, 200, 600, 200, 800] as any,
        }).catch(() => {
          try {
            new Notification(bildirimBaslik, bildirimSecenekleri);
          } catch {}
        });
      }).catch(() => {
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
 * Web Audio API Sentetizör Yedek Siren (Paylaşımlı AudioContext ile)
 */
async function webAudioSirenCal() {
  try {
    ortakSesNesneleriniHazirla();
    const sesMerkezi = ortakAudioContext;
    if (!sesMerkezi) return;

    if (sesMerkezi.state === 'suspended') {
      await sesMerkezi.resume().catch(() => {});
    }

    const simdi = sesMerkezi.currentTime;
    const toplamSure = 3.2;

    const osilator1 = sesMerkezi.createOscillator();
    const kazanc1 = sesMerkezi.createGain();
    osilator1.type = 'sawtooth';

    const osilator2 = sesMerkezi.createOscillator();
    const kazanc2 = sesMerkezi.createGain();
    osilator2.type = 'square';

    // Siren Dalgaları
    osilator1.frequency.setValueAtTime(320, simdi);
    osilator1.frequency.exponentialRampToValueAtTime(880, simdi + 0.5);
    osilator1.frequency.exponentialRampToValueAtTime(320, simdi + 1.0);
    osilator1.frequency.exponentialRampToValueAtTime(940, simdi + 1.5);
    osilator1.frequency.exponentialRampToValueAtTime(340, simdi + 2.0);
    osilator1.frequency.exponentialRampToValueAtTime(880, simdi + 2.6);

    osilator2.frequency.setValueAtTime(324, simdi);
    osilator2.frequency.exponentialRampToValueAtTime(888, simdi + 0.5);
    osilator2.frequency.exponentialRampToValueAtTime(324, simdi + 1.0);
    osilator2.frequency.exponentialRampToValueAtTime(948, simdi + 1.5);
    osilator2.frequency.exponentialRampToValueAtTime(348, simdi + 2.0);
    osilator2.frequency.exponentialRampToValueAtTime(888, simdi + 2.6);

    kazanc1.gain.setValueAtTime(0.01, simdi);
    kazanc1.gain.linearRampToValueAtTime(0.45, simdi + 0.1);
    kazanc1.gain.exponentialRampToValueAtTime(0.001, simdi + toplamSure);

    kazanc2.gain.setValueAtTime(0.01, simdi);
    kazanc2.gain.linearRampToValueAtTime(0.25, simdi + 0.1);
    kazanc2.gain.exponentialRampToValueAtTime(0.001, simdi + toplamSure);

    osilator1.connect(kazanc1);
    kazanc1.connect(sesMerkezi.destination);
    osilator2.connect(kazanc2);
    kazanc2.connect(sesMerkezi.destination);

    osilator1.start(simdi);
    osilator2.start(simdi);
    osilator1.stop(simdi + toplamSure);
    osilator2.stop(simdi + toplamSure);
  } catch (e) {
    console.warn('Web Audio Siren hatası:', e);
  }
}

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
    } catch {
      // Cihaz veya iFrame kısıtlamasında sessizce devam et
    }
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
