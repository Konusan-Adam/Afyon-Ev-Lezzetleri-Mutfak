import React from 'react';

export type CalismaModeliSecimi = 'sube_tedarikcisi' | 'sadece_site_uygulama' | 'her_ikisi' | '';
export type BelgeDurumSecimi = 'evet' | 'hayir_alacagim' | '';

interface MutfakCalismaVeBelgeSecimiProps {
  calismaModeli: CalismaModeliSecimi;
  calismaModeliDegistir: (deger: CalismaModeliSecimi) => void;
  hijyenBelgesi: BelgeDurumSecimi;
  hijyenBelgesiDegistir: (deger: BelgeDurumSecimi) => void;
  esnafMuafiyet: BelgeDurumSecimi;
  esnafMuafiyetDegistir: (deger: BelgeDurumSecimi) => void;
}

export const MutfakCalismaVeBelgeSecimi: React.FC<MutfakCalismaVeBelgeSecimiProps> = ({
  calismaModeli,
  calismaModeliDegistir,
  hijyenBelgesi,
  hijyenBelgesiDegistir,
  esnafMuafiyet,
  esnafMuafiyetDegistir,
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-[#1A0724] border border-purple-800/60 space-y-4">
      {/* 1. Çalışma Modeli */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-white">
          Hangi Çalışma Modelini Seçiyorsunuz? <span className="text-amber-400">*</span>
        </p>
        <div className="space-y-2">
          <label className="flex items-start gap-2.5 text-xs text-gray-200 cursor-pointer group">
            <input
              type="radio"
              name="calismaModeli"
              value="sube_tedarikcisi"
              checked={calismaModeli === 'sube_tedarikcisi'}
              onChange={() => calismaModeliDegistir('sube_tedarikcisi')}
              className="mt-0.5 w-4 h-4 accent-amber-400 cursor-pointer shrink-0"
              required
            />
            <span className="leading-snug group-hover:text-white">
              <strong className="text-white">Şube Tedarikçisi:</strong> Her gün düzenli üretim yapabilirim.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs text-gray-200 cursor-pointer group">
            <input
              type="radio"
              name="calismaModeli"
              value="sadece_site_uygulama"
              checked={calismaModeli === 'sadece_site_uygulama'}
              onChange={() => calismaModeliDegistir('sadece_site_uygulama')}
              className="mt-0.5 w-4 h-4 accent-amber-400 cursor-pointer shrink-0"
              required
            />
            <span className="leading-snug group-hover:text-white">
              <strong className="text-white">Sadece Site/Uygulama:</strong> Müsait olduğum gün ve saatlerde üretim yapabilirim.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs text-gray-200 cursor-pointer group">
            <input
              type="radio"
              name="calismaModeli"
              value="her_ikisi"
              checked={calismaModeli === 'her_ikisi'}
              onChange={() => calismaModeliDegistir('her_ikisi')}
              className="mt-0.5 w-4 h-4 accent-amber-400 cursor-pointer shrink-0"
              required
            />
            <span className="leading-snug group-hover:text-white">
              <strong className="text-white">Her İkisi de:</strong> Hem şubeye düzenli üretim hem de site/uygulama üzerinden satış yapabilirim.
            </span>
          </label>
        </div>
      </div>

      {/* 2. Hijyen Belgesi */}
      <div className="space-y-2 pt-2 border-t border-purple-900/50">
        <p className="text-xs font-bold text-white">
          Hijyen Belgeniz Var mı? (Yoksa açılışa kadar alınması şarttır){' '}
          <span className="text-amber-400">*</span>
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer hover:text-white">
            <input
              type="radio"
              name="hijyenBelgesi"
              value="evet"
              checked={hijyenBelgesi === 'evet'}
              onChange={() => hijyenBelgesiDegistir('evet')}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
              required
            />
            <span>Evet, var</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer hover:text-white">
            <input
              type="radio"
              name="hijyenBelgesi"
              value="hayir_alacagim"
              checked={hijyenBelgesi === 'hayir_alacagim'}
              onChange={() => hijyenBelgesiDegistir('hayir_alacagim')}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
              required
            />
            <span>Hayır, yok (Alacağım)</span>
          </label>
        </div>
      </div>

      {/* 3. Esnaf Muafiyet Belgesi */}
      <div className="space-y-2 pt-2 border-t border-purple-900/50">
        <p className="text-xs font-bold text-white">
          Esnaf Muafiyet Belgeniz Var mı? (Vergi dairesinden ücretsiz alınır){' '}
          <span className="text-amber-400">*</span>
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer hover:text-white">
            <input
              type="radio"
              name="esnafMuafiyet"
              value="evet"
              checked={esnafMuafiyet === 'evet'}
              onChange={() => esnafMuafiyetDegistir('evet')}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
              required
            />
            <span>Evet, var</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer hover:text-white">
            <input
              type="radio"
              name="esnafMuafiyet"
              value="hayir_alacagim"
              checked={esnafMuafiyet === 'hayir_alacagim'}
              onChange={() => esnafMuafiyetDegistir('hayir_alacagim')}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
              required
            />
            <span>Hayır, yok (Alacağım)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
