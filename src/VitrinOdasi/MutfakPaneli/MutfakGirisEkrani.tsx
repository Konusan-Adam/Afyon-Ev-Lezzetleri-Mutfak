import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Lock,
  Loader2,
  ShieldCheck,
  User,
  Store,
  HelpCircle,
  ShieldQuestion,
  Info,
  MapPin,
  FileCheck2,
} from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import {
  GUVENLIK_SORULARI,
  GUVENLIK_SORUSU_ONEM_ACIKLAMASI,
} from '@/src/MalzemeCekmeceleri/GuvenlikSorusuServisi';
import {
  hukukiSozlesmeleriCanliDinle,
  hukukiSozlesmeleriCanliSenkronizeEt,
  hukukiSozlesmeleriGetir,
  mutfakKayitSozlesmeleriniFiltrele,
} from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukDeposu';
import { HukukiSozlesme } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/tipler';
import { ApkGuncellemeUyarisi } from './ApkGuncellemeUyarisi';
import { MutfakSifreKurtarmaPenceresi } from './MutfakSifreKurtarmaPenceresi';
import {
  BelgeDurumSecimi,
  CalismaModeliSecimi,
  MutfakCalismaVeBelgeSecimi,
} from './MutfakCalismaVeBelgeSecimi';
import { MutfakSozlesmeOkumaModali } from './MutfakSozlesmeOkumaModali';

