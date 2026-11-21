export type AfisBoyutDurumu = 'ideal' | 'uyari' | 'dusuk';

export interface AfisBoyutAnalizi {
  genislik: number;
  yukseklik: number;
  durum: AfisBoyutDurumu;
  baslik: string;
  mesaj: string;
}

export const AFIS_IDEAL_GENISLIK = 1200;
export const AFIS_IDEAL_YUKSEKLIK = 675;
export const AFIS_MIN_GENISLIK = 800;
export const AFIS_MIN_YUKSEKLIK = 450;

export function gorselOlculeriniAnalizEt(
  genislik: number,
  yukseklik: number
): AfisBoyutAnalizi {
  const g = Math.round(genislik || 0);
  const y = Math.round(yukseklik || 0);

  if (g < 600 || y < 350) {
    return {
      genislik: g,
      yukseklik: y,
      durum: 'dusuk',
      baslik: `Düşük Çözünürlük (${g} × ${y} px)`,
      mesaj: `Görseliniz çok küçük olduğu için vitrinde bulanık veya pikselli görünebilir. En az ${AFIS_MIN_GENISLIK} × ${AFIS_MIN_YUKSEKLIK} px (ideal ${AFIS_IDEAL_GENISLIK} × ${AFIS_IDEAL_YUKSEKLIK} px) seçmeniz önerilir.`,
    };
  }

  if (y > g) {
    return {
      genislik: g,
      yukseklik: y,
      durum: 'uyari',
      baslik: `Dikey Format (${g} × ${y} px)`,
      mesaj: `Vitrin afişleri yatay (16:9) olduğu için üst/alt kısımlar kırpılabilir. Sağdaki "Kapağı Yeniden Konumlandır" ile odağı ayarlayabilirsiniz.`,
    };
  }

  const oran = g / Math.max(1, y);
  if (g < AFIS_MIN_GENISLIK || oran < 1.35) {
    return {
      genislik: g,
      yukseklik: y,
      durum: 'uyari',
      baslik: `Oran / Boyut Uyarısı (${g} × ${y} px)`,
      mesaj: `İdeal vitrin ölçüsü ${AFIS_IDEAL_GENISLIK} × ${AFIS_IDEAL_YUKSEKLIK} px (Yatay 16:9)'dir. Yine de kullanabilir ve sağdan odak noktasını ayarlayabilirsiniz.`,
    };
  }

  return {
    genislik: g,
    yukseklik: y,
    durum: 'ideal',
    baslik: `İdeal Vitrin Çözünürlüğü (${g} × ${y} px)`,
    mesaj: 'Yatay 16:9 vitrin afişi için uygun ve net görünüm ✓',
  };
}

export function dosyaGorselOlcusuAl(
  dosya: File
): Promise<{ genislik: number; yukseklik: number } | null> {
  if (typeof window === 'undefined' || !dosya) return Promise.resolve(null);

  return new Promise((resolve) => {
    const nesneUrl = URL.createObjectURL(dosya);
    const resim = new Image();

    resim.onload = () => {
      const sonuc =
        resim.naturalWidth > 0 && resim.naturalHeight > 0
          ? { genislik: resim.naturalWidth, yukseklik: resim.naturalHeight }
          : null;
      URL.revokeObjectURL(nesneUrl);
      resolve(sonuc);
    };

    resim.onerror = () => {
      URL.revokeObjectURL(nesneUrl);
      resolve(null);
    };

    resim.src = nesneUrl;
  });
}
