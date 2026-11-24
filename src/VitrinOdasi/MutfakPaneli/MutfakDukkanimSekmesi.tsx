import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Volume2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Star,
  Music,
  Mic,
  FileCheck2,
} from 'lucide-react';
import { sesliGeriBildirimTestEt } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSesliAsistanServisi';
import { MutfakTeslimatAyarKarti } from './MutfakTeslimatAyarKarti';
import { MutfakAfisSekmesi } from './MutfakAfisSekmesi';
import { MutfakBelgelerSekmesi } from './MutfakBelgelerSekmesi';
import { MutfakYorumlarSekmesi } from './MutfakYorumlarSekmesi';
import { MutfakOnaylananSozlesmelerSekmesi } from './MutfakOnaylananSozlesmelerSekmesi';
import { MutfakZilSeciciPenceresi } from './MutfakZilSeciciPenceresi';
import { MutfakZilButonu } from '../Bilesenler/Mutfak/MutfakZilButonu';
import { SesliAsistanButonu } from '../Bilesenler/Mutfak/SesliAsistanButonu';

export type DukkanBolumu = 'ayarlar' | 'yorumlar' | 'afis' | 'belgeler' | 'sozlesmeler';

interface MutfakDukkanimSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
  mutfakKaydi: any;
  mutfakAcik: boolean;
  onMutfakDurumuDegistir: (acikMi: boolean) => void;
  onCikisYap: () => void;
  acikBolumIstegi?: { bolum: DukkanBolumu; tetik: number } | null;
}

export const MutfakDukkanimSekmesi: React.FC<MutfakDukkanimSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
  mutfakKaydi,
  mutfakAcik,
  onMutfakDurumuDegistir,
  onCikisYap,
  acikBolumIstegi,
}) => {
  const [acikBolum, setAcikBolum] = useState<DukkanBolumu | null>('ayarlar');
  const [cikisOnayiAcik, setCikisOnayiAcik] = useState(false);
  const [zilSeciciAcik, setZilSeciciAcik] = useState(false);

  useEffect(() => {
    if (acikBolumIstegi?.bolum) {
      setAcikBolum(acikBolumIstegi.bolum);
    }
  }, [acikBolumIstegi]);

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
          Yeni sipariş geldiğinde siparişi alana kadar kesintisiz çalacak melodiyi seçin, dinleyin veya cihazınızdan ses dosyası ekleyin.
        </p>
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          <MutfakZilButonu />
          <button
            type="button"
            onClick={() => setZilSeciciAcik(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Zil Sesi Seç &amp; Ekle</span>
          </button>
          <SesliAsistanButonu />
          <button
            type="button"
            onClick={() => sesliGeriBildirimTestEt()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 text-purple-100 text-xs font-bold transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-300" />
            <span>Sesli Anonsu Test Et</span>
          </button>
        </div>
      </div>
      <MutfakZilSeciciPenceresi acik={zilSeciciAcik} kapat={() => setZilSeciciAcik(false)} />

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
              <h3 className="text-sm font-bold text-white">Çalışma Saatleri &amp; Vitrin Bilgileri</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Mutfak sloganı, minimum sepet tutarı, hazırlık süresi ve adres
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
            <MutfakBelgelerSekmesi
              mutfakId={mutfakId}
              mutfakAdi={mutfakAdi}
              mutfakKaydi={mutfakKaydi}
            />
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

      {/* 5. Onaylanan Sözleşmelerim & Zaman Damgaları */}
      <div className="rounded-2xl bg-[#180A1F] border border-purple-900/60 overflow-hidden">
        <button
          type="button"
          onClick={() => bolumDegistir('sozlesmeler')}
          className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-purple-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Onaylanan Sözleşmelerim</h3>
              <p className="text-[11px] text-gray-400 truncate">
                Zaman damgalı kayıt sözleşmesi, KVKK ve .tsr kanıt dosyalarını indirin
              </p>
            </div>
          </div>
          {acikBolum === 'sozlesmeler' ? (
            <ChevronUp className="w-5 h-5 text-purple-300 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300 shrink-0" />
          )}
        </button>
        {acikBolum === 'sozlesmeler' && (
          <div className="px-4 pb-4 pt-3 border-t border-purple-900/40">
            <MutfakOnaylananSozlesmelerSekmesi
              mutfakId={mutfakId}
              mutfakAdi={mutfakAdi}
              mutfakKaydi={mutfakKaydi}
            />
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
