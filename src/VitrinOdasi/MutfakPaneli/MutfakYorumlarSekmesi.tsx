import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send } from 'lucide-react';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonuCanliDinle, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';

const M1_ESLESEN_KIMLIKLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function yorumBuMutfagaAitMi(kayitMutfakId: string | undefined, hedefMutfakId: string): boolean {
  if (!kayitMutfakId) return false;
  if (kayitMutfakId === hedefMutfakId) return true;
  return M1_ESLESEN_KIMLIKLER.includes(hedefMutfakId) && M1_ESLESEN_KIMLIKLER.includes(kayitMutfakId);
}

interface MutfakYorumlarSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
}

export const MutfakYorumlarSekmesi: React.FC<MutfakYorumlarSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
}) => {
  const [yorumlar, setYorumlar] = useState<any[]>([]);
  const [cevapMetinleri, setCevapMetinleri] = useState<{ [id: string]: string }>({});
  const [kaydediliyorId, setKaydediliyorId] = useState<string | null>(null);

  useEffect(() => {
    if (!canliFirebaseAktifMi() || !mutfakId) return;

    const durdur = koleksiyonuCanliDinle<any>('degerlendirmeler', (tum) => {
      const buMutfak = (tum || [])
        .filter((y) => yorumBuMutfagaAitMi(y.mutfak_id || y.mutfakId, mutfakId))
        .sort((a, b) =>
          String(b.tarih || b.olusturma_tarihi || '').localeCompare(
            String(a.tarih || a.olusturma_tarihi || '')
          )
        );
      setYorumlar(buMutfak);
    });

    return () => durdur();
  }, [mutfakId]);

  const cevapKaydet = async (yorumId: string) => {
    const cevap = cevapMetinleri[yorumId]?.trim();
    if (!cevap) return;

    setKaydediliyorId(yorumId);
    try {
      if (canliFirebaseAktifMi()) {
        await belgeKaydet('degerlendirmeler', yorumId, {
          mutfak_cevabi: cevap,
          cevap_tarihi: new Date().toISOString(),
        });
      }
      setYorumlar((prev) =>
        prev.map((y) => (y.id === yorumId ? { ...y, mutfak_cevabi: cevap } : y))
      );
      setCevapMetinleri((prev) => ({ ...prev, [yorumId]: '' }));
    } finally {
      setKaydediliyorId(null);
    }
  };

  const ortalamaPuan =
    yorumlar.length > 0
      ? (yorumlar.reduce((t, y) => t + Number(y.puan || y.yildiz || 5), 0) / yorumlar.length).toFixed(1)
      : '5.0';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Üst Özet Kartı */}
      <div className="bg-[#180A1F] border border-purple-900/60 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Müşteri Yorumları &amp; Değerlendirmeler</h3>
            <p className="text-xs text-purple-300 mt-0.5">
              {mutfakAdi} için yapılan lezzet puanları ve müşteri notları.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#120516] px-3.5 py-2 rounded-xl border border-amber-500/30">
          <span className="text-amber-400 font-black text-base">★ {ortalamaPuan}</span>
          <span className="text-xs text-gray-400">({yorumlar.length} Yorum)</span>
        </div>
      </div>

      {/* Yorumlar Listesi */}
      {yorumlar.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-50" />
          <p>Henüz müşterilerinizden gelen bir değerlendirme bulunmuyor.</p>
          <p className="text-[11px] text-purple-300/60 mt-1">Siparişler teslim edildikçe yorumlar buraya düşecektir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {yorumlar.map((yorum) => {
            const puan = Number(yorum.puan || yorum.yildiz || 5);
            const musteriAdi = yorum.musteri_adi || yorum.musteriAdi || 'Değerli Müşteri';
            const metin = yorum.yorum || yorum.mesaj || yorum.icerik || '';
            const tarih = yorum.tarih || yorum.olusturma_tarihi;
            const cevap = yorum.mutfak_cevabi || yorum.mutfakCevabi;

            return (
              <div key={yorum.id} className="p-4 rounded-2xl bg-[#180A1F] border border-purple-900/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{musteriAdi}</h4>
                      {yorum.siparis_kodu && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">
                          #{yorum.siparis_kodu}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < puan ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] text-gray-400 ml-1">
                        {tarih ? new Date(tarih).toLocaleDateString('tr-TR') : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {metin && (
                  <p className="text-xs text-gray-200 leading-relaxed bg-[#130617] p-3 rounded-xl border border-purple-950">
                    &ldquo;{metin}&rdquo;
                  </p>
                )}

                {/* Mutfak Cevabı Varsa veya Cevap Yazma Alanı */}
                {cevap ? (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      Mutfağınızın Cevabı:
                    </span>
                    <p className="text-xs text-purple-200">{cevap}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={cevapMetinleri[yorum.id] || ''}
                      onChange={(e) =>
                        setCevapMetinleri((prev) => ({ ...prev, [yorum.id]: e.target.value }))
                      }
                      placeholder="Müşteri yorumuna teşekkür cevabı yazın..."
                      className="flex-1 bg-[#130617] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => cevapKaydet(yorum.id)}
                      disabled={kaydediliyorId === yorum.id}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gönder</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
