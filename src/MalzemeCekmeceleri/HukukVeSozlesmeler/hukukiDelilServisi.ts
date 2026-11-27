import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { canliFirebaseAktifMi, firebaseVeritabani } from '@/src/veritabani/FirebaseIstemcisi';
import { firestoreHatasiniYonet, IslemTipi } from '@/src/veritabani/FirebaseHataYoneticisi';
import { apiYoluOlustur } from '@/src/MalzemeCekmeceleri/apiAdresiYardimcisi';
import type { DamgaDurumu, HukukiIslemTuru, HukukiOnayLogu } from './tipler';

const YEREL_LOGLAR_ANAHTARI = 'afyon_hukuki_onay_loglari_v2';

export interface HukukiDelilGirdisi {
  kimlik?: string;
  sozlesmeTuru: string;
  sozlesmeVersiyonu?: string;
  islemTuru: HukukiIslemTuru;
  onaylandiMi: boolean;
  sozlesmeIcerigi?: string;
  ilgiliKayitId?: string;
  kullaniciKimlik?: string;
  kullaniciTelefon?: string;
  kullaniciAdSoyad?: string;
  ekDetay?: Record<string, unknown>;
}

function rastgeleEkUret(): string {
  return Math.random().toString(36).substring(2, 6);
}

export function yeniDelilKimligiUret(): string {
  return `log_${Date.now()}_${rastgeleEkUret()}`;
}

export function yerelAktifMutfakKullanicisiOku(): {
  kullaniciKimlik?: string;
  kullaniciTelefon?: string;
  kullaniciAdSoyad?: string;
} {
  try {
    if (typeof localStorage === 'undefined') return {};
    const ham = localStorage.getItem('afyon_oturum_kullanici');
    if (!ham) return {};
    const k = JSON.parse(ham);
    return {
      kullaniciKimlik: k?.kimlik || k?.id || undefined,
      kullaniciTelefon: k?.telefon || k?.telefon_numarasi || undefined,
      kullaniciAdSoyad: k?.isletme_adi || k?.ad_soyad || undefined,
    };
  } catch {
    return {};
  }
}

async function tarayiciSha256Hex(metin: string): Promise<string | undefined> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const baytlar = new TextEncoder().encode(metin);
      const ozet = await crypto.subtle.digest('SHA-256', baytlar);
      return Array.from(new Uint8Array(ozet))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}
  return undefined;
}

function yerelCihazBilgisiAl(): string {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.substring(0, 120);
  }
  return 'Bilinmeyen İstemci';
}

function sunucuIstanbulFormat(tarih: Date): string {
  try {
    const parcalar = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(tarih);
    const bul = (tip: string) => parcalar.find((p) => p.type === tip)?.value || '00';
    return `${bul('day')}.${bul('month')}.${bul('year')} ${bul('hour')}:${bul('minute')}:${bul('second')}`;
  } catch {
    return tarih.toLocaleString('tr-TR');
  }
}

function izinliDelilBelgesiOlustur(
  ham: Omit<HukukiOnayLogu, 'sunucuKayitZamani'>,
  sunucuDamgasiEkle: boolean
): Record<string, unknown> {
  const belge: Record<string, unknown> = {
    kimlik: ham.kimlik,
    sozlesmeTuru: ham.sozlesmeTuru,
    sozlesmeVersiyonu: ham.sozlesmeVersiyonu,
    islemTuru: ham.islemTuru,
    tarihSaat: ham.tarihSaat,
    ipAdresi: ham.ipAdresi,
    cihazBilgisi: ham.cihazBilgisi,
    onaylandiMi: Boolean(ham.onaylandiMi),
  };

  if (sunucuDamgasiEkle) {
    belge.sunucuKayitZamani = serverTimestamp();
  }
  if (ham.sunucuUtc) belge.sunucuUtc = ham.sunucuUtc;
  if (ham.ozetHash) belge.ozetHash = ham.ozetHash;
  if (ham.sozlesmeMetinHash) belge.sozlesmeMetinHash = ham.sozlesmeMetinHash;
  if (ham.tsaSaglayici) belge.tsaSaglayici = ham.tsaSaglayici;
  if (ham.tsaTokenBase64) belge.tsaTokenBase64 = ham.tsaTokenBase64;
  if (ham.damgaDurumu) belge.damgaDurumu = ham.damgaDurumu;
  if (ham.sunucuImzasi) belge.sunucuImzasi = ham.sunucuImzasi;
  if (ham.ilgiliKayitId) belge.ilgiliKayitId = ham.ilgiliKayitId;
  if (ham.kullaniciKimlik) belge.kullaniciKimlik = ham.kullaniciKimlik;
  if (ham.kullaniciTelefon) belge.kullaniciTelefon = ham.kullaniciTelefon;
  if (ham.kullaniciAdSoyad) belge.kullaniciAdSoyad = ham.kullaniciAdSoyad;
  if (ham.ekDetay && Object.keys(ham.ekDetay).length > 0) belge.ekDetay = ham.ekDetay;

  return belge;
}

function yereldeOnayLogunuSakla(kayit: HukukiOnayLogu): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const ham = localStorage.getItem(YEREL_LOGLAR_ANAHTARI);
    const mevcut: HukukiOnayLogu[] = ham ? JSON.parse(ham) : [];
    const filtrelenmis = Array.isArray(mevcut) ? mevcut.filter((x) => x.kimlik !== kayit.kimlik) : [];
    filtrelenmis.unshift(kayit);
    if (filtrelenmis.length > 500) filtrelenmis.pop();
    localStorage.setItem(YEREL_LOGLAR_ANAHTARI, JSON.stringify(filtrelenmis));
  } catch {}
}

