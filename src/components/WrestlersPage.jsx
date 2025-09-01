import React from 'react';
import { Helmet } from 'react-helmet';
import MedicalCrossIcon from './MedicalCrossIcon';
import InactiveIcon from './InactiveIcon';

const BRAND_ORDER = ['RAW', 'SmackDown', 'NXT', 'Unassigned'];
const BRAND_LABELS = {
  RAW: 'RAW',
  SmackDown: 'SmackDown',
  NXT: 'NXT',
  Unassigned: 'Unassigned',
};

function groupWrestlersByBrand(wrestlers) {
  const grouped = { RAW: [], SmackDown: [], NXT: [], Unassigned: [] };
  wrestlers.forEach(w => {
    let brand = (w.brand || '').trim();
    if (!brand || brand.toUpperCase() === 'N/A') brand = 'Unassigned';
    if (brand === 'Raw') brand = 'RAW';
    if (brand === 'Smackdown') brand = 'SmackDown';
    if (!grouped[brand]) grouped[brand] = [];
    grouped[brand].push(w);
  });
  // Sort each group alphabetically by name
  Object.keys(grouped).forEach(brand => {
    grouped[brand].sort((a, b) => a.name.localeCompare(b.name));
  });
  return grouped;
}

export default function WrestlersPage({ wrestlers = [] }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const grouped = groupWrestlersByBrand(safeWrestlers);
  return (
    <>
      <Helmet>
        <title>Wrestlers - WWE Roster & Brands | Wrestling Boxscore</title>
        <meta name="description" content="Browse the full WWE roster by brand: RAW, SmackDown, NXT, and more. See wrestler images, names, and brand assignments." />
        <meta name="keywords" content="WWE wrestlers, WWE roster, RAW, SmackDown, NXT, wrestling brands, WWE superstars" />
        <link rel="canonical" href="https://wrestlingboxscore.com/wrestlers" />
      </Helmet>
      <div style={{ color: '#fff', padding: 40, maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Wrestlers</h2>
        {BRAND_ORDER.map(brand => (
          grouped[brand] && grouped[brand].length > 0 && (
            <div key={brand} style={{
              background: '#181818',
              borderRadius: 14,
              boxShadow: '0 0 16px #C6A04F22',
              marginBottom: 36,
              padding: '24px 20px',
            }}>
              <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>{BRAND_LABELS[brand]}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {grouped[brand].map(w => (
                  <div key={w.id} style={{
                    width: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: 16,
                    background: 'rgba(34,34,34,0.98)',
                    borderRadius: 10,
                    padding: '12px 8px',
                    boxShadow: '0 0 8px #C6A04F11',
                  }}>
                    <div style={{ position: 'relative', width: 72, height: 72 }}>
                      <img src={w.image_url} alt={w.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />

                      {/* Medical cross if status is Injured */}
                      {w.status === 'Injured' && (
                        <div style={{ position: 'absolute', top: -10, right: -10 }}>
                          <MedicalCrossIcon size={28} />
                        </div>
                      )}
                      {/* Inactive TV icon if status is Inactive */}
                      {w.status === 'Inactive' && (
                        <div style={{ position: 'absolute', bottom: -10, right: -10 }}>
                          <InactiveIcon size={28} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', textAlign: 'center', wordBreak: 'break-word' }}>{w.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </>
  );
} 