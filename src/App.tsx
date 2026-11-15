import React from 'react';
import { TemaSaglayici } from './OrtakHavuz/TemaHafizasi';
import { AramaVeFiltreSaglayici } from './OrtakHavuz/AramaVeFiltreHafizasi';
import { KullaniciSaglayici } from './OrtakHavuz/KullaniciHafizasi';
import { SepetSaglayici } from './OrtakHavuz/SepetHafizasi';
import { OrtakSepetSaglayici } from './OrtakHavuz/OrtakSepetHafizasi';
import { TeslimatSaglayici } from './OrtakHavuz/TeslimatHafizasi';
import { OzelOzelliklerSaglayici } from './OrtakHavuz/OzelOzelliklerHafizasi';
import { OnSiparisSaglayici } from './OrtakHavuz/OnSiparisHafizasi';
import { MutfakPaneli } from './VitrinOdasi/MutfakPaneli/MutfakPaneli';

export default function App() {
  return (
    <TemaSaglayici>
      <AramaVeFiltreSaglayici>
        <KullaniciSaglayici>
          <SepetSaglayici>
            <TeslimatSaglayici>
              <OrtakSepetSaglayici>
                <OzelOzelliklerSaglayici>
                  <OnSiparisSaglayici>
                    <main className="min-h-screen bg-stone-50">
                      <MutfakPaneli />
                    </main>
                  </OnSiparisSaglayici>
                </OzelOzelliklerSaglayici>
              </OrtakSepetSaglayici>
            </TeslimatSaglayici>
          </SepetSaglayici>
        </KullaniciSaglayici>
      </AramaVeFiltreSaglayici>
    </TemaSaglayici>
  );
}
