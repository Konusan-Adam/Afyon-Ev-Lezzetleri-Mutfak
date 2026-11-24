import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { siparisIptalEt } from '@/src/MalzemeCekmeceleri/MutfakYonetimi/siparisIptalIslemleri';

export interface SiparisIptalPenceresiProps {
  siparisKimligi: string;
  siparisNo: string;
  onKapat: () => void;
  onBasarili: () => void;
}

const IPTAL_GEREKCELERI = [
  'Malzeme Tükendi (Ürün kalmadı)',
  'Mutfak Aşırı Yoğun / Pişirme Kapasitesi Doldu',
  'Mutfak Servis Saatleri Dışı / Kapanıyor',
  'Müşteri Talebiyle İptal Edildi',
  'Hatalı veya Çift Sipariş',
  'Diğer Operasyonel Gerekçe',
];

export const SiparisIptalPenceresi: React.FC<SiparisIptalPenceresiProps> = ({
  siparisKimligi,
  siparisNo,
  onKapat,
  onBasarili,
}) => {
  const [secilenGerekce, setSecilenGerekce] = useState(IPTAL_GEREKCELERI[0]);
  const [detayNot, setDetayNot] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const handleIptalOnayla = async () => {
    try {
      setYukleniyor(true);
      setHata(null);
      await siparisIptalEt(siparisKimligi, secilenGerekce, detayNot, siparisNo);
      onBasarili();
      onKapat();
    } catch (e: any) {
      setHata(e?.message || 'Sipariş iptal edilirken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#180A1F] border border-red-900/50 rounded-2xl p-6 text-gray-200 shadow-2xl">
        <button
          onClick={onKapat}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Sipariş İptal Et</h3>
            <p className="text-xs text-red-300/80">Sipariş Kodu: #{siparisNo}</p>
          </div>
        </div>

        {hata && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs">
            {hata}
          </div>
        )}

        <div className="space-y-3 mb-5">
          <label className="block text-xs font-semibold text-purple-300">
            İptal Gerekçesini Seçiniz:
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {IPTAL_GEREKCELERI.map((gerekce) => (
              <label
                key={gerekce}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  secilenGerekce === gerekce
                    ? 'bg-red-950/40 border-red-500/70 text-white'
                    : 'bg-[#120617] border-purple-900/30 text-gray-300 hover:border-purple-700/50'
                }`}
              >
                <input
                  type="radio"
                  name="iptalGerekce"
                  checked={secilenGerekce === gerekce}
                  onChange={() => setSecilenGerekce(gerekce)}
                  className="accent-red-500"
                />
                <span>{gerekce}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-300 mb-1">
              Müşteriye İletilecek Ek Açıklama (İsteğe bağlı):
            </label>
            <textarea
              value={detayNot}
              onChange={(e) => setDetayNot(e.target.value)}
              placeholder="Örn: Haşhaşlı bükmemiz bugünlük tükendi, yarın sabah tekrar fırından çıkacak..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-[#120617] border border-purple-900/40 rounded-xl text-gray-200 focus:outline-none focus:border-red-500/70"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onKapat}
            disabled={yukleniyor}
            className="flex-1 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 text-gray-300 text-xs font-semibold transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={handleIptalOnayla}
            disabled={yukleniyor}
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/40"
          >
            {yukleniyor ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>İptal Ediliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>İptali Onayla</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
