import React from 'react';
import { ShoppingBag, UtensilsCrossed, Wallet, Store } from 'lucide-react';

export type MutfakAnaSekme = 'siparisler' | 'menum' | 'kazanc' | 'dukkanim';

interface MutfakAltNavigasyonProps {
  aktifSekme: MutfakAnaSekme;
  onSekmeSec: (sekme: MutfakAnaSekme) => void;
  aktifSiparisSayisi: number;
  yemekSayisi: number;
}

export const MutfakAltNavigasyon: React.FC<MutfakAltNavigasyonProps> = ({
  aktifSekme,
  onSekmeSec,
  aktifSiparisSayisi,
  yemekSayisi,
}) => {
  const ogeler: Array<{
    id: MutfakAnaSekme;
    etiket: string;
    ikon: React.ReactNode;
    rozet?: number;
    rozetVurgulu?: boolean;
  }> = [
    {
      id: 'siparisler',
      etiket: 'Siparişler',
      ikon: <ShoppingBag className="w-5 h-5" />,
      rozet: aktifSiparisSayisi > 0 ? aktifSiparisSayisi : undefined,
      rozetVurgulu: true,
    },
    {
      id: 'menum',
      etiket: 'Menüm',
      ikon: <UtensilsCrossed className="w-5 h-5" />,
      rozet: yemekSayisi > 0 ? yemekSayisi : undefined,
    },
    {
      id: 'kazanc',
      etiket: 'Kazancım',
      ikon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'dukkanim',
      etiket: 'Dükkanım',
      ikon: <Store className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Mutfak Mobil Menü"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#14051A]/95 backdrop-blur-md border-t border-purple-900/70 shadow-[0_-8px_30px_rgba(0,0,0,0.65)]"
    >
      <div className="grid grid-cols-4 gap-1 px-2 py-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        {ogeler.map((oge) => {
          const secili = aktifSekme === oge.id;
          return (
            <button
              key={oge.id}
              type="button"
              onClick={() => onSekmeSec(oge.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all cursor-pointer min-h-[58px] ${
                secili
                  ? 'bg-[#6D237A] text-white shadow-lg shadow-purple-950/60'
                  : 'text-purple-300/80 hover:text-white active:bg-purple-950/60'
              }`}
            >
              <div className="relative">
                {oge.ikon}
                {oge.rozet !== undefined && (
                  <span
                    className={`absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
                      oge.rozetVurgulu
                        ? 'bg-amber-400 text-purple-950 shadow'
                        : 'bg-purple-800 text-purple-100 border border-purple-500/40'
                    }`}
                  >
                    {oge.rozet}
                  </span>
                )}
              </div>
              <span className={`text-[11px] leading-tight ${secili ? 'font-extrabold' : 'font-semibold'}`}>
                {oge.etiket}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
