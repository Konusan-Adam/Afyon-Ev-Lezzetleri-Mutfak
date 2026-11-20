import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone,
  ShieldQuestion,
  Lock,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import {
  kullaniciGuvenlikSorusuGetir,
  sifreSifirlaGuvenlikSorusuIle,
} from '@/src/MalzemeCekmeceleri/GuvenlikSorusuServisi';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';

interface MutfakSifreKurtarmaPenceresiProps {
  acik: boolean;
  baslangicTelefon?: string;
  kapat: () => void;
}

export const MutfakSifreKurtarmaPenceresi: React.FC<MutfakSifreKurtarmaPenceresiProps> = ({
  acik,
  baslangicTelefon = '',
  kapat,
}) => {
  const { girisYap } = kullaniciHafizasiKullan();

  const [asama, setAsama] = useState<'telefon' | 'dogrulama'>('telefon');
  const [telefon, setTelefon] = useState(baslangicTelefon);
  const [kayitliSoru, setKayitliSoru] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [guvenlikCevabi, setGuvenlikCevabi] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [basariMesaji, setBasariMesaji] = useState<string | null>(null);

  useEffect(() => {
    if (acik) {
      setAsama('telefon');
      setTelefon(baslangicTelefon || '');
      setKayitliSoru('');
      setKullaniciAdi('');
      setGuvenlikCevabi('');
      setYeniSifre('');
      setYeniSifreTekrar('');
      setSifreGorunur(false);
      setHataMesaji(null);
      setBasariMesaji(null);
    }
  }, [acik, baslangicTelefon]);

  if (!acik || typeof document === 'undefined') return null;

  const handleSoruyuGetir = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);
    setBasariMesaji(null);

    if (!telefon.trim()) {
      setHataMesaji('Lütfen kayıtlı telefon numaranızı giriniz.');
      return;
    }

    setIslemSuruyor(true);
    const sonuc = await kullaniciGuvenlikSorusuGetir(telefon.trim());
    setIslemSuruyor(false);

    if (!sonuc.basarili || !sonuc.guvenlikSorusu) {
      setHataMesaji(
        sonuc.hataMesaji || 'Güvenlik sorusu bulunamadı. Lütfen telefon numaranızı kontrol ediniz.'
      );
      return;
    }

    setKayitliSoru(sonuc.guvenlikSorusu);
    setKullaniciAdi(sonuc.adSoyad || '');
    setAsama('dogrulama');
  };

  const handleSifreSifirlaVeGiris = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);
    setBasariMesaji(null);

    if (!guvenlikCevabi.trim()) {
      setHataMesaji('Lütfen güvenlik sorusunun cevabını giriniz.');
      return;
    }

    if (yeniSifre.trim().length < 4) {
      setHataMesaji('Yeni şifreniz en az 4 karakter olmalıdır.');
      return;
    }

    if (yeniSifre.trim() !== yeniSifreTekrar.trim()) {
      setHataMesaji('Girilen yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIslemSuruyor(true);
    const sifirlamaSonucu = await sifreSifirlaGuvenlikSorusuIle(
      telefon.trim(),
      guvenlikCevabi.trim(),
      yeniSifre.trim()
    );

    if (!sifirlamaSonucu.basarili) {
      setIslemSuruyor(false);
      setHataMesaji(sifirlamaSonucu.hataMesaji || 'Şifre sıfırlanamadı.');
      return;
    }

    setBasariMesaji(sifirlamaSonucu.mesaj || 'Şifreniz sıfırlandı. Otomatik giriş yapılıyor...');

    const girisBasarili = await girisYap(telefon.trim(), yeniSifre.trim());
    setIslemSuruyor(false);

    if (girisBasarili) {
      kapat();
    } else {
      setHataMesaji('Şifreniz güncellendi ancak otomatik giriş yapılamadı. Giriş ekranından tekrar deneyiniz.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#16071D] border border-purple-800/70 rounded-3xl p-6 text-gray-200 shadow-2xl shadow-purple-950/70">
        <button
          type="button"
          onClick={kapat}
          aria-label="Kapat"
          className="absolute top-4 right-4 p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">Şifre Kurtarma</h3>
            <p className="text-[11px] text-purple-300">
              {asama === 'telefon'
                ? 'Kayıtlı telefon numaranızı girin, güvenlik sorunuzu getirelim.'
                : 'Güvenlik sorunuzu yanıtlayın, yeni şifrenizi anında tanımlayın.'}
            </p>
          </div>
        </div>

        {hataMesaji && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium">
            {hataMesaji}
          </div>
        )}

        {basariMesaji && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{basariMesaji}</span>
          </div>
        )}

        {asama === 'telefon' ? (
          <form onSubmit={handleSoruyuGetir} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                Kayıtlı Telefon Numarası
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="w-full pl-10 pr-4 py-3 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={kapat}
                className="px-4 py-3 rounded-xl bg-[#100415] border border-purple-900/60 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={islemSuruyor}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6D237A] to-[#852C94] hover:from-[#7d288d] hover:to-[#9632a7] text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {islemSuruyor ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Sorgulanıyor...</span>
                  </>
                ) : (
                  <>
                    <ShieldQuestion className="w-4 h-4 text-amber-300" />
                    <span>Güvenlik Sorusunu Getir</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSifreSifirlaVeGiris} className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-amber-400/30">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Güvenlik Sorunuz
                </span>
                {kullaniciAdi && (
                  <span className="text-[11px] text-purple-300 font-medium truncate">
                    {kullaniciAdi}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-white leading-snug">{kayitliSoru}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">
                Güvenlik Sorusu Cevabı
              </label>
              <input
                type="text"
                value={guvenlikCevabi}
                onChange={(e) => setGuvenlikCevabi(e.target.value)}
                placeholder="Kayıt olurken yazdığınız cevabı giriniz"
                className="w-full px-3.5 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">
                Yeni Şifre
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type={sifreGorunur ? 'text' : 'password'}
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  placeholder="En az 4 karakter"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setSifreGorunur((v) => !v)}
                  aria-label="Şifreyi Göster veya Gizle"
                  className="absolute right-3 text-purple-400 hover:text-amber-300 cursor-pointer"
                >
                  {sifreGorunur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type={sifreGorunur ? 'text' : 'password'}
                  value={yeniSifreTekrar}
                  onChange={(e) => setYeniSifreTekrar(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar yazınız"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAsama('telefon');
                  setHataMesaji(null);
                  setBasariMesaji(null);
                }}
                className="px-3.5 py-3 rounded-xl bg-[#100415] border border-purple-900/60 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Geri</span>
              </button>
              <button
                type="submit"
                disabled={islemSuruyor}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 text-xs font-extrabold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {islemSuruyor ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sıfırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Şifreyi Sıfırla ve Giriş Yap</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
