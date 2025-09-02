import React, { useState } from 'react';
import { Helmet } from 'react-helmet';

// Current champions data (updated with accurate information)
const currentChampions = [
  {
    id: 'wwe-championship',
    title_name: 'WWE Championship',
    current_champion: 'Cody Rhodes',
    current_champion_slug: 'cody-rhodes',
    date_won: '2025-08-03',
    event: 'Summer Slam Night 2',
    brand: 'SmackDown',
    type: 'World'
  },
  {
    id: 'world-heavyweight-championship',
    title_name: 'World Heavyweight Championship',
    current_champion: 'Seth Rollins',
    current_champion_slug: 'seth-rollins',
    date_won: '2025-08-02',
    event: 'Summer Slam Night 1',
    brand: 'RAW',
    type: 'World'
  },
  {
    id: 'mens-us-championship',
    title_name: "Men's United States Championship",
    current_champion: 'Sami Zayn',
    current_champion_slug: 'sami-zayn',
    date_won: '2025-08-29',
    event: 'SmackDown',
    brand: 'SmackDown',
    type: 'Secondary'
  },
  {
    id: 'mens-ic-championship',
    title_name: "Men's Intercontinental Championship",
    current_champion: 'Dominik Mysterio',
    current_champion_slug: 'dominik-mysterio',
    date_won: '2025-04-20',
    event: 'Wrestlemania Night 2',
    brand: 'RAW',
    type: 'Secondary'
  },
  {
    id: 'raw-tag-team-championship',
    title_name: 'RAW Tag Team Championship',
    current_champion: 'The Judgment Day (Finn Balor & JD McDonagh)',
    current_champion_slug: 'the-judgment-day',
    date_won: '2025-06-30',
    event: 'RAW',
    brand: 'RAW',
    type: 'Tag Team'
  },
  {
    id: 'smackdown-tag-team-championship',
    title_name: 'SmackDown Tag Team Championship',
    current_champion: 'The Wyatt Sicks (Joe Gacy & Dexter Lumis)',
    current_champion_slug: 'the-wyatt-sicks',
    date_won: '2025-07-11',
    event: 'SmackDown',
    brand: 'SmackDown',
    type: 'Tag Team'
  },

  {
    id: 'wwe-womens-championship',
    title_name: "WWE Women's Championship",
    current_champion: 'Tiffany Stratton',
    current_champion_slug: 'tiffany-stratton',
    date_won: '2025-01-03',
    event: 'SmackDown',
    brand: 'SmackDown',
    type: 'World'
  },
  {
    id: 'womens-world-championship',
    title_name: "Women's World Championship",
    current_champion: 'VACANT',
    current_champion_slug: 'vacant',
    date_won: '2025-01-01',
    event: 'TBD',
    brand: 'RAW',
    type: 'World'
  },
  {
    id: 'womens-ic-championship',
    title_name: "Women's Intercontinental Championship",
    current_champion: 'Becky Lynch',
    current_champion_slug: 'becky-lynch',
    date_won: '2025-06-07',
    event: 'Money in the Bank',
    brand: 'RAW',
    type: 'Secondary'
  },
  {
    id: 'womens-us-championship',
    title_name: "Women's United States Championship",
    current_champion: 'Giulia',
    current_champion_slug: 'giulia',
    date_won: '2025-06-27',
    event: 'SmackDown',
    brand: 'SmackDown',
    type: 'Secondary'
  },
  {
    id: 'womens-tag-team-championship',
    title_name: 'Women\'s Tag Team Championship',
    current_champion: 'Charlotte Flair & Alexa Bliss',
    current_champion_slug: 'charlotte-flair-alexa-bliss',
    date_won: '2025-08-02',
    event: 'Summer Slam Night 1',
    brand: 'Unassigned',
    type: 'Tag Team'
  },

];

const BRAND_ORDER = ['RAW', 'SmackDown', 'NXT', 'Unassigned'];


export default function ChampionshipsPage({ wrestlers = [] }) {
  const [selectedBrand, setSelectedBrand] = useState('all');

  const filteredChampions = currentChampions.filter(champ => {
    const brandMatch = selectedBrand === 'all' || champ.brand === selectedBrand;
    return brandMatch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '2025-01-01') return 'TBD';
    const date = new Date(dateStr);
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



  // Helper function to get wrestler image
  const getWrestlerImage = (championSlug) => {
    if (championSlug === 'vacant') return null;
    const wrestler = wrestlers.find(w => w.id === championSlug);
    return wrestler?.image_url || null;
  };

  // Helper function to get tag team wrestler images
  const getTagTeamImages = (championName, championSlug) => {
    if (championSlug === 'vacant') return [];
    
    // Handle specific tag team cases
    if (championSlug === 'the-judgment-day') {
      return [
        wrestlers.find(w => w.id === 'finn-balor')?.image_url,
        wrestlers.find(w => w.id === 'jd-mcdonagh')?.image_url
      ].filter(Boolean);
    }
    
    if (championSlug === 'the-wyatt-sicks') {
      return [
        wrestlers.find(w => w.id === 'joe-gacy')?.image_url,
        wrestlers.find(w => w.id === 'dexter-lumis')?.image_url
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
                  {champ.current_champion}
                </div>
                <div style={{ fontSize: 14, color: '#ccc' }}>
                  Won on {formatDate(champ.date_won)}
                </div>
                <div style={{ fontSize: 14, color: '#ccc' }}>
                  at {champ.event}
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
                  <span style={{ fontWeight: 600 }}>{champ.current_champion}</span>
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
              const brandCount = currentChampions.filter(champ => champ.brand === brand).length;
              return (
                <div key={brand} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: getBrandColor(brand) }}>{brandCount}</div>
                  <div style={{ fontSize: 14, color: '#ccc' }}>{brand} Titles</div>
                </div>
              );
            })}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#C6A04F' }}>{currentChampions.length}</div>
              <div style={{ fontSize: 14, color: '#ccc' }}>Total Titles</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
