import crypto from 'crypto';
import type { Request } from 'express';
import {
  kanonikJsonMetneCevir,
  rfc3161IstekOlustur,
  rfc3161YanitDogrula,
  sha256HexHesapla,
} from './Rfc3161Asn1Yardimcisi';

const GECICI_BELLEK_HMAC_ANAHTARI = crypto.randomBytes(32).toString('hex');

function hmacGizliAnahtariGetir(): string {
  const ortamAnahtari = (
    process.env.ZAMAN_DAMGASI_GIZLI_ANAHTARI ||
    process.env.TIMESTAMP_HMAC_SECRET ||
    ''
  ).trim();
  return ortamAnahtari || GECICI_BELLEK_HMAC_ANAHTARI;
}

const TSA_SAGLAYICILARI = [
  {
    ad: 'FreeTSA (freetsa.org)',
    url: 'https://freetsa.org/tsr',
  },
  {
    ad: 'DigiCert (timestamp.digicert.com)',
    url: 'http://timestamp.digicert.com',
  },
] as const;

const TSA_ZAMAN_ASIMI_MS = 3200;

export type DamgaDurumuTipi = 'rfc3161_onayli' | 'sunucu_muhurlu' | 'yerel_ozet';

export interface ZamanDamgasiIstekVerisi {
  sozlesmeTuru: string;
  sozlesmeVersiyonu: string;
  islemTuru: string;
  ilgiliKayitId?: string;
  kullaniciKimlik?: string;
  kullaniciTelefon?: string;
  kullaniciAdSoyad?: string;
  sozlesmeIcerigi?: string;
  sozlesmeMetinHash?: string;
  ekDetay?: Record<string, unknown>;
}

export interface ZamanDamgasiSonucu {
  tarihSaat: string;
  sunucuUtc: string;
  ipAdresi: string;
  ozetHash: string;
  sozlesmeMetinHash?: string;
  tsaSaglayici: string;
  tsaTokenBase64?: string;
  damgaDurumu: DamgaDurumuTipi;
  sunucuImzasi: string;
}

export function istemciIpAdresiCoz(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  let hamIp = '';

  if (typeof xff === 'string' && xff.trim()) {
    hamIp = xff.split(',')[0].trim();
  } else if (Array.isArray(xff) && xff.length > 0) {
    hamIp = String(xff[0]).split(',')[0].trim();
  } else if (typeof req.headers['x-real-ip'] === 'string' && req.headers['x-real-ip'].trim()) {
    hamIp = req.headers['x-real-ip'].trim();
  } else {
    hamIp = req.ip || req.socket?.remoteAddress || '';
  }

  const temiz = hamIp.replace(/^::ffff:/, '').trim();
  return temiz || 'bilinmiyor';
}

export function istanbulTarihSaatFormatla(tarih: Date): string {
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
}

async function tsaDamgasiAl(ozetHex: string): Promise<{
  tsaSaglayici: string;
  tsaTokenBase64?: string;
  damgaDurumu: DamgaDurumuTipi;
}> {
  let istekBuffer: Buffer;
  try {
    istekBuffer = rfc3161IstekOlustur(ozetHex);
  } catch {
    return {
      tsaSaglayici: 'Sunucu Yerel Mührü',
      damgaDurumu: 'sunucu_muhurlu',
    };
  }

  for (const saglayici of TSA_SAGLAYICILARI) {
    try {
      const yanit = await fetch(saglayici.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          Accept: 'application/timestamp-reply',
        },
        body: new Uint8Array(istekBuffer),
        signal: AbortSignal.timeout(TSA_ZAMAN_ASIMI_MS),
      });

      if (!yanit.ok) continue;

      const arrayBuf = await yanit.arrayBuffer();
      const yanitBuf = Buffer.from(arrayBuf);
      const dogrulama = rfc3161YanitDogrula(yanitBuf);

      if (dogrulama.gecerli && dogrulama.tsaTokenBase64) {
        return {
          tsaSaglayici: saglayici.ad,
          tsaTokenBase64: dogrulama.tsaTokenBase64,
          damgaDurumu: 'rfc3161_onayli',
        };
      }
    } catch {
      // Birincil veya yedek TSA zaman aşımına uğrarsa sonrakine geç
    }
  }

  return {
    tsaSaglayici: 'Sunucu Yerel Mührü',
    damgaDurumu: 'sunucu_muhurlu',
  };
}

export async function zamanDamgasiUret(
  req: Request,
  veri: ZamanDamgasiIstekVerisi
): Promise<ZamanDamgasiSonucu> {
  const simdi = new Date();
  const sunucuUtc = simdi.toISOString();
  const tarihSaat = istanbulTarihSaatFormatla(simdi);
  const ipAdresi = istemciIpAdresiCoz(req);

  const sozlesmeMetinHash =
    typeof veri.sozlesmeIcerigi === 'string' && veri.sozlesmeIcerigi.trim()
      ? sha256HexHesapla(veri.sozlesmeIcerigi.trim())
      : typeof veri.sozlesmeMetinHash === 'string' && /^[a-f0-9]{64}$/i.test(veri.sozlesmeMetinHash.trim())
      ? veri.sozlesmeMetinHash.trim().toLowerCase()
      : undefined;

  const kanonikVeri = {
    sozlesmeTuru: String(veri.sozlesmeTuru || '').trim(),
    sozlesmeVersiyonu: String(veri.sozlesmeVersiyonu || '1.0.0').trim(),
    islemTuru: String(veri.islemTuru || '').trim(),
    sunucuUtc,
    ipAdresi,
    ilgiliKayitId: veri.ilgiliKayitId ? String(veri.ilgiliKayitId) : undefined,
    kullaniciKimlik: veri.kullaniciKimlik ? String(veri.kullaniciKimlik) : undefined,
    kullaniciTelefon: veri.kullaniciTelefon ? String(veri.kullaniciTelefon) : undefined,
    kullaniciAdSoyad: veri.kullaniciAdSoyad ? String(veri.kullaniciAdSoyad) : undefined,
    sozlesmeMetinHash,
    ekDetay: veri.ekDetay && typeof veri.ekDetay === 'object' ? veri.ekDetay : undefined,
  };

  const ozetHash = sha256HexHesapla(kanonikJsonMetneCevir(kanonikVeri));

  const sunucuImzasi = crypto
    .createHmac('sha256', hmacGizliAnahtariGetir())
    .update(`${ozetHash}|${sunucuUtc}|${ipAdresi}`)
    .digest('hex');

  const tsaSonuc = await tsaDamgasiAl(ozetHash);

  return {
    tarihSaat,
    sunucuUtc,
    ipAdresi,
    ozetHash,
    ...(sozlesmeMetinHash ? { sozlesmeMetinHash } : {}),
    tsaSaglayici: tsaSonuc.tsaSaglayici,
    ...(tsaSonuc.tsaTokenBase64 ? { tsaTokenBase64: tsaSonuc.tsaTokenBase64 } : {}),
    damgaDurumu: tsaSonuc.damgaDurumu,
    sunucuImzasi,
  };
}
