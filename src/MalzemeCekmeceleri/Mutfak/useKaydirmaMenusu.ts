import { useState, useEffect, useRef } from 'react';

/**
 * Kullanıcı sayfayı aşağı kaydırırken alt menüyü gizleyen,
 * yukarı kaydırırken veya en üstteyken tekrar görünür kılan kanca (hook).
 *
 * @param esik - Menünün gizlenmeye başlayacağı en küçük dikey kaydırma mesafesi (px)
 * @param hassasiyet - Küçük titremeleri önleyen kaydırma farkı eşiği (px)
 * @param sifirlamaTetikleyicisi - Değiştiğinde menüyü otomatik olarak tekrar görünür yapan değer (örn. aktif sekme)
 */
export function useKaydirmaMenusu(
  esik: number = 60,
  hassasiyet: number = 8,
  sifirlamaTetikleyicisi?: unknown
): boolean {
  const [gorunur, setGorunur] = useState(true);
  const sonKaydirmaRef = useRef(0);
  const animasyonKaresiRef = useRef<number | null>(null);

  // Sekme değiştiğinde menüyü hemen görünür yap
  useEffect(() => {
    setGorunur(true);
    sonKaydirmaRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [sifirlamaTetikleyicisi]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    sonKaydirmaRef.current = window.scrollY;

    const kaydirmaDinle = () => {
      if (animasyonKaresiRef.current !== null) return;

      animasyonKaresiRef.current = window.requestAnimationFrame(() => {
        animasyonKaresiRef.current = null;
        const guncelKaydirma = Math.max(0, window.scrollY);
        const fark = guncelKaydirma - sonKaydirmaRef.current;

        // Sayfa en üstteyse veya eşik değerinin altındaysa her zaman göster
        if (guncelKaydirma <= esik) {
          setGorunur(true);
          sonKaydirmaRef.current = guncelKaydirma;
        } else if (fark > hassasiyet) {
          // Aşağı kaydırılıyor: alt menüyü gizle ve referansı güncelle
          setGorunur(false);
          sonKaydirmaRef.current = guncelKaydirma;
        } else if (fark < -hassasiyet) {
          // Yukarı kaydırılıyor: alt menüyü göster ve referansı güncelle
          setGorunur(true);
          sonKaydirmaRef.current = guncelKaydirma;
        }
      });
    };

    window.addEventListener('scroll', kaydirmaDinle, { passive: true });

    return () => {
      window.removeEventListener('scroll', kaydirmaDinle);
      if (animasyonKaresiRef.current !== null) {
        window.cancelAnimationFrame(animasyonKaresiRef.current);
      }
    };
  }, [esik, hassasiyet]);

  return gorunur;
}
