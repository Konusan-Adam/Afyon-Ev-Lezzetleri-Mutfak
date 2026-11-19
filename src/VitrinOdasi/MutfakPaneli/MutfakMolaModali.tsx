import React, { useState } from 'react';
import { X, Coffee, Clock, Check, Power } from 'lucide-react';

interface MutfakMolaModaliProps {
  moladaMi: boolean;
  molaBitisZamani?: string;
  molaNedeni?: string;
  onMolaBaslat: (dakika: number, neden: string) => Promise<void>;
  onMolaBitir: () => Promise<void>;
  onKapat: () => void;
}

export const MutfakMolaModali: React.FC<MutfakMolaModaliProps> = ({
  moladaMi,
  molaBitisZamani,
  molaNedeni,
  onMolaBaslat,
  onMolaBitir,
  onKapat,
}) => {
  const [secilenDakika, setSecilenDakika] = useState<number>(30);
  const [neden, setNeden] = useState<string>('Tencere yenileme ve dinlenme');
  const [islemde, setIslemde] = useState(false);

  const handleBaslat = async () => {
    setIslemde(true);
    try {
      await onMolaBaslat(secilenDakika, neden);
      onKapat();
    } finally {
      setIslemde(false);
    }
  };

  const handleBitir = async () => {
    setIslemde(true);
    try {
      await onMolaBitir();
      onKapat();
    } finally {
      setIslemde(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1D0A20] border border-amber-500/40 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-xs">
        {/* Üst Bar */}
        <div className="p-4 bg-[#260C2C] border-b border-purple-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {moladaMi ? 'Mutfak Şu An Molada' : 'Geçici Mutfak Molası'}
              </h3>
              <p className="text-[11px] text-purple-300">
                {moladaMi ? 'Mola durumunu yönetin veya erkenden bitirin' : 'Dükkanı kapatmadan geçici durdurma'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onKapat} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {moladaMi ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Mola Aktif</span>
                </div>
                {molaBitisZamani && (
                  <p className="text-[11px] text-amber-300 font-mono">
                    Bitiş: {new Date(molaBitisZamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {molaNedeni && (
                  <p className="text-[10px] text-amber-300/80 italic">"{molaNedeni}"</p>
                )}
                <p className="text-[10px] text-gray-300 mt-1">
                  Vitrinde müşterilere geçici olarak mola uyarısı gösterilmektedir.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBitir}
                disabled={islemde}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
              >
                <Power className="w-4 h-4" />
                <span>Molayı Şimdi Bitir &amp; Siparişe Aç</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">Mola Süresi Seçin</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { dk: 30, etiket: '30 Dk' },
                    { dk: 60, etiket: '1 Saat' },
                    { dk: 120, etiket: '2 Saat' },
                  ].map((s) => (
                    <button
                      key={s.dk}
                      type="button"
                      onClick={() => setSecilenDakika(s.dk)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        secilenDakika === s.dk
                          ? 'bg-amber-500 text-purple-950 border-amber-400 font-black shadow-md'
                          : 'bg-[#150718] border-purple-900/60 text-purple-200 hover:border-purple-700'
                      }`}
                    >
                      {s.etiket}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Mola Nedeni (İsteğe Bağlı)</label>
                <select
                  value={neden}
                  onChange={(e) => setNeden(e.target.value)}
                  className="w-full bg-[#130713] border border-purple-900/70 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                >
                  <option value="Tencere yenileme ve dinlenme">Tencere yenileme ve dinlenme</option>
                  <option value="Pazar / malzeme alışverişi">Pazar / malzeme alışverişi</option>
                  <option value="Mutfakta aşırı yoğunluk">Mutfakta aşırı yoğunluk</option>
                  <option value="Fırın ve ocak bakımı">Fırın ve ocak bakımı</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-900/40">
                <button
                  type="button"
                  onClick={onKapat}
                  className="px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-800 text-gray-300 hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleBaslat}
                  disabled={islemde}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{secilenDakika} Dk Mola Başlat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
