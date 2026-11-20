import React from 'react';
import { Clock, ShieldAlert, Ban, FileCheck2 } from 'lucide-react';

interface MutfakDurumUyariKartiProps {
  askidaMi: boolean;
  reddedildiMi: boolean;
  onayBekliyorMu: boolean;
  askiGerekcesi?: string;
  redGerekcesi?: string;
  onBelgelerimeGit: () => void;
}

export const MutfakDurumUyariKarti: React.FC<MutfakDurumUyariKartiProps> = ({
  askidaMi,
  reddedildiMi,
  onayBekliyorMu,
  askiGerekcesi,
  redGerekcesi,
  onBelgelerimeGit,
}) => {
  if (!askidaMi && !reddedildiMi && !onayBekliyorMu) {
    return null;
  }

  if (askidaMi) {
    return (
      <div className="bg-rose-950/50 border border-rose-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-rose-100 shadow-lg">
        <div className="flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-rose-200">
              Mutfağınız Geçici Olarak Askıya Alındı
            </h4>
            <p className="text-xs text-rose-200/85 leading-relaxed">
              {askiGerekcesi ||
                'Patron Masası tarafından mutfağınızın vitrin gösterimi ve sipariş alımı geçici olarak durdurulmuştur. Evrak veya operasyonel detayları kontrol edebilirsiniz.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBelgelerimeGit}
          className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-100 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Belgelerimi Kontrol Et</span>
        </button>
      </div>
    );
  }

  if (reddedildiMi) {
    return (
      <div className="bg-red-950/50 border border-red-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-red-100 shadow-lg">
        <div className="flex items-start gap-3.5">
          <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-red-200">
              Mutfak Başvurunuz Onaylanmadı / Revizyon Gerekli
            </h4>
            <p className="text-xs text-red-200/85 leading-relaxed">
              {redGerekcesi ||
                'Başvurunuzda eksik veya güncellenmesi gereken evrak/adres bilgisi bulunmaktadır. Belgelerinizi güncelleyerek yeniden inceleme talep edebilirsiniz.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBelgelerimeGit}
          className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-red-100 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Belgelerimi Güncelle</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-amber-200 shadow-md">
      <div className="flex items-start gap-3.5">
        <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-amber-300">
            Mutfak Başvurunuz İnceleniyor (Patron Onayı Bekleniyor)
          </h4>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Yasal hijyen belgeniz ve esnaf muafiyet evraklarınız Patron Masası tarafından incelenmektedir. Onay işlemi tamamlanana kadar mutfağınız vitrinde listelenmez ve sipariş alımı kilitlidir. Bu esnada aşağıdaki sekmelerden menünüze yemek ekleyebilir ve belgelerinizi kontrol edebilirsiniz.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onBelgelerimeGit}
        className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
      >
        <FileCheck2 className="w-3.5 h-3.5" />
        <span>Belgelerime Git</span>
      </button>
    </div>
  );
};
