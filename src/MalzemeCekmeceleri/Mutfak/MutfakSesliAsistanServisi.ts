/**
 * Afyon Ev Lezzetleri — Mutfak Sesli Asistan & Geri Sayım Anons Servisi
 * Mutfaktaki aşçıların tezgaha bakmadan fırın ve ocak zamanını takip etmelerini sağlar.
 */

const ANONS_HAFIZASI = new Set<string>();

const AYAR_ANAHTARI = 'afyon_mutfak_sesli_asistan_aktif';

/**
 * Sesli asistanın açık olup olmadığını döner (varsayılan: açık)
 */
export function sesliAsistanAktifMi(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const kayit = localStorage.getItem(AYAR_ANAHTARI);
    return kayit === null ? true : kayit === 'true';
  } catch {
    return true;
  }
}

/**
 * Sesli asistanı açar veya kapatır
 */
export function sesliAsistanAyarla(aktif: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AYAR_ANAHTARI, aktif ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('afyon_sesli_asistan_ayar_degisti', { detail: { aktif } })
    );
  } catch {}
}

/**
 * Mutfak içi profesyonel çift tonlu gong / sinyal sesi çalar (Web Audio API)
 */
export function mutfakGongCal(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const zaman = ctx.currentTime;

    // Ton 1: D5 (587 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, zaman);
    gain1.gain.setValueAtTime(0.12, zaman);
    gain1.gain.exponentialRampToValueAtTime(0.001, zaman + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(zaman);
    osc1.stop(zaman + 0.25);

    // Ton 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, zaman + 0.12);
    gain2.gain.setValueAtTime(0.15, zaman + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, zaman + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(zaman + 0.12);
    osc2.stop(zaman + 0.45);
  } catch (err) {
    console.debug('Gong çalma hatası:', err);
  }
}

let hazirSesler: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    hazirSesler = window.speechSynthesis.getVoices() || [];
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        hazirSesler = window.speechSynthesis.getVoices() || [];
      } catch {}
    };
  } catch {}
}

function konusmayiBaslat(metin: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(metin);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const sesler = hazirSesler.length > 0 ? hazirSesler : window.speechSynthesis.getVoices();
    const trSes = sesler.find((s) => s.lang.startsWith('tr') || s.lang.includes('TR'));
    if (trSes) utterance.voice = trSes;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis speak hatası:', e);
  }
}

/**
 * Web Speech API ile Türkçe sesli anons yapar
 */
export function mutfakSesliAnonsYap(
  metin: string,
  secenekler?: { anindaKonus?: boolean; gongCal?: boolean }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!sesliAsistanAktifMi()) return;

  try {
    if (secenekler?.gongCal !== false) {
      mutfakGongCal();
    }

    if (secenekler?.anindaKonus) {
      konusmayiBaslat(metin);
    } else {
      setTimeout(() => {
        konusmayiBaslat(metin);
      }, 260);
    }
  } catch (err) {
    console.warn('Sesli anons hatası:', err);
  }
}

export function sesliGeriBildirimTestEt(): void {
  sesliAsistanAyarla(true);
  mutfakGongCal();
  konusmayiBaslat(
    'Afyon Ev Lezzetleri sesli geri bildirim sistemi aktif. Yeni sipariş geldiğinde ve hazırlık sürelerinde size sesli bilgi verilecektir.'
  );
}

export function yeniSiparisSesliAnonsYap(
  siparisKodu: string,
  musteriAdi: string,
  tutar: number
): void {
  if (!sesliAsistanAktifMi()) return;
  const tutarMetni = tutar > 0 ? `, toplam ${Math.round(tutar)} lira` : '';
  setTimeout(() => {
    konusmayiBaslat(
      `Yeni sipariş geldi! ${musteriAdi}${tutarMetni}. Sipariş kodu ${siparisKodu}.`
    );
  }, 1100);
}

/**
 * Geri sayım sayacına göre belirli dönüm noktalarında (her 10 dakikada ve kritik son dakikalarda)
 * tek seferlik akıllı Türkçe sesli anons yapar.
 */
export function mutfakGeriSayimAnonsKontrol(
  siparisId: string,
  siparisKodu: string,
  kalanDakika: number,
  kalanSaniye: number
): void {
  if (!sesliAsistanAktifMi()) return;

  const kisaKod = siparisKodu || siparisId?.substring(0, 6) || '';

  // Eşik Tanımları: [dakikaEşigi, anonsMetni]
  // 50 dk, 40 dk, 30 dk, 20 dk, 15 dk, 10 dk, 5 dk, 0 dk (süre doldu)
  const esikler: Array<{ dakika: number; anahtar: string; metin: string }> = [
    { dakika: 50, anahtar: '50dk', metin: `Sipariş ${kisaKod} için 50 dakika kaldı.` },
    { dakika: 40, anahtar: '40dk', metin: `Sipariş ${kisaKod} için 40 dakika kaldı.` },
    { dakika: 30, anahtar: '30dk', metin: `Sipariş ${kisaKod} için 30 dakika kaldı.` },
    { dakika: 20, anahtar: '20dk', metin: `Sipariş ${kisaKod} için 20 dakika kaldı.` },
    { dakika: 15, anahtar: '15dk', metin: `Sipariş ${kisaKod} için 15 dakika kaldı, hazırlıklar devam ediyor.` },
    { dakika: 10, anahtar: '10dk', metin: `Dikkat, Sipariş ${kisaKod} için son 10 dakika kaldı. Fırını ve ocağı kontrol edin.` },
    { dakika: 5, anahtar: '5dk', metin: `Acil uyarı! Sipariş ${kisaKod} için son 5 dakika! Paketlemeye hazırlanın.` },
    { dakika: 0, anahtar: '0dk', metin: `Sipariş ${kisaKod}'ün süresi doldu! Paketleme ve kurye teslim zamanı.` },
  ];

  for (const esik of esikler) {
    const hafizaAnahtari = `${siparisId}_${esik.anahtar}`;

    // Eğer bu eşik daha önce anons edildiyse geç
    if (ANONS_HAFIZASI.has(hafizaAnahtari)) continue;

    // Eşik kontrolü: Dakika tam eşleşiyorsa veya 0 için süre bittiğinde
    if (esik.dakika === 0) {
      if (kalanDakika <= 0 && kalanSaniye <= 0) {
        ANONS_HAFIZASI.add(hafizaAnahtari);
        mutfakSesliAnonsYap(esik.metin);
        break;
      }
    } else {
      if (kalanDakika === esik.dakika && kalanSaniye <= 5) {
        ANONS_HAFIZASI.add(hafizaAnahtari);
        mutfakSesliAnonsYap(esik.metin);
        break;
      }
    }
  }
}

/**
 * Sipariş tamamlandığında veya iptal edildiğinde anons hafızasını temizler
 */
export function mutfakAnonsHafizasiniTemizle(siparisId: string): void {
  for (const anahtar of Array.from(ANONS_HAFIZASI)) {
    if (anahtar.startsWith(`${siparisId}_`)) {
      ANONS_HAFIZASI.delete(anahtar);
    }
  }
}
