import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { canliFirebaseAktifMi, firebaseVeritabani } from '@/src/veritabani/FirebaseIstemcisi';
import { telefonAdaylariniUret } from '@/src/MalzemeCekmeceleri/Mutfak/mutfakKullaniciSorgusu';
import {
  hukukiLoglariGetir,
  hukukiSozlesmeleriCanliSenkronizeEt,
  hukukiSozlesmeleriGetir,
} from './hukukDeposu';
import { HukukiOnayLogu, HukukiSozlesme } from './tipler';

export interface MutfakKimlikOzeti {
  mutfakId: string;
  mutfakAdi: string;
  kullaniciKimlik?: string;
  telefon?: string;
  adSoyad?: string;
}

export const MUTFAK_TEMEL_SOZLESME_TURLERI = [
  'mutfak_kayit_sozlesmesi',
  'kvkk_aydinlatma',
  'hijyen_esnaf_muafiyet_onayi',
  'iptal_iade_kosullari',
] as const;

export const EK_MUTFAK_SOZLESME_TANIMLARI: Record<string, HukukiSozlesme> = {
  hijyen_esnaf_muafiyet_onayi: {
    tur: 'hijyen_esnaf_muafiyet_onayi',
    baslik: 'Hijyen Belgesi ve Esnaf Muafiyet Beyan Onayı',
    kisaBaslik: 'Hijyen & Esnaf Muafiyet Onayı',
    versiyon: '1.0.0',
    guncellenmeTarihi: '2026-10-19',
    zorunluMu: true,
    konum: 'asci_basvuru',
    silinebilirMi: false,
    icerik: `EV MUTFAĞI HİJYEN VE ESNAF MUAFIYET BEYANI

1. Üretici/Aşçı, ev mutfağında hazırladığı tüm gıda ürünlerini T.C. Tarım ve Orman Bakanlığı ile Sağlık Bakanlığı hijyen kurallarına uygun koşullarda ürettiğini beyan eder.
2. Vergi Usul Kanunu ve Gelir Vergisi Kanunu çerçevesinde esnaf muaflığı belgesi veya ilgili yasal izin/vergi kaydı yükümlülüklerinin kendisine ait olduğunu kabul eder.
3. Eksik veya onay bekleyen belgelerini panel üzerindeki "Hijyen & Esnaf Muafiyet Belgelerim" bölümünden tamamlamayı taahhüt eder.`,
  },
  iptal_iade_kosullari: {
    tur: 'iptal_iade_kosullari',
    baslik: 'Mutfak Kaynaklı Sipariş İptal ve İade Koşulları',
    kisaBaslik: 'İptal & İade Koşulları',
    versiyon: '1.0.0',
    guncellenmeTarihi: '2026-10-19',
    zorunluMu: true,
    konum: 'genel',
    silinebilirMi: false,
    icerik: `SİPARİŞ İPTAL VE İADE KOŞULLARI

1. Mutfak, sipariş kabul edildikten sonra mücbir sebep veya stok tükenmesi dışında keyfi iptal gerçekleştirmeyeceğini kabul eder.
2. Mutfak kaynaklı iptallerde iptal gerekçesi müşteri ve platform yönetimi ile şeffaf biçimde paylaşılır; her iptal işlemi tarih/saat ve zaman damgası ile kayıt altına alınır.
3. Ödeme yapılmış siparişin mutfak tarafından iptal edilmesi halinde müşteri tutarı eksiksiz iade sürecine alınır.`,
  },
};

