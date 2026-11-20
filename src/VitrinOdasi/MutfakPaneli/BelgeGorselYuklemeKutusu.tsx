import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, Eye, Trash2, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { sunucuyaGorselYukle, gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';

interface BelgeGorselYuklemeKutusuProps {
  etiket: string;
  gorselUrl: string;
  onGorselDegistir: (url: string) => void;
  onHata?: (mesaj: string) => void;
}

export const BelgeGorselYuklemeKutusu: React.FC<BelgeGorselYuklemeKutusuProps> = ({
  etiket,
  gorselUrl,
  onGorselDegistir,
  onHata,
}) => {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [onizlemeAcik, setOnizlemeAcik] = useState(false);

  const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;

    setYukleniyor(true);
    try {
      const sonuc = await sunucuyaGorselYukle(dosya, 'belgeler');
      if (sonuc.basarili && sonuc.url) {
        onGorselDegistir(sonuc.url);
      } else {
        onHata?.(sonuc.hata || 'Belge görseli yüklenemedi.');
      }
    } catch {
      onHata?.('Belge görseli yüklenirken bir sorun oluştu.');
    } finally {
      setYukleniyor(false);
      if (dosyaRef.current) dosyaRef.current.value = '';
    }
  };

  const guvenliUrl = gorselUrlGuvenliYap(gorselUrl);

  return (
    <div className="space-y-2 pt-1">
      <label className="block text-[11px] font-semibold text-gray-300">
        {etiket} <span className="text-[10px] text-purple-300/70">(İsteğe Bağlı Fotoğraf / Ekran Görüntüsü)</span>
      </label>

      <input
        ref={dosyaRef}
        type="file"
        accept="image/*"
        onChange={dosyaSecildi}
        className="hidden"
      />

      {!guvenliUrl ? (
        <button
          type="button"
          onClick={() => dosyaRef.current?.click()}
          disabled={yukleniyor}
          className="w-full py-3 px-3 rounded-xl border border-dashed border-purple-700/70 bg-[#240C28]/70 hover:bg-[#2E1034] hover:border-amber-400/60 text-xs text-purple-200 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          {yukleniyor ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Belge fotoğrafı yükleniyor...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>Galeriden / Kameradan Belge Fotoğrafı Yükle</span>
            </>
          )}
        </button>
      ) : (
        <div className="p-2.5 rounded-xl bg-[#240C28] border border-emerald-700/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={guvenliUrl}
              alt={etiket}
              className="w-11 h-11 rounded-lg object-cover border border-purple-700/60 shrink-0 bg-black/30"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Belge Görseli Eklendi</span>
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                Kaydedince Patron incelemesine iletilir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setOnizlemeAcik(true)}
              className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-amber-300 cursor-pointer"
              title="Belgeyi Büyüt"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => dosyaRef.current?.click()}
              disabled={yukleniyor}
              className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 cursor-pointer"
              title="Fotoğrafı Değiştir"
            >
              {yukleniyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onGorselDegistir('')}
              className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 cursor-pointer"
              title="Görseli Kaldır"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {onizlemeAcik &&
        guvenliUrl &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setOnizlemeAcik(false)}
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[#16071D] border border-purple-700/60 rounded-2xl p-3 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-amber-300">{etiket}</span>
                <button
                  type="button"
                  onClick={() => setOnizlemeAcik(false)}
                  className="p-1.5 rounded-lg bg-purple-950 text-gray-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={guvenliUrl}
                alt={etiket}
                className="w-full max-h-[75vh] object-contain rounded-xl bg-black/40"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
