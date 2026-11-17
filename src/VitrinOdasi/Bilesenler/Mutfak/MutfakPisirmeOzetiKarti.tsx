import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  ChefHat, 
  UtensilsCrossed, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Info
} from 'lucide-react';

export interface PisirmeOge {
  ad: string;
  toplamAdet: number;
  siparisAdedi: number;
  istasyon: 'firin' | 'ocak' | 'tatli' | 'diger';
}

export interface MutfakPisirmeOzetiKartiProps {
  siparisler: any[];
}

export const MutfakPisirmeOzetiKarti: React.FC<MutfakPisirmeOzetiKartiProps> = ({ siparisler }) => {
  const [acik, setAcik] = useState(true);

  // Sadece ocakta ve beklemede olan aktif siparişleri filtrele
  const hazirlananSiparisler = useMemo(() => {
    return (siparisler || []).filter(
      (s) => s && (s.durum === 'beklemede' || s.durum === 'hazirlaniyor')
    );
  }, [siparisler]);

  // Ürünleri topla ve istasyonlara ayır
  const { ogeler, toplamPorsiyon, istasyonSayilari } = useMemo(() => {
    const harita = new Map<string, { ad: string; toplamAdet: number; siparisKumesi: Set<string>; istasyon: 'firin' | 'ocak' | 'tatli' | 'diger' }>();

    hazirlananSiparisler.forEach((sip) => {
      const sipId = sip.id || sip.siparis_kodu || Math.random().toString();
      const urunler: any[] = sip.urunler || sip.elemanlar || sip.siparis_elemanlari || sip.ogeler || sip.sepet || [];

      urunler.forEach((u) => {
        const hamAd = (u.baslik || u.ad || u.yemek_baslik || u.yemek?.baslik || 'Özel Yöresel Menü').trim();
        const adet = Math.max(1, Number(u.adet || u.miktar || 1));
        const kucuk = hamAd.toLowerCase();

        let istasyon: 'firin' | 'ocak' | 'tatli' | 'diger' = 'diger';
        if (
          kucuk.includes('bükme') ||
          kucuk.includes('börek') ||
          kucuk.includes('ağzıaçık') ||
          kucuk.includes('agziacik') ||
          kucuk.includes('katmer') ||
          kucuk.includes('ekmek') ||
          kucuk.includes('pide') ||
          kucuk.includes('poğaça') ||
          kucuk.includes('çörek')
        ) {
          istasyon = 'firin';
        } else if (
          kucuk.includes('mantı') ||
          kucuk.includes('manti') ||
          kucuk.includes('keşkek') ||
          kucuk.includes('keskek') ||
          kucuk.includes('çorba') ||
          kucuk.includes('corba') ||
          kucuk.includes('güveç') ||
          kucuk.includes('guvec') ||
          kucuk.includes('sarma') ||
          kucuk.includes('dolma') ||
          kucuk.includes('kavurma') ||
          kucuk.includes('pilav') ||
          kucuk.includes('musakka') ||
          kucuk.includes('köfte')
        ) {
          istasyon = 'ocak';
        } else if (
          kucuk.includes('kadayıf') ||
          kucuk.includes('kadayif') ||
          kucuk.includes('tatlı') ||
          kucuk.includes('tatli') ||
          kucuk.includes('kaymak') ||
          kucuk.includes('hoşaf') ||
          kucuk.includes('baklava') ||
          kucuk.includes('helva') ||
          kucuk.includes('aşure')
        ) {
          istasyon = 'tatli';
        }

        if (harita.has(hamAd)) {
          const mevcut = harita.get(hamAd)!;
          mevcut.toplamAdet += adet;
          mevcut.siparisKumesi.add(sipId);
        } else {
          harita.set(hamAd, {
            ad: hamAd,
            toplamAdet: adet,
            siparisKumesi: new Set([sipId]),
            istasyon,
          });
        }
      });
    });

    const ogeListesi: PisirmeOge[] = Array.from(harita.values()).map((val) => ({
      ad: val.ad,
      toplamAdet: val.toplamAdet,
      siparisAdedi: val.siparisKumesi.size,
      istasyon: val.istasyon,
    }));

    // En çok sipariş edilenden aza doğru sırala
    ogeListesi.sort((a, b) => b.toplamAdet - a.toplamAdet);

    const toplam = ogeListesi.reduce((acc, curr) => acc + curr.toplamAdet, 0);

    const sayilar = {
      firin: ogeListesi.filter((o) => o.istasyon === 'firin').reduce((a, c) => a + c.toplamAdet, 0),
      ocak: ogeListesi.filter((o) => o.istasyon === 'ocak').reduce((a, c) => a + c.toplamAdet, 0),
      tatli: ogeListesi.filter((o) => o.istasyon === 'tatli').reduce((a, c) => a + c.toplamAdet, 0),
      diger: ogeListesi.filter((o) => o.istasyon === 'diger').reduce((a, c) => a + c.toplamAdet, 0),
    };

    return {
      ogeler: ogeListesi,
      toplamPorsiyon: toplam,
      istasyonSayilari: sayilar,
    };
  }, [hazirlananSiparisler]);

  // Eğer aktif hazırlanan sipariş yoksa bu kartı gösterme
  if (hazirlananSiparisler.length === 0 || ogeler.length === 0) {
    return null;
  }

  const getIstasyonRozet = (istasyon: 'firin' | 'ocak' | 'tatli' | 'diger') => {
    switch (istasyon) {
      case 'firin':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
            🥧 Fırın / Hamur
          </span>
        );
      case 'ocak':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
            🍲 Ocak / Tencere
          </span>
        );
      case 'tatli':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
            🍮 Tatlı / Soğuk
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
            🍳 Sıcak Mutfak
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#23092A] via-[#1A0720] to-[#140517] border border-amber-500/50 p-4 shadow-xl shadow-purple-950/40 text-white animate-fadeIn">
      {/* Başlık Alanı */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-md shadow-amber-900/30">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-amber-300 tracking-wide">
                Tencere & Fırın Özeti (Canlı Pişirme Sayacı)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-purple-950 text-xs font-black shadow-sm">
                {toplamPorsiyon} Parça
              </span>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Aktif {hazirlananSiparisler.length} siparişteki tüm lezzetlerin toplam porsiyon dökümü
            </p>
          </div>
        </div>

        {/* Sağ Buton & Hızlı Sayaçlar */}
        <div className="flex items-center gap-2 ml-auto">
          {/* İstasyon Özet Mini Rozetleri */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px]">
            {istasyonSayilari.firin > 0 && (
              <span className="px-2 py-1 rounded-lg bg-black/40 border border-amber-600/40 text-amber-300 font-bold">
                🥧 {istasyonSayilari.firin} Fırın
              </span>
            )}
            {istasyonSayilari.ocak > 0 && (
              <span className="px-2 py-1 rounded-lg bg-black/40 border border-rose-600/40 text-rose-300 font-bold">
                🍲 {istasyonSayilari.ocak} Tencere
              </span>
            )}
            {istasyonSayilari.tatli > 0 && (
              <span className="px-2 py-1 rounded-lg bg-black/40 border border-purple-600/40 text-purple-300 font-bold">
                🍮 {istasyonSayilari.tatli} Tatlı
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAcik(!acik)}
            className="p-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700/60 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <span>{acik ? 'Gizle' : 'Göster'}</span>
            {acik ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Gövde: Izgara Olarak Porsiyon Kartları */}
      {acik && (
        <div className="mt-3.5 pt-3 border-t border-purple-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {ogeler.map((oge, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#120515]/90 border border-purple-900/60 hover:border-amber-500/50 transition-all flex items-center justify-between gap-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6D237A] to-[#3E1646] border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                    <span className="font-black text-amber-300 text-sm">{oge.toplamAdet}x</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-xs truncate leading-tight">
                      {oge.ad}
                    </h4>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {oge.siparisAdedi} siparişte var
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {getIstasyonRozet(oge.istasyon)}
                </div>
              </div>
            ))}
          </div>

          {/* Aşçı İpucu Notu */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Aşçı Tüyosu:</strong> Fırına ve ocağa gidecek lezzetleri toplu hazırlayarak siparişleri tek seferde ocaktan çıkarabilirsiniz.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
