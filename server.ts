import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON ve URL form gövdesi limitleri
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // 1. Görsel Yükleme Köprüsü (/api/gorsel-yukle)
  app.post('/api/gorsel-yukle', async (req: Request, res: Response) => {
    try {
      const { resimBase64, dosyaAdi, klasor = 'yemekler' } = req.body;

      if (!resimBase64) {
        return res.status(400).json({ basarili: false, hata: 'Resim verisi bulunamadı.' });
      }

      // cPanel sunucusuna iletmeyi dene (yedek.pazarafyon.com.tr)
      try {
        const matches = resimBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(resimBase64, 'base64');
        const mimeType = matches ? matches[1] : 'image/webp';

        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('dosya', blob, dosyaAdi || `resim_${Date.now()}.webp`);
        formData.append('klasor', klasor);

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
      const { mesaj, gecmis = [], mevcutYemekler = [] } = req.body;

      if (!mesaj) {
        return res.status(400).json({ hata: 'Mesaj içeriği gereklidir.' });
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

  // 3. Arşivleme & Yedekleme Köprüsü (/api/arsivle)
  app.post('/api/arsivle', async (req: Request, res: Response) => {
    try {
      const { hedefUrl, apiKey, veriPaketi } = req.body;

      if (!hedefUrl) {
        return res.status(400).json({ basarili: false, mesaj: 'Hedef sunucu URL adresi eksik.' });
      }

      const disSunucuYaniti = await fetch(hedefUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
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
