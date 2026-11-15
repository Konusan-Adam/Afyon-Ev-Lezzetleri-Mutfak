import { koleksiyonGetir, belgeKaydet } from '@/src/veritabani/FirebaseKoleksiyonServisi';
import { canliFirebaseAktifMi } from '@/src/veritabani/FirebaseIstemcisi';

export async function firebaseBaslangicVerileriniYukle() {
  if (!canliFirebaseAktifMi()) return;

  try {
    const mevcutYemekler = await koleksiyonGetir('yemekler');

    if (mevcutYemekler.length === 0) {
      console.log('Firebase yemekler koleksiyonu başlatılıyor...');
      
      const baslangicYemekleri = [
        {
          id: 'ymk_bukme_01',
          mutfak_id: 'm1',
          baslik: 'Geleneksel Haşhaşlı & Mercimekli Afyon Bükmesi',
          aciklama: 'Közde ve taş fırında pişen, bol haşhaşlı, çıtır kat kat açılmış hakiki Afyon bükmesi.',
          fiyat: 65,
          kategori: 'Hamur İşleri & Bükme',
          alt_kategori: 'Mercimekli Bükmeler',
          birim: 'Adet',
          gunluk_stok: 50,
          kalan_stok: 35,
          sinirsiz_stok: false,
          puan: 4.9,
          hazirlanma_suresi: '15-20 dk',
          stokta_var_mi: true,
          tukendi_mi: false,
          onayli_mi: true,
          onay_durumu: 'onaylandi',
          gorsel_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&auto=format&fit=crop&q=80',
        },
        {
          id: 'ymk_keskek_01',
          mutfak_id: 'm1',
          baslik: 'Geleneksel Şuhut Keşkeği (Tandırda Dövme Dana Etli)',
          aciklama: 'Geceden sabaha taş tandırda dövülerek pişirilen, tereyağlı ve lokum gibi lif lif dana etli meşhur Şuhut keşkeği.',
          fiyat: 160,
          kategori: 'Yöresel Sıcak Yemekler',
          alt_kategori: 'Et Yemekleri',
          birim: 'Porsiyon',
          gunluk_stok: 30,
          kalan_stok: 18,
          sinirsiz_stok: false,
          puan: 5.0,
          hazirlanma_suresi: '20-25 dk',
          stokta_var_mi: true,
          tukendi_mi: false,
          onayli_mi: true,
          onay_durumu: 'onaylandi',
          gorsel_url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop&q=80',
        },
        {
          id: 'ymk_manti_01',
          mutfak_id: 'm1',
          baslik: 'Kıymalı Afyon Ev Mantısı (Sarımsaklı Yoğurt & Tereyağlı Sos)',
          aciklama: 'İncecik elde açılan, yerli dana kıymalı iç harçlı, süzme yoğurt ve naneli tereyağı sosuyla servis edilen ev mantısı.',
          fiyat: 175,
          kategori: 'Hamur İşleri & Bükme',
          alt_kategori: 'Mantılar',
          birim: 'Porsiyon',
          gunluk_stok: 25,
          kalan_stok: 12,
          sinirsiz_stok: false,
          puan: 4.8,
          hazirlanma_suresi: '25-30 dk',
          stokta_var_mi: true,
          tukendi_mi: false,
          onayli_mi: true,
          onay_durumu: 'onaylandi',
          gorsel_url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
        },
        {
          id: 'ymk_kadayif_01',
          mutfak_id: 'm1',
          baslik: 'Hakiki Manda Kaymaklı Afyon Ekmek Kadayıfı',
          aciklama: 'Karamelize şerbetiyle demlenmiş, manda kaymağı eşliğinde servis edilen tescilli tatlı.',
          fiyat: 120,
          kategori: 'Tatlılar & Fırın',
          alt_kategori: 'Kadayıf Çeşitleri',
          birim: 'Porsiyon',
          gunluk_stok: 40,
          kalan_stok: 24,
          sinirsiz_stok: false,
          puan: 5.0,
          hazirlanma_suresi: '10 dk',
          stokta_var_mi: true,
          tukendi_mi: false,
          onayli_mi: true,
          onay_durumu: 'onaylandi',
          gorsel_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
        },
      ];

      for (const yemek of baslangicYemekleri) {
        await belgeKaydet('yemekler', yemek.id, yemek);
      }

      await belgeKaydet('mutfaklar', 'm1', {
        id: 'm1',
        ad: 'Afyonlu Zehra Teyze Ev Yemekleri',
        mutfak_adi: 'Afyonlu Zehra Teyze Ev Yemekleri',
        mahalle: 'Marulcu Mah.',
        acik_mi: true,
        puan: 4.9,
        degerlendirme_sayisi: 142,
        onayli_mi: true,
        onay_durumu: 'onaylandi',
      });

      console.log('Firebase yemekler ve mutfak başarıyla başlatıldı.');
    }
  } catch (hata) {
    console.warn('Firebase tohumlama uyarısı:', hata);
  }
}