export function htmlKacis(metin: unknown): string {
  const s = metin == null ? '' : String(metin);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dosyaAdiTemizle(ad: string): string {
  return ad
    .toLowerCase()
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function logZamanPuaniAl(log: HukukiOnayLogu): number {
  if (log.sunucuUtc) {
    const ms = Date.parse(log.sunucuUtc);
    if (!Number.isNaN(ms)) return ms;
  }
  const eslesme = /^log_(\d+)_/.exec(log.kimlik || '');
  if (eslesme) return Number(eslesme[1]) || 0;
  return 0;
}

function telefonRakamlari(tel?: string): string {
  if (!tel) return '';
  const r = tel.replace(/\D/g, '');
  if (r.startsWith('90') && r.length === 12) return r.slice(2);
  if (r.startsWith('0') && r.length === 11) return r.slice(1);
  return r;
}

function logMutfagaAitMi(log: HukukiOnayLogu, ozet: MutfakKimlikOzeti): boolean {
  if (ozet.kullaniciKimlik && log.kullaniciKimlik === ozet.kullaniciKimlik) return true;
  if (ozet.mutfakId && (log.kullaniciKimlik === ozet.mutfakId || log.ilgiliKayitId === ozet.mutfakId)) {
    return true;
  }
  const hedefTel = telefonRakamlari(ozet.telefon);
  const logTel = telefonRakamlari(log.kullaniciTelefon);
  return Boolean(hedefTel && logTel && hedefTel === logTel);
}

export async function mutfakSozlesmeHaritasiGetir(): Promise<Record<string, HukukiSozlesme>> {
  let guncel = hukukiSozlesmeleriGetir();
  try {
    guncel = await hukukiSozlesmeleriCanliSenkronizeEt();
  } catch {
    // Yerel önbellekle devam et
  }
  return {
    ...EK_MUTFAK_SOZLESME_TANIMLARI,
    ...guncel,
  };
}

export async function mutfakOnayLoglariniGetir(
  ozet: MutfakKimlikOzeti
): Promise<HukukiOnayLogu[]> {
  const birlesik = new Map<string, HukukiOnayLogu>();

  // Yerel önbellekten yalnızca bu mutfağa ait kayıtları al
  for (const yerel of hukukiLoglariGetir()) {
    if (yerel?.kimlik && logMutfagaAitMi(yerel, ozet)) {
      birlesik.set(yerel.kimlik, yerel);
    }
  }

  if (canliFirebaseAktifMi()) {
    const logRef = collection(firebaseVeritabani, 'hukuki_onay_loglari');
    const sorgular: Promise<any>[] = [];

    const kimlikSeti = Array.from(
      new Set([ozet.kullaniciKimlik, ozet.mutfakId].filter((v): v is string => Boolean(v)))
    );
    if (kimlikSeti.length === 1) {
      sorgular.push(getDocs(query(logRef, where('kullaniciKimlik', '==', kimlikSeti[0]), limit(60))));
      sorgular.push(getDocs(query(logRef, where('ilgiliKayitId', '==', kimlikSeti[0]), limit(40))));
    } else if (kimlikSeti.length > 1) {
      sorgular.push(getDocs(query(logRef, where('kullaniciKimlik', 'in', kimlikSeti.slice(0, 10)), limit(60))));
      sorgular.push(getDocs(query(logRef, where('ilgiliKayitId', 'in', kimlikSeti.slice(0, 10)), limit(40))));
    }

    const telefonAdaylari = ozet.telefon ? telefonAdaylariniUret(ozet.telefon) : [];
    if (telefonAdaylari.length > 0) {
      sorgular.push(
        getDocs(query(logRef, where('kullaniciTelefon', 'in', telefonAdaylari.slice(0, 10)), limit(60)))
      );
    }

    const sonuclar = await Promise.allSettled(sorgular);
    for (const sonuc of sonuclar) {
      if (sonuc.status === 'fulfilled') {
        sonuc.value.docs.forEach((docSnap: any) => {
          const veri = docSnap.data() as HukukiOnayLogu;
          const kimlik = veri.kimlik || docSnap.id;
          birlesik.set(kimlik, { ...veri, kimlik });
        });
      }
    }
  }

  return Array.from(birlesik.values()).sort((a, b) => logZamanPuaniAl(b) - logZamanPuaniAl(a));
}

export function damgaDurumuEtiketi(durum?: string): {
  metin: string;
  renkSinifi: string;
} {
  if (durum === 'rfc3161_onayli') {
    return {
      metin: 'RFC 3161 Zaman Damgası Onaylı',
      renkSinifi: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    };
  }
  if (durum === 'sunucu_muhurlu') {
    return {
      metin: 'Sunucu UTC + HMAC Mühürlü',
      renkSinifi: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    };
  }
  return {
    metin: 'Yerel SHA-256 Özeti',
    renkSinifi: 'bg-purple-500/15 text-purple-200 border-purple-500/40',
  };
}

export function islemTuruTurkce(islemTuru: string): string {
  switch (islemTuru) {
    case 'kayit':
      return 'Mutfak Kayıt & Başvuru Onayı';
    case 'ozel_onay':
      return 'Sipariş Durum Onayı';
    case 'iptal':
      return 'Sipariş İptal Beyanı';
    case 'hakedis':
      return 'Hakediş Ödeme Talebi';
    case 'siparis':
      return 'Sipariş İşlemi';
    case 'cerez_onayi':
      return 'Çerez Tercihi';
    default:
      return islemTuru;
  }
}

export function sozlesmeBasligiBul(
  sozlesmeTuru: string,
  sozlesmeHaritasi: Record<string, HukukiSozlesme>
): string {
  return (
    sozlesmeHaritasi[sozlesmeTuru]?.baslik ||
    EK_MUTFAK_SOZLESME_TANIMLARI[sozlesmeTuru]?.baslik ||
    sozlesmeTuru
  );
}

export function sozlesmeBelgesiHtmlUret(
  sozlesme: HukukiSozlesme,
  onayLogu: HukukiOnayLogu | null,
  mutfakBilgisi: MutfakKimlikOzeti
): string {
  const durumBilgisi = onayLogu
    ? damgaDurumuEtiketi(onayLogu.damgaDurumu).metin
    : 'Henüz Zaman Damgalı Onay Kaydı Bulunmuyor';
  const ekDetaySatiri =
    onayLogu?.ekDetay && Object.keys(onayLogu.ekDetay).length > 0
      ? JSON.stringify(onayLogu.ekDetay, null, 2)
      : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlKacis(sozlesme.baslik)} - Zaman Damgalı Hukuki Delil Belgesi</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; background: #f8fafc; margin: 0; padding: 24px; line-height: 1.6; }
    .sayfa { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(15,23,42,0.06); }
    .ust { border-bottom: 2px solid #581c87; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .marka { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #6b21a8; }
    h1 { font-size: 20px; margin: 6px 0 4px; color: #0f172a; }
    .alt { font-size: 13px; color: #475569; }
    .rozet { display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; background: ${onayLogu ? '#ecfdf5' : '#fef3c7'}; color: ${onayLogu ? '#065f46' : '#92400e'}; border: 1px solid ${onayLogu ? '#6ee7b7' : '#fcd34d'}; }
    .kutu { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    .kutu h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin: 0 0 12px; }
    .izgara { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px 18px; font-size: 13px; }
    .etiket { font-size: 11px; color: #64748b; display: block; font-weight: 600; }
    .deger { color: #0f172a; font-weight: 600; word-break: break-all; }
    .kod { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .metin { white-space: pre-wrap; font-size: 14px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
    .dipnot { margin-top: 20px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
    @media print { body { background: #fff; padding: 0; } .sayfa { box-shadow: none; border: none; padding: 12px; } }
  </style>
</head>
<body>
  <div class="sayfa">
    <div class="ust">
      <div>
        <div class="marka">Afyon Ev Lezzetleri • Resmi İşlem ve Sözleşme Belgesi</div>
        <h1>${htmlKacis(sozlesme.baslik)}</h1>
        <div class="alt">Sözleşme Kodu: <strong>${htmlKacis(sozlesme.tur)}</strong> • Sürüm: <strong>v${htmlKacis(onayLogu?.sozlesmeVersiyonu || sozlesme.versiyon)}</strong></div>
      </div>
      <div class="rozet">${htmlKacis(durumBilgisi)}</div>
    </div>

    <div class="kutu">
      <h2>Taraf ve Mutfak Bilgileri</h2>
      <div class="izgara">
        <div><span class="etiket">Mutfak / İşletme Adı</span><span class="deger">${htmlKacis(mutfakBilgisi.mutfakAdi)}</span></div>
        <div><span class="etiket">Yetkili Ad Soyad</span><span class="deger">${htmlKacis(onayLogu?.kullaniciAdSoyad || mutfakBilgisi.adSoyad || '-')}</span></div>
        <div><span class="etiket">Telefon</span><span class="deger">${htmlKacis(onayLogu?.kullaniciTelefon || mutfakBilgisi.telefon || '-')}</span></div>
        <div><span class="etiket">Mutfak / Kullanıcı Kimliği</span><span class="deger kod">${htmlKacis(onayLogu?.kullaniciKimlik || mutfakBilgisi.mutfakId)}</span></div>
      </div>
    </div>

    ${
      onayLogu
        ? `<div class="kutu">
      <h2>RFC 3161 Zaman Damgası &amp; Kriptografik Doğrulama Kaydı</h2>
      <div class="izgara">
        <div><span class="etiket">Kayıt Kimliği</span><span class="deger kod">${htmlKacis(onayLogu.kimlik)}</span></div>
        <div><span class="etiket">İşlem Türü</span><span class="deger">${htmlKacis(islemTuruTurkce(onayLogu.islemTuru))}</span></div>
        <div><span class="etiket">Onay Tarih / Saat (TR)</span><span class="deger">${htmlKacis(onayLogu.tarihSaat)}</span></div>
        <div><span class="etiket">Sunucu UTC Zamanı</span><span class="deger kod">${htmlKacis(onayLogu.sunucuUtc || '-')}</span></div>
        <div><span class="etiket">İstemci IP Adresi</span><span class="deger kod">${htmlKacis(onayLogu.ipAdresi)}</span></div>
        <div><span class="etiket">TSA Zaman Damgası Sağlayıcı</span><span class="deger">${htmlKacis(onayLogu.tsaSaglayici || '-')}</span></div>
        <div><span class="etiket">İlgili Kayıt / Sipariş No</span><span class="deger kod">${htmlKacis(onayLogu.ilgiliKayitId || '-')}</span></div>
        <div><span class="etiket">Cihaz Bilgisi</span><span class="deger">${htmlKacis(onayLogu.cihazBilgisi)}</span></div>
      </div>
      <div style="margin-top: 12px;">
        <span class="etiket">İşlem Kanonik Özeti (SHA-256)</span>
        <div class="deger kod">${htmlKacis(onayLogu.ozetHash || '-')}</div>
      </div>
      <div style="margin-top: 8px;">
        <span class="etiket">Sözleşme Metni Özeti (SHA-256)</span>
        <div class="deger kod">${htmlKacis(onayLogu.sozlesmeMetinHash || '-')}</div>
      </div>
      <div style="margin-top: 8px;">
        <span class="etiket">Sunucu HMAC Doğrulama Mührü</span>
        <div class="deger kod">${htmlKacis(onayLogu.sunucuImzasi || '-')}</div>
      </div>
      ${
        ekDetaySatiri
          ? `<div style="margin-top: 8px;"><span class="etiket">İşlem Ek Detayları</span><pre class="kod" style="margin:4px 0 0;white-space:pre-wrap;">${htmlKacis(ekDetaySatiri)}</pre></div>`
          : ''
      }
    </div>`
        : ''
    }

    <div class="kutu" style="background:#fff;">
      <h2>Sözleşme ve Taahhüt Metni</h2>
      <div class="metin">${htmlKacis(sozlesme.icerik)}</div>
    </div>

    <div class="dipnot">
      Bu belge Afyon Ev Lezzetleri Mutfak Paneli üzerinden indirilmiştir. RFC 3161 (.tsr) zaman damgası token'ı mevcut olan kayıtlar, ilgili TSA sağlayıcı kök sertifikası ile bağımsız olarak doğrulanabilir.
    </div>
  </div>
</body>
</html>`;
}

function blobDosyaIndir(icerik: BlobPart, mimeTipi: string, dosyaAdi: string): void {
  const blob = new Blob([icerik], { type: mimeTipi });
  const nesneUrl = URL.createObjectURL(blob);
  const bag = document.createElement('a');
  bag.href = nesneUrl;
  bag.download = dosyaAdi;
  bag.style.display = 'none';
  document.body.appendChild(bag);
  bag.click();
  setTimeout(() => {
    bag.remove();
    URL.revokeObjectURL(nesneUrl);
  }, 1000);
}

export function sozlesmeBelgesiHtmlIndir(
  sozlesme: HukukiSozlesme,
  onayLogu: HukukiOnayLogu | null,
  mutfakBilgisi: MutfakKimlikOzeti
): void {
  const html = sozlesmeBelgesiHtmlUret(sozlesme, onayLogu, mutfakBilgisi);
  const tarihEk = (onayLogu?.sunucuUtc || new Date().toISOString()).slice(0, 10);
  const dosyaAdi = `${dosyaAdiTemizle(sozlesme.tur)}_${tarihEk}.html`;
  blobDosyaIndir(html, 'text/html;charset=utf-8', dosyaAdi);
}

export function tsaTokenDosyasiIndir(onayLogu: HukukiOnayLogu): boolean {
  if (!onayLogu.tsaTokenBase64) return false;
  try {
    const ikili = atob(onayLogu.tsaTokenBase64);
    const baytlar = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i += 1) {
      baytlar[i] = ikili.charCodeAt(i);
    }
    const dosyaAdi = `${dosyaAdiTemizle(onayLogu.sozlesmeTuru)}_${dosyaAdiTemizle(onayLogu.kimlik)}.tsr`;
    blobDosyaIndir(baytlar, 'application/timestamp-reply', dosyaAdi);
    return true;
  } catch {
    return false;
  }
}

export function sozlesmeBelgesiYazdir(
  sozlesme: HukukiSozlesme,
  onayLogu: HukukiOnayLogu | null,
  mutfakBilgisi: MutfakKimlikOzeti
): void {
  const html = sozlesmeBelgesiHtmlUret(sozlesme, onayLogu, mutfakBilgisi);
  const cerceve = document.createElement('iframe');
  cerceve.style.position = 'fixed';
  cerceve.style.right = '0';
  cerceve.style.bottom = '0';
  cerceve.style.width = '0';
  cerceve.style.height = '0';
  cerceve.style.border = '0';
  cerceve.srcdoc = html;
  cerceve.onload = () => {
    try {
      cerceve.contentWindow?.focus();
      cerceve.contentWindow?.print();
    } catch {
      // Yazdırma iptal edilirse veya tarayıcı izin vermezse sessiz geç
    }
    setTimeout(() => {
      cerceve.remove();
    }, 2500);
  };
  document.body.appendChild(cerceve);
}
