import { useState, useEffect } from 'react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import {
  koleksiyonuCanliDinle,
  belgeKaydet,
  belgeSil,
} from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';

export interface MutfakAfisVerisi {
  id: string;
  mutfak_id: string;
  mutfak_adi: string;
  rozet: string;
  baslik: string;
  aciklama: string;
  gorsel_url: string;
  aktif_mi: boolean;
  onay_durumu: 'beklemede' | 'onaylandi' | 'reddedildi';
  onayli_mi: boolean;
  red_gerekcesi?: string;
  olusturma_tarihi: string;
  guncellenme_tarihi: string;
}

const M1_ESLESEN_KIMLIKLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function afisBuMutfagaAitMi(kayitMutfakId: string | undefined, mutfakId: string): boolean {
  if (!kayitMutfakId) return false;
  if (kayitMutfakId === mutfakId) return true;
  return M1_ESLESEN_KIMLIKLER.includes(mutfakId) && M1_ESLESEN_KIMLIKLER.includes(kayitMutfakId);
}

export function useMutfakAfisi(mutfakId: string, mutfakAdi: string) {
  const [afis, setAfis] = useState<MutfakAfisVerisi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);

  useEffect(() => {
    if (!mutfakId) {
      setYukleniyor(false);
      return;
    }

    if (!canliFirebaseAktifMi()) {
      try {
        const lokal = localStorage.getItem(`mutfak_afis_${mutfakId}`);
        setAfis(lokal ? JSON.parse(lokal) : null);
      } catch {
        setAfis(null);
      }
      setYukleniyor(false);
      return;
    }

    setYukleniyor(true);
    const abonelikDurdur = koleksiyonuCanliDinle<MutfakAfisVerisi>('mutfak_afisleri', (liste) => {
      const bulunan = (liste || []).find((a) => afisBuMutfagaAitMi(a.mutfak_id, mutfakId)) || null;
      setAfis(bulunan);
      setYukleniyor(false);
    });

    return () => abonelikDurdur();
  }, [mutfakId]);

  const afisKaydet = async (girdi: {
    rozet: string;
    baslik: string;
    aciklama: string;
    gorsel_url: string;
    aktif_mi: boolean;
  }): Promise<boolean> => {
    if (!mutfakId) return false;
    setIslemde(true);

    const belgeId = afis?.id || `afis_${mutfakId}`;
    const simdi = new Date().toISOString();

    const yeniKayit: MutfakAfisVerisi = {
      id: belgeId,
      mutfak_id: afis?.mutfak_id || mutfakId,
      mutfak_adi: mutfakAdi,
      rozet: girdi.rozet.trim() || 'EV MUTFAĞI ÖZEL',
      baslik: girdi.baslik.trim(),
      aciklama: girdi.aciklama.trim(),
      gorsel_url: girdi.gorsel_url.trim(),
      aktif_mi: girdi.aktif_mi,
      onay_durumu: 'beklemede',
      onayli_mi: false,
      olusturma_tarihi: afis?.olusturma_tarihi || simdi,
      guncellenme_tarihi: simdi,
    };

    try {
      localStorage.setItem(`mutfak_afis_${mutfakId}`, JSON.stringify(yeniKayit));

      if (canliFirebaseAktifMi()) {
        const basarili = await belgeKaydet('mutfak_afisleri', belgeId, yeniKayit);
        if (!basarili) {
          return false;
        }
      }

      setAfis(yeniKayit);

      patronBildirimiEkle(
        'yeni_mutfak',
        'Mutfak Afiş Onayı Bekleniyor 🎨',
        `${mutfakAdi} vitrin için yeni bir afiş gönderdi: "${yeniKayit.baslik}".`,
        belgeId
      );

      return true;
    } catch (err) {
      console.warn('Mutfak afiş kaydetme hatası:', err);
      return false;
    } finally {
      setIslemde(false);
    }
  };

  const afisDurumDegistir = async (aktifMi: boolean): Promise<boolean> => {
    if (!afis) return false;
    setIslemde(true);

    const guncel: MutfakAfisVerisi = {
      ...afis,
      aktif_mi: aktifMi,
      guncellenme_tarihi: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`mutfak_afis_${mutfakId}`, JSON.stringify(guncel));
      if (canliFirebaseAktifMi()) {
        const basarili = await belgeKaydet('mutfak_afisleri', afis.id, guncel);
        if (!basarili) return false;
      }
      setAfis(guncel);
      return true;
    } finally {
      setIslemde(false);
    }
  };

  const afisKaldir = async (): Promise<boolean> => {
    if (!afis) return false;
    setIslemde(true);

    try {
      localStorage.removeItem(`mutfak_afis_${mutfakId}`);
      if (canliFirebaseAktifMi()) {
        const basarili = await belgeSil('mutfak_afisleri', afis.id);
        if (!basarili) return false;
      }
      setAfis(null);
      return true;
    } finally {
      setIslemde(false);
    }
  };

  return {
    afis,
    yukleniyor,
    islemde,
    afisKaydet,
    afisDurumDegistir,
    afisKaldir,
  };
}
