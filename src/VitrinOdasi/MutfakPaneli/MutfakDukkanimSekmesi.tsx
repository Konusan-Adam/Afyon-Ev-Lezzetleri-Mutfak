import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Volume2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';
import { MutfakTeslimatAyarKarti } from './MutfakTeslimatAyarKarti';
import { MutfakAfisSekmesi } from './MutfakAfisSekmesi';
import { MutfakBelgelerSekmesi } from './MutfakBelgelerSekmesi';
import { MutfakYorumlarSekmesi } from './MutfakYorumlarSekmesi';
import { MutfakZilButonu } from '../Bilesenler/Mutfak/MutfakZilButonu';
import { SesliAsistanButonu } from '../Bilesenler/Mutfak/SesliAsistanButonu';

interface MutfakDukkanimSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
  mutfakKaydi: any;
  mutfakAcik: boolean;
  onMutfakDurumuDegistir: (acikMi: boolean) => void;
  onCikisYap: () => void;
}

type DukkanBolumu = 'ayarlar' | 'yorumlar' | 'afis' | 'belgeler';

export const MutfakDukkanimSekmesi: React.FC<MutfakDukkanimSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
  mutfakKaydi,
  mutfakAcik,
  onMutfakDurumuDegistir,
  onCikisYap,
}) => {
  const [acikBolum, setAcikBolum] = useState<DukkanBolumu | null>('ayarlar');
  const [cikisOnayiAcik, setCikisOnayiAcik] = useState(false);

  const bolumDegistir = (bolum: DukkanBolumu) => {
    setAcikBolum((mevcut) => (mevcut === bolum ? null : bolum));
  };

  return (
    <div className="space-y-4">
      {/* Sesli Asistan & Sipariş Zili Hızlı Kontrol Kartı */}
      <div className="bg-[#180A1F] border border-purple-900/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>Ses & Zil Uyarıları</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Yeni sipariş geldiğinde zil çalmasını ve kalan dakikaların sesli okunmasını buradan kontrol edebilirsiniz.
        </p>
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          <MutfakZilButonu />
          <SesliAsistanButonu />
        </div>
      </div>

      {/* 1. Çalışma Saatleri & Min. Sepet Ayarları */}
      <div className="rounded-2xl bg-[#180A1F] border border-purple-900/60 overflow-hidden">
        <button
          type="button"
          onClick={() => bolumDegistir('ayarlar')}
          className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-purple-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Çalışma Saatleri & Min. Sepet</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Minimum sipariş tutarı, hazırlık süresi ve mahalle bilgisi
              </p>
            </div>
          </div>
          {acikBolum === 'ayarlar' ? (
            <ChevronUp className="w-5 h-5 text-purple-300 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300 shrink-0" />
          )}
        </button>
        {acikBolum === 'ayarlar' && (
          <div className="px-4 pb-4 pt-1 border-t border-purple-900/40">
            <div className="pt-3 [&>form]:mb-0">
              <MutfakTeslimatAyarKarti
                mutfakId={mutfakId}
                mutfakKaydi={mutfakKaydi}
                mutfakAcik={mutfakAcik}
                onMutfakDurumuDegistir={onMutfakDurumuDegistir}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Mutfak Afişim */}
      <div className="rounded-2xl bg-[#180A1F] border border-purple-900/60 overflow-hidden">
        <button
          type="button"
          onClick={() => bolumDegistir('afis')}
          className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-purple-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Mutfak Afişim (Kapak Görseli)</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Müşterilerin vitrinde göreceği kapak fotoğrafını düzenleyin
              </p>
            </div>
          </div>
          {acikBolum === 'afis' ? (
            <ChevronUp className="w-5 h-5 text-purple-300 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300 shrink-0" />
          )}
        </button>
        {acikBolum === 'afis' && (
          <div className="px-4 pb-4 pt-3 border-t border-purple-900/40">
            <MutfakAfisSekmesi mutfakId={mutfakId} mutfakAdi={mutfakAdi} />
          </div>
        )}
      </div>

      {/* 3. Resmi İzinler & Hijyen Belgelerim */}
      <div className="rounded-2xl bg-[#180A1F] border border-purple-900/60 overflow-hidden">
        <button
          type="button"
          onClick={() => bolumDegistir('belgeler')}
          className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-purple-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Hijyen & Esnaf Muafiyet Belgelerim</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Resmi izinler, belge yükleme ve onay durumu
              </p>
            </div>
          </div>
          {acikBolum === 'belgeler' ? (
            <ChevronUp className="w-5 h-5 text-purple-300 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300 shrink-0" />
          )}
        </button>
        {acikBolum === 'belgeler' && (
          <div className="px-4 pb-4 pt-3 border-t border-purple-900/40">
            <MutfakBelgelerSekmesi mutfakId={mutfakId} mutfakAdi={mutfakAdi} />
          </div>
        )}
      </div>

      {/* 4. Müşteri Yorumları & Puanlarım */}
      <div className="rounded-2xl bg-[#180A1F] border border-purple-900/60 overflow-hidden">
        <button
          type="button"
          onClick={() => bolumDegistir('yorumlar')}
          className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-purple-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Müşteri Yorumları & Puanlarım</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Müşteri değerlendirmelerini okuyun ve teşekkür cevabı yazın
              </p>
            </div>
          </div>
          {acikBolum === 'yorumlar' ? (
            <ChevronUp className="w-5 h-5 text-purple-300 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300 shrink-0" />
          )}
        </button>
        {acikBolum === 'yorumlar' && (
          <div className="px-4 pb-4 pt-3 border-t border-purple-900/40">
            <MutfakYorumlarSekmesi mutfakId={mutfakId} mutfakAdi={mutfakAdi} />
          </div>
        )}
      </div>

      {/* Güvenli Çıkış (Yanlışlıkla basılmasın diye en altta ve onaylı) */}
      <div className="pt-2">
        {!cikisOnayiAcik ? (
          <button
            type="button"
            onClick={() => setCikisOnayiAcik(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Hesaptan Güvenli Çıkış Yap</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-3">
            <p className="text-xs font-bold text-rose-200 text-center">
              Mutfak hesabından çıkış yapmak istediğinize emin misiniz?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCikisOnayiAcik(false)}
                className="py-2.5 rounded-xl bg-[#180A1F] border border-purple-800/60 text-gray-200 text-xs font-bold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onCikisYap}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                Evet, Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
