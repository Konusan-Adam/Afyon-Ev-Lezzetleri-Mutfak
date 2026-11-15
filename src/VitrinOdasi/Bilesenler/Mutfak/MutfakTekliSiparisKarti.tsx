import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { mutfakSiparisDurumuGuncelle } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSiparisIslemleri';

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
  const [secilenSure, setSecilenSure] = useState(25);

  const siparisId = siparis.id;
  const siparisKodu = siparis.siparis_kodu || siparis.siparisKodu || siparis.id?.substring(0, 8);
  const musteriAdi = siparis.musteri_adi || siparis.musteriAdi || 'Değerli Misafir';
  const telefon = siparis.musteri_telefon || siparis.telefon || '';
  const adres = siparis.teslimat_adresi || siparis.adres || 'Afyonkarahisar Merkez';
  const teslimatTipi = siparis.teslimat_tipi || siparis.teslimatTipi || 'adrese_teslimat';
  const toplamTutar = Number(siparis.toplam_tutar || siparis.toplamTutar || siparis.tutar || 0);
  const durum = siparis.durum || 'beklemede';
  const siparisNotu = siparis.not || siparis.siparis_notu || siparis.ozelNot;

  // Sepet / Yemek öğeleri
  const urunler: any[] = siparis.urunler || siparis.ogeler || siparis.sepet || [];

  const handleDurumGuncelle = async (
    yeniDurum: 'beklemede' | 'hazirlaniyor' | 'paketlendi' | 'yolda' | 'teslim_edildi',
    sureDakika: number,
    aciklama?: string
  ) => {
    try {
      setIslemde(true);
      await mutfakSiparisDurumuGuncelle(siparisId, yeniDurum, sureDakika, aciklama, siparisKodu);
      onYenile();
    } catch (hata) {
      console.error('Durum güncellenemedi:', hata);
    } finally {
      setIslemde(false);
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
            <ChefHat className="w-3 h-3 text-purple-400" /> Ocakta Pişiyor
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

  return (
    <div className="bg-[#180A1F] border border-purple-900/40 hover:border-purple-800/60 transition-all rounded-2xl p-4 text-gray-200 shadow-md">
      {/* Üst Başlık & Durum */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-purple-900/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">#{siparisKodu}</span>
            <span className="text-xs text-gray-400 font-medium">({musteriAdi})</span>
            {teslimatTipi === 'gel_al' ? (
              <span className="px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 text-[10px] font-bold">
                🚶 Gel-Al
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-purple-900/60 text-amber-300 text-[10px] font-bold">
                🛵 Adrese Teslim
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            {telefon && (
              <span className="flex items-center gap-1 text-purple-300">
                <Phone className="w-3 h-3" /> {telefon}
              </span>
            )}
            <span className="flex items-center gap-1 text-gray-400">
              <MapPin className="w-3 h-3" /> {adres}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getDurumRozeti()}
          <span className="font-bold text-amber-400 text-sm">{toplamTutar} ₺</span>
        </div>
      </div>

      {/* Sipariş Notu Varsa */}
      {siparisNotu && (
        <div className="mt-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-800/30 text-amber-300/90 text-xs flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Müşteri Notu: <strong>{siparisNotu}</strong></span>
        </div>
      )}

      {/* Yemek Öğeleri Listesi */}
      <div className="my-3 space-y-1.5 bg-[#120617] p-2.5 rounded-xl border border-purple-950">
        {urunler.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Yöresel Afyon Ev Menüsü siparişi</p>
        ) : (
          urunler.map((urun, index) => {
            const ad = urun.baslik || urun.ad || urun.yemek_baslik || 'Özel Sipariş';
            const adet = urun.adet || urun.miktar || 1;
            const fiyat = Number(urun.fiyat || urun.birim_fiyat || 0);
            const secenekler = Array.isArray(urun.secilen_ogeler) 
              ? urun.secilen_ogeler.map((s: any) => s.baslik).join(', ')
              : urun.varyasyon || '';

            return (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#6D237A] text-white flex items-center justify-center font-bold text-[11px]">
                    {adet}x
                  </span>
                  <span className="font-medium text-gray-200">{ad}</span>
                  {secenekler && <span className="text-gray-400 text-[10px]">({secenekler})</span>}
                </div>
                <span className="text-gray-300 font-semibold">{fiyat * adet} ₺</span>
              </div>
            );
          })
        )}
      </div>

      {/* Butonlar & Durum Aksiyonları */}
      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-purple-900/30">
        {durum !== 'iptal' && durum !== 'teslim_edildi' && (
          <button
            onClick={() => onIptalAc({ id: siparisId, kodu: siparisKodu })}
            disabled={islemde}
            className="px-3 py-1.5 rounded-xl border border-red-900/50 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs font-semibold transition-all cursor-pointer"
          >
            İptal Et
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {durum === 'beklemede' && (
            <div className="flex items-center gap-1.5">
              <select
                value={secilenSure}
                onChange={(e) => setSecilenSure(Number(e.target.value))}
                className="px-2 py-1.5 rounded-xl bg-[#120617] border border-purple-800 text-purple-200 text-xs focus:outline-none"
              >
                <option value={15}>15 dk</option>
                <option value={25}>25 dk</option>
                <option value={35}>35 dk</option>
                <option value={45}>45 dk</option>
                <option value={60}>60 dk</option>
              </select>
              <button
                onClick={() => handleDurumGuncelle('hazirlaniyor', secilenSure)}
                disabled={islemde}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {islemde ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
                <span>Onayla & Pişir ({secilenSure} dk)</span>
              </button>
            </div>
          )}

          {durum === 'hazirlaniyor' && (
            <button
              onClick={() => handleDurumGuncelle('paketlendi', 15)}
              disabled={islemde}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {islemde ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
              <span>Paketlendi & Kurye Çağır</span>
            </button>
          )}

          {durum === 'paketlendi' && (
            <button
              onClick={() => handleDurumGuncelle('yolda', 20)}
              disabled={islemde}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {islemde ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
              <span>Kuryeye Teslim Edildi</span>
            </button>
          )}

          {durum === 'yolda' && (
            <button
              onClick={() => handleDurumGuncelle('teslim_edildi', 0)}
              disabled={islemde}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {islemde ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Teslim Edildi Olarak İşaretle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
