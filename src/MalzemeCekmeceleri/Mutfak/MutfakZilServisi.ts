import { sekmeAlarmiBaslat } from '@/src/MalzemeCekmeceleri/SekmeAlarmi';

/**
 * ☢️ NÜKLEER SİREN ALARMI (YouTube Sesi & Web Audio Sentetizör Garantili)
 */
export const mutfakZiliCal = (baslik?: string, detay?: string) => {
  // 1. Sekme Başlığında Flaş Sönen Nükleer Alarm
  sekmeAlarmiBaslat('🚨 ☢️ (1) NÜKLEER SİPARİŞ GELİYOR!');

  // 2. Ses Dosyası MP3 Çalma (YouTube Nükleer Siren Sesi)
  let mp3Calindi = false;
  try {
    const sesObjesi = new Audio('/nukleer_siren.mp3');
    sesObjesi.volume = 0.9;
    const playPromise = sesObjesi.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          mp3Calindi = true;
        })
        .catch((e) => {
          console.warn('MP3 çalınamadı, Web Audio Sentetizörü devreye giriyor:', e);
          webAudioSirenCal();
        });
    }
  } catch (err) {
    console.warn('Audio nesnesi oluşturulamadı:', err);
    webAudioSirenCal();
  }

  // 3. Arka Plan & Masaüstü/Telefon Bildirimi & Güçlü Titreşim Pattern'i
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const bildirimBaslik = baslik || '☢️ NÜKLEER MUTFAK ALARMI!';
    const bildirimDetay = detay || 'Acil taze sipariş düştü! Hemen tencereye alın.';
    const bildirimSecenekleri: any = {
      body: bildirimDetay,
      icon: '/public/assets/aistudio/image_48081a60_bc73ebae.jpg',
      badge: '/public/assets/aistudio/image_48081a60_bc73ebae.jpg',
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
 * Web Audio API Sentetizör Yedek Nükleer Siren
 */
function webAudioSirenCal() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const sesMerkezi = new AudioContextClass();
      if (sesMerkezi.state === 'suspended') {
        sesMerkezi.resume().catch(() => {});
      }
      const simdi = sesMerkezi.currentTime;
      const toplamSure = 3.6;

      const osilator1 = sesMerkezi.createOscillator();
      const kazanc1 = sesMerkezi.createGain();
      osilator1.type = 'sawtooth';

      const osilator2 = sesMerkezi.createOscillator();
      const kazanc2 = sesMerkezi.createGain();
      osilator2.type = 'square';

      // Siren Dalgaları
      osilator1.frequency.setValueAtTime(320, simdi);
      osilator1.frequency.exponentialRampToValueAtTime(880, simdi + 0.6);
      osilator1.frequency.exponentialRampToValueAtTime(320, simdi + 1.2);
      osilator1.frequency.exponentialRampToValueAtTime(940, simdi + 1.8);
      osilator1.frequency.exponentialRampToValueAtTime(340, simdi + 2.4);

      osilator2.frequency.setValueAtTime(324, simdi);
      osilator2.frequency.exponentialRampToValueAtTime(888, simdi + 0.6);
      osilator2.frequency.exponentialRampToValueAtTime(324, simdi + 1.2);
      osilator2.frequency.exponentialRampToValueAtTime(948, simdi + 1.8);
      osilator2.frequency.exponentialRampToValueAtTime(348, simdi + 2.4);

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
    }
  } catch (e) {
    console.warn('Web Audio Siren hatası:', e);
  }
}
