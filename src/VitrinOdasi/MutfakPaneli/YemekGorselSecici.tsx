import React, { useRef, useState } from 'react';
import { Camera, Trash2, CheckCircle, UploadCloud, Loader2, AlertCircle, Link2, Image as ImageIcon } from 'lucide-react';
import { sunucuyaGorselYukle, gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';

interface YemekGorselSeciciProps {
  secilenGorsel: string;
  onGorselSec: (gorselUrl: string) => void;
  onYukleniyor?: (durum: boolean) => void;
}

export const YemekGorselSecici: React.FC<YemekGorselSeciciProps> = ({
  secilenGorsel,
  onGorselSec,
  onYukleniyor,
}) => {
  const dosyaGirdiReferansi = useRef<HTMLInputElement>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [yuklemeModu, setYuklemeModu] = useState<'dosya' | 'url'>('dosya');
  const [urlGirdisi, setUrlGirdisi] = useState('');

  const dosyaYukle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;

    setHataMesaji(null);
    setYukleniyor(true);
    onYukleniyor?.(true);

    try {
      const sonuc = await sunucuyaGorselYukle(dosya, 'yemekler');
      if (sonuc.basarili && sonuc.url) {
        onGorselSec(sonuc.url);
      } else {
        setHataMesaji(sonuc.hata || 'Görsel yüklenirken bir sorun oluştu.');
      }
    } catch (hata: any) {
      setHataMesaji(hata?.message || 'Görsel sunucuya aktarılamadı.');
    } finally {
      setYukleniyor(false);
      onYukleniyor?.(false);
      if (dosyaGirdiReferansi.current) {
        dosyaGirdiReferansi.current.value = '';
      }
    }
  };

  const urlKaydet = (e: React.FormEvent) => {
    e.preventDefault();
    const temizUrl = urlGirdisi.trim();
    if (!temizUrl) {
      setHataMesaji('Lütfen geçerli bir görsel web adresi (URL) giriniz.');
      return;
    }
    setHataMesaji(null);
    onGorselSec(temizUrl);
  };

  return (
    <div className="space-y-3">
      {/* Başlık ve Mod Seçimi (Dosya / URL) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="block text-gray-300 font-semibold text-xs">
          Yemeğin Gerçek Fotoğrafı <span className="text-amber-400 font-bold">* (Zorunlu)</span>
        </label>
        
        <div className="flex items-center gap-1 bg-[#120414] p-1 rounded-xl border border-purple-900/60">
          <button
            type="button"
            onClick={() => { setYuklemeModu('dosya'); setHataMesaji(null); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              yuklemeModu === 'dosya'
                ? 'bg-amber-500 text-purple-950 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Galeriden Seç</span>
          </button>
          <button
            type="button"
            onClick={() => { setYuklemeModu('url'); setHataMesaji(null); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              yuklemeModu === 'url'
                ? 'bg-amber-500 text-purple-950 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link / URL Yapıştır</span>
          </button>
        </div>
      </div>

      {yukleniyor && (
        <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5 animate-pulse bg-amber-950/30 p-2 rounded-xl border border-amber-500/30">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Fotoğraf optimize ediliyor ve sisteme aktarılıyor...</span>
        </div>
      )}

      {/* Hata Bildirimi */}
      {hataMesaji && (
        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{hataMesaji}</span>
        </div>
      )}

      {/* Gizli Dosya Seçici Input */}
      <input
        type="file"
        ref={dosyaGirdiReferansi}
        onChange={dosyaYukle}
        accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
        disabled={yukleniyor}
        className="hidden"
      />

      {/* Ana Görsel Yükleme / Önizleme Kutusu */}
      {secilenGorsel ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-black/40 group">
          <img
            src={gorselUrlGuvenliYap(secilenGorsel)}
            alt="Yemek Önizleme"
            className="w-full h-44 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex items-end justify-between p-3">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-black/70 px-2.5 py-1.5 rounded-lg border border-emerald-500/40">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fotoğraf Hazır</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (yuklemeModu === 'dosya') {
                    dosyaGirdiReferansi.current?.click();
                  } else {
                    setUrlGirdisi(secilenGorsel);
                  }
                }}
                disabled={yukleniyor}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-md disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Değiştir</span>
              </button>
              <button
                type="button"
                onClick={() => { onGorselSec(''); setUrlGirdisi(''); }}
                disabled={yukleniyor}
                className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-300 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                title="Fotoğrafı Kaldır"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : yuklemeModu === 'dosya' ? (
        <div
          onClick={() => !yukleniyor && dosyaGirdiReferansi.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center group ${
            yukleniyor
              ? 'border-amber-500/60 bg-amber-950/20 cursor-wait'
              : 'border-purple-800/80 hover:border-amber-400/80 bg-[#160618] hover:bg-[#200924]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            {yukleniyor ? (
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            ) : (
              <UploadCloud className="w-6 h-6 stroke-[2.5]" />
            )}
          </div>
          <div>
            <div className="text-white font-bold text-xs flex items-center justify-center gap-1.5">
              <span>{yukleniyor ? 'Fotoğraf Yükleniyor...' : 'Kameradan Çek veya Galeriden Fotoğraf Seç'}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Yemeğinize ait gerçek fotoğraf otomatik WebP formatına çevrilerek sisteme kaydedilir
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 p-4 rounded-2xl bg-[#160618] border border-purple-800/80">
          <label className="block text-gray-300 text-xs font-medium">
            Fotoğraf Web Bağlantısı (URL):
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlGirdisi}
              onChange={(e) => setUrlGirdisi(e.target.value)}
              placeholder="https://images.unsplash.com/... veya https://..."
              className="flex-1 px-3 py-2 bg-[#25092a] border border-purple-700/60 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={urlKaydet}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0"
            >
              Fotoğrafı Onayla
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            İnternetteki veya buluttaki yemeğinize ait görsel linkini yapıştırıp onaylayabilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
};