export async function hukukiDelilDamgalaVeKaydet(
  girdi: HukukiDelilGirdisi
): Promise<HukukiOnayLogu> {
  const kimlik = girdi.kimlik || yeniDelilKimligiUret();
  const oturumBilgisi = yerelAktifMutfakKullanicisiOku();
  const kullaniciKimlik = girdi.kullaniciKimlik ?? oturumBilgisi.kullaniciKimlik;
  const kullaniciTelefon = girdi.kullaniciTelefon ?? oturumBilgisi.kullaniciTelefon;
  const kullaniciAdSoyad = girdi.kullaniciAdSoyad ?? oturumBilgisi.kullaniciAdSoyad;
  const sozlesmeVersiyonu = (girdi.sozlesmeVersiyonu || '1.0.0').trim();
  const cihazBilgisi = yerelCihazBilgisiAl();

  const yerelSozlesmeHash =
    typeof girdi.sozlesmeIcerigi === 'string' && girdi.sozlesmeIcerigi.trim()
      ? await tarayiciSha256Hex(girdi.sozlesmeIcerigi.trim())
      : undefined;

  let damgaVerisi: {
    tarihSaat: string;
    sunucuUtc: string;
    ipAdresi: string;
    ozetHash?: string;
    sozlesmeMetinHash?: string;
    tsaSaglayici?: string;
    tsaTokenBase64?: string;
    damgaDurumu: DamgaDurumu;
    sunucuImzasi?: string;
  } | null = null;

  try {
    const yanit = await fetch(apiYoluOlustur('/api/zaman-damgasi/damgala'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sozlesmeTuru: girdi.sozlesmeTuru,
        sozlesmeVersiyonu,
        islemTuru: girdi.islemTuru,
        ilgiliKayitId: girdi.ilgiliKayitId,
        kullaniciKimlik,
        kullaniciTelefon,
        kullaniciAdSoyad,
        sozlesmeIcerigi: girdi.sozlesmeIcerigi,
        sozlesmeMetinHash: yerelSozlesmeHash,
        ekDetay: girdi.ekDetay,
      }),
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(8500) : undefined,
    });

    if (yanit.ok) {
      const sonuc = await yanit.json();
      if (sonuc?.basarili && sonuc?.damga) {
        damgaVerisi = sonuc.damga;
      }
    }
  } catch {
    // Sunucu köprüsü erişilemezse yerel özet fallback'ine geç
  }

  const simdi = new Date();
  const sunucuUtc = damgaVerisi?.sunucuUtc || simdi.toISOString();
  const yerelOzetHash =
    damgaVerisi?.ozetHash ||
    (await tarayiciSha256Hex(
      JSON.stringify({
        kimlik,
        sozlesmeTuru: girdi.sozlesmeTuru,
        sozlesmeVersiyonu,
        islemTuru: girdi.islemTuru,
        sunucuUtc,
        ilgiliKayitId: girdi.ilgiliKayitId,
        kullaniciKimlik,
        kullaniciTelefon,
        sozlesmeMetinHash: yerelSozlesmeHash,
      })
    ));

  const yerelKayit: HukukiOnayLogu = {
    kimlik,
    sozlesmeTuru: girdi.sozlesmeTuru,
    sozlesmeVersiyonu,
    islemTuru: girdi.islemTuru,
    tarihSaat: damgaVerisi?.tarihSaat || sunucuIstanbulFormat(simdi),
    ipAdresi: damgaVerisi?.ipAdresi || 'bilinmiyor',
    cihazBilgisi,
    onaylandiMi: Boolean(girdi.onaylandiMi),
    sunucuUtc,
    ozetHash: yerelOzetHash,
    sozlesmeMetinHash: damgaVerisi?.sozlesmeMetinHash || yerelSozlesmeHash,
    tsaSaglayici: damgaVerisi?.tsaSaglayici || 'İstemci Yerel Özeti',
    tsaTokenBase64: damgaVerisi?.tsaTokenBase64,
    damgaDurumu: damgaVerisi?.damgaDurumu || 'yerel_ozet',
    sunucuImzasi: damgaVerisi?.sunucuImzasi,
    ilgiliKayitId: girdi.ilgiliKayitId,
    kullaniciKimlik,
    kullaniciTelefon,
    kullaniciAdSoyad,
    ekDetay: girdi.ekDetay,
  };

  yereldeOnayLogunuSakla(yerelKayit);

  if (canliFirebaseAktifMi()) {
    try {
      const firestoreBelgesi = izinliDelilBelgesiOlustur(yerelKayit, true);
      await setDoc(doc(firebaseVeritabani, 'hukuki_onay_loglari', kimlik), firestoreBelgesi);
    } catch (hata: any) {
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      if (mesaj.includes('permission') || mesaj.includes('insufficient') || hata?.code === 'permission-denied') {
        firestoreHatasiniYonet(hata, IslemTipi.CREATE, `hukuki_onay_loglari/${kimlik}`);
      } else {
        console.warn('Hukuki delil Firestore yazma hatası:', hata);
      }
    }
  }

  return yerelKayit;
}
