import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';
import { belgeKaydet, koleksiyonGetir, belgeSil, belgeGetir } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { yerelSiparisDurumGuncelle } from '@/src/MalzemeCekmeceleri/useMusteriSiparisleri';
import { patronBildirimiEkle } from '@/src/MalzemeCekmeceleri/PatronBildirimServisi';
import { hukukiDelilDamgalaVeKaydet } from '@/src/MalzemeCekmeceleri/HukukVeSozlesmeler/hukukiDelilServisi';

export async function mutfakSiparisDurumuGuncelle(
  siparisId: string,
  yeniDurum: 'beklemede' | 'hazirlaniyor' | 'paketlendi' | 'yolda' | 'teslim_edildi',
  dakika: number,
  ozelAciklama?: string,
  siparisKodu?: string
) {
  const varsayilanAciklama =
    yeniDurum === 'beklemede'
      ? 'Sipariş alındı, mutfağın onaylaması bekleniyor.'
      : yeniDurum === 'paketlendi'
      ? `Sipariş paketlendi, kurye çağrıldı. Tahmini ${dakika} dk içinde teslim edilecek.`
      : yeniDurum === 'yolda'
      ? 'Sipariş kuryeye teslim edildi, sıcak şekilde yola çıktı!'
      : yeniDurum === 'teslim_edildi'
      ? 'Sipariş başarıyla teslim edildi. Afiyet olsun!'
      : `Sipariş mutfakta özenle pişiriliyor. Tahmini pişme: ${dakika} dakika.`;

  const aciklama = (ozelAciklama && ozelAciklama.trim()) ? ozelAciklama.trim() : varsayilanAciklama;
  const yeniAsama = 
    yeniDurum === 'beklemede'
      ? 'beklemede'
      : yeniDurum === 'hazirlaniyor' 
      ? 'ocakta' 
      : yeniDurum === 'paketlendi' 
      ? 'paketlendi' 
      : yeniDurum === 'yolda' 
      ? 'kuryede' 
      : 'teslim_edildi';

  // 1. Yerel depoyu güncelle (dakika dahil)
  yerelSiparisDurumGuncelle(siparisId, yeniDurum, aciklama, dakika);
  if (siparisKodu && siparisKodu !== siparisId) {
    yerelSiparisDurumGuncelle(siparisKodu, yeniDurum, aciklama, dakika);
  }

  // 2. Canlı event fırlat
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('afyon_siparis_durum_degisti', {
        detail: { siparisKimligi: siparisId, siparisKodu, durum: yeniDurum, aciklama, asama: yeniAsama, hazirlanmaSuresiDakika: dakika }
      })
    );
  }

  // 3. Canlı Firebase Firestore
  if (canliFirebaseAktifMi()) {
    try {
      const guncellenecekVeri: any = {
        durum: yeniDurum,
        asama: yeniAsama,
        durum_aciklamasi: aciklama,
        durumAciklamasi: aciklama,
        sonGuncelleme: new Date().toLocaleTimeString('tr-TR'),
        guncellenme_zamani: new Date().toISOString()
      };

      if (yeniDurum === 'hazirlaniyor') {
        const gecerliSure = Math.max(1, Number(dakika) || 25);
        guncellenecekVeri.hazirlanmaSuresiDakika = gecerliSure;
        guncellenecekVeri.hazirlanma_suresi_dakika = gecerliSure;
        guncellenecekVeri.ocaga_alinma_zamani = new Date().toISOString();
      }

      const tumFbSiparisler = await koleksiyonGetir<any>('siparisler');
      const eslesenDocIdler: string[] = [];

      if (tumFbSiparisler && Array.isArray(tumFbSiparisler)) {
        for (const fbDoc of tumFbSiparisler) {
          const docId = fbDoc.id;
          const koddur = fbDoc.siparis_kodu || fbDoc.siparisKodu;
          const eslesiyorMu = 
            docId === siparisId || 
            (siparisKodu && docId === siparisKodu) || 
            koddur === siparisId || 
            (siparisKodu && koddur === siparisKodu);

          if (eslesiyorMu && docId) {
            await belgeKaydet('siparisler', docId, guncellenecekVeri);
            eslesenDocIdler.push(docId);
          }
        }
      }

      if (eslesenDocIdler.length === 0 && siparisId) {
        await belgeKaydet('siparisler', siparisId, guncellenecekVeri);
        eslesenDocIdler.push(siparisId);
      }

      // 4. Sipariş Tamamlandıysa Taşı
      if (yeniDurum === 'teslim_edildi') {
        for (const hedefId of eslesenDocIdler) {
          const tamSiparis = await belgeGetir<any>('siparisler', hedefId);
          if (tamSiparis) {
            await belgeKaydet('tamamlanan_siparisler', hedefId, {
              ...tamSiparis,
              ...guncellenecekVeri,
              tamamlanma_tarihi: new Date().toISOString()
            });
            await belgeSil('siparisler', hedefId);
          }
        }
      }

      // 🔔 Bildirim tetikleyici
      if (yeniDurum === 'paketlendi') {
        patronBildirimiEkle(
          'siparis_durumu',
          'Kurye Çağrıldı! 🚴‍♂️',
          `#${siparisKodu || siparisId} nolu sipariş paketlendi, kurye bekleniyor.`,
          siparisId
        );
      } else if (yeniDurum === 'yolda') {
        patronBildirimiEkle(
          'siparis_durumu',
          'Paket Kuryeye Teslim Edildi! 🛵',
          `#${siparisKodu || siparisId} nolu sipariş kuryeye teslim edildi ve yola çıktı.`,
          siparisId
        );
      }
    } catch (hata) {
      console.warn('Firebase mutfak durum güncelleme hatası:', hata);
    }
  }

  // 5. Hukuki Delil & Zaman Damgası (Sipariş Kabul / Hazırlama / Paketleme Onayı)
  if (yeniDurum === 'hazirlaniyor' || yeniDurum === 'paketlendi' || yeniDurum === 'yolda' || yeniDurum === 'teslim_edildi') {
    const sozlesmeTuru =
      yeniDurum === 'hazirlaniyor'
        ? 'mutfak_siparis_kabul_onayi'
        : yeniDurum === 'paketlendi'
        ? 'mutfak_paketleme_onayi'
        : 'mutfak_siparis_durum_onayi';
    hukukiDelilDamgalaVeKaydet({
      islemTuru: 'ozel_onay',
      sozlesmeTuru,
      sozlesmeVersiyonu: '1.0.0',
      sozlesmeIcerigi: aciklama,
      ilgiliKayitId: siparisKodu || siparisId,
      onaylandiMi: true,
      ekDetay: {
        siparisId,
        siparisKodu: siparisKodu || siparisId,
        yeniDurum,
        yeniAsama,
        hazirlanmaSuresiDakika: dakika,
      },
    }).catch((err) => {
      console.warn('Sipariş onay zaman damgası hatası:', err);
    });
  }
}

