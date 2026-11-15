import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ChefHat, 
  ShoppingBag, 
  UtensilsCrossed, 
  DollarSign, 
  ShieldCheck, 
  Plus, 
  Check, 
  CheckCircle,
  Clock, 
  Power,
  Bike,
  LogOut,
  Ban,
  Edit3
} from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { Yemek } from '@/src/veritabani/VeriTipleri';
import { canliFirebaseAktifMi, db } from '@/src/veritabani/FirebaseIstemcisi';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { useMusteriSiparisleri } from '@/src/MalzemeCekmeceleri/useMusteriSiparisleri';
import { gorselUrlGuvenliYap } from '@/src/MalzemeCekmeceleri/sunucuGorselYukleyici';
import { YeniYemekEklePenceresi } from './YeniYemekEklePenceresi';
import { YemekDuzenlemePenceresi } from './YemekDuzenlemePenceresi';
import { MutfakCuzdanSekmesi } from './MutfakCuzdanSekmesi';
import { MutfakBelgelerSekmesi } from './MutfakBelgelerSekmesi';
import { SiparisIptalPenceresi } from '../Bilesenler/MutfakYonetimi/SiparisIptalPenceresi';
import { MutfakZilButonu } from '../Bilesenler/Mutfak/MutfakZilButonu';
import { MutfakTeslimatAyarKarti } from './MutfakTeslimatAyarKarti';
import { MutfakTekliSiparisKarti } from '../Bilesenler/Mutfak/MutfakTekliSiparisKarti';
import { mutfakSiparisDurumuGuncelle } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakSiparisIslemleri';
import { useMutfakBildirimleri } from '@/src/MalzemeCekmeceleri/Mutfak/useMutfakBildirimleri';
import { MutfakYeniSiparisUyarisi } from '../Bilesenler/Mutfak/MutfakYeniSiparisUyarisi';
import { mutfakZiliCal } from '@/src/MalzemeCekmeceleri/Mutfak/MutfakZilServisi';
import { MutfakGirisEkrani } from './MutfakGirisEkrani';

