import { Yemek } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { testYemekGuncelle } from '@/src/veritabani/CanliVeriYardimcisi';
import { porsiyonBelirle, porsiyonDusur } from '@/src/MalzemeCekmeceleri/OnSiparisVePorsiyon/PorsiyonServisi';

export const KRITIK_STOK_ESIGI = 5;

export interface YemekStokAnalizi {
  sinirliMi: boolean;
  gunlukStok: number;
  kalanStok: number;
  tukendiMi: boolean;
  kritikAzMi: boolean;
  sonKaldiMetni: string | null;
  birim: string;
  birimFiyat: number;
  kalanToplamDeger: number;
  minSepetTutari: number;
  minSepetAltindaMi: boolean;
  eksikSepetTutari: number;
}

export function yemekStokVeMinSepetAnalizEt(
  yemek: Yemek,
  minSiparisTutari: number = 0
): YemekStokAnalizi {
  const birim = yemek.birim || 'Porsiyon';
  const birimFiyat = Number(yemek.fiyat || 0);
  const sinirliMi =
    yemek.sinirsiz_stok !== true &&
    (typeof yemek.gunluk_stok === 'number' || typeof yemek.kalan_stok === 'number');

  if (!sinirliMi) {
    const tukendiMi = yemek.stokta_var_mi === false || yemek.tukendi_mi === true;
    return {
      sinirliMi: false,
      gunlukStok: 0,
      kalanStok: 0,
      tukendiMi,
      kritikAzMi: false,
      sonKaldiMetni: null,
      birim,
      birimFiyat,
      kalanToplamDeger: 0,
      minSepetTutari: Math.max(0, Number(minSiparisTutari) || 0),
      minSepetAltindaMi: false,
      eksikSepetTutari: 0,
    };
  }

  const gunlukStok = Math.max(0, Number(yemek.gunluk_stok ?? yemek.kalan_stok ?? 0));
  const kalanStok = Math.max(0, Number(yemek.kalan_stok ?? yemek.gunluk_stok ?? 0));
  const tukendiMi = kalanStok <= 0 || yemek.stokta_var_mi === false || yemek.tukendi_mi === true;
  const kritikAzMi = !tukendiMi && kalanStok > 0 && kalanStok <= KRITIK_STOK_ESIGI;
  const sonKaldiMetni = kritikAzMi ? `Son ${kalanStok} ${birim} Kaldı` : null;

  const kalanToplamDeger = Math.round(kalanStok * birimFiyat * 100) / 100;
  const minSepetTutari = Math.max(0, Number(minSiparisTutari) || 0);
  const minSepetAltindaMi =
    !tukendiMi && kalanStok > 0 && minSepetTutari > 0 && kalanToplamDeger < minSepetTutari;
  const eksikSepetTutari = minSepetAltindaMi
    ? Math.max(0, Math.round((minSepetTutari - kalanToplamDeger) * 100) / 100)
    : 0;

  return {
    sinirliMi: true,
    gunlukStok,
    kalanStok,
    tukendiMi,
    kritikAzMi,
    sonKaldiMetni,
    birim,
    birimFiyat,
    kalanToplamDeger,
    minSepetTutari,
    minSepetAltindaMi,
    eksikSepetTutari,
  };
}

