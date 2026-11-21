export interface AfyonMutfakAndroidArayuzu {
  mutfakOturumAyarla?: (
    mutfakId: string,
    mutfakAdi: string,
    acikMi: boolean,
    ekKimliklerJson: string,
    tumMutfaklar: boolean
  ) => void;
  oturumKapat?: () => void;
  zilSustur?: () => void;
  zilCal?: (baslik: string, detay: string, kesintisiz: boolean, sureSn: number) => void;
  zilAyarla?: (seciliKimlik: string, sesSeviyesi: number, ozelSesVeriUrl: string) => void;
  pilOptimizasyonuIste?: () => void;
  uygulamaSurumu?: () => string;
  apkGuncelleIndirVeKur?: (indirmeUrl: string) => void;
}

declare global {
  interface Window {
    AfyonMutfakAndroid?: AfyonMutfakAndroidArayuzu;
  }
}

export function androidKopruMevcutMu(): boolean {
  return typeof window !== 'undefined' && Boolean(window.AfyonMutfakAndroid);
}

export function androidUygulamaSurumu(): string {
  if (typeof window === 'undefined') return '1.0.0';
  try {
    return window.AfyonMutfakAndroid?.uygulamaSurumu?.() || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export function androidApkGuncelle(indirmeUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.AfyonMutfakAndroid?.apkGuncelleIndirVeKur) {
      window.AfyonMutfakAndroid.apkGuncelleIndirVeKur(indirmeUrl);
      return true;
    }
  } catch {}
  return false;
}

export function androidMutfakOturumBildir(parametreler: {
  mutfakId: string;
  mutfakAdi: string;
  acikMi: boolean;
  ekKimlikler?: string[];
  tumMutfaklar?: boolean;
}) {
  if (typeof window === 'undefined') return;
  try {
    window.AfyonMutfakAndroid?.mutfakOturumAyarla?.(
      parametreler.mutfakId,
      parametreler.mutfakAdi,
      parametreler.acikMi,
      JSON.stringify(parametreler.ekKimlikler || []),
      Boolean(parametreler.tumMutfaklar)
    );
  } catch {
    // Web tarayıcısında sessizce geç
  }
}

export function androidOturumKapatBildir() {
  if (typeof window === 'undefined') return;
  try {
    window.AfyonMutfakAndroid?.oturumKapat?.();
  } catch {}
}

export function androidZilSustur() {
  if (typeof window === 'undefined') return;
  try {
    window.AfyonMutfakAndroid?.zilSustur?.();
  } catch {}
}

export function androidZilCal(
  baslik: string,
  detay: string,
  kesintisiz = true,
  sureSn = 5
) {
  if (typeof window === 'undefined') return;
  try {
    window.AfyonMutfakAndroid?.zilCal?.(
      baslik || '🚨 YENİ MUTFAK SİPARİŞİ!',
      detay || 'Yeni sipariş geldi — Hemen onaylayın!',
      kesintisiz,
      Math.max(2, Math.round(sureSn))
    );
  } catch {}
}

export function androidZilAyarla(
  seciliKimlik: string,
  sesSeviyesi: number,
  ozelSesVeriUrl = ''
) {
  if (typeof window === 'undefined') return;
  try {
    window.AfyonMutfakAndroid?.zilAyarla?.(
      seciliKimlik || 'enerjik_siparis',
      Math.max(0.2, Math.min(1, Number(sesSeviyesi) || 0.9)),
      ozelSesVeriUrl || ''
    );
  } catch {}
}
