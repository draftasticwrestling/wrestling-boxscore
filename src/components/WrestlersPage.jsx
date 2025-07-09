import React from 'react';

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
  const grouped = groupWrestlersByBrand(wrestlers);
  return (
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
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#444', marginBottom: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {w.image_url
                      ? <img src={w.image_url} alt={w.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />
                      : <span role="img" aria-label="wrestler" style={{ fontSize: 40, color: '#7da2c1' }}>&#128100;</span>
                    }
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', textAlign: 'center', wordBreak: 'break-word' }}>{w.name}</div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
} 