export async function yemekGunlukStokKaydet(
  yemek: Yemek,
  ayar: {
    sinirsizMi: boolean;
    gunlukStok?: number;
    kalanStok?: number;
  }
): Promise<boolean> {
  const birim = yemek.birim || 'Porsiyon';

  if (ayar.sinirsizMi) {
    const guncelleme = {
      sinirsiz_stok: true,
      gunluk_stok: null as any,
      kalan_stok: null as any,
      stokta_var_mi: true,
      tukendi_mi: false,
      guncellenme_zamani: new Date().toISOString(),
    };

    porsiyonBelirle(yemek.id, 999, 999, birim, true);
    testYemekGuncelle(yemek.id, guncelleme);

    if (canliFirebaseAktifMi()) {
      const ok = await belgeKaydet('yemekler', yemek.id, guncelleme);
      if (!ok) return false;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
    }
    return true;
  }

  const hedefGunluk = Math.max(1, Math.floor(Number(ayar.gunlukStok) || 1));
  const hedefKalan = Math.max(
    0,
    Math.min(hedefGunluk, Math.floor(Number(ayar.kalanStok ?? hedefGunluk)))
  );
  const satistaMi = hedefKalan > 0;

  const guncelleme = {
    sinirsiz_stok: false,
    gunluk_stok: hedefGunluk,
    kalan_stok: hedefKalan,
    stokta_var_mi: satistaMi,
    tukendi_mi: !satistaMi,
    guncellenme_zamani: new Date().toISOString(),
  };

  porsiyonBelirle(yemek.id, hedefGunluk, hedefKalan, birim, false);
  testYemekGuncelle(yemek.id, guncelleme);

  if (canliFirebaseAktifMi()) {
    const ok = await belgeKaydet('yemekler', yemek.id, guncelleme);
    if (!ok) return false;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
  }
  return true;
}

function siparisUrunleriniCikar(siparis: any): Array<{ yemekId?: string; baslik: string; adet: number }> {
  const hamListe: any[] =
    siparis?.urunler ||
    siparis?.elemanlar ||
    siparis?.siparis_elemanlari ||
    siparis?.ogeler ||
    siparis?.sepet ||
    [];

  return hamListe
    .map((u) => ({
      yemekId: u.yemek_id || u.yemek?.id || u.id,
      baslik: String(u.baslik || u.ad || u.yemek_baslik || u.yemek?.baslik || '').trim(),
      adet: Math.max(1, Math.floor(Number(u.adet || u.miktar || 1))),
    }))
    .filter((u) => Boolean(u.yemekId || u.baslik));
}

function yemegiBul(
  mutfakYemekleri: Yemek[],
  kalem: { yemekId?: string; baslik: string }
): Yemek | undefined {
  if (kalem.yemekId) {
    const idIle = mutfakYemekleri.find((y) => y.id === kalem.yemekId);
    if (idIle) return idIle;
  }
  if (kalem.baslik) {
    const kucuk = kalem.baslik.toLowerCase();
    return mutfakYemekleri.find((y) => (y.baslik || '').trim().toLowerCase() === kucuk);
  }
  return undefined;
}

