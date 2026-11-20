import React, { useState, useEffect } from 'react';
import { Bell, SlidersHorizontal } from 'lucide-react';
import {
  mutfakZiliCal,
  mutfakZiliDurdur,
  sesSisteminiKilidiniAc,
  sesKilidiDurumunuDinle,
  zilCalinmaDurumunuDinle,
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';
import { androidZilSustur } from '@/src/MalzemeCekmeceleri/Mutfak/AndroidKopruServisi';
import { MutfakZilSeciciPenceresi } from '@/src/VitrinOdasi/MutfakPaneli/MutfakZilSeciciPenceresi';

export const MutfakZilButonu: React.FC = () => {
  const [sesAcik, setSesAcik] = useState(false);
  const [caliniyor, setCaliniyor] = useState(false);
  const [seciciAcik, setSeciciAcik] = useState(false);

  useEffect(() => {
    const abonelik1 = sesKilidiDurumunuDinle((acik) => setSesAcik(acik));
    const abonelik2 = zilCalinmaDurumunuDinle((aktif) => setCaliniyor(aktif));
    return () => {
      abonelik1();
      abonelik2();
    };
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
  };

  return (
    <>
      <div className="inline-flex items-center rounded-xl overflow-hidden border border-purple-800/50 bg-purple-950/60">
        <button
          onClick={handleZilTesti}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
            caliniyor
              ? 'bg-amber-500 text-black'
              : 'hover:bg-purple-900/80 text-purple-200'
          }`}
          title={caliniyor ? 'Susturmak için tıkla' : 'Mutfak Sipariş Zili (Tıkla ve Test Et)'}
          type="button"
        >
          <Bell className={`w-3.5 h-3.5 ${caliniyor ? 'animate-bounce text-black' : 'text-amber-400'}`} />
          <span className="hidden sm:inline">{caliniyor ? 'Sustur' : 'Mutfak Zili'}</span>
          <span className={`w-2 h-2 rounded-full ml-0.5 ${sesAcik ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400/70'}`} />
        </button>

        <button
          type="button"
          onClick={() => setSeciciAcik(true)}
          title="Sipariş Zili & Sistem Sesini Seç"
          aria-label="Sipariş Zili & Sistem Sesini Seç"
          className="px-2.5 py-2 border-l border-purple-800/60 hover:bg-purple-900/90 text-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Ses Seç</span>
        </button>
      </div>

      <MutfakZilSeciciPenceresi acik={seciciAcik} kapat={() => setSeciciAcik(false)} />
    </>
  );
};
