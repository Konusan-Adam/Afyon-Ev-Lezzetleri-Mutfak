import React from 'react';
import { gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';

interface CokluMenuKolajOnizlemeProps {
  gorseller: string[];
  toplamCesitSayisi: number;
  boyutSinifi?: string;
}

const VARSAYILAN_LOGO = '/assets/aistudio/image_48081a60_bc73ebae.jpg';

export const CokluMenuKolajOnizleme: React.FC<CokluMenuKolajOnizlemeProps> = ({
  gorseller,
  toplamCesitSayisi,
  boyutSinifi = 'w-20 h-20',
}) => {
  const gosterilenler = (gorseller || []).filter(Boolean).slice(0, 6);
  const fazladanCesit = Math.max(0, toplamCesitSayisi - 6);

  if (gosterilenler.length === 0) {
    return (
      <div
        className={`${boyutSinifi} rounded-xl overflow-hidden border border-purple-800/70 bg-purple-950/60 shrink-0 flex items-center justify-center`}
      >
        <img
          src={VARSAYILAN_LOGO}
          alt="Çoklu Menü"
          className="w-full h-full object-cover opacity-80"
        />
      </div>
    );
  }

  const gridSinifi =
    gosterilenler.length === 1
      ? 'grid-cols-1 grid-rows-1'
      : gosterilenler.length === 2
      ? 'grid-cols-2 grid-rows-1'
      : gosterilenler.length <= 4
      ? 'grid-cols-2 grid-rows-2'
      : 'grid-cols-3 grid-rows-2';

  return (
    <div
      className={`${boyutSinifi} rounded-xl overflow-hidden border border-amber-500/40 bg-[#120416] grid ${gridSinifi} gap-[1.5px] shrink-0 shadow-md`}
    >
      {gosterilenler.map((url, idx) => {
        const sonKareVeFazlaVar = idx === 5 && fazladanCesit > 0;
        const guvenliUrl = gorselUrlGuvenliYap(url) || VARSAYILAN_LOGO;
        return (
          <div key={`${idx}-${url.slice(0, 20)}`} className="relative w-full h-full overflow-hidden bg-purple-950/50">
            <img
              src={guvenliUrl}
              alt={`Çeşit ${idx + 1}`}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.endsWith(VARSAYILAN_LOGO)) {
                  img.src = VARSAYILAN_LOGO;
                }
              }}
              className="w-full h-full object-cover"
            />
            {sonKareVeFazlaVar && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="text-[11px] font-black text-amber-300 tracking-tight">
                  +{fazladanCesit}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
