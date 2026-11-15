import React, { useState } from 'react';
import { ChefHat, Phone, Lock, Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';

export const MutfakGirisEkrani: React.FC = () => {
  const { girisYap, yukleniyor } = kullaniciHafizasiKullan();
  const [telefon, setTelefon] = useState('');
  const [sifre, setSifre] = useState('');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const handleGiris = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);

    if (!telefon.trim() || !sifre.trim()) {
      setHataMesaji('Lütfen telefon numaranızı ve şifrenizi giriniz.');
      return;
    }

    const basarili = await girisYap(telefon.trim(), sifre.trim());
    if (!basarili) {
      setHataMesaji('Giriş başarısız! Telefon numarası veya şifre hatalı, lütfen kontrol edin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A020D]/95 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#16071D] border border-purple-900/60 rounded-3xl p-8 text-gray-200 shadow-2xl shadow-purple-950/55">
        
        {/* Başlık & Logo */}
        <div className="text-center mb-6">
          <img 
            src="/public/assets/aistudio/image_48081a60_bc73ebae.jpg" 
            alt="Afyon Ev Lezzetleri Logosu" 
            className="w-24 h-24 rounded-full mx-auto border-2 border-amber-400/60 p-1 bg-white/10 shadow-xl mb-3 object-cover"
          />
          <h2 className="text-xl font-black text-white tracking-wide">Afyon Ev Lezzetleri</h2>
          <p className="text-xs text-amber-300 font-semibold mt-1">Ev Mutfak & Aşçı Paneli Giriş Kapısı</p>
        </div>

        {hataMesaji && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs text-center font-medium animate-fadeIn">
            {hataMesaji}
          </div>
        )}

        <form onSubmit={handleGiris} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-purple-300 mb-1.5">
              Telefon Numarası
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 w-4 h-4 text-purple-400" />
              <input
                type="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="05XX XXX XX XX"
                className="w-full pl-10 pr-4 py-3 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-300 mb-1.5">
              Şifre
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-purple-400" />
              <input
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#6D237A] to-[#852C94] hover:from-[#7d288d] hover:to-[#9632a7] text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {yukleniyor ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Mutfak Paneline Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-purple-900/30 text-center">
          <p className="text-[11px] text-gray-400">
            Kişiye özel şifrenizle doğrudan kendi mutfağınızı yönetin.
          </p>
        </div>
      </div>
    </div>
  );
};
