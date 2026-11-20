/**
 * 🦁 Afyon Ev Lezzetleri — Ev Aşçısı Yasal Belgeler ve İzinler Modülü
 * 
 * Yasal Dayanaklar:
 * 1. 1593 Sayılı Umumi Hıfzıssıhha Kanunu & Hijyen Eğitimi Yönetmeliği (MEB / Halk Eğitim)
 * 2. 193 Sayılı Gelir Vergisi Kanunu Madde 9/10 ve 9/6 (Evde İmal Edilen Malların Satışında Esnaf Muafiyeti)
 */

export type BelgeOnayDurumu = 'onay_bekliyor' | 'onaylandi' | 'reddedildi' | 'yuklenmedi';

export interface AsciYasalBelgeleri {
  // 1. Hijyen Belgesi
  hijyenBelgesiVarMi: boolean;
  hijyenBarkodNo?: string;
  hijyenBelgeGorseliUrl?: string;
  hijyenVerilisTarihi?: string;
  hijyenKurum?: string; // Örn: Afyonkarahisar Halk Eğitimi Merkezi
  hijyenOnayDurumu: BelgeOnayDurumu;
  hijyenRedSebebi?: string;

  // 2. Esnaf Vergi Muafiyet Belgesi
  esnafMuafiyetVarMi: boolean;
  vergiMuafiyetNo?: string;
  vergiDairesi?: string; // Örn: Afyonkarahisar Kocatepe Vergi Dairesi
  muafiyetBelgeGorseliUrl?: string;
  muafiyetVerilisTarihi?: string;
  muafiyetOnayDurumu: BelgeOnayDurumu;
  muafiyetRedSebebi?: string;

  // 3. Genel Uyumluluk
  sonGuncellemeTarihi: string;
}

export const RESMI_BELGE_REHBERI = {
  hijyen: {
    baslik: 'MEB Onaylı Hijyen Eğitimi Belgesi',
    kanun: '1593 Sayılı Umumi Hıfzıssıhha Kanunu & Hijyen Eğitimi Yönetmeliği',
    nasilAlinir: 'Afyonkarahisar Merkez ve İlçe Halk Eğitimi Merkezlerinden veya e-Yaygın sistemi üzerinden 8 saatlik eğitimi tamamlayarak e-Devlet onaylı barkodlu belgenizi hemen alabilirsiniz.',
    eDevletLink: 'https://www.turkiye.gov.tr/meb-sertifika-bilgileri-sorgulama',
    zorunluMu: true,
  },
  esnafMuafiyeti: {
    baslik: 'Evden Satış Esnaf Vergi Muafiyet Belgesi',
    kanun: '193 Sayılı Gelir Vergisi Kanunu 9. Madde (6 ve 10 Nolu Bentler)',
    nasilAlinir: 'İnteraktif Vergi Dairesi (ivd.gib.gov.tr) veya e-Devlet üzerinden hiçbir harç veya vergi ödemeden "Evde İmal Edilen Malların İnternetten Satışına İlişkin Esnaf Muafiyeti Belgesi" talebinde bulunup anında alabilirsiniz.',
    eDevletLink: 'https://dijital.gib.gov.tr',
    zorunluMu: true,
  }
};

export type BelgeBeyanDurumu = 'evet' | 'hayir_alacagim' | '';

export interface BelgeDurumOzeti {
  rozetMetni: string;
  rozetSinifi: string;
  bilgiNotu: string;
}

export function belgeBeyaniniCozumle(
  belgeNo?: string,
  belgelerVarMi?: boolean,
  kullaniciBeyani?: string,
  gorselUrl?: string
): BelgeBeyanDurumu {
  if ((belgeNo && belgeNo.trim() !== '') || (gorselUrl && gorselUrl.trim() !== '')) return 'evet';
  if (kullaniciBeyani === 'evet' || kullaniciBeyani === 'hayir_alacagim') {
    return kullaniciBeyani;
  }
  if (belgelerVarMi === true) return 'evet';
  if (belgelerVarMi === false) return 'hayir_alacagim';
  return '';
}

export function belgeDurumOzetiGetir(
  onayliMi: boolean,
  belgeNo: string,
  beyan: BelgeBeyanDurumu,
  numaraAdi: string,
  gorselUrl?: string
): BelgeDurumOzeti {
  if (onayliMi) {
    return {
      rozetMetni: '✓ Patron Onaylı',
      rozetSinifi: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
      bilgiNotu: 'Belgeniz Patron Masası tarafından doğrulanıp onaylanmıştır.',
    };
  }
  if (belgeNo.trim() !== '' || (gorselUrl && gorselUrl.trim() !== '')) {
    return {
      rozetMetni: '⏳ İncelemede',
      rozetSinifi: 'bg-sky-950/80 text-sky-300 border-sky-700',
      bilgiNotu: 'Belge bilginiz veya fotoğrafınız kaydedildi. Patron Masası doğrulaması bekleniyor.',
    };
  }
  if (beyan === 'evet') {
    return {
      rozetMetni: 'Var Beyanı — No Girin',
      rozetSinifi: 'bg-amber-950/80 text-amber-300 border-amber-600',
      bilgiNotu: `Kayıtta "Evet, var" beyanında bulundunuz. Doğrulama için ${numaraAdi} bilginizi girip veya fotoğrafını yükleyip kaydediniz.`,
    };
  }
  if (beyan === 'hayir_alacagim') {
    return {
      rozetMetni: 'Alacağım Beyanı',
      rozetSinifi: 'bg-rose-950/80 text-rose-300 border-rose-700',
      bilgiNotu: `Kayıtta "Hayır, yok (Alacağım)" seçtiniz. Belgenizi aldıktan sonra ${numaraAdi} bilginizi veya fotoğrafını buraya ekleyip kaydediniz.`,
    };
  }
  return {
    rozetMetni: 'Eksik',
    rozetSinifi: 'bg-amber-950/80 text-amber-300 border-amber-700',
    bilgiNotu: '',
  };
}
