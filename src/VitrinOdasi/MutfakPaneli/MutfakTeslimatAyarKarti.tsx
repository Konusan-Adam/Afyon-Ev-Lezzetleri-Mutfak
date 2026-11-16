import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, Save, Loader2, Clock, Truck, MapPin } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';

interface Props {
  mutfakId: string;
}

const VARSAYILAN_MUTFAK_IDLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function mutfakBelgesiEslesirMi(doc: any, mutfakId: string): boolean {
  const docId = doc?.id || doc?.kimlik;
  if (!docId) return false;
  if (docId === mutfakId) return true;
  return VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(docId);
}

export const MutfakTeslimatAyarKarti: React.FC<Props> = ({ mutfakId }) => {
  const [minTutar, setMinTutar] = useState<string>('150');
  const [teslimatUcreti, setTeslimatUcreti] = useState<string>('25');
  const [hazirlanmaSuresi, setHazirlanmaSuresi] = useState<string>('25-35 dk');
  const [calismaSaatleri, setCalismaSaatleri] = useState<string>('09:00 - 21:00');
  const [mahalle, setMahalle] = useState<string>('Marulcu Mah. / Merkez');

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    const yukle = async () => {
      const lokal = localStorage.getItem(`mutfak_ayar_${mutfakId}`);
      if (lokal) {
        try {
          const parsed = JSON.parse(lokal);
          if (parsed.min_siparis_tutari !== undefined) setMinTutar(String(parsed.min_siparis_tutari));
          if (parsed.teslimat_ucreti !== undefined) setTeslimatUcreti(String(parsed.teslimat_ucreti));
          if (parsed.hazirlanma_suresi) setHazirlanmaSuresi(parsed.hazirlanma_suresi);
          if (parsed.calisma_saatleri) setCalismaSaatleri(parsed.calisma_saatleri);
          if (parsed.mahalle || parsed.adres) setMahalle(parsed.mahalle || parsed.adres);
        } catch {}
      }

      if (canliFirebaseAktifMi()) {
        try {
          const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
          const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
          if (mutfak) {
            if (mutfak.min_siparis_tutari !== undefined) setMinTutar(String(mutfak.min_siparis_tutari));
            if (mutfak.teslimat_ucreti !== undefined) setTeslimatUcreti(String(mutfak.teslimat_ucreti));
            if (mutfak.hazirlanma_suresi) setHazirlanmaSuresi(mutfak.hazirlanma_suresi);
            if (mutfak.calisma_saatleri) setCalismaSaatleri(mutfak.calisma_saatleri);
            if (mutfak.mahalle || mutfak.adres) setMahalle(mutfak.mahalle || mutfak.adres);
          }
        } catch (err) {
          console.warn('Mutfak ayarı okunamadı:', err);
        }
      }
    };
    yukle();
  }, [mutfakId]);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setKaydediliyor(true);
    setMesaj(null);

    const veri = {
      min_siparis_tutari: Math.max(0, Number(minTutar) || 0),
      teslimat_ucreti: Math.max(0, Number(teslimatUcreti) || 0),
      hazirlanma_suresi: hazirlanmaSuresi.trim() || '25-35 dk',
      calisma_saatleri: calismaSaatleri.trim() || '09:00 - 21:00',
      mahalle: mahalle.trim() || 'Merkez',
      adres: mahalle.trim() || 'Merkez, Afyonkarahisar',
    };

    localStorage.setItem(`mutfak_ayar_${mutfakId}`, JSON.stringify(veri));
    window.dispatchEvent(new Event(`mutfak_ayar_guncellendi_${mutfakId}`));

    if (canliFirebaseAktifMi()) {
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
        const hedefId = mutfak ? (mutfak.id || mutfak.kimlik) : mutfakId;

        await belgeKaydet('mutfaklar', hedefId, {
          ...(mutfak || {}),
          id: hedefId,
          ad: mutfak?.ad || 'Afyon Ev Mutfağı',
          ...veri,
        });
      } catch (err) {
        console.warn('Firebase mutfak ayar kaydetme hatası:', err);
      }
    }

    setKaydediliyor(false);
    setMesaj('Mutfak ve teslimat ayarları kaydedildi!');
    setTimeout(() => setMesaj(null), 3000);
  };

  return (
    <form onSubmit={kaydet} className="bg-[#1C0722] border border-purple-900/60 rounded-2xl p-4 space-y-4 mb-6 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <ShoppingBag className="w-4 h-4" />
          <span>Mutfak Operasyon & Teslimat Ayarları</span>
        </div>
        {mesaj && (
          <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {mesaj}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="text-purple-300 font-medium block mb-1">Min. Sipariş Tutarı (₺)</label>
          <input
            type="number"
            min="0"
            value={minTutar}
            onChange={(e) => setMinTutar(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-amber-400 outline-none"
            placeholder="150"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <Truck className="w-3 h-3 text-amber-400" />
            <span>Teslimat Ücreti (₺)</span>
          </label>
          <input
            type="number"
            min="0"
            value={teslimatUcreti}
            onChange={(e) => setTeslimatUcreti(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-amber-400 outline-none"
            placeholder="25"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Hazırlık Süresi</span>
          </label>
          <input
            type="text"
            value={hazirlanmaSuresi}
            onChange={(e) => setHazirlanmaSuresi(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="25-35 dk"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>Çalışma Saatleri</span>
          </label>
          <input
            type="text"
            value={calismaSaatleri}
            onChange={(e) => setCalismaSaatleri(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="09:00 - 21:00"
          />
        </div>

        <div>
          <label className="text-purple-300 font-medium flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>Mahalle / Semt</span>
          </label>
          <input
            type="text"
            value={mahalle}
            onChange={(e) => setMahalle(e.target.value)}
            className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 outline-none"
            placeholder="Marulcu Mah. / Merkez"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[10px] text-purple-400/70">
          Minimum sepet tutarı, teslimat ücreti, çalışma saatleri ve mahalle bilgileri vitrinde müşterilere gösterilir.
        </p>
        <button
          type="submit"
          disabled={kaydediliyor}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {kaydediliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{kaydediliyor ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
        </button>
      </div>
    </form>
  );
};
