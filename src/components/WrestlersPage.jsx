import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import MedicalCrossIcon from './MedicalCrossIcon';
import InactiveIcon from './InactiveIcon';
import { supabase } from '../supabaseClient';
import { useUser } from '../hooks/useUser';
import WrestlerEditModal from './WrestlerEditModal';

const BRAND_ORDER = ['RAW', 'SmackDown', 'NXT', 'AAA'];
const BRAND_LABELS = {
  RAW: 'RAW',
  SmackDown: 'SmackDown',
  NXT: 'NXT',
  AAA: 'AAA',
};

// Extract wrestler slugs from match participants string
function extractWrestlerSlugs(participants) {
  const slugs = new Set();
  
  if (!participants) return slugs;
  
  // Handle array format (battle royal)
  if (Array.isArray(participants)) {
    participants.forEach(slug => {
      if (slug && typeof slug === 'string') {
        slugs.add(slug.trim());
      }
    });
    return slugs;
  }
  
  // Handle string format
  if (typeof participants !== 'string') return slugs;
  
  // Split by " vs " to get sides
  const sides = participants.split(' vs ');
  
  sides.forEach(side => {
    // Check for tag team format: "Team Name (slug1 & slug2)"
    const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (teamMatch) {
      // Extract slugs from parentheses
      const teamSlugs = teamMatch[2].split('&').map(s => s.trim()).filter(Boolean);
      teamSlugs.forEach(slug => slugs.add(slug));
    } else {
      // Regular format: "slug1 & slug2" or just "slug1"
      const sideSlugs = side.split('&').map(s => s.trim()).filter(Boolean);
      sideSlugs.forEach(slug => slugs.add(slug));
    }
  });
  
  return slugs;
}

// Parse event date string to Date object
function parseEventDate(dateStr) {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  // Try format like "June 9, 2025" or "Jan 1, 2024"
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

// Check if a wrestler has appeared in events within the last 12 months
async function getWrestlersWithRecentAppearances() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setHours(0, 0, 0, 0);
  
  try {
    // Fetch all events (we'll filter by date in JavaScript since date format may vary)
    const { data: events, error } = await supabase
      .from('events')
      .select('id, date, matches')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching events:', error);
      return new Set();
    }
    
    const wrestlerSlugs = new Set();
    
    // Filter events from the last 12 months and extract wrestler slugs
    events.forEach(event => {
      const eventDate = parseEventDate(event.date);
      
      // Only process events from the last 12 months
      if (eventDate && eventDate >= twelveMonthsAgo) {
        if (event.matches && Array.isArray(event.matches)) {
          event.matches.forEach(match => {
            if (match.participants) {
              const slugs = extractWrestlerSlugs(match.participants);
              slugs.forEach(slug => wrestlerSlugs.add(slug));
            }
          });
        }
      }
    });
    
    return wrestlerSlugs;
  } catch (error) {
    console.error('Error getting wrestlers with recent appearances:', error);
    return new Set();
  }
}

function groupWrestlersByClassification(wrestlers) {
  const grouped = {
    Active: { RAW: [], SmackDown: [], NXT: [], AAA: [] },
    'Part-timer': [],
    Alumni: [],
    'Celebrity Guests': []
  };

  wrestlers.forEach(w => {
    const classification = w.classification || 'Active'; // Default to Active for backward compatibility
    
    if (classification === 'Active') {
      let brand = (w.brand || '').trim();
      if (brand === 'Raw') brand = 'RAW';
      if (brand === 'Smackdown') brand = 'SmackDown';
      // Handle AAA (case-insensitive)
      if (brand && brand.toUpperCase() === 'AAA') brand = 'AAA';
      if (BRAND_ORDER.includes(brand)) {
        grouped.Active[brand].push(w);
      } else {
        // Active wrestler without a valid brand - put in RAW as default
        grouped.Active['RAW'].push(w);
      }
    } else if (classification === 'Part-timer') {
      grouped['Part-timer'].push(w);
    } else if (classification === 'Alumni') {
      grouped.Alumni.push(w);
    } else if (classification === 'Celebrity Guests') {
      grouped['Celebrity Guests'].push(w);
    } else {
      // Fallback: if no classification, treat as Active
      let brand = (w.brand || '').trim();
      if (brand === 'Raw') brand = 'RAW';
      if (brand === 'Smackdown') brand = 'SmackDown';
      if (brand && brand.toUpperCase() === 'AAA') brand = 'AAA';
      if (BRAND_ORDER.includes(brand)) {
        grouped.Active[brand].push(w);
      } else {
        grouped.Active['RAW'].push(w);
      }
    }
  });

  // Sort each group alphabetically by name
  Object.keys(grouped.Active).forEach(brand => {
    grouped.Active[brand].sort((a, b) => a.name.localeCompare(b.name));
  });
  grouped['Part-timer'].sort((a, b) => a.name.localeCompare(b.name));
  grouped.Alumni.sort((a, b) => a.name.localeCompare(b.name));
  grouped['Celebrity Guests'].sort((a, b) => a.name.localeCompare(b.name));

  return grouped;
}

