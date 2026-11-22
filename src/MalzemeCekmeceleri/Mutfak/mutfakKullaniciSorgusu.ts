import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { canliFirebaseAktifMi, firebaseVeritabani } from '@/src/veritabani/FirebaseIstemcisi';
import { firestoreHatasiniYonet, IslemTipi } from '@/src/veritabani/FirebaseHataYoneticisi';

export const YETKILI_MUTFAK_ROLLERI = ['mutfak', 'ev_mutfagi', 'ticari_restoran'] as const;
export const YETKISIZ_ROL_UYARISI = 'Bu panel yalnızca yetkili mutfak personeli içindir.';

export interface MutfakSorguSonucu {
  kullanici: any | null;
  yetkisizRolVarMi: boolean;
}

export function mutfakRoluMu(rol?: string): boolean {
  if (!rol) return false;
  return (YETKILI_MUTFAK_ROLLERI as readonly string[]).includes(String(rol).trim());
}

function telefonRakamAyikla(tel: string): string {
  const rakamlar = (tel || '').replace(/\D/g, '');
  if (rakamlar.startsWith('90') && rakamlar.length === 12) return rakamlar.slice(2);
  if (rakamlar.startsWith('0') && rakamlar.length === 11) return rakamlar.slice(1);
  return rakamlar;
}

export function telefonAdaylariniUret(telefon: string): string[] {
  const temiz = (telefon || '').trim();
  const onHane = telefonRakamAyikla(temiz);
  const adaySeti = new Set<string>();
  if (onHane) {
    adaySeti.add(`0${onHane}`);
    adaySeti.add(onHane);
    adaySeti.add(`+90${onHane}`);
    adaySeti.add(`90${onHane}`);
  }
  if (temiz) adaySeti.add(temiz);
  return Array.from(adaySeti).slice(0, 10);
}

function yetkiHatasiMi(hata: unknown): boolean {
  if (!hata) return false;
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  return mesaj.includes('permission') || mesaj.includes('insufficient') || (hata as any)?.code === 'permission-denied';
}

async function alanIleMutfakSorgula(alanAdi: 'telefon_numarasi' | 'telefon', adaylar: string[]): Promise<any | null> {
  const kolRef = collection(firebaseVeritabani, 'kullanicilar');
  const q = query(
    kolRef,
    where(alanAdi, 'in', adaylar),
    where('rol', 'in', [...YETKILI_MUTFAK_ROLLERI]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const veri = { id: doc.id, ...doc.data() } as any;
  return mutfakRoluMu(veri.rol) ? veri : null;
}

async function baskaRoldeKayitVarMi(adaylar: string[]): Promise<boolean> {
  const kolRef = collection(firebaseVeritabani, 'kullanicilar');
  for (const alanAdi of ['telefon_numarasi', 'telefon'] as const) {
    try {
      const q = query(kolRef, where(alanAdi, 'in', adaylar), limit(5));
      const snap = await getDocs(q);
      if (snap.docs.some((d) => !mutfakRoluMu((d.data() as any)?.rol))) {
        return true;
      }
    } catch {
      // Güvenlik kuralı kısıtı varsa sessizce geç
    }
  }
  return false;
}

export async function mutfakKullanicisiniSorgula(telefon: string): Promise<MutfakSorguSonucu> {
  if (!canliFirebaseAktifMi()) return { kullanici: null, yetkisizRolVarMi: false };
  const adaylar = telefonAdaylariniUret(telefon);
  if (adaylar.length === 0) return { kullanici: null, yetkisizRolVarMi: false };

  try {
    const telefonNumarasiIle = await alanIleMutfakSorgula('telefon_numarasi', adaylar);
    if (telefonNumarasiIle) return { kullanici: telefonNumarasiIle, yetkisizRolVarMi: false };

    const telefonIle = await alanIleMutfakSorgula('telefon', adaylar);
    if (telefonIle) return { kullanici: telefonIle, yetkisizRolVarMi: false };

    const yetkisizRolVarMi = await baskaRoldeKayitVarMi(adaylar);
    return { kullanici: null, yetkisizRolVarMi };
  } catch (hata) {
    if (yetkiHatasiMi(hata)) {
      firestoreHatasiniYonet(hata, IslemTipi.LIST, 'kullanicilar');
    }
    console.warn('Mutfak kullanıcı sorgu hatası:', hata);
    return { kullanici: null, yetkisizRolVarMi: false };
  }
}
