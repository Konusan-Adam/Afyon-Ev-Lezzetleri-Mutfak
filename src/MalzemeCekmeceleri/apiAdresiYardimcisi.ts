const VARSAYILAN_CANLI_SUNUCU =
  'https://ais-pre-yp7jo4ebbsp6v6ahrupisj-546261314622.europe-west2.run.app';

export function yerelAndroidWebViewIcindeMi(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location?.hostname || '';
  const protokol = window.location?.protocol || '';
  return (
    host === 'appassets.androidplatform.net' ||
    protokol === 'file:' ||
    Boolean((window as any).AfyonMutfakAndroid)
  );
}

export function apiYoluOlustur(goreliYol: string): string {
  const temizYol = goreliYol.startsWith('/') ? goreliYol : `/${goreliYol}`;
  if (yerelAndroidWebViewIcindeMi()) {
    const ozelTaban = (import.meta as any).env?.VITE_API_SUNUCU_URL;
    const taban =
      typeof ozelTaban === 'string' && ozelTaban.trim()
        ? ozelTaban.trim().replace(/\/+$/, '')
        : VARSAYILAN_CANLI_SUNUCU;
    return `${taban}${temizYol}`;
  }
  return temizYol;
}
