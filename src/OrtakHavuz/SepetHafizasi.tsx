import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SepetElemani } from '@/src/veritabani/VeriTipleri';
import { veritabanindanSepetiGetir } from '@/src/MalzemeCekmeceleri/Sepet/sepetiGetir';
import { veritabaninaSepeteEkle } from '@/src/MalzemeCekmeceleri/Sepet/sepeteEkle';
import {
  veritabanindaSepetAdetiGuncelle,
  veritabanindanSepetElemaniniSil,
  veritabanindanMutfakSepetiniTemizle,
} from '@/src/MalzemeCekmeceleri/Sepet/sepetElemaniGuncelle';
import { sepetiMutfaklaraGöreGrupla, MutfakSepetGrubu } from '@/src/MalzemeCekmeceleri/Sepet/sepetGruplayici';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';

interface SepetHafizasiTip {
  sepetPaneliAcik: boolean;
  sepetPaneliAc: () => void;
  sepetPaneliKapat: () => void;
  sepetElemanlari: SepetElemani[];
  mutfakGruplari: MutfakSepetGrubu[];
  toplamUrunSayisi: number;
  toplamSepetTutari: number;
  toplamTeslimatUcreti: number;
  genelToplamTutar: number;
  yukleniyor: boolean;
  sepeteEkle: (mutfakId: string, yemekId: string, adet: number, birimFiyat: number) => Promise<void>;
  adetGuncelle: (sepetId: string, yeniAdet: number) => Promise<void>;
  sepettenSil: (sepetId: string) => Promise<void>;
  mutfakSepetiniTemizle: (mutfakId: string) => Promise<void>;
  sepetiTamamenTemizle: () => Promise<void>;
}

const SepetContext = createContext<SepetHafizasiTip>({
  sepetPaneliAcik: false,
  sepetPaneliAc: () => {},
  sepetPaneliKapat: () => {},
  sepetElemanlari: [],
  mutfakGruplari: [],
  toplamUrunSayisi: 0,
  toplamSepetTutari: 0,
  toplamTeslimatUcreti: 0,
  genelToplamTutar: 0,
  yukleniyor: false,
  sepeteEkle: async () => {},
  adetGuncelle: async () => {},
  sepettenSil: async () => {},
  mutfakSepetiniTemizle: async () => {},
  sepetiTamamenTemizle: async () => {},
});

