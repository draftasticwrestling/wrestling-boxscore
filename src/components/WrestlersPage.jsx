import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import MedicalCrossIcon from './MedicalCrossIcon';
import InactiveIcon from './InactiveIcon';
import { supabase } from '../supabaseClient';
import { useUser } from '../hooks/useUser';
import WrestlerEditModal from './WrestlerEditModal';
import WrestlerAddModal from './WrestlerAddModal';
import FactionsView from './FactionsView';
import TagTeamsView from './TagTeamsView';

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
    'Not Assigned': [],
    Alumni: [],
    'Celebrity Guests': []
  };

  wrestlers.forEach(w => {
    const classification = w.classification || 'Active'; // Default to Active for backward compatibility
    const status = w.status || w.Status || '';
    
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
      // Part-timers are not assigned to a specific roster by definition
      // All part-timers go to "Not Assigned" section
      // (The "Part-timer" section can be used for active part-timers if needed in the future)
      grouped['Not Assigned'].push(w);
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
  grouped['Not Assigned'].sort((a, b) => a.name.localeCompare(b.name));
  grouped.Alumni.sort((a, b) => a.name.localeCompare(b.name));
  grouped['Celebrity Guests'].sort((a, b) => a.name.localeCompare(b.name));

  return grouped;
}

function WrestlerCard({ w, onEdit, isAuthorized }) {
  const [showEditButton, setShowEditButton] = useState(false);
  
  // Debug: Log status for troubleshooting
  const status = w.status || w.Status || '';
  if (status) {
    console.log(`Wrestler ${w.name} has status:`, status, 'w.status:', w.status, 'w.Status:', w.Status);
  }

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

        {/* Get status - handle both lowercase and capital S (database has "Status") */}
        {(() => {
          const status = w.status || w.Status || '';
          return (
            <>
              {/* Medical cross if status is Injured */}
              {status === 'Injured' && (
                <div style={{ position: 'absolute', top: -10, right: -10 }}>
                  <MedicalCrossIcon size={28} />
                </div>
              )}
              {/* Inactive TV icon if status is On Hiatus or Inactive */}
              {(status === 'On Hiatus' || status === 'Inactive') && (
                <div style={{ position: 'absolute', bottom: -10, right: -10 }}>
                  <InactiveIcon size={28} />
                </div>
              )}
            </>
          );
        })()}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', textAlign: 'center', wordBreak: 'break-word' }}>{w.name}</div>
      {/* Status indicator text */}
      {(() => {
        const status = w.status || w.Status || '';
        return (
          <>
            {status === 'Injured' && (
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
            {(status === 'On Hiatus' || status === 'Inactive') && (
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
          </>
        );
      })()}
    </div>
  );
}

export default function WrestlersPage({ wrestlers = [], onWrestlerUpdate }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [wrestlersWithRecentAppearances, setWrestlersWithRecentAppearances] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [editingWrestler, setEditingWrestler] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster', 'factions', 'tag-teams'
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
  
  // Debug: Log grouping results
  console.log('Wrestler grouping:', {
    'Part-timer': grouped['Part-timer'].length,
    'Not Assigned': grouped['Not Assigned'].length,
    'RAW': grouped.Active['RAW'].length,
    'SmackDown': grouped.Active['SmackDown'].length,
    'NXT': grouped.Active['NXT'].length,
    'AAA': grouped.Active['AAA'].length,
  });

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

  const handleWrestlerCreate = async (newWrestler) => {
    console.log('Wrestler created in parent:', newWrestler);
    // Close the modal
    setShowAddModal(false);
    // Force a hard refresh to ensure we get the latest data from the database
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
      <div style={{ color: '#fff', padding: 40, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h2 style={{ textAlign: 'center', margin: 0, flex: 1 }}>Wrestlers</h2>
          {isAuthorized && activeTab === 'roster' && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#C6A04F',
                color: '#232323',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              + Add Wrestler
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: 32,
          borderBottom: '2px solid #333',
        }}>
          <button
            onClick={() => setActiveTab('roster')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'roster' ? '#C6A04F' : 'transparent',
              color: activeTab === 'roster' ? '#232323' : '#fff',
              border: 'none',
              borderBottom: activeTab === 'roster' ? '3px solid #C6A04F' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: activeTab === 'roster' ? 700 : 500,
              transition: 'all 0.2s',
            }}
          >
            Roster
          </button>
          <button
            onClick={() => setActiveTab('factions')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'factions' ? '#C6A04F' : 'transparent',
              color: activeTab === 'factions' ? '#232323' : '#fff',
              border: 'none',
              borderBottom: activeTab === 'factions' ? '3px solid #C6A04F' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: activeTab === 'factions' ? 700 : 500,
              transition: 'all 0.2s',
            }}
          >
            Stables
          </button>
          <button
            onClick={() => setActiveTab('tag-teams')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'tag-teams' ? '#C6A04F' : 'transparent',
              color: activeTab === 'tag-teams' ? '#232323' : '#fff',
              border: 'none',
              borderBottom: activeTab === 'tag-teams' ? '3px solid #C6A04F' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: activeTab === 'tag-teams' ? 700 : 500,
              transition: 'all 0.2s',
            }}
          >
            Tag Teams
          </button>
        </div>

        {loading && activeTab === 'roster' && (
          <div style={{ textAlign: 'center', color: '#C6A04F', marginBottom: 24 }}>
            Loading recent appearances...
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'roster' && (
          <div>
        {/* RAW */}
        {grouped.Active['RAW'] && grouped.Active['RAW'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>RAW</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped.Active['RAW'].map(w => (
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

        {/* SmackDown */}
        {grouped.Active['SmackDown'] && grouped.Active['SmackDown'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>SmackDown</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped.Active['SmackDown'].map(w => (
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

        {/* Not Assigned (Part-timers on hiatus or without roster) */}
        {grouped['Not Assigned'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>Not Assigned</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped['Not Assigned'].map(w => (
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

        {/* NXT */}
        {grouped.Active['NXT'] && grouped.Active['NXT'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>NXT</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped.Active['NXT'].map(w => (
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

        {/* AAA */}
        {grouped.Active['AAA'] && grouped.Active['AAA'].length > 0 && (
          <div style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, marginBottom: 18, textAlign: 'left', letterSpacing: 1 }}>AAA</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {grouped.Active['AAA'].map(w => (
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
          </div>
        )}

        {activeTab === 'factions' && (
          <FactionsView 
            wrestlers={safeWrestlers}
            isAuthorized={isAuthorized}
            onWrestlerUpdate={handleWrestlerUpdate}
          />
        )}

        {activeTab === 'tag-teams' && (
          <TagTeamsView 
            wrestlers={safeWrestlers}
            isAuthorized={isAuthorized}
            onWrestlerUpdate={handleWrestlerUpdate}
          />
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

        {/* Add Modal */}
        {showAddModal && (
          <WrestlerAddModal
            onClose={() => setShowAddModal(false)}
            onSave={handleWrestlerCreate}
            allWrestlers={safeWrestlers}
          />
        )}
      </div>
    </>
  );
} 