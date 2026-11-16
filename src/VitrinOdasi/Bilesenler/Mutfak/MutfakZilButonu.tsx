import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  mutfakZiliCal,
  mutfakZiliDurdur,
  sesSisteminiKilidiniAc,
  sesKilidiDurumunuDinle,
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';
import { androidZilSustur } from '@/src/MalzemeCekmeceleri/Mutfak/AndroidKopruServisi';

export const MutfakZilButonu: React.FC = () => {
  const [sesAcik, setSesAcik] = useState(false);
  const [caliniyor, setCaliniyor] = useState(false);

  useEffect(() => {
    const abonelik = sesKilidiDurumunuDinle((acik) => setSesAcik(acik));
    return () => abonelik();
  }, []);

  const handleZilTesti = async () => {
    if (caliniyor) {
      mutfakZiliDurdur();
      androidZilSustur();
      setCaliniyor(false);
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    await sesSisteminiKilidiniAc();
    setCaliniyor(true);
    mutfakZiliCal('🔔 Zil Testi', 'Mutfak sesli uyarı sistemi aktif ve çalışıyor!', { sureSn: 2.5 });
    setTimeout(() => setCaliniyor(false), 2600);
  };

  return (
    <button
      onClick={handleZilTesti}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
        caliniyor
          ? 'bg-amber-500 text-black border-amber-300 scale-105 shadow-lg shadow-amber-500/30'
          : 'bg-purple-950/60 hover:bg-purple-900/80 border-purple-800/50 text-purple-200'
      }`}
      title={caliniyor ? 'Susturmak için tıkla' : 'Mutfak Sipariş Zili (Tıkla ve Test Et)'}
      type="button"
    >
      <Bell className={`w-3.5 h-3.5 ${caliniyor ? 'animate-bounce text-black' : 'text-amber-400'}`} />
      <span className="hidden sm:inline">{caliniyor ? 'Sustur' : 'Mutfak Zili'}</span>
      <span className={`w-2 h-2 rounded-full ml-0.5 ${sesAcik ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400/70'}`} />
    </button>
  );
};