export const MutfakPaneli: React.FC = () => {
  const { aktifKullanici, panelDegistir, cikisYap } = kullaniciHafizasiKullan();
  const [mutfakAcik, setMutfakAcik] = useState(true);

  const [aktifSekme, setAktifSekme] = useState<'siparisler' | 'menum' | 'kazanc' | 'belgeler' | 'tamamlanan'>('siparisler');
  const [yemekModalAcik, setYemekModalAcik] = useState(false);
  const [duzenlenenYemek, setDuzenlenenYemek] = useState<Yemek | null>(null);
  const [iptalModalSiparis, setIptalModalSiparis] = useState<{ id: string; kodu: string } | null>(null);
  const [guncellemeSayaci, setGuncellemeSayaci] = useState(0);
  const [tamamlananSiparisler, setTamamlananSiparisler] = useState<any[]>([]);

  const { siparisler: canliSiparisler, yenile: siparisleriYenile } = useMusteriSiparisleri();

  const mutfakId = aktifKullanici?.kimlik || aktifKullanici?.id || 'm1';
  const mutfakAdi = aktifKullanici?.isletme_adi || aktifKullanici?.ad_soyad || 'Afyonlu Zehra Teyze Ev Yemekleri';

  useEffect(() => {
    const yukle = async () => {
      if (canliFirebaseAktifMi() && mutfakId) {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => m.id === mutfakId || m.kimlik === mutfakId);
        if (mutfak && mutfak.acik_mi !== undefined) {
          setMutfakAcik(mutfak.acik_mi);
        }
      }
    };
    yukle();
  }, [mutfakId]);

  // 🔔 Canlı Sipariş Zil & Bildirim Dedektörü
  const { yeniSiparisUyarisi, uyariKapat } = useMutfakBildirimleri(mutfakId);

  const [canliYemekler, setCanliYemekler] = useState<Yemek[]>([]);

  useEffect(() => {
    if (canliFirebaseAktifMi()) {
      koleksiyonGetir<Yemek>('yemekler').then((tum) => {
        const buMutfak = tum.filter((y) => 
          y.mutfak_id === mutfakId ||
          (mutfakId === 'm1' && (y.mutfak_id === 'asci_fatma_01' || y.mutfak_id === 'mutfak-fatma-teyze'))
        );
        setCanliYemekler(buMutfak);
      });
    }
  }, [mutfakId, guncellemeSayaci]);

  useEffect(() => {
    if (canliFirebaseAktifMi() && mutfakId) {
      const q = query(collection(db, 'tamamlanan_siparisler'), where('mutfak_id', '==', mutfakId));
      getDocs(q).then((snap) => {
        const veriler = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTamamlananSiparisler(veriler);
      });
    }
  }, [mutfakId, guncellemeSayaci]);


  const varsayilanTestMutfaklari = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1', 'm2', 'mutfak-muzaffer'];
  const onayBekliyorMu = 
    aktifKullanici?.rol !== 'yonetici' &&
    !varsayilanTestMutfaklari.includes(aktifKullanici?.kimlik || '') &&
    ((aktifKullanici as any)?.onay_durumu === 'beklemede' || (aktifKullanici as any)?.onayli_mi === false);

  const mutfakYemekleri = canliYemekler;
  const mutfakSiparisleri = canliSiparisler.filter((s) => !s.mutfak_id || s.mutfak_id === mutfakId || s.mutfak_id === 'm1' || s.mutfak_id === 'mutfak-1' || s.mutfak_id === 'mutfak-fatma-teyze');

  const siparisDurumDegistir = async (siparisId: string, yeniDurum: 'hazirlaniyor' | 'paketlendi' | 'teslim_edildi') => {
    await mutfakSiparisDurumuGuncelle(siparisId, yeniDurum as any, 25);
    siparisleriYenile();
    setGuncellemeSayaci((s) => s + 1);
  };

  const toggleMutfakDurumu = async () => {
    const yeniDurum = !mutfakAcik;
    setMutfakAcik(yeniDurum);

    if (canliFirebaseAktifMi() && mutfakId) {
      try {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => m.id === mutfakId || m.kimlik === mutfakId);
        
        await belgeKaydet('mutfaklar', mutfak?.id || mutfakId, {
          ...(mutfak || {}),
          id: mutfak?.id || mutfakId,
          acik_mi: yeniDurum
        });
      } catch (err) {
        console.warn('Mutfak durum güncelleme hatası:', err);
      }
    }
  };

  if (!aktifKullanici || (aktifKullanici.rol !== 'ev_mutfagi' && aktifKullanici.rol !== 'ticari_restoran' && aktifKullanici.rol !== 'yonetici')) {
    return <MutfakGirisEkrani />;
  }

  return (
    <div className="w-full min-h-screen bg-[#0C020E] text-gray-200 select-none pb-16">
      
      {/* 🔔 YENİ SİPARİŞ CANLI FLAŞ BİLDİRİMİ & ZİL ALARMI */}
      <MutfakYeniSiparisUyarisi 
        uyari={yeniSiparisUyarisi} 
        onKapat={uyariKapat} 
        onSipariseGit={() => setAktifSekme('siparisler')} 
      />

      {/* 👑 PATRON TEST GEÇİŞ BANNERI (Yalnızca Patron/Yönetici İse Görünür) */}
      {aktifKullanici?.rol === 'yonetici' && (
        <div className="bg-gradient-to-r from-amber-600 via-purple-900 to-amber-700 text-white px-4 py-2 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span className="font-bold">EV MUTFAĞI & AŞÇI PANELİ (Patron Önizleme Modu)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => panelDegistir('vitrin')}
              className="bg-black/50 hover:bg-black/80 px-3 py-1 rounded-lg text-white font-extrabold border border-white/20 text-[11px] cursor-pointer flex items-center gap-1 transition-all"
            >
              <span>🏠 Vitrine Dön</span>
            </button>
            <button
              type="button"
              onClick={() => panelDegistir('patron')}
              className="bg-black/50 hover:bg-black/80 px-3 py-1 rounded-lg text-amber-300 font-extrabold border border-amber-400/40 text-[11px] cursor-pointer flex items-center gap-1 transition-all"
            >
              <span>👑 Patron Masasına Dön</span>
            </button>
          </div>
        </div>
      )}

      {/* Üst Başlık Barı */}
      <header className="bg-[#180A1F] border-b border-[#3E1646] px-4 py-4">
        <div className="anasayfa-genislik flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img 
              src={gorselUrlGuvenliYap((aktifKullanici as any)?.gorsel_url) || '/public/assets/aistudio/image_48081a60_bc73ebae.jpg'} 
              alt="Mutfak Logosu" 
              className="w-11 h-11 rounded-2xl object-cover bg-white/10 p-0.5 border border-amber-500/40 shadow-md shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/public/assets/aistudio/image_48081a60_bc73ebae.jpg';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-black text-sm sm:text-base">
                  {aktifKullanici?.isletme_adi || 'Fatma Teyze Afyon Ev Mutfağı'}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ 4.9 Puan
                </span>
              </div>
              <p className={`text-xs ${onayBekliyorMu ? 'text-amber-400 font-bold' : 'text-purple-300'}`}>
                {onayBekliyorMu ? '⏳ Başvuru İnceleniyor • Patron Onayı Bekleniyor' : 'Merkez / Marulcu Mah. • Onaylı Ev Aşçısı'}
              </p>
            </div>
          </div>

          {/* Mutfak Aç/Kapa & Zil & Güvenli Çıkış Butonları */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <MutfakZilButonu />

            {onayBekliyorMu ? (
              <div 
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-950/70 border border-amber-500/50 text-amber-300 select-none shadow-xs"
                title="Patron onayı tamamlandıktan sonra mutfağınız siparişe açılacaktır"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Onay Bekliyor</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleMutfakDurumu}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mutfakAcik 
                    ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 shadow-emerald-900/40 shadow-sm'
                    : 'bg-rose-950/80 border border-rose-500 text-rose-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{mutfakAcik ? 'Mutfak Açık' : 'Mutfak Kapalı'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                cikisYap();
                panelDegistir('vitrin');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="Güvenli Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Güvenli Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Gövde ve Sekmeler */}
      <main className="anasayfa-genislik px-4 pt-6 space-y-6">
        
        {/* ⚠️ ONAY BEKLİYOR BİLGİLENDİRME BANNERI */}
        {onayBekliyorMu && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3.5 text-amber-200 shadow-md">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-300">Mutfak Başvurunuz İnceleniyor (Patron Onayı Bekleniyor)</h4>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Yasal hijyen belgeniz ve esnaf muafiyet evraklarınız Patron Masası tarafından incelenmektedir. Onay işlemi tamamlanana kadar mutfağınız vitrinde listelenmez ve sipariş alımı kilitlidir. Bu esnada aşağıdaki sekmelerden menünüze yemek ekleyebilir ve belgelerinizi kontrol edebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Sekmeler (Sade: Siparişler, Menüm, Kazancım) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-purple-950">
          <button
            type="button"
            onClick={() => setAktifSekme('siparisler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'siparisler'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Ocak & Fırın ({mutfakSiparisleri.length} Sipariş)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('menum')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'menum'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <span>Tencere Menüm ({mutfakYemekleri.length} Çeşit)</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('kazanc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'kazanc'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Hakediş & Kazancım</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('tamamlanan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'tamamlanan'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Tamamlanan ({tamamlananSiparisler.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAktifSekme('belgeler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              aktifSekme === 'belgeler'
                ? 'bg-[#6D237A] text-white shadow-md'
                : 'bg-[#180A1F] text-gray-400 hover:text-white border border-[#3E1646]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>📜 Resmi İzinler & Hijyen / Muafiyet</span>
          </button>
        </div>

        {/* Sekme 1: Gelen Siparişler */}
        {aktifSekme === 'siparisler' && (
          <div className="space-y-4">
            {mutfakSiparisleri.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-50" />
                <p>Şu an ocakta bekleyen yeni sipariş bulunmuyor.</p>
              </div>
            ) : (
              mutfakSiparisleri.map((sip) => (
                <MutfakTekliSiparisKarti
                  key={sip.id}
                  siparis={sip}
                  onYenile={siparisleriYenile}
                  onIptalAc={setIptalModalSiparis}
                />
              ))
            )}
          </div>
        )}

        {/* Sekme: Tamamlanan Siparişler */}
        {aktifSekme === 'tamamlanan' && (
          <div className="space-y-4">
            {tamamlananSiparisler.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#180A1F] rounded-2xl border border-purple-900/40">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                <p>Henüz tamamlanmış sipariş bulunmuyor.</p>
              </div>
            ) : (
              tamamlananSiparisler.map((sip) => (
                <MutfakTekliSiparisKarti
                  key={sip.id}
                  siparis={sip}
                  onYenile={siparisleriYenile}
                  onIptalAc={() => {}} // Tamamlananlar iptal edilemez
                />
              ))
            )}
          </div>
        )}

        {/* Sekme 2: Menüm (Ürün Ekleme & Yönetim) */}
        {aktifSekme === 'menum' && (
          <div className="space-y-4">
            <MutfakTeslimatAyarKarti mutfakId={mutfakId} />

            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-300">Bugün Pişen {mutfakYemekleri.length} Çeşit Yemek</span>
              <button 
                onClick={() => setYemekModalAcik(true)}
                className="px-3.5 py-2 rounded-xl bg-[#6D237A] hover:bg-[#852C94] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Yemek Ekle</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mutfakYemekleri.map((yemek) => (
                <div 
                  key={yemek.id} 
                  className="p-3.5 rounded-2xl bg-[#180A1F] border border-[#3E1646] hover:border-purple-700 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img src={gorselUrlGuvenliYap(yemek.gorsel_url)} alt={yemek.baslik} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-purple-900/60" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{yemek.baslik}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{yemek.birim || 'Porsiyon'}: <strong className="text-amber-300">{yemek.fiyat} ₺</strong> • {yemek.hazirlanma_suresi || '25 dk'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {(yemek as any).onay_durumu === 'beklemede' || (yemek as any).onayli_mi === false ? (
                          <span className="inline-block text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            ⏳ Patron Onayı Bekliyor
                          </span>
                        ) : (yemek as any).onay_durumu === 'reddedildi' ? (
                          <span className="inline-block text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                            ❌ Reddedildi
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                            ✅ Vitrinde Yayında
                          </span>
                        )}
                        {yemek.secenek_gruplari && yemek.secenek_gruplari.length > 0 && (
                          <span className="text-[10px] text-amber-300 font-medium">
                            • {yemek.secenek_gruplari.length} Seçenek Grubu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDuzenlenenYemek(yemek)}
                    className="px-3 py-2 bg-purple-950/80 hover:bg-amber-500 hover:text-purple-950 border border-purple-800/80 hover:border-amber-400 text-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Düzenle</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sekme 3: Kazanç & Cüzdan */}
        {aktifSekme === 'kazanc' && (
          <MutfakCuzdanSekmesi
            mutfakId={mutfakId}
            mutfakAdi={mutfakAdi}
            toplamSatisTutari={mutfakSiparisleri.reduce((toplam, s) => toplam + (s.toplam_tutar || 0), 0)}
          />
        )}

        {/* Sekme 4: Resmi İzinler & Hukuki Belgeler */}
        {aktifSekme === 'belgeler' && (
          <MutfakBelgelerSekmesi
            mutfakAdi={mutfakAdi}
          />
        )}

      </main>

      {/* Yeni Yemek Ekleme Penceresi */}
      {yemekModalAcik && (
        <YeniYemekEklePenceresi
          mutfakId={mutfakId}
          onKapat={() => setYemekModalAcik(false)}
          onEklendi={(yeniYemek) => {
            setCanliYemekler((prev) => [yeniYemek, ...prev]);
            setGuncellemeSayaci((s) => s + 1);
          }}
        />
      )}

      {/* Mevcut Yemeği Düzenleme Penceresi */}
      {duzenlenenYemek && (
        <YemekDuzenlemePenceresi
          yemek={duzenlenenYemek}
          onKapat={() => setDuzenlenenYemek(null)}
          onGuncellendi={() => setGuncellemeSayaci((s) => s + 1)}
          onSilindi={() => setGuncellemeSayaci((s) => s + 1)}
        />
      )}

      {/* Sipariş İptal Modalı */}
      {iptalModalSiparis && (
        <SiparisIptalPenceresi
          siparisKimligi={iptalModalSiparis.id}
          siparisNo={iptalModalSiparis.kodu}
          onKapat={() => setIptalModalSiparis(null)}
          onBasarili={() => setGuncellemeSayaci((s) => s + 1)}
        />
      )}
    </div>
  );
};
