import React from 'react';
import { X, Printer } from 'lucide-react';

interface MutfakSiparisFisiPenceresiProps {
  siparis: any;
  mutfakAdi?: string;
  onKapat: () => void;
}

export const MutfakSiparisFisiPenceresi: React.FC<MutfakSiparisFisiPenceresiProps> = ({
  siparis,
  mutfakAdi = 'Afyon Ev Mutfağı',
  onKapat,
}) => {
  const siparisKodu = siparis.siparis_kodu || siparis.siparisKodu || siparis.id?.substring(0, 8);
  const musteriAdi = siparis.musteri_adi || siparis.musteriAdi || 'Misafir';
  const telefon = siparis.musteri_telefon || siparis.telefon || '-';
  const adres = siparis.teslimat_adresi || siparis.teslimat_adresi_metni || siparis.adres || 'Afyonkarahisar';
  const teslimatTipi = siparis.teslimat_tipi || siparis.teslimatTipi || 'adrese_teslimat';
  const toplamTutar = Number(siparis.toplam_tutar || siparis.toplamTutar || siparis.tutar || 0);
  const siparisNotu = siparis.not || siparis.siparis_notu || siparis.adresNotu || siparis.ozelNot;
  const urunler: any[] = siparis.urunler || siparis.elemanlar || siparis.siparis_elemanlari || siparis.ogeler || siparis.sepet || [];
  const tarih = siparis.olusturma_tarihi || siparis.olusturulma_tarihi || siparis.tarih || new Date().toISOString();

  const handleYazdir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#180A1F] border border-purple-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Üst Eylem Çubuğu (Yazdırırken gizlenir) */}
        <div className="p-3.5 bg-[#250C29] border-b border-purple-900/60 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">Mutfak Fişi / Poşet Etiketi</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleYazdir}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Yazdır</span>
            </button>
            <button
              type="button"
              onClick={onKapat}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Termal Fiş Kağıdı Görünümü */}
        <div className="p-4 overflow-y-auto flex-1 bg-white text-black font-mono text-xs select-text">
          <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-0.5">
            <h2 className="font-black text-sm tracking-wider uppercase">AFYON EV LEZZETLERİ</h2>
            <p className="text-[11px] font-bold">{mutfakAdi}</p>
            <p className="text-[10px] text-gray-600">*** MUTFAK SİPARİŞ FİŞİ ***</p>
          </div>

          <div className="py-2 border-b border-dashed border-black text-[11px] space-y-0.5">
            <div className="flex justify-between font-black text-xs">
              <span>SİPARİŞ NO:</span>
              <span>#{siparisKodu}</span>
            </div>
            <div className="flex justify-between">
              <span>TARİH / SAAT:</span>
              <span>{new Date(tarih).toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex justify-between">
              <span>TESLİMAT:</span>
              <span className="font-bold">{teslimatTipi === 'gel_al' ? 'GEL-AL (MÜŞTERİ ALACAK)' : 'ADRESE TESLİM'}</span>
            </div>
          </div>

          {/* Müşteri & Adres Bilgisi */}
          <div className="py-2 border-b border-dashed border-black text-[11px] space-y-0.5">
            <p><strong>MÜŞTERİ:</strong> {musteriAdi}</p>
            <p><strong>TEL:</strong> {telefon}</p>
            <p><strong>ADRES:</strong> {adres}</p>
          </div>

          {/* ⚠️ MÜŞTERİ ÖZEL NOTU (Çok Belirgin) */}
          {siparisNotu && (
            <div className="my-2 p-2 border-2 border-black rounded bg-yellow-100 text-[11px] leading-tight">
              <p className="font-black underline">⚠️ MÜŞTERİ ÖZEL NOTU:</p>
              <p className="font-black text-xs mt-0.5 uppercase">{siparisNotu}</p>
            </div>
          )}

          {/* Yemek Kalemleri */}
          <div className="py-2 border-b-2 border-dashed border-black space-y-1.5">
            <div className="flex justify-between font-bold text-[10px] border-b border-black pb-1">
              <span>ADET & ÜRÜN</span>
              <span>TUTAR</span>
            </div>
            {urunler.map((urun, i) => {
              const ad = urun.baslik || urun.ad || urun.yemek_baslik || urun.yemek?.baslik || 'Özel Sipariş';
              const adet = Number(urun.adet || urun.miktar || 1);
              const birimFiyat = Number(urun.fiyat ?? urun.birim_fiyat ?? urun.yemek?.fiyat ?? 0);
              const secenekler = Array.isArray(urun.secilen_ogeler)
                ? urun.secilen_ogeler.map((s: any) => s.baslik || s.ad).join(', ')
                : urun.varyasyon || '';

              return (
                <div key={i} className="text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>{adet}x {ad}</span>
                    <span>{adet * birimFiyat} ₺</span>
                  </div>
                  {secenekler && (
                    <p className="text-[10px] text-gray-700 pl-4 italic">[{secenekler}]</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Toplam Tutar */}
          <div className="pt-2 text-right">
            <div className="text-sm font-black">
              TOPLAM TUTAR: {toplamTutar} ₺
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              Afiyet olsun! Anne eliyle taze pişirilmiştir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
