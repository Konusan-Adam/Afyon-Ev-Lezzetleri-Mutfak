import crypto from 'crypto';

const SHA256_OID_BYTES = Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);
const SIGNED_DATA_OID_BYTES = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]);

function derUzunlukKodla(uzunluk: number): Buffer {
  if (uzunluk < 0x80) {
    return Buffer.from([uzunluk]);
  }
  const baytlar: number[] = [];
  let kalan = uzunluk;
  while (kalan > 0) {
    baytlar.unshift(kalan & 0xff);
    kalan >>= 8;
  }
  return Buffer.from([0x80 | baytlar.length, ...baytlar]);
}

function derTagSarmala(tag: number, icerik: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derUzunlukKodla(icerik.length), icerik]);
}

function derPozitifTamSayiKodla(hamBaytlar: Buffer): Buffer {
  let dilim = hamBaytlar;
  while (dilim.length > 1 && dilim[0] === 0x00 && (dilim[1] & 0x80) === 0) {
    dilim = dilim.subarray(1);
  }
  if (dilim[0] & 0x80) {
    dilim = Buffer.concat([Buffer.from([0x00]), dilim]);
  }
  return derTagSarmala(0x02, dilim);
}

function derTlvOku(buf: Buffer, baslangic: number): {
  tag: number;
  icerikBaslangic: number;
  icerikBitis: number;
  sonrakiKonum: number;
} | null {
  if (baslangic >= buf.length) return null;
  const tag = buf[baslangic];
  if (baslangic + 1 >= buf.length) return null;
  const ilkUzunlukBayti = buf[baslangic + 1];
  let icerikBaslangic = baslangic + 2;
  let icerikUzunlugu = 0;

  if ((ilkUzunlukBayti & 0x80) === 0) {
    icerikUzunlugu = ilkUzunlukBayti;
  } else {
    const uzunlukBaytSayisi = ilkUzunlukBayti & 0x7f;
    if (uzunlukBaytSayisi === 0 || icerikBaslangic + uzunlukBaytSayisi > buf.length) {
      return null;
    }
    for (let i = 0; i < uzunlukBaytSayisi; i++) {
      icerikUzunlugu = (icerikUzunlugu << 8) | buf[icerikBaslangic + i];
    }
    icerikBaslangic += uzunlukBaytSayisi;
  }

  const icerikBitis = icerikBaslangic + icerikUzunlugu;
  if (icerikBitis > buf.length) return null;
  return { tag, icerikBaslangic, icerikBitis, sonrakiKonum: icerikBitis };
}

export function sha256HexHesapla(veri: string | Buffer): string {
  return crypto.createHash('sha256').update(veri).digest('hex');
}

export function kanonikJsonMetneCevir(deger: unknown): string {
  if (deger === null || typeof deger !== 'object') {
    return JSON.stringify(deger);
  }
  if (Array.isArray(deger)) {
    return `[${deger.map((eleman) => kanonikJsonMetneCevir(eleman)).join(',')}]`;
  }
  const obj = deger as Record<string, unknown>;
  const siraliAnahtarlar = Object.keys(obj)
    .filter((anahtar) => obj[anahtar] !== undefined)
    .sort();
  const parcalar = siraliAnahtarlar.map(
    (anahtar) => `${JSON.stringify(anahtar)}:${kanonikJsonMetneCevir(obj[anahtar])}`
  );
  return `{${parcalar.join(',')}}`;
}

export function rfc3161IstekOlustur(ozetHex: string): Buffer {
  const ozetBuffer = Buffer.from(ozetHex, 'hex');
  if (ozetBuffer.length !== 32) {
    throw new Error('RFC 3161 için geçerli 32 baytlık SHA-256 özeti gereklidir.');
  }

  const versiyon = derPozitifTamSayiKodla(Buffer.from([0x01]));
  const sha256Oid = derTagSarmala(0x06, SHA256_OID_BYTES);
  const asn1Null = Buffer.from([0x05, 0x00]);
  const algoritmaTanimlayici = derTagSarmala(0x30, Buffer.concat([sha256Oid, asn1Null]));
  const ozetOctet = derTagSarmala(0x04, ozetBuffer);
  const messageImprint = derTagSarmala(0x30, Buffer.concat([algoritmaTanimlayici, ozetOctet]));

  const rastgeleNonce = crypto.randomBytes(8);
  rastgeleNonce[0] &= 0x7f;
  const nonce = derPozitifTamSayiKodla(rastgeleNonce);
  const certReq = Buffer.from([0x01, 0x01, 0xff]);

  return derTagSarmala(0x30, Buffer.concat([versiyon, messageImprint, nonce, certReq]));
}

export interface Rfc3161DogrulamaSonucu {
  gecerli: boolean;
  durumKodu?: number;
  tsaTokenBase64?: string;
  hata?: string;
}

export function rfc3161YanitDogrula(yanitBuffer: Buffer): Rfc3161DogrulamaSonucu {
  try {
    const disSekans = derTlvOku(yanitBuffer, 0);
    if (!disSekans || disSekans.tag !== 0x30) {
      return { gecerli: false, hata: 'Geçersiz DER TimeStampResp yapısı.' };
    }

    const durumBilgisi = derTlvOku(yanitBuffer, disSekans.icerikBaslangic);
    if (!durumBilgisi || durumBilgisi.tag !== 0x30) {
      return { gecerli: false, hata: 'PKIStatusInfo alanı bulunamadı.' };
    }

    const durumTamSayi = derTlvOku(yanitBuffer, durumBilgisi.icerikBaslangic);
    if (!durumTamSayi || durumTamSayi.tag !== 0x02) {
      return { gecerli: false, hata: 'PKIStatus kodu okunamadı.' };
    }

    let durumKodu = 0;
    for (let i = durumTamSayi.icerikBaslangic; i < durumTamSayi.icerikBitis; i++) {
      durumKodu = (durumKodu << 8) | yanitBuffer[i];
    }

    if (durumKodu !== 0 && durumKodu !== 1) {
      return { gecerli: false, durumKodu, hata: `TSA isteği reddedildi (durum kodu: ${durumKodu}).` };
    }

    const tokenBilgisi = derTlvOku(yanitBuffer, durumBilgisi.sonrakiKonum);
    if (!tokenBilgisi || tokenBilgisi.tag !== 0x30) {
      return { gecerli: false, durumKodu, hata: 'TimeStampToken içeriği eksik.' };
    }

    const icerikOid = derTlvOku(yanitBuffer, tokenBilgisi.icerikBaslangic);
    if (
      !icerikOid ||
      icerikOid.tag !== 0x06 ||
      !yanitBuffer.subarray(icerikOid.icerikBaslangic, icerikOid.icerikBitis).equals(SIGNED_DATA_OID_BYTES)
    ) {
      return { gecerli: false, durumKodu, hata: 'Token içinde geçerli CMS SignedData OID bulunamadı.' };
    }

    return {
      gecerli: true,
      durumKodu,
      tsaTokenBase64: yanitBuffer.toString('base64'),
    };
  } catch (err: any) {
    return { gecerli: false, hata: err?.message || 'ASN.1 çözümleme hatası.' };
  }
}
