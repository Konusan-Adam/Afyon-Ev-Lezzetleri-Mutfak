import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2 } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';

interface Props {
  mutfakId: string;
}

export const MutfakTeslimatAyarKarti: React.FC<Props> = ({ mutfakId }) => {
  const [minTutar, setMinTutar] = useState<number>(150);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    const yukle = async () => {
      const lokal = localStorage.getItem(`mutfak_ayar_${mutfakId}`);
      if (lokal) {
        try {
          const parsed = JSON.parse(lokal);
          if (parsed.min_siparis_tutari !== undefined) setMinTutar(parsed.min_siparis_tutari);
        } catch {}
      }

      if (canliFirebaseAktifMi()) {
        try {
          const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
          const mutfak = mutfaklar.find((m) => m.id === mutfakId || m.kimlik === mutfakId || (mutfakId === 'm1' && (m.id === 'asci_fatma_01' || m.id === 'mutfak-fatma-teyze')));
          if (mutfak) {
            if (mutfak.min_siparis_tutari !== undefined) setMinTutar(mutfak.min_siparis_tutari);
          }
        } catch (err) {
          console.warn('Mutfak ayarı okunamadı:', err);
        }
      }
    };
    yukle();
  }, [mutfakId]);

  const kaydet = async (yeniMin: number) => {
    setMinTutar(yeniMin);
    setKaydediliyor(true);

    const veri = {
      min_siparis_tutari: yeniMin
    };

    localStorage.setItem(`mutfak_ayar_${mutfakId}`, JSON.stringify(veri));
    window.dispatchEvent(new Event(`mutfak_ayar_guncellendi_${mutfakId}`));

    if (canliFirebaseAktifMi()) {
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => m.id === mutfakId || m.kimlik === mutfakId || (mutfakId === 'm1' && (m.id === 'asci_fatma_01' || m.id === 'mutfak-fatma-teyze')));
        const hedefId = mutfak ? (mutfak.id || mutfak.kimlik) : mutfakId;

        await belgeKaydet('mutfaklar', hedefId, {
          ...(mutfak || {}),
          id: hedefId,
          ad: mutfak?.ad || 'Afyon Ev Mutfağı',
          min_siparis_tutari: yeniMin
        });
      } catch (err) {
        console.warn('Firebase mutfak ayar kaydetme hatası:', err);
      }
    }

    setTimeout(() => {
      setKaydediliyor(false);
      setMesaj('Minimum sepet tutarı güncellendi!');
      setTimeout(() => setMesaj(null), 2500);
    }, 300);
  };

  return (
    <div className="bg-[#1C0722] border border-purple-900/60 rounded-2xl p-4 space-y-3 mb-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <ShoppingBag className="w-4 h-4" />
          <span>Mutfak Minimum Sipariş Tutarı Ayarı</span>
        </div>
        {mesaj && (
          <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {mesaj}
          </span>
        )}
      </div>

      <div className="max-w-md text-xs">
        <label className="text-purple-300 font-medium block mb-1">Minimum Sipariş Tutarı (₺)</label>
        <input
          type="number"
          value={minTutar}
          onChange={(e) => kaydet(Number(e.target.value) || 0)}
          className="w-full bg-[#120415] border border-purple-900/80 rounded-xl px-3 py-2 text-white font-bold text-sm"
          placeholder="150"
        />
        <p className="text-[10px] text-purple-400/70 mt-1">Müşterinin mutfağınızdan sepet oluşturabilmesi için gereken alt sepet tutarı.</p>
      </div>
    </div>
  );
};
