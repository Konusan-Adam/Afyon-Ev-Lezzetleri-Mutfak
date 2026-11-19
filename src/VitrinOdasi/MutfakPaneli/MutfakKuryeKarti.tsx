import React from 'react';
import { Truck, Phone } from 'lucide-react';

interface MutfakKuryeKartiProps {
  kuryeAdi?: string;
  kuryeTelefon?: string;
  durum?: string;
  tahminiDakika?: number | string;
}

export const MutfakKuryeKarti: React.FC<MutfakKuryeKartiProps> = ({
  kuryeAdi,
  kuryeTelefon,
  durum,
  tahminiDakika,
}) => {
  if (!kuryeAdi && !kuryeTelefon) return null;

  const yoldaMi = durum === 'yolda';

  return (
    <div className="p-2.5 rounded-xl bg-[#200A29] border border-cyan-500/50 flex items-center justify-between gap-2.5 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-bold border border-cyan-600/40">
              {yoldaMi ? '🛵 Kurye Yolda' : '🛵 Kurye Atandı'}
            </span>
            <span className="text-xs font-black text-white truncate">
              {kuryeAdi || 'Kurye'}
            </span>
          </div>
          <p className="text-[10px] text-cyan-200/80 truncate mt-0.5">
            {yoldaMi
              ? 'Siparişi teslim aldı, müşteriye götürüyor'
              : 'Siparişi almak için mutfağınıza geliyor'}
            {tahminiDakika ? ` • ~${tahminiDakika} dk` : ''}
          </p>
        </div>
      </div>

      {kuryeTelefon && (
        <a
          href={`tel:${kuryeTelefon}`}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Kuryeyi Ara</span>
        </a>
      )}
    </div>
  );
};
