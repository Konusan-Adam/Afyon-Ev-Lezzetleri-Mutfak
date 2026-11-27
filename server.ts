import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { zamanDamgasiUret } from './src/SunucuIsleri/ZamanDamgasiServisi';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IZINLI_GORSEL_KLASORLERI = new Set([
  'yemekler',
  'afisler',
  'logolar',
  'belgeler',
  'coklu_menuler',
  'genel',
]);

const IZINLI_ARSIV_ALANLARI = new Set(
  [
    'yedek.pazarafyon.com.tr',
    'pazarafyon.com.tr',
    ...(process.env.ARSIV_IZINLI_ALANLAR || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  ]
);

function ozelIpAdresiMi(hostname: string): boolean {
  const temiz = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (temiz === 'localhost' || temiz === '127.0.0.1' || temiz === '::1' || temiz === '0.0.0.0') {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(temiz)) {
    const parcalar = temiz.split('.').map(Number);
    if (parcalar[0] === 10 || parcalar[0] === 127 || parcalar[0] === 0) return true;
    if (parcalar[0] === 169 && parcalar[1] === 254) return true;
    if (parcalar[0] === 172 && parcalar[1] >= 16 && parcalar[1] <= 31) return true;
    if (parcalar[0] === 192 && parcalar[1] === 168) return true;
  }
  return false;
}

function guvenliArsivUrlDogrula(hedefUrl: unknown): URL | null {
  if (typeof hedefUrl !== 'string' || !hedefUrl.trim()) return null;
  try {
    const url = new URL(hedefUrl.trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (ozelIpAdresiMi(host)) return null;
    if (!IZINLI_ARSIV_ALANLARI.has(host)) return null;
    return url;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON ve URL form gövdesi limitleri
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  const IZINLI_APK_KAYNAKLARI = new Set([
    'https://appassets.androidplatform.net',
    'http://localhost',
    'https://localhost',
  ]);
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && IZINLI_APK_KAYNAKLARI.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 1. Görsel Yükleme Köprüsü (/api/gorsel-yukle)
  app.post('/api/gorsel-yukle', async (req: Request, res: Response) => {
    try {
      const { resimBase64, dosyaAdi, klasor = 'yemekler' } = req.body;

      if (typeof resimBase64 !== 'string' || !resimBase64) {
        return res.status(400).json({ basarili: false, hata: 'Resim verisi bulunamadı.' });
      }

      const guvenliKlasor =
        typeof klasor === 'string' && IZINLI_GORSEL_KLASORLERI.has(klasor.trim())
          ? klasor.trim()
          : 'yemekler';
      const temizDosyaAdi =
        typeof dosyaAdi === 'string' && dosyaAdi.trim()
          ? path.basename(dosyaAdi.trim()).replace(/[^a-zA-Z0-9._-]/g, '_')
          : `resim_${Date.now()}.webp`;

      // cPanel sunucusuna iletmeyi dene (yedek.pazarafyon.com.tr)
      try {
        const matches = resimBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(resimBase64, 'base64');
        const mimeType = matches ? matches[1] : 'image/webp';

        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('dosya', blob, temizDosyaAdi);
        formData.append('klasor', guvenliKlasor);

        const disSunucuYaniti = await fetch('https://yedek.pazarafyon.com.tr/yukle.php', {
          method: 'POST',
          body: formData,
        });

        if (disSunucuYaniti.ok) {
          const veri: any = await disSunucuYaniti.json();
          if (veri?.basarili && veri?.url) {
            return res.json({
              basarili: true,
              url: veri.url,
              klasor,
              dosyaAdi: veri.dosyaAdi || dosyaAdi,
            });
          }
        }
      } catch (disHata) {
        // Doğrudan yükleme başarısızsa base64 fallback ile devam et
      }

      // Güvenli yerel veri URL fallback
      return res.json({
        basarili: true,
        yerelUrl: resimBase64,
        url: resimBase64,
        klasor,
        dosyaAdi: dosyaAdi || `afyon_${klasor}_${Date.now()}.webp`,
      });
    } catch (hata: any) {
      console.error('Görsel yükleme hatası:', hata);
      return res.status(500).json({ basarili: false, hata: hata?.message || 'Görsel yüklenemedi' });
    }
  });

  // 2. Afyon Lezzet Danışmanı & Yapay Zeka Asistanı (/api/lezzet-danismani)
  app.post('/api/lezzet-danismani', async (req: Request, res: Response) => {
    try {
      const { mesaj, mevcutYemekler = [] } = req.body;

      if (typeof mesaj !== 'string' || !mesaj.trim()) {
        return res.status(400).json({ hata: 'Mesaj içeriği gereklidir.' });
      }
      if (mesaj.trim().length > 600) {
        return res.status(400).json({ hata: 'Mesaj uzunluğu 600 karakteri geçemez.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI();
          const yemekListesiOzeti = Array.isArray(mevcutYemekler) && mevcutYemekler.length > 0
            ? `Şu an mutfakta bulunan yemekler:\n${mevcutYemekler.map((y: any) => `- ${y.baslik} (${y.kategori || 'Yöresel'}, ${y.fiyat} ₺)`).join('\n')}`
            : 'Afyonkarahisar yöresel yemekleri: Afyon Bükmesi, Şuhut Keşkeği, Etli Yaprak Sarma, Afyon Mantısı, Ekmek Kadayıfı (Manda Kaymaklı), Arabaşı Çorbası, Sucuklu Yumurta.';

          const systemPrompt = `Sen "Afyon Ev Lezzetleri Mutfak" platformunun sıcakkanlı, samimi, saygılı ve bilgili Yöresel Mutfak & Lezzet Danışmanısın.
Afyonkarahisar mutfağının geleneksel lezzetlerini çok iyi bilirsin. Müşterilere iştah açıcı, güler yüzlü ve kısa/öz önerilerde bulunursun.
${yemekListesiOzeti}
Lütfen Türkçe, sıcak ve esnaf samimiyetiyle en fazla 2-3 cümlelik yanıt ver.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nKullanıcı: ${mesaj}`,
          });

          const cevap = response.text || '';
          if (cevap) {
            return res.json({ cevap: cevap.trim() });
          }
        } catch (aiError) {
          console.warn('Gemini API yanıt üretemedi, yedek kural motoru devreye giriyor:', aiError);
        }
      }

      // Kural tabanlı yöresel lezzet yanıt motoru (Fallback)
      const kucukMesaj = String(mesaj).toLowerCase();
      let yedekCevap = 'Afyonumuzun tescilli lezzetleri olan çıtır mercimekli bükmemizi, tandırda ağır ağır pişen Şuhut keşkeğimizi veya hakiki manda kaymaklı ekmek kadayıfımızı gönül rahatlığıyla tavsiye ederim!';

      if (kucukMesaj.includes('tatlı') || kucukMesaj.includes('kadayıf')) {
        yedekCevap = 'Tatlı olarak hakiki Afyon manda kaymağıyla servis edilen meşhur Ekmek Kadayıfımızı veya çıtır cevizli ev baklavamızı mutlaka tatmalısınız!';
      } else if (kucukMesaj.includes('kahvaltı') || kucukMesaj.includes('bükme') || kucukMesaj.includes('sabah')) {
        yedekCevap = 'Sabah saatleri için sıcak haşhaşlı & mercimekli Afyon bükmemiz ve fırından yeni çıkmış sıcacık patatesli köy ekmeğimiz mükemmel bir seçim olacaktır!';
      } else if (kucukMesaj.includes('çorba') || kucukMesaj.includes('sıcak')) {
        yedekCevap = 'Şifalı arabaşı çorbamız veya taze süzme mercimek çorbamız içinizi ısıtacak en güzel başlangıçtır.';
      } else if (kucukMesaj.includes('et') || kucukMesaj.includes('yemek') || kucukMesaj.includes('ana yemek')) {
        yedekCevap = 'Ana yemek olarak geleneksel dövme dana etli Şuhut keşkeğimiz ve yoğurtlu Afyon mantımız mutfağımızın en çok övgü alan lezzetlerindendir.';
      }

      return res.json({ cevap: yedekCevap });
    } catch (hata: any) {
      console.error('Lezzet danışmanı hatası:', hata);
      return res.status(500).json({ hata: 'Lezzet danışmanı yanıt veremedi.' });
    }
  });

  // 3. Arşivleme & Yedekleme Köprüsü (/api/arsivle - Sıkı alan adı & HTTPS korumalı)
  app.post('/api/arsivle', async (req: Request, res: Response) => {
    try {
      const { hedefUrl, apiKey, veriPaketi } = req.body;
      const guvenliUrl = guvenliArsivUrlDogrula(hedefUrl);

      if (!guvenliUrl) {
        return res.status(403).json({
          basarili: false,
          mesaj: 'Yalnızca yetkili HTTPS yedekleme alan adlarına erişim izni vardır.',
        });
      }

      const disSunucuYaniti = await fetch(guvenliUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof apiKey === 'string' && apiKey.trim()
            ? { Authorization: `Bearer ${apiKey.trim()}` }
            : {}),
        },
        body: JSON.stringify(veriPaketi),
      });

      if (disSunucuYaniti.ok) {
        const sonuc = await disSunucuYaniti.json();
        return res.json(sonuc);
      } else {
        return res.status(disSunucuYaniti.status).json({
          basarili: false,
          mesaj: `Hedef sunucu ${disSunucuYaniti.status} hatası döndürdü.`,
        });
      }
    } catch (hata: any) {
      return res.status(500).json({
        basarili: false,
        mesaj: `Yedekleme köprüsü hatası: ${hata?.message || 'Sunucuya ulaşılamadı'}`,
      });
    }
  });

  // 4. Hukuki Zaman Damgası Üretici (/api/zaman-damgasi/damgala)
  app.post('/api/zaman-damgasi/damgala', async (req: Request, res: Response) => {
    try {
      const {
        sozlesmeTuru,
        sozlesmeVersiyonu,
        islemTuru,
        ilgiliKayitId,
        kullaniciKimlik,
        kullaniciTelefon,
        kullaniciAdSoyad,
        sozlesmeIcerigi,
        sozlesmeMetinHash,
        ekDetay,
      } = req.body || {};

      if (typeof sozlesmeTuru !== 'string' || !sozlesmeTuru.trim()) {
        return res.status(400).json({ basarili: false, hata: 'sozlesmeTuru zorunludur.' });
      }
      if (typeof islemTuru !== 'string' || !islemTuru.trim()) {
        return res.status(400).json({ basarili: false, hata: 'islemTuru zorunludur.' });
      }

      const damga = await zamanDamgasiUret(req, {
        sozlesmeTuru,
        sozlesmeVersiyonu: typeof sozlesmeVersiyonu === 'string' && sozlesmeVersiyonu.trim() ? sozlesmeVersiyonu : '1.0.0',
        islemTuru,
        ilgiliKayitId: typeof ilgiliKayitId === 'string' ? ilgiliKayitId : undefined,
        kullaniciKimlik: typeof kullaniciKimlik === 'string' ? kullaniciKimlik : undefined,
        kullaniciTelefon: typeof kullaniciTelefon === 'string' ? kullaniciTelefon : undefined,
        kullaniciAdSoyad: typeof kullaniciAdSoyad === 'string' ? kullaniciAdSoyad : undefined,
        sozlesmeIcerigi: typeof sozlesmeIcerigi === 'string' ? sozlesmeIcerigi : undefined,
        sozlesmeMetinHash: typeof sozlesmeMetinHash === 'string' ? sozlesmeMetinHash : undefined,
        ekDetay: ekDetay && typeof ekDetay === 'object' && !Array.isArray(ekDetay) ? ekDetay : undefined,
      });

      return res.json({ basarili: true, damga });
    } catch (hata: any) {
      console.error('Zaman damgası üretme hatası:', hata);
      return res.status(500).json({ basarili: false, hata: 'Zaman damgası üretilemedi.' });
    }
  });

  // Vite entegrasyonu (Development) veya Statik Dosya Sunumu (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Afyon Ev Lezzetleri Mutfak sunucusu http://localhost:${PORT} portunda çalışıyor.`);
  });
}

startServer().catch((hata) => {
  console.error('Sunucu başlatılırken hata oluştu:', hata);
  process.exit(1);
});
