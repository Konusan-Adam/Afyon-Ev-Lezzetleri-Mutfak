import { useState, useEffect, useCallback } from 'react';
import {
  androidKopruMevcutMu,
  androidUygulamaSurumu,
  androidApkGuncelle,
} from './AndroidKopruServisi';

const GITHUB_REPO = 'Konusan-Adam/Afyon-Ev-Lezzetleri-Mutfak';
const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

function surumKarsilastir(yeni: string, mevcut: string): number {
  const temiz = (s: string) =>
    s
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const a = temiz(yeni);
  const b = temiz(mevcut);
  const max = Math.max(a.length, b.length, 3);
  for (let i = 0; i < max; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export interface ApkGuncellemeDurumu {
  guncellemeVar: boolean;
  mevcutSurum: string;
  yeniSurum: string;
  surumNotu: string;
  indirmeUrl: string;
  indiriliyor: boolean;
  yuzde: number;
  durumMesaji: string | null;
  hata: string | null;
  guncellemeyiBaslat: () => void;
  kapat: () => void;
}

export function useApkGuncelleme(): ApkGuncellemeDurumu {
  const [guncellemeVar, setGuncellemeVar] = useState(false);
  const [kapatildi, setKapatildi] = useState(false);
  const [mevcutSurum, setMevcutSurum] = useState('1.0.0');
  const [yeniSurum, setYeniSurum] = useState('');
  const [surumNotu, setSurumNotu] = useState('');
  const [indirmeUrl, setIndirmeUrl] = useState('');
  const [indiriliyor, setIndiriliyor] = useState(false);
  const [yuzde, setYuzde] = useState(0);
  const [durumMesaji, setDurumMesaji] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!androidKopruMevcutMu()) return;

    const kurulu = androidUygulamaSurumu();
    setMevcutSurum(kurulu);

    let iptal = false;

    const kontrolEt = async () => {
      try {
        const yanit = await fetch(GITHUB_LATEST_API, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store',
        });
        if (!yanit.ok) return;
        const release = await yanit.json();
        if (iptal || !release?.tag_name) return;

        const tag = String(release.tag_name).trim();
        const temizYeni = tag.replace(/^v/i, '');

        if (surumKarsilastir(temizYeni, kurulu) > 0) {
          const assets = Array.isArray(release.assets) ? release.assets : [];
          const apkAsset = assets.find(
            (a: any) =>
              typeof a?.name === 'string' &&
              a.name.toLowerCase().endsWith('.apk') &&
              a.browser_download_url
          );

          const url =
            apkAsset?.browser_download_url ||
            `https://raw.githubusercontent.com/${GITHUB_REPO}/${encodeURIComponent(tag)}/public/afyon-mutfak.apk`;

          setYeniSurum(temizYeni);
          setSurumNotu(
            typeof release.body === 'string' && release.body.trim()
              ? release.body.trim().slice(0, 180)
              : 'Yeni mutfak iyileştirmeleri ve hata düzeltmeleri hazır.'
          );
          setIndirmeUrl(url);
          setGuncellemeVar(true);
        }
      } catch {
        // Ağ yok veya henüz release yayınlanmadı
      }
    };

    kontrolEt();

    const indirmeDinle = (e: any) => {
      const detay = e?.detail;
      if (!detay) return;
      if (detay.durum === 'indiriliyor') {
        setIndiriliyor(true);
        setHata(null);
        setYuzde(Number(detay.yuzde) || 0);
        setDurumMesaji(`Güncelleme indiriliyor (%${Number(detay.yuzde) || 0})...`);
      } else if (detay.durum === 'hazir') {
        setIndiriliyor(false);
        setYuzde(100);
        setDurumMesaji('Kurulum ekranı açılıyor...');
      } else if (detay.durum === 'izin_gerekli') {
        setIndiriliyor(false);
        setDurumMesaji('Lütfen açılan ekrandan uygulama yükleme iznini onaylayın.');
      } else if (detay.durum === 'hata') {
        setIndiriliyor(false);
        setHata(detay.hata || 'Güncelleme indirilemedi.');
        setDurumMesaji(null);
      }
    };

    window.addEventListener('afyon_apk_indirme', indirmeDinle);
    return () => {
      iptal = true;
      window.removeEventListener('afyon_apk_indirme', indirmeDinle);
    };
  }, []);

  const guncellemeyiBaslat = useCallback(() => {
    if (!indirmeUrl) return;
    setHata(null);
    setIndiriliyor(true);
    setYuzde(0);
    setDurumMesaji('Güncelleme başlatılıyor...');
    const tetiklendi = androidApkGuncelle(indirmeUrl);
    if (!tetiklendi) {
      setIndiriliyor(false);
      window.location.href = indirmeUrl;
    }
  }, [indirmeUrl]);

  const kapat = useCallback(() => {
    if (indiriliyor) return;
    setKapatildi(true);
  }, [indiriliyor]);

  return {
    guncellemeVar: guncellemeVar && !kapatildi,
    mevcutSurum,
    yeniSurum,
    surumNotu,
    indirmeUrl,
    indiriliyor,
    yuzde,
    durumMesaji,
    hata,
    guncellemeyiBaslat,
    kapat,
  };
}
