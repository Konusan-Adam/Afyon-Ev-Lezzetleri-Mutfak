import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  Building,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  Send,
  Save,
  Loader2
} from 'lucide-react';
import { useCanliHakedisTalepleri } from '@/src/MalzemeCekmeceleri/useCanliHakedisTalepleri';
import { useKomisyonYonetimi } from '@/src/MalzemeCekmeceleri/useKomisyonYonetimi';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';

interface MutfakCuzdanSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
  toplamSatisTutari: number;
  kayitliKomisyonTutari?: number;
}

const VARSAYILAN_MUTFAK_IDLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function mutfakBelgesiEslesirMi(doc: any, mutfakId: string): boolean {
  const docId = doc?.id || doc?.kimlik;
  if (!docId) return false;
  if (docId === mutfakId) return true;
  return VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(docId);
}

export const MutfakCuzdanSekmesi: React.FC<MutfakCuzdanSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
  toplamSatisTutari,
  kayitliKomisyonTutari,
}) => {
  const { talepler, yeniTalepOlustur } = useCanliHakedisTalepleri();
  const { ayarlar, komisyonHesapla } = useKomisyonYonetimi();

  // IBAN Bilgileri (Firestore'daki mutfak kaydından yüklenir ve kaydedilir)
  const [hesapSahibi, setHesapSahibi] = useState('');
  const [bankaAdi, setBankaAdi] = useState('');
  const [subeIl, setSubeIl] = useState('Afyonkarahisar Merkez');
  const [iban, setIban] = useState('');
  const [ibanDuzenlemeModu, setIbanDuzenlemeModu] = useState(false);
  const [ibanKaydediliyor, setIbanKaydediliyor] = useState(false);
  const [ibanMesaji, setIbanMesaji] = useState<string | null>(null);

  // Çekim Talebi Formu
  const [cekimTutari, setCekimTutari] = useState<number | ''>('');
  const [islemBasarili, setIslemBasarili] = useState(false);
  const [hataMesaji, setHataMesaji] = useState('');

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      if (!canliFirebaseAktifMi() || !mutfakId) return;
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
        if (aktif && mutfak) {
          setHesapSahibi(mutfak.hesap_sahibi || mutfak.banka_bilgileri?.hesap_sahibi || '');
          setBankaAdi(mutfak.banka_adi || mutfak.banka_bilgileri?.banka_adi || '');
          setSubeIl(mutfak.sube_il || mutfak.banka_bilgileri?.sube_il || 'Afyonkarahisar Merkez');
          setIban(mutfak.iban || mutfak.banka_bilgileri?.iban || '');
        }
      } catch (err) {
        console.warn('Banka/IBAN bilgileri okunamadı:', err);
      }
    };
    yukle();
    return () => { aktif = false; };
  }, [mutfakId]);

  // Gerçek brüt satış ve dinamik komisyon hesaplama (sahte 8500 fallback yok!)
  const brutSatis = Math.max(0, Number(toplamSatisTutari) || 0);
  const mutfakKomisyonAyari = ayarlar.find((a) => a.tip === 'mutfak' && a.hedefId === mutfakId && a.aktif_mi);
  const genelKomisyonAyari = ayarlar.find((a) => a.tip === 'genel' && a.aktif_mi);
  const aktifKomisyonAyari = mutfakKomisyonAyari || genelKomisyonAyari;

  const dinamikHesap = komisyonHesapla(mutfakId, brutSatis);
  const platformKomisyonu =
    typeof kayitliKomisyonTutari === 'number' && kayitliKomisyonTutari > 0
      ? Math.round(kayitliKomisyonTutari * 100) / 100
      : Math.round((dinamikHesap.komisyonTutari + dinamikHesap.platformBedeli) * 100) / 100;
  const gosterilenOran = aktifKomisyonAyari ? aktifKomisyonAyari.oran : 0;
  const toplamHakEdilenNet = Math.max(0, Math.round((brutSatis - platformKomisyonu) * 100) / 100);

  // Mutfak talepleri
  const mutfakTalepleri = talepler.filter((t) =>
    t.mutfak_id === mutfakId ||
    (VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(t.mutfak_id || ''))
  );
  const odenenToplam = mutfakTalepleri
    .filter((t) => t.durum === 'odendi')
    .reduce((acc, t) => acc + (Number(t.tutar) || 0), 0);
  const bekleyenToplam = mutfakTalepleri
    .filter((t) => t.durum === 'beklemede')
    .reduce((acc, t) => acc + (Number(t.tutar) || 0), 0);

  const cekilebilirNetBakiye = Math.max(0, Math.round((toplamHakEdilenNet - odenenToplam - bekleyenToplam) * 100) / 100);

  const bankaBilgileriniKaydet = async () => {
    setHataMesaji('');
    setIbanMesaji(null);

    const temizIban = iban.replace(/\s+/g, '').toUpperCase();
    if (!hesapSahibi.trim() || !bankaAdi.trim() || !temizIban) {
      setHataMesaji('Lütfen hesap sahibi, banka adı ve IBAN alanlarını eksiksiz doldurunuz.');
      return;
    }
    if (!/^TR\d{24}$/.test(temizIban)) {
      setHataMesaji('Geçersiz IBAN formatı! Türkiye IBAN numarası "TR" ile başlamalı ve toplam 26 karakter olmalıdır.');
      return;
    }

    const formatliIban = temizIban.replace(/(.{4})/g, '$1 ').trim();
    setIban(formatliIban);

    if (canliFirebaseAktifMi() && mutfakId) {
      setIbanKaydediliyor(true);
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
        const hedefId = mutfak ? (mutfak.id || mutfak.kimlik) : mutfakId;

        await belgeKaydet('mutfaklar', hedefId, {
          ...(mutfak || {}),
          id: hedefId,
          hesap_sahibi: hesapSahibi.trim(),
          banka_adi: bankaAdi.trim(),
          sube_il: subeIl.trim() || 'Afyonkarahisar Merkez',
          iban: formatliIban,
          banka_bilgileri: {
            hesap_sahibi: hesapSahibi.trim(),
            banka_adi: bankaAdi.trim(),
            sube_il: subeIl.trim() || 'Afyonkarahisar Merkez',
            iban: formatliIban,
            guncellenme_tarihi: new Date().toISOString(),
          },
        });
        setIbanMesaji('Banka ve IBAN bilgileriniz kalıcı olarak kaydedildi.');
        setIbanDuzenlemeModu(false);
        setTimeout(() => setIbanMesaji(null), 3000);
      } catch (err) {
        console.warn('IBAN kaydetme hatası:', err);
        setHataMesaji('Banka bilgileri kaydedilirken bir hata oluştu.');
      } finally {
        setIbanKaydediliyor(false);
      }
    } else {
      setIbanDuzenlemeModu(false);
    }
  };

  const talepGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHataMesaji('');

    if (!cekimTutari || Number(cekimTutari) <= 0) {
      setHataMesaji('Lütfen geçerli bir çekim tutarı yazınız.');
      return;
    }
    if (Number(cekimTutari) < 500) {
      setHataMesaji("Minimum para çekim tutarı 500 ₺'dir.");
      return;
    }
    if (Number(cekimTutari) > cekilebilirNetBakiye) {
      setHataMesaji(`Çekilebilir bakiyenizden (${cekilebilirNetBakiye} ₺) fazla tutar talep edemezsiniz.`);
      return;
    }

    const temizIban = iban.replace(/\s+/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(temizIban) || !hesapSahibi.trim() || !bankaAdi.trim()) {
      setHataMesaji('Lütfen önce geçerli bir Hesap Sahibi, Banka Adı ve 26 haneli TR IBAN kaydediniz.');
      setIbanDuzenlemeModu(true);
      return;
    }

    await yeniTalepOlustur({
      id: `hak-${Date.now()}`,
      rol_tipi: 'mutfak',
      mutfak_id: mutfakId,
      mutfak_adi: mutfakAdi,
      tutar: Number(cekimTutari),
      iban: iban.trim(),
      hesap_sahibi: hesapSahibi.trim(),
      banka_adi: bankaAdi.trim(),
      durum: 'beklemede',
      talep_tarihi: new Date().toLocaleString('tr-TR'),
      aciklama: `${mutfakAdi} (${subeIl || 'Merkez'}) çekim talebi`
    });

    setCekimTutari('');
    setIslemBasarili(true);
    setTimeout(() => setIslemBasarili(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-white">
      {/* 4 Ana Finansal Özet Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Çekilebilir Bakiye */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-[#260C2B] to-[#180A1F] border border-amber-500/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-200">Çekilebilir Net Bakiye</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {cekilebilirNetBakiye.toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[10px] text-amber-200/70 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Hemen banka hesabına aktarılabilir</span>
          </p>
        </div>

        {/* Toplam Brüt Satış */}
        <div className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Toplam Brüt Ciro</span>
            <div className="w-8 h-8 rounded-xl bg-purple-900/40 text-purple-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {brutSatis.toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[10px] text-gray-400 mt-1">İptal hariç geçerli siparişlerin toplamı</p>
        </div>

        {/* Platform Komisyonu */}
        <div className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">
              Platform Hizmet Bedeli {gosterilenOran > 0 ? `(%${gosterilenOran})` : ''}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-900/40 text-purple-300 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 mt-2">
            -{platformKomisyonu.toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Sunucu, kurye & müşteri hizmetleri</p>
        </div>

        {/* Bugüne Kadar Ödenen */}
        <div className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">Ödenen Toplam</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {odenenToplam.toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Bekleyen: <strong className="text-amber-300">{bekleyenToplam.toLocaleString('tr-TR')} ₺</strong>
          </p>
        </div>
      </div>

      {/* İki Kolonlu Alt Düzen: Sol = Para Çekme & IBAN, Sağ = Çekim Geçmişi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sol Alan: IBAN & Çekim Talebi Formu (5 Kolon) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Kayıtlı Banka & IBAN Kartı */}
          <div className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Kayıtlı Banka & IBAN Bilgisi</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIbanDuzenlemeModu(!ibanDuzenlemeModu);
                  setHataMesaji('');
                }}
                className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
              >
                {ibanDuzenlemeModu ? 'Vazgeç' : iban ? 'Değiştir' : 'IBAN Ekle'}
              </button>
            </div>

            {ibanMesaji && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{ibanMesaji}</span>
              </div>
            )}

            {ibanDuzenlemeModu ? (
              <div className="space-y-2.5 pt-1 text-xs">
                <div>
                  <label className="text-gray-400 block text-[10px] mb-1">Hesap Sahibi (Ad Soyad)</label>
                  <input
                    type="text"
                    value={hesapSahibi}
                    onChange={(e) => setHesapSahibi(e.target.value)}
                    placeholder="Örn: Fatma Yılmaz"
                    className="w-full bg-[#120614] border border-purple-900 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Banka Adı</label>
                    <input
                      type="text"
                      value={bankaAdi}
                      onChange={(e) => setBankaAdi(e.target.value)}
                      placeholder="Örn: Ziraat Bankası"
                      className="w-full bg-[#120614] border border-purple-900 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Şube / İl</label>
                    <input
                      type="text"
                      value={subeIl}
                      onChange={(e) => setSubeIl(e.target.value)}
                      placeholder="Afyonkarahisar Merkez"
                      className="w-full bg-[#120614] border border-purple-900 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 block text-[10px] mb-1">IBAN Numarası (26 Hane)</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full bg-[#120614] border border-purple-900 rounded-xl px-3 py-2 font-mono text-amber-300 font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={bankaBilgileriniKaydet}
                  disabled={ibanKaydediliyor}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {ibanKaydediliyor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Banka & IBAN Bilgilerini Kaydet</span>
                </button>
              </div>
            ) : iban ? (
              <div className="p-3 rounded-xl bg-[#140616] border border-purple-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Hesap Sahibi:</span>
                  <span className="font-bold text-white">{hesapSahibi || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Banka / Şube:</span>
                  <span className="font-semibold text-purple-200">{bankaAdi || '-'} ({subeIl})</span>
                </div>
                <div className="pt-1 border-t border-purple-900/40 flex items-center justify-between text-xs gap-2">
                  <span className="text-gray-400 shrink-0">IBAN:</span>
                  <span className="font-mono text-amber-400 font-bold tracking-wider truncate">{iban}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
                <span>Henüz kayıtlı banka / IBAN bilginiz yok.</span>
                <button
                  type="button"
                  onClick={() => setIbanDuzenlemeModu(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-purple-950 font-bold text-[11px] cursor-pointer shrink-0"
                >
                  Ekle
                </button>
              </div>
            )}
          </div>

          {/* Çekim Talebi Oluşturma Formu */}
          <form onSubmit={talepGonder} className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-white">Banka Hesabıma Para Aktar</h4>
            </div>

            {islemBasarili && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Çekim talebiniz Afyon muhasebe masasına iletildi. 24 saat içinde hesabınıza aktarılacaktır.</span>
              </div>
            )}

            {hataMesaji && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{hataMesaji}</span>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-gray-300 font-semibold">Çekilecek Tutar (₺)</label>
                <button
                  type="button"
                  onClick={() => setCekimTutari(cekilebilirNetBakiye)}
                  disabled={cekilebilirNetBakiye <= 0}
                  className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer disabled:opacity-40"
                >
                  Tüm Bakiyeyi Çek ({cekilebilirNetBakiye} ₺)
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  max={cekilebilirNetBakiye}
                  value={cekimTutari}
                  onChange={(e) => {
                    setCekimTutari(e.target.value ? Number(e.target.value) : '');
                    setHataMesaji('');
                  }}
                  placeholder="Min. 500 ₺"
                  className="w-full bg-[#120614] border border-purple-900 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-amber-400 pl-8"
                />
                <span className="absolute left-3 top-2.5 text-amber-400 font-bold">₺</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={cekilebilirNetBakiye < 500}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                cekilebilirNetBakiye >= 500
                  ? 'bg-amber-500 hover:bg-amber-400 text-purple-950 shadow-amber-500/20 cursor-pointer'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{cekilebilirNetBakiye < 500 ? 'Minimum Çekim Tutarı 500 ₺' : 'Hakediş Çekim Talebi Oluştur'}</span>
            </button>
          </form>
        </div>

        {/* Sağ Alan: Geçmiş Hakediş ve Ödeme Listesi (7 Kolon) */}
        <div className="lg:col-span-7">
          <div className="p-4 rounded-2xl bg-[#1D0A20] border border-[#3E1646] h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-300" />
                <h4 className="text-xs font-bold text-white">Hakediş & Çekim Geçmişi</h4>
              </div>
              <span className="text-[10px] text-gray-400">{mutfakTalepleri.length} Talep Kayıtlı</span>
            </div>

            {mutfakTalepleri.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <Wallet className="w-10 h-10 text-purple-800 mb-2" />
                <p className="text-xs font-bold text-white">Henüz çekim talebi oluşturulmadı.</p>
                <p className="text-[11px] mt-0.5">Bakiyeniz 500 ₺'ye ulaştığında banka hesabınıza çekim yapabilirsiniz.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {mutfakTalepleri.map((talep) => (
                  <div
                    key={talep.id}
                    className="p-3 rounded-xl bg-[#140616] border border-purple-900/60 hover:border-purple-700 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {talep.tutar.toLocaleString('tr-TR')} ₺
                        </span>
                        {talep.durum === 'odendi' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ödendi / Hesaba Geçti</span>
                          </span>
                        )}
                        {talep.durum === 'beklemede' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Onay Bekliyor</span>
                          </span>
                        )}
                        {talep.durum === 'reddedildi' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Reddedildi</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-400 truncate">
                        {talep.banka_adi} • <span className="font-mono text-gray-300">{talep.iban.slice(0, 14)}...</span>
                      </div>

                      {talep.dekont_notu && (
                        <div className="text-[10px] text-emerald-300/90 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-900/40">
                          {talep.dekont_notu}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[10px] text-gray-400 shrink-0">
                      <div>Talep: {talep.talep_tarihi}</div>
                      {talep.odeme_tarihi && (
                        <div className="text-emerald-400 font-semibold mt-0.5">Ödeme: {talep.odeme_tarihi}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
