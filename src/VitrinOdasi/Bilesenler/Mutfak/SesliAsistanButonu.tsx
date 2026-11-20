import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { 
  sesliAsistanAktifMi, 
  sesliAsistanAyarla, 
  mutfakSesliAnonsYap 
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSesliAsistanServisi';

export const SesliAsistanButonu: React.FC = () => {
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    setAktif(sesliAsistanAktifMi());

    const handleAyarDegisti = (e: any) => {
      if (typeof e.detail?.aktif === 'boolean') {
        setAktif(e.detail.aktif);
      }
    };

    window.addEventListener('afyon_sesli_asistan_ayar_degisti', handleAyarDegisti);
    return () => {
      window.removeEventListener('afyon_sesli_asistan_ayar_degisti', handleAyarDegisti);
    };
  }, []);

  const toggle = () => {
    const yeni = !aktif;
    setAktif(yeni);
    sesliAsistanAyarla(yeni);

    if (yeni) {
      mutfakSesliAnonsYap('Sesli mutfak asistanı aktif edildi.', { anindaKonus: true });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
        aktif
          ? 'bg-purple-950/80 border-amber-500/50 text-amber-300 hover:bg-purple-900/90 shadow-amber-950/30'
          : 'bg-gray-900/80 border-gray-700 text-gray-400 hover:text-white'
      }`}
      title={
        aktif
          ? 'Sesli Asistan Açık (Kalan süreleri ve son dakikaları sesli anons eder)'
          : 'Sesli Asistan Kapalı (Sadece görsel sayaç çalışır)'
      }
    >
      {aktif ? (
        <>
          <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">Sesli Asistan</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
            Açık
          </span>
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4 text-gray-400" />
          <span className="hidden sm:inline">Sesli Asistan</span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.2 rounded font-mono">
            Kapalı
          </span>
        </>
      )}
    </button>
  );
};
