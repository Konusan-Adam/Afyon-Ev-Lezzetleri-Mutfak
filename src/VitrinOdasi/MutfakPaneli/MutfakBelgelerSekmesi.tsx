import React, { useState, useEffect } from 'react';
import {
  Award,
  FileCheck2,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2
} from 'lucide-react';
import { RESMI_BELGE_REHBERI } from '@/src/MalzemeCekmeceleri/MutfakYonetimi/BelgelerVeIzinler';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';

interface MutfakBelgelerSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
}

const VARSAYILAN_MUTFAK_IDLER = ['m1', 'asci_fatma_01', 'mutfak-fatma-teyze', 'mutfak-1'];

function mutfakBelgesiEslesirMi(doc: any, mutfakId: string): boolean {
  const docId = doc?.id || doc?.kimlik;
  if (!docId) return false;
  if (docId === mutfakId) return true;
  return VARSAYILAN_MUTFAK_IDLER.includes(mutfakId) && VARSAYILAN_MUTFAK_IDLER.includes(docId);
}

export const MutfakBelgelerSekmesi: React.FC<MutfakBelgelerSekmesiProps> = ({
  mutfakId,
  mutfakAdi,
}) => {
  const [hijyenNo, setHijyenNo] = useState('');
  const [hijyenKurum, setHijyenKurum] = useState('');
  const [hijyenTarih, setHijyenTarih] = useState('');
  const [hijyenOnayli, setHijyenOnayli] = useState(false);

  const [muafiyetNo, setMuafiyetNo] = useState('');
  const [vergiDairesi, setVergiDairesi] = useState('');
  const [muafiyetTarih, setMuafiyetTarih] = useState('');
  const [muafiyetOnayli, setMuafiyetOnayli] = useState(false);

  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      setYukleniyor(true);
      if (canliFirebaseAktifMi() && mutfakId) {
        try {
          const mutfaklar = await koleksiyonGetir<any>('mutfaklar');
          const mutfak = mutfaklar.find((m) => mutfakBelgesiEslesirMi(m, mutfakId));
          if (aktif && mutfak) {
            const b = mutfak.belgeler || {};
            setHijyenNo(b.hijyenBarkodNo || b.hijyenNo || '');
            setHijyenKurum(b.hijyenKurum || '');
            setHijyenTarih(b.hijyenVerilisTarihi || b.hijyenTarih || '');
            setHijyenOnayli(Boolean(mutfak.hijyen_onayli_mi || b.hijyenOnayDurumu === 'onaylandi'));

            setMuafiyetNo(b.vergiMuafiyetNo || b.muafiyetNo || '');
            setVergiDairesi(b.vergiDairesi || '');
            setMuafiyetTarih(b.muafiyetVerilisTarihi || b.muafiyetTarih || '');
            setMuafiyetOnayli(Boolean(mutfak.esnaf_muafiyet_onayli_mi || b.muafiyetOnayDurumu === 'onaylandi'));
          }
        } catch (err) {
          console.warn('Belgeler okunamadı:', err);
        }
      }
      if (aktif) setYukleniyor(false);
    };
    yukle();
    return () => { aktif = false; };
  }, [mutfakId]);

  const guncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    setKaydedildi(false);

    if (!hijyenNo.trim() && !muafiyetNo.trim()) {
      setHata('Lütfen en az bir resmi belge barkod veya sicil numarası giriniz.');
      return;
    }

    setKaydediliyor(true);
    try {
      const belgelerVerisi = {
        hijyenBelgesiVarMi: Boolean(hijyenNo.trim()),
        hijyenBarkodNo: hijyenNo.trim(),
        hijyenKurum: hijyenKurum.trim(),
        hijyenVerilisTarihi: hijyenTarih,
        hijyenOnayDurumu: hijyenOnayli ? 'onaylandi' : (hijyenNo.trim() ? 'onay_bekliyor' : 'yuklenmedi'),

        esnafMuafiyetVarMi: Boolean(muafiyetNo.trim()),
        vergiMuafiyetNo: muafiyetNo.trim(),
        vergiDairesi: vergiDairesi.trim(),
        muafiyetVerilisTarihi: muafiyetTarih,
        muafiyetOnayDurumu: muafiyetOnayli ? 'onaylandi' : (muafiyetNo.trim() ? 'onay_bekliyor' : 'yuklenmedi'),

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
              Afyon Ev Lezzetleri platformunda ev mutfağınızın yasal koruma altında faaliyet göstermesi için gerekli resmi kayıtlar.
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
          <span>Belge bilgileriniz Firestore veritabanına kalıcı olarak kaydedildi ve incelemeye iletildi.</span>
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
              <div className="flex items-center justify-between border-b border-purple-950 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-xs sm:text-sm">MEB Hijyen Eğitimi Belgesi</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  hijyenOnayli
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700'
                }`}>
                  {hijyenOnayli ? '✓ Patron Onaylı' : hijyenNo ? 'İncelemede' : 'Eksik'}
                </span>
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
                    onChange={(e) => setHijyenNo(e.target.value)}
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
              <div className="flex items-center justify-between border-b border-purple-950 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-xs sm:text-sm">GVK 9/10 Esnaf Vergi Muafiyeti</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  muafiyetOnayli
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700'
                }`}>
                  {muafiyetOnayli ? '✓ Patron Onaylı' : muafiyetNo ? 'İncelemede' : 'Eksik'}
                </span>
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
                    onChange={(e) => setMuafiyetNo(e.target.value)}
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
