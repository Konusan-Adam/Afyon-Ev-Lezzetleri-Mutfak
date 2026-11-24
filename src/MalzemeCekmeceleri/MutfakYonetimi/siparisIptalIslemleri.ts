import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';
import { yerelSiparisDurumGuncelle } from '@/src/MalzemeCekmeceleri/useMusteriSiparisleri';
import { siparisStokIadeUygula } from '@/src/MalzemeCekmeceleri/Mutfak/gunlukStokIslemleri';
import { hukukiSozlesmeleriGetir } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukDeposu';
import { hukukiDelilDamgalaVeKaydet } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukiDelilServisi';

export async function siparisIptalEt(
  siparisKimligi: string,
  gerekceBaslik: string,
  detayNot?: string,
  siparisKodu?: string
): Promise<boolean> {
  const aciklamaMetni = detayNot && detayNot.trim()
    ? `Sipariş İptal Edildi: ${gerekceBaslik} (${detayNot.trim()})`
    : `Sipariş İptal Edildi: ${gerekceBaslik}`;

  // 1. Yerel depolama ve localStorage güncellemesi
  yerelSiparisDurumGuncelle(siparisKimligi, 'iptal', aciklamaMetni);

  // 2. Canlı Firebase güncellemesi ve stok iadesi
  if (canliFirebaseAktifMi()) {
    try {
      await siparisStokIadeUygula(siparisKimligi);
      await belgeKaydet('siparisler', siparisKimligi, {
        durum: 'iptal',
        asama: 'iptal',
        iptal_kaynagi: 'mutfak',
        durum_aciklamasi: aciklamaMetni,
        durumAciklamasi: aciklamaMetni,
        iptal_gerekcesi: gerekceBaslik,
        sonGuncelleme: new Date().toLocaleTimeString('tr-TR'),
        guncellenme_zamani: new Date().toISOString()
      });
    } catch (hata) {
      console.warn('Firebase sipariş iptal güncelleme hatası:', hata);
    }
  }

  // 3. Mutfak Kaynaklı İptal Zaman Damgası
  try {
    const sozlesmeler = hukukiSozlesmeleriGetir();
    const iptalKosullari = sozlesmeler.iptal_iade_kosullari;
    await hukukiDelilDamgalaVeKaydet({
      islemTuru: 'iptal',
      sozlesmeTuru: 'iptal_iade_kosullari',
      sozlesmeVersiyonu: iptalKosullari?.versiyon || '1.0.0',
      sozlesmeIcerigi: iptalKosullari?.icerik || aciklamaMetni,
      ilgiliKayitId: siparisKodu || siparisKimligi,
      onaylandiMi: true,
      ekDetay: {
        siparisId: siparisKimligi,
        siparisKodu: siparisKodu || siparisKimligi,
        iptalKaynagi: 'mutfak',
        gerekceBaslik,
        detayNot: detayNot?.trim() || '',
      },
    });
  } catch (err) {
    console.warn('Sipariş iptal zaman damgası hatası:', err);
  }

  // 4. Patron Bildirimi Ekle & Ses Çal
  patronBildirimiEkle('iade_talebi', 'Sipariş İptal Edildi ⚠️', `#${(siparisKodu || siparisKimligi).substring(0, 12)} nolu sipariş iptal edildi. Gerekçe: ${gerekceBaslik}`);

  // 5. Global olay tetikle
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('afyon_siparis_durum_degisti', { detail: { siparisKimligi, durum: 'iptal', iptal_kaynagi: 'mutfak' } }));
  }

  return true;
}
