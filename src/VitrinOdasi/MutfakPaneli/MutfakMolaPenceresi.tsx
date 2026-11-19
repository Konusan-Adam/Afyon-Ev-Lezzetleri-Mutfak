import React, { useState } from 'react';
import { X, Clock, Coffee, Loader2 } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';

interface MutfakMolaPenceresiProps {
  mutfakId: string;
  mutfakKaydi: any;
  onKapat: () => void;
}

export const MutfakMolaPenceresi: React.FC<MutfakMolaPenceresiProps> = ({
  mutfakId,
  mutfakKaydi,
  onKapat,
}) => {
  const [secilenSureDk, setSecilenSureDk] = useState<number>(30);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const hedefMutfakId = mutfakKaydi?.id || mutfakKaydi?.kimlik || mutfakId;

  const molaBaslat = async () => {
    setKaydediliyor(true);
    const bitisZamani = new Date(Date.now() + secilenSureDk * 60 * 1000).toISOString();

    if (canliFirebaseAktifMi() && hedefMutfakId) {
      try {
        await belgeKaydet('mutfaklar', hedefMutfakId, {
          mola_durumu: true,
          mola_bitis_zamani: bitisZamani,
          acik_mi: false,
        });
      } catch (err) {
        console.warn('Mola başlatma hatası:', err);
      }
    }

    setKaydediliyor(false);
    onKapat();
  };

  const molaBitir = async () => {
    setKaydediliyor(true);
    if (canliFirebaseAktifMi() && hedefMutfakId) {
      try {
        await belgeKaydet('mutfaklar', hedefMutfakId, {
          mola_durumu: false,
          mola_bitis_zamani: null,
          acik_mi: true,
        });
      } catch (err) {
        console.warn('Mola bitirme hatası:', err);
      }
    }

    setKaydediliyor(false);
    onKapat();
  };

  const aktifMolaMi = mutfakKaydi?.mola_durumu === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#180A1F] border border-purple-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Üst Bar */}
        <div className="p-4 border-b border-purple-900/60 flex items-center justify-between bg-[#240C28]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Mutfak Dinlenme / Mola Modu</h3>
              <p className="text-[11px] text-purple-300">Geçici olarak sipariş alımını durdurun</p>
            </div>
          </div>
          <button type="button" onClick={onKapat} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-5 space-y-4 text-xs">
          {aktifMolaMi ? (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 text-center space-y-3">
              <Clock className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
              <div>
                <h4 className="font-black text-amber-300 text-sm">Mutfağınız Şu An Molada!</h4>
                <p className="text-xs text-amber-200/80 mt-1">
                  Vitrinde &ldquo;Mutfak dinlenmede&rdquo; olarak görünüyorsunuz. Yeni sipariş alımı durdurulmuştur.
                </p>
                {mutfakKaydi?.mola_bitis_zamani && (
                  <p className="text-[11px] text-purple-300 mt-2 font-mono">
                    Tahmini Bitiş: {new Date(mutfakKaydi.mola_bitis_zamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={molaBitir}
                disabled={kaydediliyor}
                className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Molayı Bitir & Dükkanı Aç'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Tencereyi tazelemek, fırını temizlemek veya kısa bir dinlenme arası vermek istediğinizde mola başlatabilirsiniz. Mola süresince dükkanınız kapalı konuma geçer.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((dk) => (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => setSecilenSureDk(dk)}
                    className={`py-3 rounded-2xl font-black text-xs border transition-all cursor-pointer ${
                      secilenSureDk === dk
                        ? 'bg-amber-500 text-purple-950 border-amber-400 shadow-md'
                        : 'bg-[#130617] border-purple-900/60 text-purple-200 hover:border-purple-700'
                    }`}
                  >
                    {dk >= 60 ? `${dk / 60} Saat` : `${dk} Dakika`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={molaBaslat}
                disabled={kaydediliyor}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-purple-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {kaydediliyor ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-950" />
                ) : (
                  <>
                    <Coffee className="w-4 h-4" />
                    <span>{secilenSureDk >= 60 ? `${secilenSureDk / 60} Saat` : `${secilenSureDk} Dk`} Mola Başlat</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
