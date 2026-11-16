import React, { useState } from 'react';
import { Phone, Lock, Loader2, ShieldCheck, User, Store, MapPin, HelpCircle } from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { ApkGuncellemeUyarisi } from './ApkGuncellemeUyarisi';

export const MutfakGirisEkrani: React.FC = () => {
  const { girisYap, kayitOl, yukleniyor } = kullaniciHafizasiKullan();
  const [mod, setMod] = useState<'giris' | 'kayit'>('giris');

  const [telefon, setTelefon] = useState('');
  const [sifre, setSifre] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [isletmeAdi, setIsletmeAdi] = useState('');
  const [ilce, setIlce] = useState('Merkez');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [sifreYardimiAcik, setSifreYardimiAcik] = useState(false);

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

  const handleKayit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);

    if (!adSoyad.trim() || !isletmeAdi.trim() || !telefon.trim() || !sifre.trim()) {
      setHataMesaji('Lütfen ad soyad, mutfak adı, telefon ve şifre alanlarını doldurunuz.');
      return;
    }
    if (sifre.trim().length < 4) {
      setHataMesaji('Şifreniz en az 4 karakter olmalıdır.');
      return;
    }

    const basarili = await kayitOl({
      ad_soyad: adSoyad.trim(),
      isletme_adi: isletmeAdi.trim(),
      telefon: telefon.trim(),
      sifre: sifre.trim(),
      ilce: ilce.trim() || 'Merkez',
      rol: 'ev_mutfagi',
    });

    if (!basarili) {
      setHataMesaji('Kayıt oluşturulamadı! Telefon numarası geçersiz veya sistemde zaten kayıtlı olabilir.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#0A020D]/95 backdrop-blur-md select-none overflow-y-auto gap-3">
      <div className="w-full max-w-md">
        <ApkGuncellemeUyarisi />
      </div>
      <div className="relative w-full max-w-md bg-[#16071D] border border-purple-900/60 rounded-3xl p-7 text-gray-200 shadow-2xl shadow-purple-950/55 my-auto">
        {/* Başlık & Logo */}
        <div className="text-center mb-5">
          <img
            src="/assets/aistudio/image_48081a60_bc73ebae.jpg"
            alt="Afyon Ev Lezzetleri Logosu"
            className="w-24 h-24 rounded-full mx-auto border-2 border-amber-400/60 p-1 bg-white/10 shadow-xl mb-3 object-cover"
          />
          <h2 className="text-xl font-black text-white tracking-wide">Afyon Ev Lezzetleri</h2>
          <p className="text-xs text-amber-300 font-semibold mt-1">Ev Mutfak & Aşçı Paneli Giriş Kapısı</p>
        </div>

        {/* Mod Seçici: Giriş / Yeni Mutfak Başvurusu */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#100415] border border-purple-900/50 mb-5">
          <button
            type="button"
            onClick={() => { setMod('giris'); setHataMesaji(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mod === 'giris'
                ? 'bg-[#6D237A] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mutfak Girişi
          </button>
          <button
            type="button"
            onClick={() => { setMod('kayit'); setHataMesaji(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mod === 'kayit'
                ? 'bg-[#6D237A] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yeni Mutfak Başvurusu
          </button>
        </div>

        {hataMesaji && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs text-center font-medium animate-fadeIn">
            {hataMesaji}
          </div>
        )}

        {mod === 'giris' ? (
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-purple-300">
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => setSifreYardimiAcik((v) => !v)}
                  className="text-[11px] text-amber-300/90 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Şifremi Unuttum</span>
                </button>
              </div>
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

            {sifreYardimiAcik && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
                Şifrenizi unuttuysanız Afyon Ev Lezzetleri yönetim destek hattı veya Patron Masası üzerinden telefon numaranızı bildirerek şifre yenileme talebinde bulunabilirsiniz.
              </div>
            )}

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
        ) : (
          <form onSubmit={handleKayit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">Aşçı Ad Soyad</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={adSoyad}
                  onChange={(e) => setAdSoyad(e.target.value)}
                  placeholder="Örn: Ayşe Demir"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">Ev Mutfağı / İşletme Adı</label>
              <div className="relative flex items-center">
                <Store className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={isletmeAdi}
                  onChange={(e) => setIsletmeAdi(e.target.value)}
                  placeholder="Örn: Ayşe Hanım Afyon Mutfağı"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">Telefon</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 w-3.5 h-3.5 text-purple-400" />
                  <input
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-8 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">İlçe</label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 w-3.5 h-3.5 text-purple-400" />
                  <input
                    type="text"
                    value={ilce}
                    onChange={(e) => setIlce(e.target.value)}
                    placeholder="Merkez"
                    className="w-full pl-8 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">Giriş Şifresi</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="password"
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="En az 4 karakter"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 text-xs font-extrabold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {yukleniyor ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Başvuru Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Mutfak Başvurusunu Oluştur</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-purple-900/30 text-center">
          <p className="text-[11px] text-gray-400">
            Kişiye özel telefon ve şifrenizle doğrudan kendi mutfağınızı yönetin.
          </p>
        </div>
      </div>
    </div>
  );
};