function WrestlerCard({ w, onEdit, isAuthorized }) {
  const [showEditButton, setShowEditButton] = useState(false);

  return (
    <div
      style={{
        width: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 16,
        background: 'rgba(34,34,34,0.98)',
        borderRadius: 10,
        padding: '12px 8px',
        boxShadow: '0 0 8px #C6A04F11',
        position: 'relative',
        cursor: isAuthorized ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={() => isAuthorized && setShowEditButton(true)}
      onMouseLeave={() => setShowEditButton(false)}
      onClick={() => isAuthorized && onEdit(w)}
    >
      {isAuthorized && showEditButton && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: '#C6A04F',
            color: '#232323',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 700,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          Edit
        </div>
      )}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <img src={w.image_url} alt={w.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />

        {/* Medical cross if status is Injured */}
        {w.status === 'Injured' && (
          <div style={{ position: 'absolute', top: -10, right: -10 }}>
            <MedicalCrossIcon size={28} />
          </div>
        )}
        {/* Inactive TV icon if status is On Hiatus or Inactive */}
        {(w.status === 'On Hiatus' || w.status === 'Inactive') && (
          <div style={{ position: 'absolute', bottom: -10, right: -10 }}>
            <InactiveIcon size={28} />
          </div>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', textAlign: 'center', wordBreak: 'break-word' }}>{w.name}</div>
      {/* Status indicator text */}
      {w.status === 'Injured' && (
        <div style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 700,
          color: '#ff4444',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          INJ
        </div>
      )}
      {(w.status === 'On Hiatus' || w.status === 'Inactive') && (
        <div style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 700,
          color: '#ffa726',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          HIATUS
        </div>
      )}
    </div>
  );
}

export default function WrestlersPage({ wrestlers = [], onWrestlerUpdate }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [wrestlersWithRecentAppearances, setWrestlersWithRecentAppearances] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [editingWrestler, setEditingWrestler] = useState(null);
  const user = useUser();
  const isAuthorized = !!user;
  
  // Fetch wrestlers with recent appearances
  useEffect(() => {
    async function fetchRecentAppearances() {
      setLoading(true);
      const recentWrestlers = await getWrestlersWithRecentAppearances();
      setWrestlersWithRecentAppearances(recentWrestlers);
      setLoading(false);
    }
    fetchRecentAppearances();
  }, []);
  
  // Filter wrestlers based on brand and recent appearances
  const filteredWrestlers = safeWrestlers.filter(w => {
    const brand = (w.brand || '').trim();
    const normalizedBrand = brand === 'Raw' ? 'RAW' : 
                           brand === 'Smackdown' ? 'SmackDown' : 
                           brand && brand.toUpperCase() === 'AAA' ? 'AAA' : brand;
    
    // Always show RAW, SmackDown, and NXT wrestlers
    if (normalizedBrand === 'RAW' || normalizedBrand === 'SmackDown' || normalizedBrand === 'NXT') {
      return true;
    }
    
    // For all others (AAA, Part-timers, Celebrity Guests, Alumni), 
    // only show if they appeared in an event within the last 12 months
    return wrestlersWithRecentAppearances.has(w.id);
  });
  
  const grouped = groupWrestlersByClassification(filteredWrestlers);

  const handleWrestlerUpdate = async (updatedWrestler) => {
    console.log('Wrestler updated in parent:', updatedWrestler);
    // Call the parent callback if provided
    if (onWrestlerUpdate) {
      onWrestlerUpdate(updatedWrestler);
    }
    // Close the modal
    setEditingWrestler(null);
    // Force a hard refresh to ensure we get the latest data from the database
    // Using location.reload(true) for a hard refresh (clears cache)
    setTimeout(() => {
      window.location.reload(true);
    }, 300);
  };
  
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
        {loading && (
          <div style={{ textAlign: 'center', color: '#C6A04F', marginBottom: 24 }}>
            Loading recent appearances...
          </div>
        )}
        
        {/* Active Wrestlers by Brand */}
        {BRAND_ORDER.map(brand => (
          grouped.Active[brand] && grouped.Active[brand].length > 0 && (
            <div key={brand} style={{
              background: '#181818',
              borderRadius: 14,
              boxShadow: '0 0 16px #C6A04F22',
              marginBottom: 36,
              padding: '24px 20px',
            }}>
              <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>{BRAND_LABELS[brand]}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {grouped.Active[brand].map(w => (
                  <WrestlerCard 
                    key={w.id} 
                    w={w} 
                    onEdit={setEditingWrestler}
                    isAuthorized={isAuthorized}
                  />
                ))}
              </div>
            </div>
          )
        ))}

        {/* Part-timer Wrestlers */}
        {grouped['Part-timer'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>Part-timers</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped['Part-timer'].map(w => (
                <WrestlerCard 
                  key={w.id} 
                  w={w} 
                  onEdit={setEditingWrestler}
                  isAuthorized={isAuthorized}
                />
              ))}
            </div>
          </div>
        )}

        {/* Celebrity Guests */}
        {grouped['Celebrity Guests'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>Celebrity Guests</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped['Celebrity Guests'].map(w => (
                <WrestlerCard 
                  key={w.id} 
                  w={w} 
                  onEdit={setEditingWrestler}
                  isAuthorized={isAuthorized}
                />
              ))}
            </div>
          </div>
        )}

        {/* Alumni Wrestlers */}
        {grouped.Alumni.length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>Alumni</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped.Alumni.map(w => (
                <WrestlerCard 
                  key={w.id} 
                  w={w} 
                  onEdit={setEditingWrestler}
                  isAuthorized={isAuthorized}
                />
              ))}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingWrestler && (
          <WrestlerEditModal
            wrestler={editingWrestler}
            onClose={() => setEditingWrestler(null)}
            onSave={handleWrestlerUpdate}
            allWrestlers={safeWrestlers}
          />
        )}
      </div>
    </>
  );
} 