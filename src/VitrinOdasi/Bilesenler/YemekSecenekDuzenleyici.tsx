import React, { useState } from 'react';
import { Plus, Trash2, Layers, CheckSquare, Square, Sparkles } from 'lucide-react';
import { type SecenekGrubu, type SecenekOgesi } from '@/src/MalzemeCekmeceleri/UrunSecenekleri/UrunSecenekleriTipleri';

export interface YemekSecenekDuzenleyiciProps {
  kategori?: string;
  secenekGruplari: SecenekGrubu[];
  onChange: (gruplar: SecenekGrubu[]) => void;
}

export const YemekSecenekDuzenleyici: React.FC<YemekSecenekDuzenleyiciProps> = ({
  kategori,
  secenekGruplari = [],
  onChange,
}) => {
  const [yeniGrupBaslik, setYeniGrupBaslik] = useState('');
  const [yeniGrupZorunlu, setYeniGrupZorunlu] = useState(false);
  const [yeniGrupCoklu, setYeniGrupCoklu] = useState(false);

  const grupEkle = () => {
    if (!yeniGrupBaslik.trim()) return;
    const yeniGrup: SecenekGrubu = {
      kimlik: `grup_${Date.now()}`,
      baslik: yeniGrupBaslik.trim(),
      zorunlu_mu: yeniGrupZorunlu,
      coklu_secim_mi: yeniGrupCoklu,
      ogeler: [
        { kimlik: `oge_${Date.now()}_1`, baslik: 'Standart', ek_ucret: 0 }
      ],
    };
    onChange([...secenekGruplari, yeniGrup]);
    setYeniGrupBaslik('');
    setYeniGrupZorunlu(false);
    setYeniGrupCoklu(false);
  };

  const grupSil = (grupId: string) => {
    onChange(secenekGruplari.filter((g) => g.kimlik !== grupId));
  };

  const ogeEkle = (grupId: string) => {
    const guncel = secenekGruplari.map((g) => {
      if (g.kimlik !== grupId) return g;
      const yeniOge: SecenekOgesi = {
        kimlik: `oge_${Date.now()}`,
        baslik: 'Yeni Seçenek',
        ek_ucret: 0,
      };
      return { ...g, ogeler: [...g.ogeler, yeniOge] };
    });
    onChange(guncel);
  };

  const ogeGuncelle = (grupId: string, ogeId: string, baslik: string, ek_ucret: number) => {
    const guncel = secenekGruplari.map((g) => {
      if (g.kimlik !== grupId) return g;
      const ogeler = g.ogeler.map((o) => (o.kimlik === ogeId ? { ...o, baslik, ek_ucret } : o));
      return { ...g, ogeler };
    });
    onChange(guncel);
  };

  const ogeSil = (grupId: string, ogeId: string) => {
    const guncel = secenekGruplari.map((g) => {
      if (g.kimlik !== grupId) return g;
      return { ...g, ogeler: g.ogeler.filter((o) => o.kimlik !== ogeId) };
    });
    onChange(guncel);
  };

  // Hızlı Hazır Porsiyon Şablonu Ekle
  const sablonPorsiyonEkle = () => {
    const porsiyonGrubu: SecenekGrubu = {
      kimlik: `porsiyon_${Date.now()}`,
      baslik: 'Porsiyon Seçimi',
      zorunlu_mu: true,
      coklu_secim_mi: false,
      ogeler: [
        { kimlik: `p_${Date.now()}_1`, baslik: '1 Porsiyon (Standart)', ek_ucret: 0 },
        { kimlik: `p_${Date.now()}_2`, baslik: '1.5 Porsiyon (Doyurucu)', ek_ucret: 45 },
        { kimlik: `p_${Date.now()}_3`, baslik: '2 Porsiyon (Aile Boyu)', ek_ucret: 90 },
      ],
    };
    onChange([...secenekGruplari, porsiyonGrubu]);
  };

  return (
    <div className="space-y-4 pt-3 border-t border-purple-900/30">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h4 className="text-xs font-bold text-gray-200">
            Porsiyon & Opsiyonel Seçenekler (Varyasyonlar)
          </h4>
        </div>
        <button
          type="button"
          onClick={sablonPorsiyonEkle}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>+ Hazır Porsiyon Şablonu</span>
        </button>
      </div>

      {/* Mevcut Gruplar */}
      {secenekGruplari.length > 0 && (
        <div className="space-y-3">
          {secenekGruplari.map((grup) => (
            <div
              key={grup.kimlik}
              className="p-3 bg-[#120617] rounded-xl border border-purple-900/40 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{grup.baslik}</span>
                  {grup.zorunlu_mu ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800">
                      Zorunlu
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300">
                      İsteğe Bağlı
                    </span>
                  )}
                  {grup.coklu_secim_mi ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
                      Çoklu Seçim
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                      Tek Seçim
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => grupSil(grup.kimlik)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                  title="Grubu Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grup Öğeleri */}
              <div className="space-y-1.5">
                {grup.ogeler.map((oge) => (
                  <div key={oge.kimlik} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={oge.baslik}
                      onChange={(e) => ogeGuncelle(grup.kimlik, oge.kimlik, e.target.value, oge.ek_ucret)}
                      className="flex-1 px-2.5 py-1 text-xs bg-[#1a0a22] border border-purple-900/50 rounded-lg text-gray-200 focus:outline-none focus:border-purple-600"
                      placeholder="Seçenek Adı (Örn: 1.5 Porsiyon, Acılı)"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">+</span>
                      <input
                        type="number"
                        min="0"
                        value={oge.ek_ucret}
                        onChange={(e) => ogeGuncelle(grup.kimlik, oge.kimlik, oge.baslik, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs bg-[#1a0a22] border border-purple-900/50 rounded-lg text-amber-300 font-bold text-right focus:outline-none"
                      />
                      <span className="text-[11px] text-gray-400">₺</span>
                    </div>
                    {grup.ogeler.length > 1 && (
                      <button
                        type="button"
                        onClick={() => ogeSil(grup.kimlik, oge.kimlik)}
                        className="p-1 text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => ogeEkle(grup.kimlik)}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Yeni Seçenek Ekle</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Grup Ekleme Alanı */}
      <div className="p-3 bg-[#120617] rounded-xl border border-dashed border-purple-900/60 space-y-2.5">
        <span className="text-[11px] text-gray-400 font-medium">Yeni Seçenek Grubu Oluştur:</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={yeniGrupBaslik}
            onChange={(e) => setYeniGrupBaslik(e.target.value)}
            placeholder="Grup Başlığı (Örn: Sos Tercihi, İçecek, Porsiyon)"
            className="flex-1 px-3 py-1.5 text-xs bg-[#1a0a22] border border-purple-900/50 rounded-lg text-gray-200 focus:outline-none"
          />
          <button
            type="button"
            onClick={grupEkle}
            className="px-3 py-1.5 bg-[#6D237A] hover:bg-[#852C94] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Grubu Ekle</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={yeniGrupZorunlu}
              onChange={(e) => setYeniGrupZorunlu(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Zorunlu Seçim</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={yeniGrupCoklu}
              onChange={(e) => setYeniGrupCoklu(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Çoklu Seçim (Birden fazla seçilebilir)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
