import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../supabaseClient';

const BRAND_ORDER = ['RAW', 'SmackDown', 'NXT', 'Unassigned'];

// Custom championship display order
const CHAMPIONSHIP_ORDER = [
  'Undisputed WWE Championship',
  'World Heavyweight Championship',
  'WWE Women\'s Championship',
  'Women\'s World Championship',
  'Men\'s IC Championship',
  'Women\'s IC Championship',
  'Men\'s U.S. Championship',
  'Women\'s U.S. Championship',
  'Raw Tag Team Championship',
  'SmackDown Tag Team Championship',
  'Women\'s Tag Team Championship'
];

// Helper function to get championship display order
function getChampionshipOrder(titleName) {
  const index = CHAMPIONSHIP_ORDER.indexOf(titleName);
  return index === -1 ? 999 : index; // Put unknown championships at the end
}

export default function ChampionshipsPage({ wrestlers = [] }) {
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tagTeams, setTagTeams] = useState([]);
  const [tagTeamMembers, setTagTeamMembers] = useState({});

  useEffect(() => {
    fetchChampions();
    fetchTagTeams();
  }, []);

  const fetchTagTeams = async () => {
    try {
      // Fetch all tag teams
      const { data: teams, error: teamsError } = await supabase
        .from('tag_teams')
        .select('id, name');
      
      if (teamsError) throw teamsError;
      setTagTeams(teams || []);
      
      // Fetch all tag team members
      if (teams && teams.length > 0) {
        const { data: members, error: membersError } = await supabase
          .from('tag_team_members')
          .select('tag_team_id, wrestler_slug, member_order')
          .eq('active', true)
          .order('member_order');
        
        if (membersError) throw membersError;
        
        // Group members by tag team
        const membersByTeam = {};
        (members || []).forEach(member => {
          if (!membersByTeam[member.tag_team_id]) {
            membersByTeam[member.tag_team_id] = [];
          }
          membersByTeam[member.tag_team_id].push(member.wrestler_slug);
        });
        
        setTagTeamMembers(membersByTeam);
      }
    } catch (err) {
      console.error('Error fetching tag teams:', err);
      // Don't show error to user, just log it
    }
  };

  const fetchChampions = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('championships')
        .select('*');

      if (fetchError) throw fetchError;
      
      // Transform data and check if titles were won from vacant status
      // Check if previous_champion_slug is 'vacant' which indicates title was won from vacant
      // Note: Only check for titles that are currently held (not currently vacant)
      const transformedData = (data || []).map(champ => {
        // Only mark as wonFromVacant if title is currently held (not vacant) and was won from vacant
        const isCurrentlyVacant = champ.current_champion === 'VACANT' || champ.current_champion_slug === 'vacant';
        const wonFromVacant = !isCurrentlyVacant && (
          champ.previous_champion_slug === 'vacant' || 
          champ.previous_champion === 'VACANT'
        );
        
        return {
          ...champ,
          event: champ.event_name || champ.event || 'Unknown Event',
          wonFromVacant: wonFromVacant
        };
      });
      
      // Sort by custom championship order
      transformedData.sort((a, b) => {
        const orderA = getChampionshipOrder(a.title_name);
        const orderB = getChampionshipOrder(b.title_name);
        return orderA - orderB;
      });
      
      setChampions(transformedData);
    } catch (err) {
      console.error('Error fetching champions:', err);
      setError('Failed to load champions. Please try again later.');
      // Fallback to empty array
      setChampions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredChampions = champions.filter(champ => {
    const brandMatch = selectedBrand === 'all' || champ.brand === selectedBrand;
    return brandMatch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '2025-01-01') return 'TBD';
    
    // If date is in YYYY-MM-DD format, parse it in local timezone to avoid day shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Use local timezone, not UTC
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // For other formats, try to parse normally
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if parsing fails
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getBrandColor = (brand) => {
    switch (brand) {
      case 'RAW': return '#D32F2F';
      case 'SmackDown': return '#1976D2';
      case 'NXT': return '#FF6F00';
      case 'Unassigned': return '#C6A04F';
      default: return '#666';
    }
  };



  // Helper function to get tag team name from slug
  const getTagTeamName = (slug) => {
    if (!slug || slug === 'vacant') return null;
    // Try to find tag team by slug
    const team = tagTeams.find(t => t.id === slug || t.id === slug.replace(/^the-/, ''));
    return team?.name || null;
  };

  // Helper function to format champion name (handles both individuals and tag teams)
  const formatChampionName = (championName, championSlug, champType = null) => {
    // For non–tag-team titles, always prefer the wrestler's proper name from the wrestlers table
    if (champType !== 'Tag Team' && championSlug && championSlug !== 'vacant' && championSlug !== 'unknown') {
      const wrestlerBySlug = wrestlers.find(w => w.id === championSlug);
      if (wrestlerBySlug?.name) {
        return wrestlerBySlug.name;
      }
    }

    // If it's a tag team championship, try to find the tag team
    if (champType === 'Tag Team') {
      // First try to get tag team name from slug directly
      if (championSlug) {
        const teamName = getTagTeamName(championSlug);
        if (teamName) return teamName;
      }
      
      // If champion name contains " & " it might be individual slugs
      // Also handle format like "The Kabuki Warriors (asuka & kairi-sane)"
      if (championName && championName.includes(' & ')) {
        // Check if it's in format "Team Name (slug1 & slug2)"
        const teamMatch = championName.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (teamMatch) {
          const teamName = teamMatch[1].trim();
          const slugs = teamMatch[2].split('&').map(s => s.trim());
          // Format individual names in parentheses
          const names = slugs.map(slug => {
            const wrestler = wrestlers.find(w => w.id === slug);
            return wrestler?.name || slug;
          });
          return `${teamName} (${names.join(' & ')})`;
        }
        
        // Otherwise, just slugs separated by " & "
        const slugs = championName.split(' & ').map(s => s.trim());
        // Try to find a tag team that contains these members
        for (const team of tagTeams) {
          const teamId = team.id;
          const members = tagTeamMembers[teamId] || [];
          // Check if all slugs are in this team and team has exactly these members
          const hasAllMembers = slugs.every(slug => members.includes(slug));
          const hasOnlyTheseMembers = members.length === slugs.length;
          if (hasAllMembers && hasOnlyTheseMembers) {
            return team.name;
          }
        }
        
        // If no team found, format as individual names
        const names = slugs.map(slug => {
          const wrestler = wrestlers.find(w => w.id === slug);
          return wrestler?.name || slug;
        });
        return names.join(' & ');
      }
      
      // If champion name looks like a slug, try to get tag team name
      if (championSlug && championName && championSlug === championName.toLowerCase().replace(/\s+/g, '-')) {
        const teamName = getTagTeamName(championSlug);
        if (teamName) return teamName;
      }
    }
    
    // Check if championName looks like a slug (contains hyphens and is lowercase)
    // This handles cases where the database stores slugs instead of names
    if (championName && championName.includes('-') && championName === championName.toLowerCase()) {
      // Try to look up by the name itself (treating it as a slug)
      const wrestler = wrestlers.find(w => w.id === championName);
      if (wrestler?.name) {
        return wrestler.name;
      }
      // Also try with the championSlug parameter
      if (championSlug && championSlug !== championName) {
        const wrestlerBySlug = wrestlers.find(w => w.id === championSlug);
        if (wrestlerBySlug?.name) {
          return wrestlerBySlug.name;
        }
      }
    }
    
    // For individuals, if name is "Unknown" or empty but we have a slug, look up by slug
    if ((!championName || championName === 'Unknown') && championSlug && championSlug !== 'unknown' && championSlug !== 'vacant') {
      const wrestler = wrestlers.find(w => w.id === championSlug);
      if (wrestler?.name) {
        return wrestler.name;
      }
    }
    
    // For individuals, return the name (should already be a proper name)
    // But if it's empty or null, try slug lookup as fallback
    if (!championName && championSlug && championSlug !== 'unknown' && championSlug !== 'vacant') {
      const wrestler = wrestlers.find(w => w.id === championSlug);
      if (wrestler?.name) {
        return wrestler.name;
      }
    }
    
    return championName || 'Unknown';
  };

  // Helper function to get wrestler image
  const getWrestlerImage = (championSlug) => {
    if (championSlug === 'vacant') return null;
    const wrestler = wrestlers.find(w => w.id === championSlug);
    return wrestler?.image_url || null;
  };

  // Helper function to get tag team wrestler images
  const getTagTeamImages = (championName, championSlug) => {
    if (championSlug === 'vacant') return [];
    
    // Normalize slug - remove "the-" prefix if present for lookup
    const normalizedSlug = championSlug.replace(/^the-/, '');
    
    // Clean up champion name - remove member names in parentheses if present
    const cleanChampionName = championName.replace(/\s*\([^)]+\)\s*$/, '').trim();
    
    // Try to find tag team in database by multiple methods
    const tagTeam = tagTeams.find(team => {
      // Match by exact slug
      if (team.id === championSlug || team.id === normalizedSlug) return true;
      // Match by name (case insensitive)
      if (team.name.toLowerCase() === championName.toLowerCase()) return true;
      // Match by cleaned name (without member names in parentheses)
      if (team.name.toLowerCase() === cleanChampionName.toLowerCase()) return true;
      // Match if team name is contained in champion name or vice versa
      const teamNameLower = team.name.toLowerCase();
      const champNameLower = championName.toLowerCase();
      if (champNameLower.includes(teamNameLower) || teamNameLower.includes(champNameLower)) return true;
      return false;
    });
    
    if (tagTeam) {
      // Get members from tag_team_members
      const teamId = tagTeam.id;
      const memberSlugs = tagTeamMembers[teamId] || [];
      
      // Get images for the first 2 members (for display)
      const images = memberSlugs.slice(0, 2).map(slug => {
        const wrestler = wrestlers.find(w => w.id === slug);
        return wrestler?.image_url;
      }).filter(Boolean);
      
      if (images.length > 0) {
        return images;
      }
    }
    
    // Fallback: Handle specific hardcoded cases for teams not in database
    if (championSlug === 'the-judgment-day') {
      return [
        wrestlers.find(w => w.id === 'finn-balor')?.image_url,
        wrestlers.find(w => w.id === 'jd-mcdonagh')?.image_url
      ].filter(Boolean);
    }
    
    if (championSlug === 'charlotte-flair-alexa-bliss') {
      return [
        wrestlers.find(w => w.id === 'charlotte-flair')?.image_url,
        wrestlers.find(w => w.id === 'alexa-bliss')?.image_url
      ].filter(Boolean);
    }
    
    // Fallback: try to find individual wrestlers by name
    const names = championName.split('&').map(name => name.trim());
    const images = names.map(name => {
      const wrestler = wrestlers.find(w => 
        w.name?.toLowerCase().includes(name.toLowerCase()) ||
        w.id?.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, '-'))
      );
      return wrestler?.image_url;
    }).filter(Boolean);
    
    return images;
  };

  // Helper function to get belt image URL from Supabase storage
  const getBeltImageUrl = (championshipId) => {
    // Map championship IDs to belt image filenames
    const beltImageMap = {
      'wwe-championship': 'undisputed-wwe-championship.png',
      'world-heavyweight-championship': 'world-heavyweight-championship.png',
      'mens-ic-championship': 'mens-intercontinental-championship1.png',
      'mens-us-championship': 'mens-united-states-championship.png',
      'raw-tag-team-championship': 'raw-tag-team-championship.png',
      'smackdown-tag-team-championship': 'smackdown-tag-team-championship.png',
      'wwe-womens-championship': 'wwe-womens-championship.png',
      'womens-world-championship': 'womens-world-championship.png',
      'womens-ic-championship': 'womens-intercontinental-championship.png',
      'womens-us-championship': 'womens-united-states-championship.png',
      'womens-tag-team-championship': 'womens-tag-team-championship.png'
    };
    
    const filename = beltImageMap[championshipId];
    if (!filename) return null;
    
    // Return Supabase storage URL with your actual project reference
    return `https://qvbqxietcmweltxoonvh.supabase.co/storage/v1/object/public/belts/${filename}`;
  };

  return (
    <>
      <Helmet>
        <title>Current Champions - WWE Championships | Wrestling Boxscore</title>
        <meta name="description" content="View all current WWE champions across RAW, SmackDown, NXT, and undisputed titles. Stay updated with the latest championship holders." />
        <meta name="keywords" content="WWE champions, current champions, WWE titles, RAW champions, SmackDown champions, NXT champions" />
        <link rel="canonical" href="https://wrestlingboxscore.com/championships" />
      </Helmet>
      
      <div style={{ color: '#fff', padding: 40, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 32, color: '#C6A04F', fontSize: 36, fontWeight: 800 }}>
          Current Champions
        </h1>
        
        {error && (
          <div style={{ 
            background: '#b02a37', 
            color: '#fff', 
            padding: 16, 
            borderRadius: 8, 
            marginBottom: 24,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ccc' }}>
            Loading champions...
          </div>
        ) : filteredChampions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ccc' }}>
            No champions found.
          </div>
        ) : (
          <>
        {/* Filters */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 12, fontWeight: 600, color: '#C6A04F' }}>Brand:</span>
            <button
              onClick={() => setSelectedBrand('all')}
              style={{
                margin: '0 4px',
                padding: '8px 16px',
                background: selectedBrand === 'all' ? '#C6A04F' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: selectedBrand === 'all' ? 'bold' : 'normal'
              }}
            >
              ALL
            </button>
            {BRAND_ORDER.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(selectedBrand === brand ? 'all' : brand)}
                style={{
                  margin: '0 4px',
                  padding: '8px 16px',
                  background: selectedBrand === brand ? getBrandColor(brand) : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: selectedBrand === brand ? 'bold' : 'normal'
                }}
              >
                {brand}
              </button>
            ))}
          </div>
          

        </div>

        {/* Champions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
          {filteredChampions.map(champ => (
            <div key={champ.id} style={{ 
              background: '#181818', 
              padding: 24, 
              borderRadius: 12,
              border: `2px solid ${getBrandColor(champ.brand)}`,
              boxShadow: `0 0 20px ${getBrandColor(champ.brand)}33`,
              position: 'relative',
              overflow: 'hidden'
            }}>

              
              {/* Brand Badge */}
              <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: getBrandColor(champ.brand),
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600
              }}>
                {champ.brand}
              </div>
              
              {/* Championship Title */}
              <div style={{ marginTop: 32, marginBottom: 16, textAlign: 'center' }}>
                <h3 style={{ color: '#C6A04F', fontSize: 20, fontWeight: 700, margin: 0 }}>
                  {champ.title_name}
                </h3>
              </div>
              
              {/* Belt Image */}
              {getBeltImageUrl(champ.id) && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  {champ.type === 'Tag Team' ? (
                    // Tag Team: Show two belts side by side
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                      <img 
                        src={getBeltImageUrl(champ.id)} 
                        alt={`${champ.title_name} belt`}
                        style={{ 
                          width: '120px', 
                          height: '80px',
                          objectFit: 'contain'
                        }} 
                      />
                      <img 
                        src={getBeltImageUrl(champ.id)} 
                        alt={`${champ.title_name} belt`}
                        style={{ 
                          width: '120px', 
                          height: '80px',
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                  ) : (
                    // Individual: Show one belt with size based on championship type
                    <img 
                      src={getBeltImageUrl(champ.id)} 
                      alt={`${champ.title_name} belt`}
                      style={{ 
                        width: champ.id.includes('womens') ? '240px' : '200px', 
                        height: champ.id.includes('womens') ? '96px' : '80px',
                        objectFit: 'contain'
                      }} 
                    />
                  )}
                </div>
              )}
              
              {/* Champion Info */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {/* Wrestler Images */}
                {champ.type === 'Tag Team' ? (
                  // Tag Team Images
                  getTagTeamImages(champ.current_champion, champ.current_champion_slug).length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {getTagTeamImages(champ.current_champion, champ.current_champion_slug).map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Tag team member ${index + 1}`}
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #C6A04F'
                          }} 
                        />
                      ))}
                    </div>
                  )
                ) : (
                  // Individual Wrestler Image
                  getWrestlerImage(champ.current_champion_slug) && (
                    <div style={{ marginBottom: 12 }}>
                      <img 
                        src={getWrestlerImage(champ.current_champion_slug)} 
                        alt={champ.current_champion}
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #C6A04F'
                        }} 
                      />
                    </div>
                  )
                )}
                
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                  {formatChampionName(champ.current_champion, champ.current_champion_slug, champ.type)}
                </div>
              </div>
              
              {/* Championship Details */}
              <div style={{ 
                background: '#222', 
                padding: 16, 
                borderRadius: 8,
                border: '1px solid #444'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#ccc' }}>Champion:</span>
                  <span style={{ fontWeight: 600 }}>{formatChampionName(champ.current_champion, champ.current_champion_slug, champ.type)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#ccc' }}>Brand:</span>
                  <span style={{ color: getBrandColor(champ.brand), fontWeight: 600 }}>{champ.brand}</span>
                </div>


              </div>
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div style={{ 
          marginTop: 48, 
          padding: 24, 
          background: '#181818', 
          borderRadius: 12,
          border: '1px solid #444'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#C6A04F' }}>Championship Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {BRAND_ORDER.map(brand => {
              const brandCount = champions.filter(champ => champ.brand === brand).length;
              return (
                <div key={brand} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: getBrandColor(brand) }}>{brandCount}</div>
                  <div style={{ fontSize: 14, color: '#ccc' }}>{brand} Titles</div>
                </div>
              );
            })}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#C6A04F' }}>{champions.length}</div>
              <div style={{ fontSize: 14, color: '#ccc' }}>Total Titles</div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  );
}