export async function siparisStokDusumuUygula(
  siparis: any,
  mutfakYemekleri: Yemek[]
): Promise<boolean> {
  if (!siparis?.id || siparis.stok_dusuldu_mu === true || siparis.durum === 'iptal') {
    return false;
  }

  const kalemler = siparisUrunleriniCikar(siparis);
  if (kalemler.length === 0) return false;

  // Mümkünse önce Firebase'deki en güncel siparişi okuyup yarış koşulunu önle
  if (canliFirebaseAktifMi()) {
    const canliSiparis = await belgeGetir<any>('siparisler', siparis.id);
    if (canliSiparis?.stok_dusuldu_mu === true || canliSiparis?.durum === 'iptal') {
      return false;
    }
    // İşareti erken bas (çift düşümü engelle)
    await belgeKaydet('siparisler', siparis.id, {
      stok_dusuldu_mu: true,
      stok_dusum_zamani: new Date().toISOString(),
    });
  }

  const dusulecekMiktarHaritasi = new Map<string, number>();
  for (const kalem of kalemler) {
    const eslesen = yemegiBul(mutfakYemekleri, kalem);
    if (!eslesen) continue;
    const sinirliMi =
      eslesen.sinirsiz_stok !== true &&
      (typeof eslesen.gunluk_stok === 'number' || typeof eslesen.kalan_stok === 'number');
    if (!sinirliMi) continue;

    // Sipariş zamanı, yemeğin son stok planlama zamanından daha eskiyse mevcut kotadan düşme
    const stokGuncellemeStr = (eslesen as any).guncellenme_zamani;
    const siparisZamanStr =
      siparis.olusturma_tarihi || siparis.olusturulma_tarihi || siparis.created_at;
    if (stokGuncellemeStr && siparisZamanStr && typeof siparisZamanStr === 'string') {
      const stokMs = Date.parse(stokGuncellemeStr);
      const sipMs = Date.parse(siparisZamanStr);
      if (!Number.isNaN(stokMs) && !Number.isNaN(sipMs) && sipMs + 5000 < stokMs) {
        continue;
      }
    }

    dusulecekMiktarHaritasi.set(
      eslesen.id,
      (dusulecekMiktarHaritasi.get(eslesen.id) || 0) + kalem.adet
    );
  }

  for (const [yemekId, toplamAdet] of dusulecekMiktarHaritasi.entries()) {
    const guncelYemek = canliFirebaseAktifMi()
      ? (await belgeGetir<Yemek>('yemekler', yemekId)) || mutfakYemekleri.find((y) => y.id === yemekId)
      : mutfakYemekleri.find((y) => y.id === yemekId);

    if (!guncelYemek || guncelYemek.sinirsiz_stok === true) continue;

    const mevcutKalan = Math.max(
      0,
      Number(guncelYemek.kalan_stok ?? guncelYemek.gunluk_stok ?? 0)
    );
    const yeniKalan = Math.max(0, mevcutKalan - toplamAdet);
    const satistaMi = yeniKalan > 0;

    porsiyonDusur(yemekId, toplamAdet);
    testYemekGuncelle(yemekId, {
      kalan_stok: yeniKalan,
      stokta_var_mi: satistaMi,
      tukendi_mi: !satistaMi,
    });

    if (canliFirebaseAktifMi()) {
      await belgeKaydet('yemekler', yemekId, {
        kalan_stok: yeniKalan,
        stokta_var_mi: satistaMi,
        tukendi_mi: !satistaMi,
        guncellenme_zamani: new Date().toISOString(),
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
  }

  return true;
}

export async function siparisStokIadeUygula(siparisId: string): Promise<boolean> {
  if (!siparisId || !canliFirebaseAktifMi()) return false;

  const siparis = await belgeGetir<any>('siparisler', siparisId);
  if (!siparis || siparis.stok_dusuldu_mu !== true || siparis.stok_iade_edildi_mi === true) {
    return false;
  }

  await belgeKaydet('siparisler', siparisId, {
    stok_iade_edildi_mi: true,
    stok_iade_zamani: new Date().toISOString(),
  });

  const kalemler = siparisUrunleriniCikar(siparis);
  for (const kalem of kalemler) {
    if (!kalem.yemekId) continue;
    const yemek = await belgeGetir<Yemek>('yemekler', kalem.yemekId);
    if (!yemek || yemek.sinirsiz_stok === true) continue;
    if (typeof yemek.kalan_stok !== 'number' && typeof yemek.gunluk_stok !== 'number') continue;

    const mevcutKalan = Math.max(0, Number(yemek.kalan_stok ?? 0));
    const ustSinir = typeof yemek.gunluk_stok === 'number' ? yemek.gunluk_stok : mevcutKalan + kalem.adet;
    const yeniKalan = Math.min(ustSinir, mevcutKalan + kalem.adet);

    porsiyonBelirle(yemek.id, ustSinir, yeniKalan, yemek.birim, false);
    testYemekGuncelle(yemek.id, {
      kalan_stok: yeniKalan,
      stokta_var_mi: yeniKalan > 0,
      tukendi_mi: yeniKalan <= 0,
    });

    await belgeKaydet('yemekler', yemek.id, {
      kalan_stok: yeniKalan,
      stokta_var_mi: yeniKalan > 0,
      tukendi_mi: yeniKalan <= 0,
      guncellenme_zamani: new Date().toISOString(),
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('afyon_yemekler_guncellendi'));
  }
  return true;
}