export const MutfakGirisEkrani: React.FC = () => {
  const { girisYapDetayli, kayitOl, yukleniyor } = kullaniciHafizasiKullan();
  const [mod, setMod] = useState<'giris' | 'kayit'>('giris');

  const [telefon, setTelefon] = useState('');
  const [sifre, setSifre] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [isletmeAdi, setIsletmeAdi] = useState('');
  const [ilce, setIlce] = useState('Merkez');
  const [adres, setAdres] = useState('');
  const [calismaModeli, setCalismaModeli] = useState<CalismaModeliSecimi>('');
  const [hijyenBelgesi, setHijyenBelgesi] = useState<BelgeDurumSecimi>('');
  const [esnafMuafiyet, setEsnafMuafiyet] = useState<BelgeDurumSecimi>('');
  const [guvenlikSorusu, setGuvenlikSorusu] = useState<string>(GUVENLIK_SORULARI[0]);
  const [guvenlikCevabi, setGuvenlikCevabi] = useState('');

  const [sozlesmeler, setSozlesmeler] = useState<Record<string, HukukiSozlesme>>(() =>
    hukukiSozlesmeleriGetir()
  );
  const [okunanTurler, setOkunanTurler] = useState<Record<string, boolean>>({});
  const [onayliTurler, setOnayliTurler] = useState<Record<string, boolean>>({});
  const [acikSozlesmeTuru, setAcikSozlesmeTuru] = useState<string | null>(null);

  const kayitSozlesmeleri = useMemo(
    () => mutfakKayitSozlesmeleriniFiltrele(sozlesmeler),
    [sozlesmeler]
  );

  const zorunluSozlesmeler = useMemo(
    () => kayitSozlesmeleri.filter((s) => s.zorunluMu !== false),
    [kayitSozlesmeleri]
  );

  const onaylananSayisi = useMemo(
    () => kayitSozlesmeleri.filter((s) => okunanTurler[s.tur] && onayliTurler[s.tur]).length,
    [kayitSozlesmeleri, okunanTurler, onayliTurler]
  );

  const sozlesmelerTamam = useMemo(
    () =>
      zorunluSozlesmeler.length === 0 ||
      zorunluSozlesmeler.every((s) => Boolean(okunanTurler[s.tur] && onayliTurler[s.tur])),
    [zorunluSozlesmeler, okunanTurler, onayliTurler]
  );

  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [sifreKurtarmaAcik, setSifreKurtarmaAcik] = useState(false);

  useEffect(() => {
    hukukiSozlesmeleriCanliSenkronizeEt()
      .then((guncel) => setSozlesmeler(guncel))
      .catch(() => {});

    const abonelikDurdur = hukukiSozlesmeleriCanliDinle((guncel) => {
      setSozlesmeler(guncel);
    });
    return () => abonelikDurdur();
  }, []);

  const handleGiris = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);

    if (!telefon.trim() || !sifre.trim()) {
      setHataMesaji('Lütfen telefon numaranızı ve şifrenizi giriniz.');
      return;
    }

    const sonuc = await girisYapDetayli(telefon.trim(), sifre.trim());
    if (!sonuc.basarili) {
      setHataMesaji(
        sonuc.hataMesaji || 'Giriş başarısız! Telefon numarası veya şifre hatalı, lütfen kontrol edin.'
      );
    }
  };

  const handleKayit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);

    if (!adSoyad.trim() || !isletmeAdi.trim() || !telefon.trim() || !sifre.trim()) {
      setHataMesaji('Lütfen ad soyad, işletme adı, telefon ve şifre alanlarını doldurunuz.');
      return;
    }
    if (sifre.trim().length < 4) {
      setHataMesaji('Şifreniz en az 4 karakter olmalıdır.');
      return;
    }
    if (!adres.trim()) {
      setHataMesaji('Lütfen mutfağınızın açık adresini giriniz.');
      return;
    }
    if (!calismaModeli || !hijyenBelgesi || !esnafMuafiyet) {
      setHataMesaji(
        'Lütfen çalışma modelinizi, hijyen belgesi ve esnaf muafiyet belgesi durumunuzu seçiniz.'
      );
      return;
    }
    if (!guvenlikSorusu.trim() || !guvenlikCevabi.trim()) {
      setHataMesaji('Lütfen şifre kurtarma için güvenlik sorusu ve cevabını giriniz.');
      return;
    }
    if (!sozlesmelerTamam) {
      setHataMesaji(
        'Başvuruyu tamamlamak için önce her iki yasal sözleşmeyi de tıklayıp sonuna kadar okuyarak onaylamanız gerekmektedir.'
      );
      return;
    }

    const onaylananSozlesmeListesi = kayitSozlesmeleri.filter(
      (s) => Boolean(okunanTurler[s.tur] && onayliTurler[s.tur])
    );

    const basarili = await kayitOl({
      ad_soyad: adSoyad.trim(),
      isletme_adi: isletmeAdi.trim(),
      telefon: telefon.trim(),
      sifre: sifre.trim(),
      ilce: ilce.trim() || 'Merkez',
      adres: adres.trim(),
      calisma_modeli: calismaModeli,
      hijyen_belgesi_durumu: hijyenBelgesi,
      esnaf_muafiyet_durumu: esnafMuafiyet,
      guvenlik_sorusu: guvenlikSorusu.trim(),
      guvenlik_cevabi: guvenlikCevabi.trim(),
      sozlesme_onayli: Boolean(onayliTurler.mutfak_kayit_sozlesmesi ?? true),
      kvkk_onayli: Boolean(onayliTurler.kvkk_aydinlatma ?? true),
      onaylanan_sozlesmeler: onaylananSozlesmeListesi,
      rol: 'ev_mutfagi',
    });

    if (!basarili) {
      setHataMesaji(
        'Kayıt oluşturulamadı! Telefon numarası geçersiz veya sistemde zaten kayıtlı olabilir.'
      );
    }
  };

  const okunanSozlesme = acikSozlesmeTuru ? sozlesmeler[acikSozlesmeTuru] || null : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-4 py-6 bg-[#0A020D]/95 backdrop-blur-md select-none overflow-y-auto gap-3">
      <div className="w-full max-w-lg shrink-0">
        <ApkGuncellemeUyarisi />
      </div>
      <div className="relative w-full max-w-lg bg-[#16071D] border border-purple-900/60 rounded-3xl p-6 sm:p-7 text-gray-200 shadow-2xl shadow-purple-950/55 my-auto shrink-0">
        {/* Başlık & Logo */}
        <div className="text-center mb-5">
          <img
            src="/assets/aistudio/image_48081a60_bc73ebae.jpg"
            alt="Afyon Ev Lezzetleri Logosu"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto border-2 border-amber-400/60 p-1 bg-white/10 shadow-xl mb-3 object-cover"
          />
          <h2 className="text-xl font-black text-white tracking-wide">Afyon Ev Lezzetleri</h2>
          <p className="text-xs text-amber-300 font-semibold mt-1">
            Ev Mutfak & Aşçı Paneli Giriş Kapısı
          </p>
        </div>

        {/* Mod Seçici: Giriş / Yeni Mutfak Başvurusu */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#100415] border border-purple-900/50 mb-5">
          <button
            type="button"
            onClick={() => {
              setMod('giris');
              setHataMesaji(null);
            }}
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
            onClick={() => {
              setMod('kayit');
              setHataMesaji(null);
            }}
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
                <label className="block text-xs font-semibold text-purple-300">Şifre</label>
                <button
                  type="button"
                  onClick={() => setSifreKurtarmaAcik(true)}
                  className="text-[11px] font-semibold text-amber-300/95 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Şifremi Unuttum?</span>
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
          <form onSubmit={handleKayit} className="space-y-3.5">
            {/* Temel Kimlik ve İletişim Bilgileri (E-postasız) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Ad Soyad <span className="text-amber-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    value={adSoyad}
                    onChange={(e) => setAdSoyad(e.target.value)}
                    placeholder="Örn: Ayşe Demir"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  İşletme Adı <span className="text-amber-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <Store className="absolute left-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    value={isletmeAdi}
                    onChange={(e) => setIsletmeAdi(e.target.value)}
                    placeholder="Örn: Ayşe Hanım Mutfağı"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Telefon <span className="text-amber-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Şifre <span className="text-amber-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="password"
                    value={sifre}
                    onChange={(e) => setSifre(e.target.value)}
                    placeholder="En az 4 karakter"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#120518] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Adres Alanı */}
            <div className="p-3 rounded-2xl bg-[#110417] border border-purple-900/50 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1">İlçe</label>
                  <input
                    type="text"
                    value={ilce}
                    onChange={(e) => setIlce(e.target.value)}
                    placeholder="Merkez"
                    className="w-full px-3 py-2.5 text-xs bg-[#16071D] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-purple-300 mb-1">
                    Mutfak Açık Adresi <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative flex items-start">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      value={adres}
                      onChange={(e) => setAdres(e.target.value)}
                      placeholder="Mahalle, cadde/sokak, bina ve daire no"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#16071D] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Çalışma Modeli, Hijyen Belgesi & Esnaf Muafiyet Seçimleri */}
            <MutfakCalismaVeBelgeSecimi
              calismaModeli={calismaModeli}
              calismaModeliDegistir={setCalismaModeli}
              hijyenBelgesi={hijyenBelgesi}
              hijyenBelgesiDegistir={setHijyenBelgesi}
              esnafMuafiyet={esnafMuafiyet}
              esnafMuafiyetDegistir={setEsnafMuafiyet}
            />

            {/* Güvenlik Sorusu & Cevabı */}
            <div className="p-3 rounded-2xl bg-[#110417] border border-purple-800/60 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Güvenlik Sorusu <span className="text-amber-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <ShieldQuestion className="absolute left-3.5 w-4 h-4 text-amber-400 pointer-events-none" />
                  <select
                    value={guvenlikSorusu}
                    onChange={(e) => setGuvenlikSorusu(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#16071D] border border-purple-900/60 rounded-xl text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    required
                  >
                    {GUVENLIK_SORULARI.map((soru) => (
                      <option key={soru} value={soru} className="bg-[#16071D] text-white">
                        {soru}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Güvenlik Sorusu Cevabı <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={guvenlikCevabi}
                  onChange={(e) => setGuvenlikCevabi(e.target.value)}
                  placeholder="Cevabınızı buraya yazınız"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#16071D] border border-purple-900/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{GUVENLIK_SORUSU_ONEM_ACIKLAMASI}</span>
              </div>
            </div>

            {/* Yasal Sözleşme Onayları (Süper Admin / Veritabanı ile Canlı Eşit) */}
            <div className="p-3.5 rounded-2xl bg-[#110417] border border-purple-800/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Yasal Sözleşme ve Onaylar</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-200 border border-purple-800/70">
                  {onaylananSayisi} / {kayitSozlesmeleri.length} Onaylandı
                </span>
              </div>

              {kayitSozlesmeleri.map((soz, idx) => {
                const okundu = Boolean(okunanTurler[soz.tur]);
                const onayli = Boolean(onayliTurler[soz.tur]);
                const zorunlu = soz.zorunluMu !== false;

                return (
                  <div
                    key={soz.tur}
                    className={`flex items-start gap-2.5 text-[11px] text-gray-200 leading-relaxed ${
                      idx > 0 ? 'pt-2 border-t border-purple-900/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={onayli}
                      onChange={(e) => {
                        if (!okundu) {
                          setAcikSozlesmeTuru(soz.tur);
                          return;
                        }
                        setOnayliTurler((onceki) => ({
                          ...onceki,
                          [soz.tur]: e.target.checked,
                        }));
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
                    />
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setAcikSozlesmeTuru(soz.tur)}
                        className="text-amber-300 underline hover:text-amber-200 font-semibold cursor-pointer text-left"
                      >
                        {soz.baslik}
                      </button>
                      <span> metnini okudum, şartları kabul ediyorum. </span>
                      {zorunlu ? (
                        <span className="text-amber-400">*</span>
                      ) : (
                        <span className="text-gray-400">(İsteğe bağlı)</span>
                      )}
                      <span className="block mt-0.5 text-[10px]">
                        {okundu && onayli ? (
                          <span className="text-emerald-400 font-semibold">✓ Okundu ve onaylandı</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAcikSozlesmeTuru(soz.tur)}
                            className="text-amber-300/90 hover:text-amber-200 font-semibold cursor-pointer"
                          >
                            Okumak için tıklayın →
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!sozlesmelerTamam && (
              <p className="text-[11px] text-center text-amber-300/90 font-medium">
                Başvuru butonunun aktif olması için zorunlu sözleşmeleri ({zorunluSozlesmeler.length} adet) okuyup onaylayınız.
              </p>
            )}

            <button
              type="submit"
              disabled={yukleniyor || !sozlesmelerTamam}
              className={`w-full mt-2 py-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                yukleniyor || !sozlesmelerTamam
                  ? 'bg-gray-800/80 text-gray-500 border border-gray-700/70 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-purple-950 shadow-lg shadow-amber-500/20 cursor-pointer'
              }`}
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
            E-posta veya SMS gerekmeden telefon, şifre ve güvenlik sorunuzla mutfağınızı güvenle yönetin.
          </p>
        </div>
      </div>

      <MutfakSifreKurtarmaPenceresi
        acik={sifreKurtarmaAcik}
        baslangicTelefon={telefon}
        kapat={() => setSifreKurtarmaAcik(false)}
      />

      <MutfakSozlesmeOkumaModali
        sozlesme={okunanSozlesme}
        kapat={() => setAcikSozlesmeTuru(null)}
        onaylaVeKapat={() => {
          if (acikSozlesmeTuru) {
            setOkunanTurler((onceki) => ({ ...onceki, [acikSozlesmeTuru]: true }));
            setOnayliTurler((onceki) => ({ ...onceki, [acikSozlesmeTuru]: true }));
          }
          setAcikSozlesmeTuru(null);
        }}
      />
    </div>
  );
};
