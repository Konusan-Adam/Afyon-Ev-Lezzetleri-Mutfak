import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Phone, 
  ChefHat, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  XCircle,
  FileText,
  Timer,
  PlusCircle,
  Flame,
  Check,
  Volume2
} from 'lucide-react';
import { 
  mutfakSiparisDurumuGuncelle, 
  mutfakSiparisEkSureEkle 
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSiparisIslemleri';
import { 
  mutfakGeriSayimAnonsKontrol,
  mutfakSesliAnonsYap,
  mutfakAnonsHafizasiniTemizle
} from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSesliAsistanServisi';

export interface MutfakTekliSiparisKartiProps {
  siparis: any;
  onYenile: () => void;
  onIptalAc: (sip: { id: string; kodu: string }) => void;
}

export const MutfakTekliSiparisKarti: React.FC<MutfakTekliSiparisKartiProps> = ({
  siparis,
  onYenile,
  onIptalAc,
}) => {
  const [islemde, setIslemde] = useState(false);
  const [ekSureEkleniyor, setEkSureEkleniyor] = useState(false);
  const [ekSureBilgisi, setEkSureBilgisi] = useState<string | null>(null);
  const [secilenSure, setSecilenSure] = useState(25);

  const siparisId = siparis.id;
  const siparisKodu = siparis.siparis_kodu || siparis.siparisKodu || siparis.id?.substring(0, 8);
  const musteriAdi = siparis.musteri_adi || siparis.musteriAdi || 'Değerli Misafir';
  const telefon = siparis.musteri_telefon || siparis.telefon || '';
  const adres = siparis.teslimat_adresi || siparis.teslimat_adresi_metni || siparis.adres || 'Afyonkarahisar Merkez';
  const teslimatTipi = siparis.teslimat_tipi || siparis.teslimatTipi || 'adrese_teslimat';
  const toplamTutar = Number(siparis.toplam_tutar || siparis.toplamTutar || siparis.tutar || 0);
  const durum = siparis.durum || 'beklemede';
  const siparisNotu = siparis.not || siparis.siparis_notu || siparis.adresNotu || siparis.ozelNot;

// Her türlü tarih biçimini (ISO, Firebase Timestamp, Türkçe GG.AA.YYYY veya milisaniye) güvenle çözen fonksiyon
function guvenliZamanMs(veri: any): number {
  if (!veri) return Date.now();
  if (typeof veri === 'number') return isFinite(veri) ? veri : Date.now();
  if (typeof veri === 'object') {
    if (typeof veri.seconds === 'number') return veri.seconds * 1000;
    if (typeof veri._seconds === 'number') return veri._seconds * 1000;
    if (typeof veri.toDate === 'function') {
      try {
        const d = veri.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
      } catch {}
    }
  }
  if (typeof veri === 'string') {
    const standartMs = new Date(veri).getTime();
    if (!isNaN(standartMs)) return standartMs;

    // Türkçe tarih desteği: GG.AA.YYYY SS:DD:SS
    const parcalar = veri.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (parcalar) {
      const gun = parseInt(parcalar[1], 10);
      const ay = parseInt(parcalar[2], 10) - 1;
      const yil = parseInt(parcalar[3], 10);
      const saat = parseInt(parcalar[4] || '0', 10);
      const dakika = parseInt(parcalar[5] || '0', 10);
      const saniye = parseInt(parcalar[6] || '0', 10);
      const d = new Date(yil, ay, gun, saat, dakika, saniye).getTime();
      if (!isNaN(d)) return d;
    }
  }
  return Date.now();
}

  // Zamanlama referansları - Her veri formatına karşı %100 korumalı
  const baslangicMs = guvenliZamanMs(
    siparis.ocaga_alinma_zamani ||
    siparis.guncellenme_zamani ||
    siparis.olusturma_tarihi ||
    siparis.olusturulma_tarihi ||
    siparis.tarih ||
    siparis.zaman ||
    siparis.created_at
  );
  const alinanSureDk = Number(
    siparis.hazirlanmaSuresiDakika ||
    siparis.hazirlanma_suresi_dakika ||
    siparis.sure ||
    siparis.secilen_sure ||
    siparis.dakika ||
    25
  );
  const toplamSureDakika = Math.max(
    1,
    alinanSureDk + Number(siparis.ekSureDakika ?? siparis.ek_sure_dakika ?? 0)
  );

  // Canlı Geri Sayım & Kronometre Hesaplaması
  const [anlikMs, setAnlikMs] = useState<number>(Date.now());

  useEffect(() => {
    if (durum === 'teslim_edildi' || durum === 'iptal') {
      mutfakAnonsHafizasiniTemizle(siparisId);
      return;
    }

    const zamanlayici = setInterval(() => {
      setAnlikMs(Date.now());
    }, 1000);

    return () => clearInterval(zamanlayici);
  }, [durum, siparisId]);

  // Duruma Göre Süre Hesaplaması
  let kalanDakika = 0;
  let kalanSaniye = 0;
  let gecikmedeMi = false;
  let sureMetni = '00:00';
  let kademe: 'taze' | 'dikkat' | 'gecikme' = 'taze';
  let ilerlemeYuzdesi = 100;

  if (durum === 'hazirlaniyor') {
    // ⏳ GERİ SAYIM SAYACI (Countdown)
    const hedefBitisMs = baslangicMs + (toplamSureDakika * 60 * 1000);
    const kalanMs = hedefBitisMs - anlikMs;

    if (kalanMs >= 0) {
      const toplamKalanSn = Math.floor(kalanMs / 1000);
      kalanDakika = Math.floor(toplamKalanSn / 60);
      kalanSaniye = toplamKalanSn % 60;
      gecikmedeMi = false;
      sureMetni = `${String(Math.max(0, kalanDakika)).padStart(2, '0')}:${String(Math.max(0, kalanSaniye)).padStart(2, '0')}`;

      // İlerleme yüzdesi
      const toplamSaniye = toplamSureDakika * 60;
      ilerlemeYuzdesi = Math.min(100, Math.max(3, (toplamKalanSn / Math.max(toplamSaniye, 1)) * 100));

      if (kalanDakika <= 5) {
        kademe = 'gecikme'; // Son 5 dakika kritik
      } else if (kalanDakika <= 15) {
        kademe = 'dikkat'; // Son 15 dakika sarı
      } else {
        kademe = 'taze'; // Normal yeşil
      }

      // Sesli Anons Kontrolü (Her 10 dk ve kritik dakikalarda)
      mutfakGeriSayimAnonsKontrol(siparisId, siparisKodu, kalanDakika, kalanSaniye);
    } else {
      // Süre bitti, gecikmeye girdi
      const gecikmeSnToplam = Math.abs(Math.floor(kalanMs / 1000));
      kalanDakika = -Math.floor(gecikmeSnToplam / 60);
      kalanSaniye = gecikmeSnToplam % 60;
      gecikmedeMi = true;
      kademe = 'gecikme';
      ilerlemeYuzdesi = 0;
      sureMetni = `-${String(Math.abs(kalanDakika)).padStart(2, '0')}:${String(kalanSaniye).padStart(2, '0')}`;

      // 0 dk süre doldu anonsunu tetikle
      mutfakGeriSayimAnonsKontrol(siparisId, siparisKodu, 0, 0);
    }
  } else if (durum === 'beklemede') {
    // ⏱️ BEKLEME KRONOMETRESİ (Kaç dakikadır onay bekliyor)
    const gecenSn = Math.max(0, Math.floor((anlikMs - baslangicMs) / 1000));
    const gecenDk = Math.floor(gecenSn / 60);
    const gecenKalanSn = gecenSn % 60;
    sureMetni = `${String(gecenDk).padStart(2, '0')}:${String(gecenKalanSn).padStart(2, '0')}`;

    if (gecenDk >= 10) {
      kademe = 'gecikme';
    } else if (gecenDk >= 5) {
      kademe = 'dikkat';
    } else {
      kademe = 'taze';
    }
  }

  // Kesin NaN Koruması (Fail-Safe)
  if (isNaN(kalanDakika) || isNaN(kalanSaniye) || sureMetni.includes('NaN')) {
    kalanDakika = 0;
    kalanSaniye = 0;
    sureMetni = '00:00';
  }

  // Sepet / Yemek öğeleri
  const urunler: any[] = siparis.urunler || siparis.elemanlar || siparis.siparis_elemanlari || siparis.ogeler || siparis.sepet || [];

  const handleDurumGuncelle = async (
    yeniDurum: 'beklemede' | 'hazirlaniyor' | 'paketlendi' | 'yolda' | 'teslim_edildi',
    sureDakika: number,
    aciklama?: string
  ) => {
    try {
      setIslemde(true);
      await mutfakSiparisDurumuGuncelle(siparisId, yeniDurum, sureDakika, aciklama, siparisKodu);

      if (yeniDurum === 'hazirlaniyor') {
        mutfakSesliAnonsYap(`Sipariş ${siparisKodu} onaylandı. Pişirme süresi ${sureDakika} dakika.`);
      } else if (yeniDurum === 'paketlendi') {
        mutfakAnonsHafizasiniTemizle(siparisId);
        mutfakSesliAnonsYap(`Sipariş ${siparisKodu} paketlendi, kurye bekleniyor.`);
      }

      onYenile();
    } catch (hata) {
      console.error('Durum güncellenemedi:', hata);
    } finally {
      setIslemde(false);
    }
  };

  const handleEkSureIste = async () => {
    try {
      setEkSureEkleniyor(true);
      await mutfakSiparisEkSureEkle(siparisId, 10, siparisKodu);
      setEkSureBilgisi('+10 Dk Eklendi');
      mutfakSesliAnonsYap(`Sipariş ${siparisKodu} için 10 dakika ek süre eklendi.`);
      setTimeout(() => setEkSureBilgisi(null), 3500);
      onYenile();
    } catch (err) {
      console.error('Ek süre talep hatası:', err);
    } finally {
      setEkSureEkleniyor(false);
    }
  };

  const getDurumRozeti = () => {
    switch (durum) {
      case 'beklemede':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Onay Bekliyor
          </span>
        );
      case 'hazirlaniyor':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1">
            <ChefHat className="w-3 h-3 text-purple-400" /> Ocakta & Fırında
          </span>
        );
      case 'paketlendi':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> Paketlendi / Hazır
          </span>
        );
      case 'yolda':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1">
            <Truck className="w-3 h-3" /> Kurye Yolda
          </span>
        );
      case 'teslim_edildi':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Teslim Edildi
          </span>
        );
      case 'iptal':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> İptal Edildi
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-gray-500/20 text-gray-300 border border-gray-500/40 text-[11px] font-bold">
            {durum}
          </span>
        );
    }
  };

  const kartStili =
    durum === 'iptal'
      ? 'border-red-950/60 bg-[#150616] opacity-75'
      : durum === 'teslim_edildi'
      ? 'border-emerald-950/60 bg-[#0e1613]'
      : kademe === 'gecikme'
      ? 'border-rose-500/80 ring-2 ring-rose-500/30 bg-[#20081a] shadow-xl shadow-rose-950/50'
      : kademe === 'dikkat'
      ? 'border-amber-500/60 bg-[#1b0d21] shadow-lg shadow-amber-950/40'
      : 'border-purple-900/50 bg-[#180A1F] shadow-md';

  return (
    <div className={`transition-all rounded-2xl p-4 text-gray-200 border ${kartStili}`}>
      {/* Üst Başlık: Canlı Geri Sayım / Kronometre + Durum & Fiyat */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-purple-900/30 flex-wrap sm:flex-nowrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-white text-base tracking-wide">#{siparisKodu}</span>
            <span className="text-xs text-gray-300 font-semibold">({musteriAdi})</span>

            {teslimatTipi === 'gel_al' ? (
              <span className="px-2 py-0.5 rounded-md bg-indigo-900/70 text-indigo-300 border border-indigo-700/50 text-[10px] font-bold">
                🚶 Gel-Al
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-purple-900/70 text-amber-300 border border-purple-700/50 text-[10px] font-bold">
                🛵 Adrese Teslim
              </span>
            )}

            {/* ⏳ GERİ SAYIM SAYACI (Ocakta / Hazırlanıyorken) */}
            {durum === 'hazirlaniyor' && (
              <div
                className={`px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 transition-all shadow-md ${
                  gecikmedeMi
                    ? 'bg-rose-950 text-rose-200 border-2 border-rose-500 animate-pulse'
                    : kademe === 'gecikme'
                    ? 'bg-rose-950/90 text-rose-300 border border-rose-500 animate-pulse'
                    : kademe === 'dikkat'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                }`}
                title={gecikmedeMi ? 'Pişirme süresi aşıldı!' : `Kalan hedef pişirme süresi (Toplam ${toplamSureDakika} dk)`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>
                  {gecikmedeMi ? `⚠️ Gecikme: ${sureMetni}` : `⏳ Kalan: ${sureMetni}`}
                </span>
                <span className="text-[10px] font-sans font-extrabold uppercase">
                  {gecikmedeMi ? 'Acil!' : kademe === 'gecikme' ? 'Son 5 Dk' : kademe === 'dikkat' ? 'Son 15 Dk' : 'Zamanında'}
                </span>
              </div>
            )}

            {/* ⏱️ BEKLEME SÜRESİ (Beklemedeyken) */}
            {durum === 'beklemede' && (
              <div className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black flex items-center gap-1.5 ${
                kademe === 'gecikme'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
                  : kademe === 'dikkat'
                  ? 'bg-amber-950 text-amber-300 border border-amber-600'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
              }`}>
                <Clock className="w-3 h-3" />
                <span>Bekleme: {sureMetni}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            {telefon && (
              <span className="flex items-center gap-1 text-purple-300 font-medium">
                <Phone className="w-3 h-3" /> {telefon}
              </span>
            )}
            <span className="flex items-center gap-1 text-gray-300">
              <MapPin className="w-3 h-3 text-gray-400" /> {adres}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
          {getDurumRozeti()}
          <span className="font-black text-amber-400 text-base">{toplamTutar} ₺</span>
        </div>
      </div>

      {/* 📊 Canlı Zaman Çubuğu (Geri Sayım İlerleme Barı) */}
      {durum === 'hazirlaniyor' && (
        <div className="mt-2.5 space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span>Hedef: {toplamSureDakika} dk</span>
            <span className={gecikmedeMi ? 'text-rose-400 font-bold' : 'text-amber-300'}>
              {gecikmedeMi ? 'Süre Doldu (Kurye / Paketleme Bekleniyor)' : `${sureMetni} kaldı`}
            </span>
          </div>
          <div className="w-full bg-[#120617] h-2 rounded-full overflow-hidden border border-purple-900/60">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                gecikmedeMi
                  ? 'bg-rose-500 animate-pulse'
                  : kademe === 'gecikme'
                  ? 'bg-rose-500 animate-pulse'
                  : kademe === 'dikkat'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${ilerlemeYuzdesi}%` }}
            />
          </div>
        </div>
      )}

      {/* Sipariş Notu Varsa */}
      {siparisNotu && (
        <div className="mt-2.5 p-2 rounded-xl bg-purple-950/50 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Müşteri Notu: <strong className="text-white">{siparisNotu}</strong></span>
        </div>
      )}

      {/* Yemek Öğeleri Listesi */}
      <div className="my-3 space-y-1.5 bg-[#120617] p-3 rounded-xl border border-purple-950">
        {urunler.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Yöresel Afyon Ev Menüsü siparişi</p>
        ) : (
          urunler.map((urun, index) => {
            const ad = urun.baslik || urun.ad || urun.yemek_baslik || urun.yemek?.baslik || 'Özel Sipariş';
            const adet = Number(urun.adet || urun.miktar || 1);
            const fiyat = Number(urun.fiyat ?? urun.birim_fiyat ?? urun.yemek?.fiyat ?? 0);
            const secenekler = Array.isArray(urun.secilen_ogeler) 
              ? urun.secilen_ogeler.map((s: any) => s.baslik).join(', ')
              : urun.varyasyon || '';

            return (
              <div key={index} className="flex justify-between items-center text-xs py-0.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-6 h-6 px-1.5 rounded-lg bg-[#6D237A] text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {adet}x
                  </span>
                  <span className="font-bold text-gray-100 text-sm">{ad}</span>
                  {secenekler && <span className="text-gray-400 text-xs">({secenekler})</span>}
                </div>
                <span className="text-gray-200 font-bold text-xs">{fiyat * adet} ₺</span>
              </div>
            );
          })
        )}
      </div>

      {/* Butonlar & Durum Aksiyonları (Mutfak & Eldiven Dostu Geniş Dokunmatik Alanlar) */}
      {(durum === 'iptal' || durum === 'teslim_edildi') ? (
        (siparis.durum_aciklamasi || siparis.durumAciklamasi || siparis.tamamlanma_tarihi) && (
          <div className="pt-2 flex items-center justify-between gap-2 text-xs text-gray-400 border-t border-purple-900/30">
            <span>{siparis.durum_aciklamasi || siparis.durumAciklamasi || 'İşlem tamamlandı.'}</span>
            {siparis.tamamlanma_tarihi && (
              <span className="text-emerald-400 font-semibold shrink-0">
                {new Date(siparis.tamamlanma_tarihi).toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        )
      ) : (
        <div className="pt-2.5 flex items-center justify-between gap-3 flex-wrap border-t border-purple-900/40">
          <button
            onClick={() => onIptalAc({ id: siparisId, kodu: siparisKodu })}
            disabled={islemde}
            className="px-3.5 py-2.5 rounded-xl border border-red-900/50 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs font-bold transition-all cursor-pointer"
          >
            İptal Et
          </button>

          <div className="flex items-center gap-2.5 ml-auto flex-wrap">
            {/* ➕ Ek Süre İste Butonu (Ocakta / Hazırlanıyorken) */}
            {durum === 'hazirlaniyor' && (
              <button
                type="button"
                onClick={handleEkSureIste}
                disabled={islemde || ekSureEkleniyor}
                className="px-3.5 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/60 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                title="Sayaca ve müşteriye +10 dakika ek hazırlık süresi ekler"
              >
                {ekSureEkleniyor ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : ekSureBilgisi ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{ekSureBilgisi || '+10 Dk Ek Süre İste'}</span>
              </button>
            )}

            {durum === 'beklemede' && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={secilenSure}
                  onChange={(e) => setSecilenSure(Number(e.target.value))}
                  className="px-3 py-2.5 rounded-xl bg-[#120617] border border-purple-700 text-purple-200 text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value={10}>10 dk içinde</option>
                  <option value={15}>15 dk içinde</option>
                  <option value={25}>25 dk içinde</option>
                  <option value={35}>35 dk içinde</option>
                  <option value={45}>45 dk içinde</option>
                  <option value={60}>60 dk içinde</option>
                </select>
                <button
                  onClick={() => handleDurumGuncelle('hazirlaniyor', secilenSure)}
                  disabled={islemde}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {islemde ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4 text-amber-300" />}
                  <span>KABUL ET & GERİ SAYIMI BAŞLAT ({secilenSure} dk)</span>
                </button>
              </div>
            )}

            {durum === 'hazirlaniyor' && (
              <button
                onClick={() => handleDurumGuncelle('paketlendi', 15)}
                disabled={islemde}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-cyan-900/30 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {islemde ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>PAKETLENDİ & KURYE ÇAĞIR</span>
              </button>
            )}

            {durum === 'paketlendi' && (
              <button
                onClick={() => handleDurumGuncelle('yolda', 20)}
                disabled={islemde}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {islemde ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>KURYEYE TESLİM EDİLDİ</span>
              </button>
            )}

            {durum === 'yolda' && (
              <button
                onClick={() => handleDurumGuncelle('teslim_edildi', 0)}
                disabled={islemde}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {islemde ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>MÜŞTERİYE TESLİM EDİLDİ</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
