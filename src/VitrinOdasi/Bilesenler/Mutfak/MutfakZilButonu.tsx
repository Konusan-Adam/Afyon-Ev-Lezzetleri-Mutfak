import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2 } from 'lucide-react';
import { mutfakZiliCal } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';

export const MutfakZilButonu: React.FC = () => {
  const [zilAktif, setZilAktif] = useState(true);
  const [bildirimDurumu, setBildirimDurumu] = useState<NotificationPermission | 'unsupported'>('default');
  const [caliniyor, setCaliniyor] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBildirimDurumu(Notification.permission);
    } else {
      setBildirimDurumu('unsupported');
    }
  }, []);

  const handleZilToggle = async () => {
    // Tarayıcı izin kontrolü
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const sonuc = await Notification.requestPermission();
        setBildirimDurumu(sonuc);
      } catch (e) {
        // İzin isteği reddedildi veya hata
      }
    }

    setCaliniyor(true);
    mutfakZiliCal('🔔 Zil Testi', 'Mutfak sesli uyarı sistemi aktif ve çalışıyor!');
    setTimeout(() => setCaliniyor(false), 1500);
  };

  return (
    <button
      onClick={handleZilToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
        caliniyor
          ? 'bg-amber-500 text-black border-amber-300 scale-105 shadow-lg shadow-amber-500/30'
          : 'bg-purple-950/60 hover:bg-purple-900/80 border-purple-800/50 text-purple-200'
      }`}
      title="Mutfak Sipariş Zili (Tıkla ve Test Et)"
      type="button"
    >
      <Bell className={`w-3.5 h-3.5 ${caliniyor ? 'animate-bounce text-black' : 'text-amber-400'}`} />
      <span className="hidden sm:inline">Mutfak Zili</span>
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
    </button>
  );
};
