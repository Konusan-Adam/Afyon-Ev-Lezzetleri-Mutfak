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
  Image as ImageIcon,
  MoveVertical,
  Check,
  X,
  Sliders,
  RotateCcw,
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
  const { afis, yukleniyor, islemde, afisKaydet, konumKaydet, afisDurumDegistir, afisKaldir } = useMutfakAfisi(mutfakId, mutfakAdi);

  const [rozet, setRozet] = useState('EV MUTFAĞI ÖZEL');
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [gorselUrl, setGorselUrl] = useState('');
  const [aktifMi, setAktifMi] = useState(true);

  // Facebook tarzı dikey odak konumu (0: En Üst, 50: Orta, 100: En Alt)
  const [konumY, setKonumY] = useState(50);
  const [orijinalKonumY, setOrijinalKonumY] = useState(50);
  const [konumlandirmaModu, setKonumlandirmaModu] = useState(false);
  const [surukleniyor, setSurukleniyor] = useState(false);
  const [onizlemeMetinleriniGizle, setOnizlemeMetinleriniGizle] = useState(false);

  const [gorselModu, setGorselModu] = useState<'dosya' | 'url'>('dosya');
  const [urlGirdisi, setUrlGirdisi] = useState('');
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [silmeOnayiAcik, setSilmeOnayiAcik] = useState(false);
  const [basariMesaji, setBasariMesaji] = useState<string | null>(null);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const dosyaInputRef = useRef<HTMLInputElement>(null);
  const onizlemeKonteynerRef = useRef<HTMLDivElement>(null);
  const suruklemeBaslangicRef = useRef<{ y: number; baslangicKonumY: number; containerYukseklik: number } | null>(null);

  useEffect(() => {
    if (afis) {
      setRozet(afis.rozet || 'EV MUTFAĞI ÖZEL');
      setBaslik(afis.baslik || '');
      setAciklama(afis.aciklama || '');
      setGorselUrl(afis.gorsel_url || '');
      const y = Number.isFinite(afis.konum_y) ? Math.min(100, Math.max(0, Math.round(afis.konum_y!))) : 50;
      setKonumY(y);
      setOrijinalKonumY(y);
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!konumlandirmaModu) return;
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    const rect = onizlemeKonteynerRef.current?.getBoundingClientRect();
    suruklemeBaslangicRef.current = {
      y: e.clientY,
      baslangicKonumY: konumY,
      containerYukseklik: rect?.height || 260,
    };
    setSurukleniyor(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!surukleniyor || !suruklemeBaslangicRef.current) return;
    const { y, baslangicKonumY, containerYukseklik } = suruklemeBaslangicRef.current;
    const deltaY = e.clientY - y;
    // Facebook mantığı: Görsel aşağı çekilirse üst taraf görünür (konum_y azalır),
    // yukarı itilirse alt taraf görünür (konum_y artar).
    const deltaYuzde = (deltaY / Math.max(containerYukseklik, 120)) * 100;
    const yeniY = Math.min(100, Math.max(0, Math.round(baslangicKonumY - deltaYuzde)));
    setKonumY(yeniY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (surukleniyor) {
      setSurukleniyor(false);
      suruklemeBaslangicRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const konumlandirmayiKaydet = async () => {
    if (afis) {
      const ok = await konumKaydet(konumY);
      if (ok) {
        setOrijinalKonumY(konumY);
        setKonumlandirmaModu(false);
        setBasariMesaji(`Afiş dikey odak konumu (%${konumY}) başarıyla güncellendi.`);
        setTimeout(() => setBasariMesaji(null), 3500);
      } else {
        setHataMesaji('Afiş konumu kaydedilemedi.');
      }
    } else {
      setOrijinalKonumY(konumY);
      setKonumlandirmaModu(false);
      setBasariMesaji(`Dikey odak konumu ayarlandı (%${konumY}). Afişi kaydetmek için formu onaylayınız.`);
      setTimeout(() => setBasariMesaji(null), 3500);
    }
  };

  const konumlandirmadanVazgec = () => {
    setKonumY(orijinalKonumY);
    setKonumlandirmaModu(false);
    setSurukleniyor(false);
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
      konum_y: konumY,
      aktif_mi: aktifMi,
    });

    if (ok) {
      setOrijinalKonumY(konumY);
      setKonumlandirmaModu(false);
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
      setKonumY(50);
      setOrijinalKonumY(50);
      setKonumlandirmaModu(false);
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Eye className="w-4 h-4" />
                <span>Canlı Vitrin Afiş Önizlemesi</span>
              </div>
              {gorselUrl && !konumlandirmaModu && (
                <button
                  type="button"
                  onClick={() => {
                    setOrijinalKonumY(konumY);
                    setKonumlandirmaModu(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-purple-900/90 hover:bg-purple-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                  title="Afişin yukarı-aşağı dikey odak noktasını ayarla"
                >
                  <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kapağı Yeniden Konumlandır</span>
                  <span className="text-[10px] text-purple-200 bg-purple-950/80 px-1 py-0.2 rounded font-mono font-bold">
                    %{konumY}
                  </span>
                </button>
              )}
            </div>

            {/* Önizleme Konteyneri - Facebook Tarzı Yukarı/Aşağı Sürükleme */}
            <div
              ref={onizlemeKonteynerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative rounded-2xl overflow-hidden border transition-all ${
                konumlandirmaModu
                  ? 'border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/20 cursor-ns-resize select-none touch-none'
                  : 'border-amber-500/40'
              } bg-[#120415] min-h-[260px] flex flex-col justify-end select-none`}
            >
              {gorselUrl ? (
                <img
                  src={gorselUrlGuvenliYap(gorselUrl)}
                  alt="Mutfak Afiş Önizleme"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-[object-position] duration-75"
                  style={{ objectPosition: `center ${konumY}%` }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-400/50 gap-2 p-4 text-center">
                  <ImageIcon className="w-10 h-10" />
                  <span className="text-xs">Afiş görseli seçtiğinizde burada görünecektir</span>
                </div>
              )}

              {/* Konumlandırma Modu Üst Çubuğu (Facebook Tarzı) */}
              {konumlandirmaModu && (
                <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2 p-2 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/60 shadow-lg">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-extrabold animate-pulse">
                    <MoveVertical className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Kapağı yukarı-aşağı sürükleyin</span>
                    <span className="sm:hidden">Sürükleyin</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={konumlandirmadanVazgec}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <X className="w-3 h-3" />
                      <span>Vazgeç</span>
                    </button>
                    <button
                      type="button"
                      onClick={konumlandirmayiKaydet}
                      disabled={islemde}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-gray-950 text-[11px] font-black flex items-center gap-1 shadow-md cursor-pointer transition-all disabled:opacity-50"
                    >
                      {islemde ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Konumu Kaydet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sürükleme İpucu Rozeti (Sürükleme modundayken) */}
              {konumlandirmaModu && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/60 text-white text-xs font-black flex items-center gap-2 shadow-2xl">
                    <MoveVertical className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>Dikey Odak: %{konumY}</span>
                  </div>
                </div>
              )}

              {/* Metin Katmanı (Vitrin Görünümü) */}
              <div
                className={`relative z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-5 pt-14 space-y-2 transition-opacity duration-200 ${
                  konumlandirmaModu && onizlemeMetinleriniGizle ? 'opacity-10' : 'opacity-100'
                }`}
              >
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

                <div className="pt-1 flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#6D237A] text-white text-[11px] font-bold border border-purple-400/30">
                    Mutfağı İncele →
                  </span>

                  {konumlandirmaModu && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOnizlemeMetinleriniGizle(!onizlemeMetinleriniGizle);
                      }}
                      className="px-2 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-purple-200 hover:text-white border border-purple-800 text-[10px] font-semibold cursor-pointer"
                    >
                      {onizlemeMetinleriniGizle ? 'Yazıları Göster' : 'Yazıları Gizle'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Konumlandırma Modu Aktifken: Hassas Slider & Hazır Konumlar Paneli */}
            {konumlandirmaModu ? (
              <div className="p-3.5 rounded-2xl bg-[#140517] border border-amber-500/50 space-y-3 shadow-inner animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sliders className="w-4 h-4" />
                    <span>Hassas Dikey Odak Ayarı (%{konumY})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKonumY(50)}
                    className="text-[10px] text-gray-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Ortala (%50)</span>
                  </button>
                </div>

                {/* Dikey Odak Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                    <span>0% (En Üst Odak)</span>
                    <span className="text-amber-400 font-bold font-mono">%{konumY}</span>
                    <span>100% (En Alt Odak)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={konumY}
                    onChange={(e) => setKonumY(Number(e.target.value))}
                    className="w-full h-2.5 bg-[#25082C] rounded-lg appearance-none cursor-pointer accent-amber-500 border border-purple-800/60"
                  />
                </div>

                {/* Hızlı Hazır Konumlar */}
                <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-semibold shrink-0">Hızlı Konum:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { etiket: 'Üst (%15)', val: 15 },
                      { etiket: 'Orta (%50)', val: 50 },
                      { etiket: 'Alt (%85)', val: 85 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setKonumY(p.val)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                          konumY === p.val
                            ? 'bg-amber-500 text-purple-950 border-amber-400'
                            : 'bg-[#1D0823] text-gray-300 border-purple-900/60 hover:text-white'
                        }`}
                      >
                        {p.etiket}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Mod: Dikey Odak Bilgi Çubuğu */
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#120614] border border-purple-900/50 text-[11px]">
                <div className="flex items-center gap-2 text-gray-300">
                  <MoveVertical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Dikey Kapak Odağı:</span>
                  <span className="font-bold text-amber-300 font-mono">%{konumY}</span>
                  <span className="text-gray-400 text-[10px]">
                    ({konumY < 35 ? 'Üst Ağırlıklı' : konumY > 65 ? 'Alt Ağırlıklı' : 'Dengeli/Orta'})
                  </span>
                </div>
                {gorselUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrijinalKonumY(konumY);
                      setKonumlandirmaModu(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-[10px]"
                  >
                    Konumu Ayarla
                  </button>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-[11px] text-gray-300 leading-relaxed">
              Her mutfağın yalnızca <strong className="text-amber-300">1 aktif afiş</strong> hakkı vardır. Facebook tarzı dikey odak ayarı sayesinde afişiniz vitrinde tam istediğiniz noktaya odaklanır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
