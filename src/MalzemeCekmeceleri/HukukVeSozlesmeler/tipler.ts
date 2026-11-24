/**
 * Afyon Ev Lezzetleri — Hukuki Sözleşmeler, Zaman Damgası ve Çerez Yönetimi Tipleri
 */

export type SozlesmeTuru =
  | 'mesafeli_satis'
  | 'on_bilgilendirme'
  | 'kvkk_aydinlatma'
  | 'kullanici_sozlesmesi'
  | 'mutfak_kayit_sozlesmesi'
  | 'hijyen_esnaf_muafiyet_onayi'
  | 'cerez_politikasi'
  | 'iptal_iade_kosullari'
  | string;

export type SozlesmeKonumu = 'kayit' | 'siparis' | 'asci_basvuru' | 'kurye_basvuru' | 'genel';

export type HukukiIslemTuru =
  | 'kayit'
  | 'siparis'
  | 'cerez_onayi'
  | 'ozel_onay'
  | 'iptal'
  | 'hakedis';

export type DamgaDurumu = 'rfc3161_onayli' | 'sunucu_muhurlu' | 'yerel_ozet';

export interface HukukiSozlesme {
  tur: SozlesmeTuru;
  baslik: string;
  kisaBaslik: string;
  versiyon: string;
  guncellenmeTarihi: string;
  icerik: string;
  zorunluMu: boolean;
  konum?: SozlesmeKonumu;
  silinebilirMi?: boolean;
}

export interface HukukiOnayLogu {
  kimlik: string;
  sozlesmeTuru: string;
  sozlesmeVersiyonu: string;
  islemTuru: HukukiIslemTuru;
  tarihSaat: string;
  ipAdresi: string;
  cihazBilgisi: string;
  onaylandiMi: boolean;
  sunucuKayitZamani?: unknown;
  sunucuUtc?: string;
  ozetHash?: string;
  sozlesmeMetinHash?: string;
  tsaSaglayici?: string;
  tsaTokenBase64?: string;
  damgaDurumu?: DamgaDurumu;
  sunucuImzasi?: string;
  ilgiliKayitId?: string;
  kullaniciKimlik?: string;
  kullaniciTelefon?: string;
  kullaniciAdSoyad?: string;
  ekDetay?: Record<string, unknown>;
}

export interface CerezTercihleri {
  zorunlu: boolean;
  analitik: boolean;
  pazarlama: boolean;
  onaylandi: boolean;
  tarih: string;
}