export async function mutfakSiparisEkSureEkle(
  siparisId: string,
  ekDakika: number = 10,
  siparisKodu?: string
) {
  const yeniAciklama = `Sipariş yoğunluğu nedeniyle +${ekDakika} dk ek süre eklendi. Titizlikle hazırlanıyor.`;

  // 1. Yerel depoyu güncelle
  yerelSiparisDurumGuncelle(siparisId, 'hazirlaniyor', yeniAciklama, undefined, ekDakika);
  if (siparisKodu && siparisKodu !== siparisId) {
    yerelSiparisDurumGuncelle(siparisKodu, 'hazirlaniyor', yeniAciklama, undefined, ekDakika);
  }

  // 2. Canlı event fırlat
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('afyon_siparis_durum_degisti', {
        detail: { siparisKimligi: siparisId, siparisKodu, durum: 'hazirlaniyor', aciklama: yeniAciklama, ekDakika }
      })
    );
  }

  // 3. Firebase Firestore
  if (canliFirebaseAktifMi()) {
    try {
      const tumFbSiparisler = await koleksiyonGetir<any>('siparisler');
      if (tumFbSiparisler && Array.isArray(tumFbSiparisler)) {
        for (const fbDoc of tumFbSiparisler) {
          const docId = fbDoc.id;
          const koddur = fbDoc.siparis_kodu || fbDoc.siparisKodu;
          const eslesiyorMu = 
            docId === siparisId || 
            (siparisKodu && docId === siparisKodu) || 
            koddur === siparisId || 
            (siparisKodu && koddur === siparisKodu);

          if (eslesiyorMu && docId) {
            const toplamEkSure = (Number(fbDoc.ekSureDakika ?? fbDoc.ek_sure_dakika) || 0) + ekDakika;
            const guncelleme = {
              ekSureDakika: toplamEkSure,
              ek_sure_dakika: toplamEkSure,
              durum_aciklamasi: yeniAciklama,
              durumAciklamasi: yeniAciklama,
              sonGuncelleme: new Date().toLocaleTimeString('tr-TR'),
              guncellenme_zamani: new Date().toISOString()
            };
            await belgeKaydet('siparisler', docId, guncelleme);
          }
        }
      }

      patronBildirimiEkle(
        'siparis_durumu',
        'Ek Pişirme Süresi İstendi ⏱️',
        `#${siparisKodu || siparisId} nolu sipariş için mutfak +${ekDakika} dakika ek süre bildirdi.`,
        siparisId
      );
    } catch (err) {
      console.warn('Firebase ek süre kaydetme hatası:', err);
    }
  }
}
