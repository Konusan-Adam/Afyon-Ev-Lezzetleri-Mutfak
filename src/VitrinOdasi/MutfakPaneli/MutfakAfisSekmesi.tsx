import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  Save,
  Loader2,
  Power,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { useMutfakAfisi } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakAfisi';
import { sunucuyaGorselYukle, gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';

interface MutfakAfisSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
}

const HAZIR_ROZETLER = [
  'EV MUTFAĞI ÖZEL',
  'GÜNÜN TAZE MENÜSÜ',
  'ANNE ELİNDEN',
  'HAFTA SONU FIRSATI',
  'SINIRLI SAYIDA',
];

export const MutfakAfisSekmesi: React.FC<MutfakAfisSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
}) => {
  const { afis, yukleniyor, islemde, afisKaydet, afisDurumDegistir, afisKaldir } = useMutfakAfisi(mutfakId, mutfakAdi);

  const [rozet, setRozet] = useState('EV MUTFAĞI ÖZEL');
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [gorselUrl, setGorselUrl] = useState('');
  const [aktifMi, setAktifMi] = useState(true);

  const [gorselModu, setGorselModu] = useState<'dosya' | 'url'>('dosya');
  const [urlGirdisi, setUrlGirdisi] = useState('');
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [silmeOnayiAcik, setSilmeOnayiAcik] = useState(false);
  const [basariMesaji, setBasariMesaji] = useState<string | null>(null);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const dosyaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (afis) {
      setRozet(afis.rozet || 'EV MUTFAĞI ÖZEL');
      setBaslik(afis.baslik || '');
      setAciklama(afis.aciklama || '');
      setGorselUrl(afis.gorsel_url || '');
      setAktifMi(afis.aktif_mi !== false);
    }
  }, [afis]);

  const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;

    setHataMesaji(null);
    setGorselYukleniyor(true);

    try {
      const sonuc = await sunucuyaGorselYukle(dosya, 'afisler');
      if (sonuc.basarili && sonuc.url) {
        setGorselUrl(sonuc.url);
      } else {
        setHataMesaji(sonuc.hata || 'Afiş görseli yüklenemedi.');
      }
    } catch (err: any) {
      setHataMesaji(err?.message || 'Görsel yükleme sırasında hata oluştu.');
    } finally {
      setGorselYukleniyor(false);
      if (dosyaInputRef.current) dosyaInputRef.current.value = '';
    }
  };

  const urlUygula = () => {
    const temiz = urlGirdisi.trim();
    if (!temiz) {
      setHataMesaji('Lütfen geçerli bir afiş görsel bağlantısı giriniz.');
      return;
    }
    setHataMesaji(null);
    setGorselUrl(temiz);
  };

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji(null);
    setBasariMesaji(null);

    if (gorselYukleniyor) {
      setHataMesaji('Afiş görseli yükleniyor, lütfen birkaç saniye bekleyiniz.');
      return;
    }
    if (!baslik.trim()) {
      setHataMesaji('Lütfen afişiniz için dikkat çekici bir ana başlık yazınız.');
      return;
    }
    if (!aciklama.trim()) {
      setHataMesaji('Lütfen afişiniz için kısa bir slogan veya lezzet açıklaması yazınız.');
      return;
    }
    if (!gorselUrl.trim()) {
      setHataMesaji('Lütfen mutfak afişiniz için yatay bir görsel yükleyiniz veya URL ekleyiniz.');
      return;
    }

    const ok = await afisKaydet({
      rozet,
      baslik,
      aciklama,
      gorsel_url: gorselUrl,
      aktif_mi: aktifMi,
    });

    if (ok) {
      setBasariMesaji('Mutfak afişiniz kaydedildi ve Patron onayına gönderildi.');
      setTimeout(() => setBasariMesaji(null), 4000);
    } else {
      setHataMesaji('Afiş kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleSil = async () => {
    const ok = await afisKaldir();
    setSilmeOnayiAcik(false);
    if (ok) {
      setRozet('EV MUTFAĞI ÖZEL');
      setBaslik('');
      setAciklama('');
      setGorselUrl('');
      setUrlGirdisi('');
      setAktifMi(true);
      setBasariMesaji('Mutfak afişiniz kaldırıldı.');
      setTimeout(() => setBasariMesaji(null), 3000);
    } else {
      setHataMesaji('Afiş silinemedi.');
    }
  };

  if (yukleniyor) {
    return (
      <div className="py-14 flex items-center justify-center gap-2 text-xs text-purple-300">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span>Mutfak afiş bilgileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-white">
      {/* Üst Bilgi ve Onay Durumu Kartı */}
      <div className="p-4 rounded-2xl bg-[#1A081D] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-900/50 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {mutfakAdi} — Vitrin Afiş Yönetimi
              </h3>
              {!afis ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                  Henüz Afiş Yok
                </span>
              ) : afis.onay_durumu === 'onaylandi' || afis.onayli_mi ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Patron Onaylı
                </span>
              ) : afis.onay_durumu === 'reddedildi' ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Revize / Reddedildi
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Patron Onayı Bekliyor
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Mutfağınız için 1 adet özel kapak/kampanya afişi hazırlayın. Patron onayından sonra vitrinde yayınlanır.
            </p>
          </div>
        </div>

        {afis && (
          <button
            type="button"
            disabled={islemde}
            onClick={() => afisDurumDegistir(!afis.aktif_mi)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
              afis.aktif_mi
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{afis.aktif_mi ? 'Afiş Aktif' : 'Afiş Duraklatıldı'}</span>
          </button>
        )}
      </div>

      {afis?.onay_durumu === 'reddedildi' && afis.red_gerekcesi && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Red Gerekçesi: <strong>{afis.red_gerekcesi}</strong></span>
        </div>
      )}

      {basariMesaji && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{basariMesaji}</span>
        </div>
      )}

      {hataMesaji && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{hataMesaji}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Kolon: Afiş Formu (7 Kolon) */}
        <form onSubmit={handleKaydet} className="lg:col-span-7 p-5 rounded-2xl bg-[#180A1F] border border-[#3E1646] space-y-4 text-xs shadow-lg">
          <div className="space-y-2">
            <label className="block text-gray-300 font-semibold">Vitrin Rozeti / Üst Etiket</label>
            <input
              type="text"
              maxLength={32}
              value={rozet}
              onChange={(e) => setRozet(e.target.value)}
              placeholder="Örn: EV MUTFAĞI ÖZEL"
              className="w-full bg-[#120614] border border-purple-900/60 rounded-xl px-3 py-2 text-amber-300 font-bold tracking-wide focus:border-amber-400 outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {HAZIR_ROZETLER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRozet(r)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    rozet === r
                      ? 'bg-amber-500 text-purple-950 border-amber-400'
                      : 'bg-[#120614] text-gray-400 border-purple-900/50 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-gray-300 font-semibold">Afiş Ana Başlığı *</label>
              <span className="text-[10px] text-gray-500">{baslik.length}/60</span>
            </div>
            <input
              type="text"
              maxLength={60}
              value={baslik}
              onChange={(e) => { setBaslik(e.target.value); setHataMesaji(null); }}
              placeholder="Örn: Fırından Yeni Çıktı: Haşhaşlı Afyon Bükmesi!"
              className="w-full bg-[#120614] border border-purple-900/60 rounded-xl px-3 py-2.5 text-white font-bold placeholder-gray-500 focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-gray-300 font-semibold">Kısa Slogan & Kampanya Notu *</label>
              <span className="text-[10px] text-gray-500">{aciklama.length}/140</span>
            </div>
            <textarea
              rows={2}
              maxLength={140}
              value={aciklama}
              onChange={(e) => { setAciklama(e.target.value); setHataMesaji(null); }}
              placeholder="Örn: Hakiki Afyon haşhaşı ve ev yapımı tereyağı ile günlük taze açılır. Sıcak teslimat!"
              className="w-full bg-[#120614] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none resize-none"
            />
          </div>

          {/* Afiş Görseli Seçimi */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-gray-300 font-semibold">Afiş Kapak Görseli (Önerilen: Yatay 16:9) *</label>
              <div className="flex items-center gap-1 bg-[#120414] p-1 rounded-xl border border-purple-900/60">
                <button
                  type="button"
                  onClick={() => setGorselModu('dosya')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    gorselModu === 'dosya' ? 'bg-amber-500 text-purple-950' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Cihazdan Yükle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGorselModu('url')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    gorselModu === 'url' ? 'bg-amber-500 text-purple-950' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>URL Yapıştır</span>
                </button>
              </div>
            </div>

            <input
              ref={dosyaInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp"
              onChange={dosyaSecildi}
              className="hidden"
            />

            {gorselModu === 'dosya' ? (
              <button
                type="button"
                disabled={gorselYukleniyor}
                onClick={() => dosyaInputRef.current?.click()}
                className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-purple-800/80 hover:border-amber-400/80 bg-[#120614] flex items-center justify-center gap-3 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-60"
              >
                {gorselYukleniyor ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    <span className="font-bold text-amber-300">Afiş optimize edilip sunucuya yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-amber-400" />
                    <span className="font-bold">
                      {gorselUrl ? 'Afiş Görselini Değiştir' : 'Galeriden veya Bilgisayardan Afiş Görseli Seç'}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlGirdisi}
                  onChange={(e) => setUrlGirdisi(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-[#120614] border border-purple-900/60 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:border-amber-400 outline-none"
                />
                <button
                  type="button"
                  onClick={urlUygula}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold cursor-pointer shrink-0"
                >
                  Uygula
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#120614] border border-purple-900/50">
            <div>
              <span className="font-semibold text-gray-200 block">Onay Sonrası Yayına Alınsın</span>
              <span className="text-[11px] text-gray-400">İsterseniz afişinizi geçici olarak gizleyebilirsiniz.</span>
            </div>
            <input
              type="checkbox"
              checked={aktifMi}
              onChange={(e) => setAktifMi(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {silmeOnayiAcik && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/70 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-rose-200 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Mutfak afişiniz kalıcı olarak kaldırılsın mı?</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSilmeOnayiAcik(false)}
                  className="px-2.5 py-1 rounded-lg bg-purple-950 text-gray-200 font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSil}
                  disabled={islemde}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  Evet, Kaldır
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-purple-900/40">
            {afis ? (
              <button
                type="button"
                onClick={() => setSilmeOnayiAcik(true)}
                disabled={islemde}
                className="px-3 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Afişi Kaldır</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={islemde || gorselYukleniyor}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-gray-950 font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {islemde ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{afis ? 'Afişi Güncelle & Onaya Gönder' : 'Afişi Kaydet & Onaya Gönder'}</span>
            </button>
          </div>
        </form>

        {/* Sağ Kolon: Canlı Vitrin Önizlemesi (5 Kolon) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-[#180A1F] border border-[#3E1646] space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Eye className="w-4 h-4" />
                <span>Canlı Vitrin Afiş Önizlemesi</span>
              </div>
              <span className="text-[10px] text-gray-400">Müşteri Görünümü</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-[#120415] min-h-[240px] flex flex-col justify-end">
              {gorselUrl ? (
                <img
                  src={gorselUrlGuvenliYap(gorselUrl)}
                  alt="Mutfak Afiş Önizleme"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-400/50 gap-2 p-4 text-center">
                  <ImageIcon className="w-10 h-10" />
                  <span className="text-xs">Afiş görseli seçtiğinizde burada görünecektir</span>
                </div>
              )}

              <div className="relative z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-5 pt-14 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-purple-950 font-black text-[10px] tracking-wider uppercase">
                    {rozet || 'EV MUTFAĞI ÖZEL'}
                  </span>
                  <span className="text-[10px] text-amber-200 font-semibold bg-black/50 px-2 py-0.5 rounded-md border border-white/10">
                    {mutfakAdi}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                  {baslik || 'Afiş Başlığınız Burada Görünecek'}
                </h4>

                <p className="text-xs text-gray-200 leading-relaxed line-clamp-2">
                  {aciklama || 'Mutfağınızın özel lezzetini veya günlük fırsatını anlatan kısa slogan.'}
                </p>

                <div className="pt-1">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#6D237A] text-white text-[11px] font-bold border border-purple-400/30">
                    Mutfağı İncele →
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-[11px] text-gray-300 leading-relaxed">
              Her mutfağın yalnızca <strong className="text-amber-300">1 aktif afiş</strong> hakkı vardır. Afişinizi güncellediğinizde kalite kontrolü için yeniden Patron onayına sunulur.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
