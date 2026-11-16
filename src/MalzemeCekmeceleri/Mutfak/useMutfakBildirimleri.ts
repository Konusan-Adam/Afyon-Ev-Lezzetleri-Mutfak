import { useState, useEffect, useRef } from 'react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonuCanliDinle } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { mutfakZiliCal, mutfakZiliDurdur } from './MutfakZilServisi';
import { androidZilSustur } from './AndroidKopruServisi';
import { mutfakTeslimZiliCal } from '@/src/MalzemeCekmeceleri/MutfakTeslimZili';
import { sekmeAlarmiDurdur } from '@/src/MalzemeCekmeceleri/SekmeAlarmi';

export interface YeniSiparisBildirimi {
  id: string;
  siparisKodu: string;
  musteriAdi: string;
  toplamTutar: number;
  zaman: string;
}

const VARSAYILAN_MUTFAK_KIMLIKLERI = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

export function useMutfakBildirimleri(
  mutfakId: string,
  secenekler?: {
    aktifMi?: boolean;
    ekMutfakKimlikleri?: string[];
    tumMutfaklariDinle?: boolean;
  }
) {
  const aktifMi = secenekler?.aktifMi !== false;
  const tumMutfaklariDinle = Boolean(secenekler?.tumMutfaklariDinle);
  const ekKimliklerAnahtari = (secenekler?.ekMutfakKimlikleri || []).filter(Boolean).join('|');

  const [yeniSiparisUyarisi, setYeniSiparisUyarisi] = useState<YeniSiparisBildirimi | null>(null);
  const bilinenSiparisIdleri = useRef<Set<string>>(new Set());
  const bilinenTeslimEdilenler = useRef<Set<string>>(new Set());
  const ilkYukleme = useRef<boolean>(true);
  const tekrarZiliRef = useRef<any>(null);
  const aktifUyariSiparisIdRef = useRef<string | null>(null);

  const uyariKapat = () => {
    if (tekrarZiliRef.current) {
      clearInterval(tekrarZiliRef.current);
      tekrarZiliRef.current = null;
    }
    aktifUyariSiparisIdRef.current = null;
    mutfakZiliDurdur();
    sekmeAlarmiDurdur();
    androidZilSustur();
    setYeniSiparisUyarisi(null);
  };

  useEffect(() => {
    // Mutfak değiştiğinde veya giriş yapıldığında dinleme durumunu sıfırla
    bilinenSiparisIdleri.current = new Set();
    bilinenTeslimEdilenler.current = new Set();
    ilkYukleme.current = true;
    uyariKapat();

    if (!aktifMi || !mutfakId) {
      return;
    }

    const tumGecerliKimlikler = new Set<string>([mutfakId]);
    (ekKimliklerAnahtari ? ekKimliklerAnahtari.split('|') : []).forEach((k) => {
      if (k) tumGecerliKimlikler.add(k);
    });
    const varsayilanMutfakMi = Array.from(tumGecerliKimlikler).some((k) =>
      VARSAYILAN_MUTFAK_KIMLIKLERI.includes(k)
    );
    if (varsayilanMutfakMi) {
      VARSAYILAN_MUTFAK_KIMLIKLERI.forEach((k) => tumGecerliKimlikler.add(k));
    }

    const siparisBuMutfagaAitMi = (sipMutfak?: string) => {
      if (tumMutfaklariDinle) return true;
      if (!sipMutfak) return varsayilanMutfakMi;
      return tumGecerliKimlikler.has(sipMutfak);
    };

    const yeniSiparisBildir = (siparis: any) => {
      const kod = siparis.siparis_kodu || siparis.siparisKodu || siparis.id;
      const tutar = Number(siparis.toplam_tutar || siparis.toplamTutar || siparis.tutar || 0);
      const musteri = siparis.musteri_adi || siparis.musteriAdi || 'Müşteri';

      aktifUyariSiparisIdRef.current = siparis.id;

      // Ses ve masaüstü zilini çal (5 saniye net uyarı)
      mutfakZiliCal(
        'Yeni Mutfak Siparişi! 🔔',
        `#${kod} nolu yeni sipariş geldi (${tutar} ₺). Tencere menünüze eklendi.`,
        { sureSn: 5 }
      );

      // Ekranda canlı uyarı göster
      setYeniSiparisUyarisi({
        id: siparis.id,
        siparisKodu: kod,
        musteriAdi: musteri,
        toplamTutar: tutar,
        zaman: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      });

      // Yalnızca onay bekleyen siparişlerde en fazla 2 kez (15 sn arayla) hatırlat, sonsuz çalma
      if (tekrarZiliRef.current) clearInterval(tekrarZiliRef.current);
      if (!siparis.durum || siparis.durum === 'beklemede') {
        let tekrarSayisi = 0;
        tekrarZiliRef.current = setInterval(() => {
          tekrarSayisi += 1;
          if (tekrarSayisi > 2) {
            clearInterval(tekrarZiliRef.current);
            tekrarZiliRef.current = null;
            return;
          }
          mutfakZiliCal(
            'Onay Bekleyen Sipariş! 🔔',
            `#${kod} nolu sipariş ocakta pişirilmeyi bekliyor.`,
            { sureSn: 4 }
          );
        }, 15000);
      }
    };

    // 1. Yerel Olay Dinleyicisi
    const yerelOlayDinle = (e: any) => {
      const sip = e.detail;
      if (!sip) return;
      const sipMutfak = sip.mutfak_id || sip.mutfakId;

      if (siparisBuMutfagaAitMi(sipMutfak)) {
        if (sip.id) bilinenSiparisIdleri.current.add(sip.id);
        yeniSiparisBildir(sip);
      }
    };

    const durumDinle = (e: any) => {
      const detay = e.detail;
      if (!detay) return;
      if (detay.durum === 'teslim_edildi') {
        const kod = detay.siparisKodu || detay.siparisKimligi;
        mutfakTeslimZiliCal(kod);
      }
      if (
        aktifUyariSiparisIdRef.current &&
        detay.siparisKimligi === aktifUyariSiparisIdRef.current &&
        detay.durum &&
        detay.durum !== 'beklemede'
      ) {
        uyariKapat();
      }
    };

    window.addEventListener('afyon_siparis_eklendi', yerelOlayDinle);
    window.addEventListener('afyon_yeni_mutfak_siparisi', yerelOlayDinle);
    window.addEventListener('afyon_siparis_durum_degisti', durumDinle);

    // 2. Canlı Firebase Dinleyicisi
    let abonelikDurdur = () => {};
    if (canliFirebaseAktifMi()) {
      abonelikDurdur = koleksiyonuCanliDinle<any>('siparisler', (liste) => {
        if (!Array.isArray(liste)) return;

        if (ilkYukleme.current) {
          liste.forEach((s) => {
            bilinenSiparisIdleri.current.add(s.id);
            if (s.durum === 'teslim_edildi' || s.asama === 'teslim_edildi') {
              bilinenTeslimEdilenler.current.add(s.id);
            }
          });
          ilkYukleme.current = false;
          return;
        }

        // Teslim edilen siparişler için mutfağa başarı zili çal
        liste.forEach((s) => {
          const teslimMi = s.durum === 'teslim_edildi' || s.asama === 'teslim_edildi';
          const sipMutfak = s.mutfak_id || s.mutfakId;

          if (teslimMi && siparisBuMutfagaAitMi(sipMutfak) && !bilinenTeslimEdilenler.current.has(s.id)) {
            bilinenTeslimEdilenler.current.add(s.id);
            mutfakTeslimZiliCal(s.siparis_kodu || s.id);
          }

          // Açık uyarıdaki sipariş onaylandıysa/iptal edildiyse tekrar zilini sustur
          if (
            aktifUyariSiparisIdRef.current === s.id &&
            s.durum &&
            s.durum !== 'beklemede'
          ) {
            uyariKapat();
          }
        });

        // Yeni eklenen tüm aktif siparişleri bul (iptal/teslim_edildi hariç)
        const yeniGelenler = liste.filter((s) => {
          if (bilinenSiparisIdleri.current.has(s.id)) return false;
          const sipMutfak = s.mutfak_id || s.mutfakId;
          const aktifSiparisMi = s.durum !== 'teslim_edildi' && s.durum !== 'iptal';
          return siparisBuMutfagaAitMi(sipMutfak) && aktifSiparisMi;
        });

        if (yeniGelenler.length > 0) {
          yeniGelenler.forEach((s) => bilinenSiparisIdleri.current.add(s.id));
          yeniSiparisBildir(yeniGelenler[0]);
        }
      });
    }

    return () => {
      window.removeEventListener('afyon_siparis_eklendi', yerelOlayDinle);
      window.removeEventListener('afyon_yeni_mutfak_siparisi', yerelOlayDinle);
      window.removeEventListener('afyon_siparis_durum_degisti', durumDinle);
      if (tekrarZiliRef.current) clearInterval(tekrarZiliRef.current);
      sekmeAlarmiDurdur();
      abonelikDurdur();
    };
  }, [mutfakId, aktifMi, ekKimliklerAnahtari, tumMutfaklariDinle]);

  return {
    yeniSiparisUyarisi,
    uyariKapat
  };
}
