import React, { useState } from 'react';
import { Volume2, Check, Radio, Database } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';

export interface TezgahBildirimCubuguProps {
  panelTuru?: 'mutfak' | 'kurye' | 'yonetici' | string;
  onSesTesti?: () => void;
}

export const TezgahBildirimCubugu: React.FC<TezgahBildirimCubuguProps> = ({
  panelTuru = 'mutfak',
  onSesTesti,
}) => {
  const [sesTestEdildi, setSesTestEdildi] = useState(false);
  const firebaseAktif = canliFirebaseAktifMi();

  const handleSesTesti = () => {
    if (onSesTesti) {
      onSesTesti();
      setSesTestEdildi(true);
      setTimeout(() => setSesTestEdildi(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#180A1F] border border-purple-900/40 text-xs text-gray-300 flex-wrap">
      {/* Canlı Firebase Durum Rozeti */}
      <div 
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-800/40"
        title="Firebase Firestore Canlı Bulut Veritabanı Aktif"
      >
        <Database className={`w-3 h-3 ${firebaseAktif ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span className={`text-[10px] font-bold ${firebaseAktif ? 'text-emerald-300' : 'text-amber-300'}`}>
          {firebaseAktif ? 'Firebase: Canlı Bağlı 🟢' : 'Yerel Mod 🟡'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-purple-200 hidden md:inline">
          Canlı Sipariş Hattı Açık
        </span>
      </div>

      {onSesTesti && (
        <button
          onClick={handleSesTesti}
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-amber-300 text-[10px] font-bold transition-all cursor-pointer border border-purple-800/40"
          title="Hoparlör ve Zil Testi"
        >
          {sesTestEdildi ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Çaldı ✓</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>Sesi Test Et</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
