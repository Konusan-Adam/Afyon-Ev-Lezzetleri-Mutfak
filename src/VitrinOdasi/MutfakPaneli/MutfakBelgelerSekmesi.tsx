import React, { useState, useEffect } from 'react';
import {
  Award,
  FileCheck2,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import {
  RESMI_BELGE_REHBERI,
  BelgeBeyanDurumu,
  belgeBeyaniniCozumle,
  belgeDurumOzetiGetir,
} from '@/src/MalzemeCekmeceleri/MutfakYonetimi/BelgelerVeIzinler';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, belgeGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { BelgeGorselYuklemeKutusu } from './BelgeGorselYuklemeKutusu';

interface MutfakBelgelerSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
  mutfakKaydi?: any;
}

const VARSAYILAN_MUTFAK_IDLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function mutfakBelgesiEslesirMi(doc: any, mutfakId: string): boolean {
  const docId = doc?.id || doc?.kimlik;
  if (!docId && !doc?.sahip_id) return false;
  if (docId === mutfakId || doc?.sahip_id === mutfakId) return true;
  return VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(docId);
}

export const MutfakBelgelerSekmesi: React.FC<MutfakBelgelerSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
  mutfakKaydi,
}) => {
  const { aktifKullanici, aktifKullaniciBilgisiGuncelle } = kullaniciHafizasiKullan();

  const [hijyenNo, setHijyenNo] = useState('');
  const [hijyenKurum, setHijyenKurum] = useState('');
  const [hijyenTarih, setHijyenTarih] = useState('');
  const [hijyenOnayli, setHijyenOnayli] = useState(false);
  const [hijyenBeyan, setHijyenBeyan] = useState<BelgeBeyanDurumu>('');
  const [hijyenGorselUrl, setHijyenGorselUrl] = useState('');

  const [muafiyetNo, setMuafiyetNo] = useState('');
  const [vergiDairesi, setVergiDairesi] = useState('');
  const [muafiyetTarih, setMuafiyetTarih] = useState('');
  const [muafiyetOnayli, setMuafiyetOnayli] = useState(false);
  const [muafiyetBeyan, setMuafiyetBeyan] = useState<BelgeBeyanDurumu>('');
  const [muafiyetGorselUrl, setMuafiyetGorselUrl] = useState('');

  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      setYukleniyor(true);

      let bulunanMutfak = mutfakKaydi || null;
      let kullaniciKaydi: any = aktifKullanici || null;

      if (canliFirebaseAktifMi() && mutfakId) {
        try {
          const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
          const eslesenMutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
          if (eslesenMutfak) bulunanMutfak = eslesenMutfak;

          const kullaniciId =
            eslesenMutfak?.sahip_id ||
            aktifKullanici?.kimlik ||
            aktifKullanici?.id ||
            mutfakId;
          if (kullaniciId) {
            const k = await belgeGetir<any>('kullanicilar', kullaniciId);
            if (k) kullaniciKaydi = k;
          }
        } catch (err) {
          console.warn('Belgeler okunamadı:', err);
        }
      }

      if (aktif) {
        const b = bulunanMutfak?.belgeler || {};
        const hNo = b.hijyenBarkodNo || b.hijyenNo || '';
        const hGorsel = b.hijyenBelgeGorseliUrl || '';
        const mNo = b.vergiMuafiyetNo || b.muafiyetNo || '';
        const mGorsel = b.muafiyetBelgeGorseliUrl || '';

        setHijyenNo(hNo);
        setHijyenKurum(b.hijyenKurum || '');
        setHijyenTarih(b.hijyenVerilisTarihi || b.hijyenTarih || '');
        setHijyenOnayli(Boolean(bulunanMutfak?.hijyen_onayli_mi || b.hijyenOnayDurumu === 'onaylandi'));
        setHijyenGorselUrl(hGorsel);
        setHijyenBeyan(
          belgeBeyaniniCozumle(hNo, b.hijyenBelgesiVarMi, kullaniciKaydi?.hijyen_belgesi_durumu, hGorsel)
        );

        setMuafiyetNo(mNo);
        setVergiDairesi(b.vergiDairesi || '');
        setMuafiyetTarih(b.muafiyetVerilisTarihi || b.muafiyetTarih || '');
        setMuafiyetOnayli(Boolean(bulunanMutfak?.esnaf_muafiyet_onayli_mi || b.muafiyetOnayDurumu === 'onaylandi'));
        setMuafiyetGorselUrl(mGorsel);
        setMuafiyetBeyan(
          belgeBeyaniniCozumle(mNo, b.esnafMuafiyetVarMi, kullaniciKaydi?.esnaf_muafiyet_durumu, mGorsel)
        );
        setYukleniyor(false);
      }
    };
    yukle();
    return () => { aktif = false; };
  }, [mutfakId, mutfakKaydi, aktifKullanici?.kimlik, aktifKullanici?.hijyen_belgesi_durumu, aktifKullanici?.esnaf_muafiyet_durumu]);

  const guncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    setKaydedildi(false);

    if (
      !hijyenNo.trim() &&
      !muafiyetNo.trim() &&
      !hijyenGorselUrl.trim() &&
      !muafiyetGorselUrl.trim() &&
      !hijyenBeyan &&
      !muafiyetBeyan
    ) {
      setHata('Lütfen en az bir resmi belge numarası, görseli veya beyan durumu seçiniz.');
      return;
    }

    setKaydediliyor(true);
    try {
      const sonHijyenBeyan: BelgeBeyanDurumu =
        hijyenNo.trim() || hijyenGorselUrl.trim() ? 'evet' : hijyenBeyan;
      const sonMuafiyetBeyan: BelgeBeyanDurumu =
        muafiyetNo.trim() || muafiyetGorselUrl.trim() ? 'evet' : muafiyetBeyan;

      const hijyenVarMi = sonHijyenBeyan === 'evet';
      const muafiyetVarMi = sonMuafiyetBeyan === 'evet';

      const belgelerVerisi = {
        hijyenBelgesiVarMi: hijyenVarMi,
        hijyenBarkodNo: hijyenNo.trim(),
        hijyenBelgeGorseliUrl: hijyenGorselUrl.trim(),
        hijyenKurum: hijyenKurum.trim(),
        hijyenVerilisTarihi: hijyenTarih,
        hijyenOnayDurumu: hijyenOnayli ? 'onaylandi' : (hijyenVarMi ? 'onay_bekliyor' : 'yuklenmedi'),

        esnafMuafiyetVarMi: muafiyetVarMi,
        vergiMuafiyetNo: muafiyetNo.trim(),
        muafiyetBelgeGorseliUrl: muafiyetGorselUrl.trim(),
        vergiDairesi: vergiDairesi.trim(),
        muafiyetVerilisTarihi: muafiyetTarih,
        muafiyetOnayDurumu: muafiyetOnayli ? 'onaylandi' : (muafiyetVarMi ? 'onay_bekliyor' : 'yuklenmedi'),

        sonGuncellemeTarihi: new Date().toISOString(),
      };

      if (canliFirebaseAktifMi() && mutfakId) {
        const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
        const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
        const hedefId = mutfak ? (mutfak.id || mutfak.kimlik) : mutfakId;

        const basarili = await belgeKaydet('mutfaklar', hedefId, {
          ...(mutfak || {}),
          id: hedefId,
          ad: mutfak?.ad || mutfakAdi,
          belgeler: {
            ...(mutfak?.belgeler || {}),
            ...belgelerVerisi,
          },
        });

        if (!basarili) {
          setHata('Belge bilgileri veritabanına kaydedilemedi.');
          return;
        }

        const kullaniciHedefId =
          mutfak?.sahip_id ||
          aktifKullanici?.kimlik ||
          aktifKullanici?.id ||
          hedefId;
        if (kullaniciHedefId) {
          await belgeKaydet('kullanicilar', kullaniciHedefId, {
            hijyen_belgesi_durumu: sonHijyenBeyan || 'hayir_alacagim',
            esnaf_muafiyet_durumu: sonMuafiyetBeyan || 'hayir_alacagim',
          });
        }
      }

      setHijyenBeyan(sonHijyenBeyan);
      setMuafiyetBeyan(sonMuafiyetBeyan);
      if (aktifKullanici && (aktifKullanici.kimlik === mutfakId || aktifKullanici.id === mutfakId || mutfakKaydi?.sahip_id === aktifKullanici.kimlik)) {
        aktifKullaniciBilgisiGuncelle({
          hijyen_belgesi_durumu: sonHijyenBeyan || 'hayir_alacagim',
          esnaf_muafiyet_durumu: sonMuafiyetBeyan || 'hayir_alacagim',
        });
      }

      patronBildirimiEkle(
        'eksik_belge',
        'Mutfak Resmi Belgeleri Güncellendi 📜',
        `${mutfakAdi} hijyen/muafiyet belge bilgilerini güncelledi. İnceleme için hazır.`,
        mutfakId
      );

      setKaydedildi(true);
      setTimeout(() => setKaydedildi(false), 3500);
    } catch (err) {
      console.warn('Belge güncelleme hatası:', err);
      setHata('Belgeler güncellenirken bir hata oluştu.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const yasalUygunMu = hijyenOnayli && muafiyetOnayli;
  const hijyenDurum = belgeDurumOzetiGetir(
    hijyenOnayli,
    hijyenNo,
    hijyenBeyan,
    'e-Devlet Belge Barkod No',
    hijyenGorselUrl
  );
  const muafiyetDurum = belgeDurumOzetiGetir(
    muafiyetOnayli,
    muafiyetNo,
    muafiyetBeyan,
    'Muafiyet Belge / Sicil No',
    muafiyetGorselUrl
  );

  return (
    <form onSubmit={guncelle} className="space-y-6">
      {/* Üst Bilgilendirme Kartı */}
      <div className="p-4 rounded-2xl bg-[#1A081D] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-900/50 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2 flex-wrap">
              <span>{mutfakAdi} — Resmi Yasal İzin & Belge Dosyası</span>
              {yasalUygunMu ? (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  ✓ Yasal Satışa Uygun
                </span>
              ) : (
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                  ⏳ Onay / Evrak Bekleniyor
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Kayıt sırasında verdiğiniz beyanlar otomatik aktarılır; belge numaralarınızı girip kaydettiğinizde Patron incelemesine iletilir.
            </p>
          </div>
        </div>
      </div>

      {hata && (
        <div className="p-3 bg-rose-950/80 border border-rose-600 text-rose-200 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{hata}</span>
        </div>
      )}

      {kaydedildi && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Belge bilgileriniz ve beyan durumunuz veritabanına kalıcı olarak kaydedildi ve incelemeye iletildi.</span>
        </div>
      )}

      {yukleniyor ? (
        <div className="py-10 flex items-center justify-center gap-2 text-xs text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Mutfak belge kayıtları yükleniyor...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. KART: MEB Hijyen Eğitimi Belgesi */}
          <div className="p-5 rounded-2xl bg-[#180A1F] border border-[#3E1646] space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-purple-950 pb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <h4 className="font-bold text-white text-xs sm:text-sm">MEB Hijyen Eğitimi Belgesi</h4>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${hijyenDurum.rozetSinifi}`}>
                  {hijyenDurum.rozetMetni}
                </span>
              </div>

              {hijyenDurum.bilgiNotu && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{hijyenDurum.bilgiNotu}</span>
                </div>
              )}

              {/* Kayıt / Belge Beyanı Senkron Seçici */}
              <div className="p-2.5 rounded-xl bg-[#240C28] border border-purple-900/60 space-y-1.5">
                <span className="block text-[10px] font-bold text-purple-200 uppercase tracking-wider">
                  Kayıt / Mevcut Belge Beyanınız
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHijyenBeyan('evet')}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      hijyenBeyan === 'evet'
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                        : 'bg-[#180A1F] border-purple-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    ✓ Evet, var
                  </button>
                  <button
                    type="button"
                    onClick={() => setHijyenBeyan('hayir_alacagim')}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      hijyenBeyan === 'hayir_alacagim'
                        ? 'bg-amber-900/50 border-amber-500 text-amber-200'
                        : 'bg-[#180A1F] border-purple-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    ⏳ Hayır, yok (Alacağım)
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-gray-300 bg-purple-950/30 p-2.5 rounded-xl border border-purple-900/40 leading-relaxed">
                <p className="font-semibold text-[#DDAF53]">{RESMI_BELGE_REHBERI.hijyen.kanun}</p>
                <p className="mt-1 text-gray-400">{RESMI_BELGE_REHBERI.hijyen.nasilAlinir}</p>
                <a
                  href={RESMI_BELGE_REHBERI.hijyen.eDevletLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-amber-300 hover:text-white flex items-center gap-1 font-bold underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>e-Devlet MEB Sertifika Sorgulama Ekranı</span>
                </a>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">e-Devlet Belge Barkod No</label>
                  <input
                    type="text"
                    value={hijyenNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHijyenNo(val);
                      if (val.trim()) setHijyenBeyan('evet');
                    }}
                    placeholder="Örn: MEB-2026-AFY-..."
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Veren Kurum</label>
                  <input
                    type="text"
                    value={hijyenKurum}
                    onChange={(e) => setHijyenKurum(e.target.value)}
                    placeholder="Örn: Afyonkarahisar Halk Eğitimi Merkezi"
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Belge Veriliş Tarihi</label>
                  <input
                    type="date"
                    value={hijyenTarih}
                    onChange={(e) => setHijyenTarih(e.target.value)}
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <BelgeGorselYuklemeKutusu
                  etiket="Hijyen Belgesi Fotoğrafı"
                  gorselUrl={hijyenGorselUrl}
                  onGorselDegistir={(url) => {
                    setHijyenGorselUrl(url);
                    if (url) setHijyenBeyan('evet');
                  }}
                  onHata={(msg) => setHata(msg)}
                />
              </div>
            </div>

            <div className="pt-2 text-[10px] text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Tarım & Orman Bakanlığı standartlarına tam uyumludur.</span>
            </div>
          </div>

          {/* 2. KART: GVK Esnaf Vergi Muafiyet Belgesi */}
          <div className="p-5 rounded-2xl bg-[#180A1F] border border-[#3E1646] space-y-4 shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-purple-950 pb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <h4 className="font-bold text-white text-xs sm:text-sm">GVK 9/10 Esnaf Vergi Muafiyeti</h4>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${muafiyetDurum.rozetSinifi}`}>
                  {muafiyetDurum.rozetMetni}
                </span>
              </div>

              {muafiyetDurum.bilgiNotu && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{muafiyetDurum.bilgiNotu}</span>
                </div>
              )}

              {/* Kayıt / Belge Beyanı Senkron Seçici */}
              <div className="p-2.5 rounded-xl bg-[#240C28] border border-purple-900/60 space-y-1.5">
                <span className="block text-[10px] font-bold text-purple-200 uppercase tracking-wider">
                  Kayıt / Mevcut Belge Beyanınız
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMuafiyetBeyan('evet')}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      muafiyetBeyan === 'evet'
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                        : 'bg-[#180A1F] border-purple-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    ✓ Evet, var
                  </button>
                  <button
                    type="button"
                    onClick={() => setMuafiyetBeyan('hayir_alacagim')}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      muafiyetBeyan === 'hayir_alacagim'
                        ? 'bg-amber-900/50 border-amber-500 text-amber-200'
                        : 'bg-[#180A1F] border-purple-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    ⏳ Hayır, yok (Alacağım)
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-gray-300 bg-purple-950/30 p-2.5 rounded-xl border border-purple-900/40 leading-relaxed">
                <p className="font-semibold text-[#DDAF53]">{RESMI_BELGE_REHBERI.esnafMuafiyeti.kanun}</p>
                <p className="mt-1 text-gray-400">{RESMI_BELGE_REHBERI.esnafMuafiyeti.nasilAlinir}</p>
                <a
                  href={RESMI_BELGE_REHBERI.esnafMuafiyeti.eDevletLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-amber-300 hover:text-white flex items-center gap-1 font-bold underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Dijital Vergi Dairesi (ivd.gib.gov.tr)</span>
                </a>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Muafiyet Belge / Sicil No</label>
                  <input
                    type="text"
                    value={muafiyetNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMuafiyetNo(val);
                      if (val.trim()) setMuafiyetBeyan('evet');
                    }}
                    placeholder="Örn: GVK-03-2026-..."
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Bağlı Olunan Vergi Dairesi</label>
                  <input
                    type="text"
                    value={vergiDairesi}
                    onChange={(e) => setVergiDairesi(e.target.value)}
                    placeholder="Örn: Afyonkarahisar Kocatepe Vergi Dairesi"
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Belge Veriliş Tarihi</label>
                  <input
                    type="date"
                    value={muafiyetTarih}
                    onChange={(e) => setMuafiyetTarih(e.target.value)}
                    className="w-full bg-[#240C28] border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <BelgeGorselYuklemeKutusu
                  etiket="Esnaf Muafiyet Belgesi Fotoğrafı"
                  gorselUrl={muafiyetGorselUrl}
                  onGorselDegistir={(url) => {
                    setMuafiyetGorselUrl(url);
                    if (url) setMuafiyetBeyan('evet');
                  }}
                  onHata={(msg) => setHata(msg)}
                />
              </div>
            </div>

            <div className="pt-2 text-[10px] text-gray-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Ev hanımları için şirket kurmadan yasal satış sağlar.</span>
            </div>
          </div>
        </div>
      )}

      {/* Kaydet Butonu */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={kaydediliyor || yukleniyor}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-gray-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
        >
          {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{kaydediliyor ? 'Kaydediliyor...' : 'Belge Bilgilerini Kaydet ve Güncelle'}</span>
        </button>
      </div>
    </form>
  );
};
