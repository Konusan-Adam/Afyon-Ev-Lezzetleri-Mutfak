import { useState, useEffect } from 'react';
import { CokluMenuTipi } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import {
  koleksiyonuCanliDinle,
  belgeKaydet,
  belgeSil,
} from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';

const COKLU_MENU_KOLEKSIYONU = 'coklu_menuler';
const M1_ESLESEN_KIMLIKLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function menuMutfagaAitMi(kayitMutfakId: string | undefined, mutfakId: string): boolean {
  if (!kayitMutfakId) return M1_ESLESEN_KIMLIKLER.includes(mutfakId);
  if (kayitMutfakId === mutfakId) return true;
  return M1_ESLESEN_KIMLIKLER.includes(mutfakId) && M1_ESLESEN_KIMLIKLER.includes(kayitMutfakId);
}

export function useMutfakCokluMenuleri(mutfakId: string, aktifMi: boolean = true) {
  const [menuler, setMenuler] = useState<CokluMenuTipi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    if (!aktifMi || !mutfakId || !canliFirebaseAktifMi()) {
      setYukleniyor(false);
      return;
    }

    const durdur = koleksiyonuCanliDinle<CokluMenuTipi>(COKLU_MENU_KOLEKSIYONU, (tum) => {
      const filtreli = (tum || [])
        .filter((m) => menuMutfagaAitMi(m.mutfak_id, mutfakId))
        .sort((a, b) => (b.olusturma_tarihi || '').localeCompare(a.olusturma_tarihi || ''));
      setMenuler(filtreli);
      setYukleniyor(false);
    });

    return () => durdur();
  }, [mutfakId, aktifMi]);

  return { menuler, yukleniyor };
}

export async function cokluMenuKaydet(
  menu: CokluMenuTipi,
  yeniKayitMi: boolean
): Promise<boolean> {
  const duzenliKalemler = (menu.kalemler || []).map((k, indeks) => ({
    id: k.id || `kalem_${Date.now()}_${indeks}`,
    sira: indeks,
    ad: String(k.ad || '').trim(),
    aciklama: String(k.aciklama || '').trim(),
    fiyat: Math.max(0, Number(k.fiyat) || 0),
    gorsel_url: String(k.gorsel_url || '').trim(),
    not_izinli_mi: k.not_izinli_mi !== false,
    varsayilan_secili: k.varsayilan_secili !== false,
    zorunlu_mu: Boolean(k.zorunlu_mu),
  }));

  const kapakGorselleri = duzenliKalemler
    .map((k) => k.gorsel_url)
    .filter(Boolean)
    .slice(0, 6);

  const simdi = new Date().toISOString();
  const kayitVerisi: CokluMenuTipi = {
    id: menu.id,
    mutfak_id: menu.mutfak_id,
    mutfak_adi: menu.mutfak_adi || 'Afyon Ev Mutfağı',
    baslik: String(menu.baslik || '').trim(),
    aciklama: String(menu.aciklama || '').trim(),
    fiyat_tipi: menu.fiyat_tipi === 'kalem_toplam' ? 'kalem_toplam' : 'paket',
    fiyat: Math.max(0, Number(menu.fiyat) || 0),
    hazirlanma_suresi: String(menu.hazirlanma_suresi || '35-45 dk').trim(),
    kapak_gorselleri: kapakGorselleri,
    kalemler: duzenliKalemler,
    stokta_var_mi: menu.stokta_var_mi !== false,
    tukendi_mi: Boolean(menu.tukendi_mi),
    onay_durumu: menu.onay_durumu || 'beklemede',
    onayli_mi: Boolean(menu.onayli_mi),
    olusturma_tarihi: menu.olusturma_tarihi || simdi,
    guncellenme_tarihi: simdi,
  };

  let basarili = true;
  if (canliFirebaseAktifMi()) {
    basarili = await belgeKaydet(COKLU_MENU_KOLEKSIYONU, kayitVerisi.id, kayitVerisi);
  }

  if (basarili && yeniKayitMi) {
    patronBildirimiEkle(
      'yeni_yemek',
      'Yeni Çoklu Menü Oluşturuldu 🍱',
      `${kayitVerisi.mutfak_adi} mutfağı ${duzenliKalemler.length} çeşitlik "${kayitVerisi.baslik}" (${kayitVerisi.fiyat} ₺) menüsü ekledi. Onay bekliyor.`
    );
  }

  return basarili;
}

export async function cokluMenuStokDegistir(menuId: string, satistaMi: boolean): Promise<boolean> {
  if (!canliFirebaseAktifMi()) return true;
  return belgeKaydet(COKLU_MENU_KOLEKSIYONU, menuId, {
    stokta_var_mi: satistaMi,
    tukendi_mi: !satistaMi,
    guncellenme_tarihi: new Date().toISOString(),
  });
}

export async function cokluMenuSil(menuId: string): Promise<boolean> {
  if (!canliFirebaseAktifMi()) return true;
  return belgeSil(COKLU_MENU_KOLEKSIYONU, menuId);
}
