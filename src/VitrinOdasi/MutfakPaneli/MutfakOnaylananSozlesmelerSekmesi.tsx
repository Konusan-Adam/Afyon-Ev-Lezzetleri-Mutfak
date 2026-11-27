import React, { useEffect, useState, useMemo } from 'react';
import {
  FileCheck2,
  Download,
  Eye,
  ShieldCheck,
  FileCode2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { kullaniciHafizasiKullan } from '@/src/OrtakHavuz/KullaniciHafizasi';
import { hukukiDelilDamgalaVeKaydet } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukiDelilServisi';
import { HukukiOnayLogu, HukukiSozlesme } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/tipler';
import {
  EK_MUTFAK_SOZLESME_TANIMLARI,
  MutfakKimlikOzeti,
  damgaDurumuEtiketi,
  islemTuruTurkce,
  mutfakOnayLoglariniGetir,
  mutfakSozlesmeHaritasiGetir,
  sozlesmeBasligiBul,
  sozlesmeBelgesiHtmlIndir,
  tsaTokenDosyasiIndir,
} from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/mutfakSozlesmeIndirmeServisi';
import {
  hukukiSozlesmeleriCanliDinle,
  mutfakKayitSozlesmeleriniFiltrele,
} from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukDeposu';
import { MutfakSozlesmeOnizlemeModali } from './MutfakSozlesmeOnizlemeModali';

interface MutfakOnaylananSozlesmelerSekmesiProps {
  mutfakId: string;
  mutfakAdi: string;
  mutfakKaydi?: any;
}

export const MutfakOnaylananSozlesmelerSekmesi: React.FC<
  MutfakOnaylananSozlesmelerSekmesiProps
> = ({ mutfakId, mutfakAdi, mutfakKaydi }) => {
  const { aktifKullanici } = kullaniciHafizasiKullan();

  const [sozlesmeHaritasi, setSozlesmeHaritasi] = useState<Record<string, HukukiSozlesme>>({});
  const [onayLoglari, setOnayLoglari] = useState<HukukiOnayLogu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [damgalananTur, setDamgalananTur] = useState<string | null>(null);
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const [seciliOnizleme, setSeciliOnizleme] = useState<{
    sozlesme: HukukiSozlesme;
    onayLogu: HukukiOnayLogu | null;
  } | null>(null);

  const mutfakBilgisi: MutfakKimlikOzeti = useMemo(
    () => ({
      mutfakId,
      mutfakAdi,
      kullaniciKimlik: aktifKullanici?.kimlik || aktifKullanici?.id || mutfakId,
      telefon: aktifKullanici?.telefon || mutfakKaydi?.telefon,
      adSoyad: aktifKullanici?.ad_soyad || mutfakAdi,
    }),
    [mutfakId, mutfakAdi, aktifKullanici, mutfakKaydi?.telefon]
  );

  const verileriYukle = async () => {
    setYukleniyor(true);
    try {
      const [harita, loglar] = await Promise.all([
        mutfakSozlesmeHaritasiGetir(),
        mutfakOnayLoglariniGetir(mutfakBilgisi),
      ]);
      setSozlesmeHaritasi(harita);
      setOnayLoglari(loglar);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    verileriYukle();
    const abonelikDurdur = hukukiSozlesmeleriCanliDinle((canliHarita) => {
      setSozlesmeHaritasi({
        ...EK_MUTFAK_SOZLESME_TANIMLARI,
        ...canliHarita,
      });
    });
    return () => abonelikDurdur();
  }, [mutfakBilgisi.mutfakId, mutfakBilgisi.kullaniciKimlik, mutfakBilgisi.telefon]);

  const enSonOnayLoguBul = (sozlesmeTuru: string): HukukiOnayLogu | null => {
    return (
      onayLoglari.find(
        (log) => log.sozlesmeTuru === sozlesmeTuru && log.onaylandiMi !== false
      ) || null
    );
  };

  const simdiZamanDamgasiOlustur = async (sozlesme: HukukiSozlesme) => {
    setDamgalananTur(sozlesme.tur);
    try {
      const yeniLog = await hukukiDelilDamgalaVeKaydet({
        sozlesmeTuru: sozlesme.tur,
        sozlesmeVersiyonu: sozlesme.versiyon || '1.0.0',
        sozlesmeIcerigi: sozlesme.icerik,
        islemTuru: sozlesme.tur === 'iptal_iade_kosullari' ? 'ozel_onay' : 'kayit',
        onaylandiMi: true,
        ilgiliKayitId: mutfakBilgisi.mutfakId,
        kullaniciKimlik: mutfakBilgisi.kullaniciKimlik,
        kullaniciTelefon: mutfakBilgisi.telefon,
        kullaniciAdSoyad: mutfakBilgisi.adSoyad,
        ekDetay: {
          kaynak: 'mutfak_panel_sozlesmelerim',
          isletmeAdi: mutfakBilgisi.mutfakAdi,
        },
      });
      setOnayLoglari((onceki) => [
        yeniLog,
        ...onceki.filter((x) => x.kimlik !== yeniLog.kimlik),
      ]);
      setSeciliOnizleme((mevcut) =>
        mevcut && mevcut.sozlesme.tur === sozlesme.tur
          ? { sozlesme, onayLogu: yeniLog }
          : mevcut
      );
    } finally {
      setDamgalananTur(null);
    }
  };

  const temelSozlesmeler = useMemo(() => {
    const canliListe = mutfakKayitSozlesmeleriniFiltrele(sozlesmeHaritasi);
    const eklenenTurler = new Set(canliListe.map((s) => s.tur));

    // Kayıt veya geçmiş onay loglarında bulunan ancak güncel listede gizli kalmış türleri de ekle
    const ekLogSozlesmeleri: HukukiSozlesme[] = [];
    for (const log of onayLoglari) {
      if (log.islemTuru === 'kayit' && log.sozlesmeTuru && !eklenenTurler.has(log.sozlesmeTuru)) {
        const tanim = sozlesmeHaritasi[log.sozlesmeTuru];
        if (tanim) {
          eklenenTurler.add(log.sozlesmeTuru);
          ekLogSozlesmeleri.push(tanim);
        }
      }
    }
    return [...canliListe, ...ekLogSozlesmeleri];
  }, [sozlesmeHaritasi, onayLoglari]);

  const operasyonelDamgalar = useMemo(() => {
    return onayLoglari.filter((log) => log.islemTuru !== 'kayit').slice(0, 15);
  }, [onayLoglari]);

  const rfcDamgaliSayisi = useMemo(() => {
    return temelSozlesmeler.filter((s) => enSonOnayLoguBul(s.tur)?.damgaDurumu === 'rfc3161_onayli').length;
  }, [temelSozlesmeler, onayLoglari]);

  return (
    <div className="space-y-4">
      {/* Üst Bilgi Bandı */}
      <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-emerald-200">
              RFC 3161 &amp; SHA-256 Zaman Damgalı Hukuki Arşiv
            </p>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Kayıt sırasında ve panel içinde onayladığınız sözleşmeleri tam doğrulama mührü (.html) ve kriptografik zaman damgası (.tsr) olarak cihazınıza indirebilirsiniz.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={verileriYukle}
          disabled={yukleniyor}
          className="p-2 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 cursor-pointer shrink-0"
          title="Kayıtları yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${yukleniyor ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* İstatistik Özeti */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-xl bg-[#120618] border border-purple-900/50 p-3">
          <span className="text-[11px] text-gray-400 block">Kayıtlı Sözleşme Sayısı</span>
          <span className="text-base font-extrabold text-white">
            {temelSozlesmeler.filter((s) => Boolean(enSonOnayLoguBul(s.tur))).length} / {temelSozlesmeler.length}
          </span>
        </div>
        <div className="rounded-xl bg-[#120618] border border-purple-900/50 p-3">
          <span className="text-[11px] text-gray-400 block">RFC 3161 TSA Damgalı</span>
          <span className="text-base font-extrabold text-emerald-300">{rfcDamgaliSayisi} Belge</span>
        </div>
      </div>

      {yukleniyor ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-purple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Onaylanan sözleşmeleriniz yükleniyor...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {temelSozlesmeler.map((sozlesme) => {
            const log = enSonOnayLoguBul(sozlesme.tur);
            const etiket = log ? damgaDurumuEtiketi(log.damgaDurumu) : null;
            const buDamgalaniyor = damgalananTur === sozlesme.tur;

            return (
              <div
                key={sozlesme.tur}
                className="rounded-xl bg-[#120618] border border-purple-900/60 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <FileCheck2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {sozlesme.kisaBaslik || sozlesme.baslik}
                      </h4>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        v{log?.sozlesmeVersiyonu || sozlesme.versiyon}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                      {sozlesme.baslik}
                    </p>
                  </div>

                  {etiket ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${etiket.renkSinifi}`}
                    >
                      {etiket.metin}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-amber-500/10 text-amber-300 border-amber-500/30 shrink-0">
                      Damga Bekliyor
                    </span>
                  )}
                </div>

                {log ? (
                  <div className="text-[11px] text-gray-300 bg-purple-950/30 rounded-lg px-2.5 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>Onay: <strong className="text-white">{log.tarihSaat}</strong></span>
                      <span className="font-mono text-[10px] text-purple-200">IP: {log.ipAdresi}</span>
                    </div>
                    {log.ozetHash && (
                      <div className="font-mono text-[10px] text-emerald-300/90 truncate">
                        SHA-256: {log.ozetHash}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-200/90">
                    Zaman damgası altyapısından önce açılan hesaplar için sözleşmeyi şimdi damgalayarak arşivleyebilirsiniz.
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <button
                    type="button"
                    onClick={() => setSeciliOnizleme({ sozlesme, onayLogu: log })}
                    className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 text-purple-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Oku &amp; Doğrula</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sozlesmeBelgesiHtmlIndir(sozlesme, log, mutfakBilgisi)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-purple-950 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Belgeyi İndir</span>
                  </button>

                  {log?.tsaTokenBase64 && (
                    <button
                      type="button"
                      onClick={() => tsaTokenDosyasiIndir(log)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>.tsr İndir</span>
                    </button>
                  )}

                  {!log && (
                    <button
                      type="button"
                      onClick={() => simdiZamanDamgasiOlustur(sozlesme)}
                      disabled={buDamgalaniyor}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {buDamgalaniyor ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Damgalı Onayla</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Son Operasyonel Zaman Damgaları */}
      {operasyonelDamgalar.length > 0 && (
        <div className="rounded-xl bg-[#120618] border border-purple-900/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setGecmisAcik((v) => !v)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer hover:bg-purple-950/30"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-purple-200">
              <History className="w-4 h-4 text-amber-300" />
              <span>Diğer Zaman Damgalı İşlemler ({operasyonelDamgalar.length})</span>
            </div>
            {gecmisAcik ? (
              <ChevronUp className="w-4 h-4 text-purple-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-300" />
            )}
          </button>

          {gecmisAcik && (
            <div className="px-3.5 pb-3 space-y-2 border-t border-purple-900/40 pt-2.5">
              {operasyonelDamgalar.map((log) => {
                const eslesenSozlesme = sozlesmeHaritasi[log.sozlesmeTuru] || {
                  tur: log.sozlesmeTuru,
                  baslik: sozlesmeBasligiBul(log.sozlesmeTuru, sozlesmeHaritasi),
                  kisaBaslik: islemTuruTurkce(log.islemTuru),
                  versiyon: log.sozlesmeVersiyonu || '1.0.0',
                  guncellenmeTarihi: (log.sunucuUtc || '').slice(0, 10) || '-',
                  zorunluMu: false,
                  icerik: `İşlem Türü: ${islemTuruTurkce(log.islemTuru)}\nİlgili Kayıt: ${log.ilgiliKayitId || '-'}\nTarih: ${log.tarihSaat}`,
                };

                return (
                  <div
                    key={log.kimlik}
                    className="rounded-lg bg-purple-950/30 border border-purple-900/40 p-2.5 flex items-center justify-between gap-2 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">
                        {islemTuruTurkce(log.islemTuru)}
                        {log.ilgiliKayitId ? ` • #${log.ilgiliKayitId}` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {log.tarihSaat} • {damgaDurumuEtiketi(log.damgaDurumu).metin}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => sozlesmeBelgesiHtmlIndir(eslesenSozlesme, log, mutfakBilgisi)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>İndir</span>
                      </button>
                      {log.tsaTokenBase64 && (
                        <button
                          type="button"
                          onClick={() => tsaTokenDosyasiIndir(log)}
                          className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 text-[10px] font-bold cursor-pointer"
                        >
                          .tsr
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {seciliOnizleme && (
        <MutfakSozlesmeOnizlemeModali
          sozlesme={seciliOnizleme.sozlesme}
          onayLogu={seciliOnizleme.onayLogu}
          mutfakBilgisi={mutfakBilgisi}
          damgalaniyor={damgalananTur === seciliOnizleme.sozlesme.tur}
          onSimdiOnayla={() => simdiZamanDamgasiOlustur(seciliOnizleme.sozlesme)}
          onKapat={() => setSeciliOnizleme(null)}
        />
      )}
    </div>
  );
};