export const SepetSaglayici: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { aktifKullanici } = kullaniciHafizasiKullan();
  const [sepetPaneliAcik, setSepetPaneliAcik] = useState<boolean>(false);
  const [sepetElemanlari, setSepetElemanlari] = useState<SepetElemani[]>(() => {
    try {
      const kayitli = localStorage.getItem('afyon_yerel_sepet_v1');
      return kayitli ? JSON.parse(kayitli) : [];
    } catch {
      return [];
    }
  });
  const [yukleniyor, setYukleniyor] = useState<boolean>(false);

  // Dinamik Müşteri ID: Aktif kullanıcı varsa onun ID'si, yoksa izole misafir ID
  const musteriId = aktifKullanici?.kimlik || 'misafir_yerel_sepet';

  const sepetiYukle = useCallback(async (hedefId?: string) => {
    setYukleniyor(true);
    const id = hedefId || (aktifKullanici?.kimlik || 'misafir_yerel_sepet');
    const veri = await veritabanindanSepetiGetir(id);
    if (veri && veri.length > 0) {
      setSepetElemanlari(veri);
      try {
        localStorage.setItem('afyon_yerel_sepet_v1', JSON.stringify(veri));
      } catch {}
    } else if (veri && veri.length === 0 && id !== 'misafir_yerel_sepet') {
      // Oturum açmış kullanıcının sunucu sepeti boşsa yerel hafızayı da temizle
      setSepetElemanlari([]);
      try {
        localStorage.removeItem('afyon_yerel_sepet_v1');
      } catch {}
    }
    setYukleniyor(false);
  }, [aktifKullanici?.kimlik]);

  useEffect(() => {
    sepetiYukle(musteriId);
  }, [sepetiYukle, musteriId]);

  // Sepet elemanları her güncellendiğinde yerel hafızayı senkron tut
  useEffect(() => {
    if (sepetElemanlari.length > 0) {
      try {
        localStorage.setItem('afyon_yerel_sepet_v1', JSON.stringify(sepetElemanlari));
      } catch {}
    } else {
      try {
        localStorage.removeItem('afyon_yerel_sepet_v1');
      } catch {}
    }
  }, [sepetElemanlari]);

  // Oturum değiştiğinde (Giriş veya Çıkış yapıldığında) anında sepeti yeniden yükle / sıfırla
  useEffect(() => {
    const oturumDegistiDinleyici = (e: any) => {
      const yeniKullanici = e.detail?.aktifKullanici;
      if (!yeniKullanici) {
        // Çıkış yapıldı: Müşteri sepetini anında sıfırla ve misafir moduna geç
        setSepetElemanlari([]);
        setSepetPaneliAcik(false);
        try {
          localStorage.removeItem('afyon_yerel_sepet_v1');
        } catch {}
        sepetiYukle('misafir_yerel_sepet');
      } else {
        // Yeni kullanıcı giriş yaptı: Onun sepetini yükle
        sepetiYukle(yeniKullanici.kimlik);
      }
    };

    window.addEventListener('afyon_oturum_degisti', oturumDegistiDinleyici);
    return () => {
      window.removeEventListener('afyon_oturum_degisti', oturumDegistiDinleyici);
    };
  }, [sepetiYukle]);

  const sepeteEkle = async (
    mutfakId: string,
    yemekId: string,
    adet: number,
    birimFiyat: number
  ) => {
    await veritabaninaSepeteEkle(musteriId, mutfakId, yemekId, adet, birimFiyat);
    await sepetiYukle(musteriId);
  };

  const adetGuncelle = async (sepetId: string, yeniAdet: number) => {
    await veritabanindaSepetAdetiGuncelle(sepetId, yeniAdet);
    await sepetiYukle(musteriId);
  };

  const sepettenSil = async (sepetId: string) => {
    // 🚀 Anında arayüzden (optimistic) kaldır ki mobilde takılmadan silsin
    setSepetElemanlari((oncekiler) => oncekiler.filter((e) => e.id !== sepetId));
    try {
      localStorage.setItem(
        'afyon_yerel_sepet_v1',
        JSON.stringify(sepetElemanlari.filter((e) => e.id !== sepetId))
      );
    } catch {}

    await veritabanindanSepetElemaniniSil(sepetId);
    await sepetiYukle(musteriId);
  };

  const mutfakSepetiniTemizle = async (mutfakId: string) => {
    // 🚀 Anında arayüzden (optimistic) kaldır ki mobilde takılmadan silsin
    setSepetElemanlari((oncekiler) => oncekiler.filter((e) => e.yemek && e.yemek.mutfak_id !== mutfakId));
    try {
      localStorage.setItem(
        'afyon_yerel_sepet_v1',
        JSON.stringify(sepetElemanlari.filter((e) => e.yemek && e.yemek.mutfak_id !== mutfakId))
      );
    } catch {}

    await veritabanindanMutfakSepetiniTemizle(musteriId, mutfakId);
    await sepetiYukle(musteriId);
  };

  const sepetiTamamenTemizle = async () => {
    for (const g of mutfakGruplari) {
      await veritabanindanMutfakSepetiniTemizle(musteriId, g.mutfakId);
    }
    setSepetElemanlari([]);
    try {
      localStorage.removeItem('afyon_yerel_sepet_v1');
    } catch {}
    await sepetiYukle(musteriId);
  };

  const [, setKuryeGuncellemeTetikleyici] = useState(0);
  useEffect(() => {
    const yenile = () => setKuryeGuncellemeTetikleyici((p) => p + 1);
    window.addEventListener('afyon_kurye_ayarlari_guncellendi', yenile);
    window.addEventListener('afyon_adres_guncellendi', yenile);
    return () => {
      window.removeEventListener('afyon_kurye_ayarlari_guncellendi', yenile);
      window.removeEventListener('afyon_adres_guncellendi', yenile);
    };
  }, []);

  const mutfakGruplari = sepetiMutfaklaraGöreGrupla(sepetElemanlari);
  const toplamUrunSayisi = sepetElemanlari.reduce((toplam, item) => toplam + item.adet, 0);
  const toplamSepetTutari = mutfakGruplari.reduce((toplam, g) => toplam + g.araToplam, 0);
  const toplamTeslimatUcreti = mutfakGruplari.reduce((toplam, g) => toplam + g.teslimatUcreti, 0);
  const genelToplamTutar = toplamSepetTutari + toplamTeslimatUcreti;

  return (
    <SepetContext.Provider
      value={{
        sepetPaneliAcik,
        sepetPaneliAc: () => setSepetPaneliAcik(true),
        sepetPaneliKapat: () => setSepetPaneliAcik(false),
        sepetElemanlari,
        mutfakGruplari,
        toplamUrunSayisi,
        toplamSepetTutari,
        toplamTeslimatUcreti,
        genelToplamTutar,
        yukleniyor,
        sepeteEkle,
        adetGuncelle,
        sepettenSil,
        mutfakSepetiniTemizle,
        sepetiTamamenTemizle,
      }}
    >
      {children}
    </SepetContext.Provider>
  );
};

export const sepetHafizasiKullan = () => useContext(SepetContext);
