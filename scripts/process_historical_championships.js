/**
 * Script to process historical events and backfill championship data
 * This will scan all existing events and update championships based on match results
 * 
 * Run with: node scripts/process_historical_championships.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Title name to championship ID mapping
const titleToId = {
  'Undisputed WWE Championship': 'wwe-championship',
  'World Heavyweight Championship': 'world-heavyweight-championship',
  'Men\'s IC Championship': 'mens-ic-championship',
  'Men\'s U.S. Championship': 'mens-us-championship',
  'Raw Tag Team Championship': 'raw-tag-team-championship',
  'SmackDown Tag Team Championship': 'smackdown-tag-team-championship',
  'Men\'s Speed Championship': 'mens-speed-championship',
  'WWE Women\'s Championship': 'wwe-womens-championship',
  'Women\'s World Championship': 'womens-world-championship',
  'Women\'s IC Championship': 'womens-ic-championship',
  'Women\'s U.S. Championship': 'womens-us-championship',
  'Women\'s Tag Team Championship': 'womens-tag-team-championship',
  'Women\'s Speed Championship': 'womens-speed-championship'
};

// Helper function to extract winner from result
function extractWinner(result) {
  if (!result) return null;
  
  if (result.includes(' def. ')) {
    return result.split(' def. ')[0].trim();
  }
  if (result.includes(' won ')) {
    return result.split(' won ')[0].trim();
  }
  if (result.includes(' defeats ')) {
    return result.split(' defeats ')[0].trim();
  }
  
  return null;
}

// Helper function to parse date
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse common date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Return in YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If parsing fails, return null
    console.warn(`Could not parse date: ${dateStr}`);
    return null;
  } catch (e) {
    console.warn(`Error parsing date: ${dateStr}`, e);
    return null;
  }
}

// Helper function to determine brand
function getBrand(titleName) {
  if (titleName.includes('Raw') 
      || titleName === 'World Heavyweight Championship'
      || titleName === 'Women\'s World Championship'
      || titleName === 'Men\'s IC Championship'
      || titleName === 'Women\'s IC Championship') {
    return 'RAW';
  }
  if (titleName.includes('SmackDown') 
      || titleName === 'WWE Women\'s Championship' 
      || titleName === 'Undisputed WWE Championship'
      || titleName === 'Men\'s U.S. Championship'
      || titleName === 'Women\'s U.S. Championship') {
    return 'SmackDown';
  }
  if (titleName.includes('Speed')) {
    return 'NXT';
  }
  if (titleName.includes('Tag Team') && !titleName.includes('Raw') && !titleName.includes('SmackDown')) {
    return 'Unassigned';
  }
  return 'Unassigned';
}

// Helper function to determine type
function getType(titleName) {
  if (titleName.includes('World') || titleName.includes('WWE Championship')) {
    return 'World';
  }
  if (titleName.includes('Tag Team')) {
    return 'Tag Team';
  }
  return 'Secondary';
}

// Helper function to find wrestler info (name and slug)
async function findWrestlerInfo(winnerName) {
  if (!winnerName) return { name: null, slug: null };
  
  // First, check if winnerName is already a slug (contains hyphens and lowercase)
  const looksLikeSlug = /^[a-z0-9-]+$/.test(winnerName) && winnerName.includes('-');
  
  if (looksLikeSlug) {
    // Try to find by slug (id)
    const { data: slugMatch, error: slugError } = await supabase
      .from('wrestlers')
      .select('id, name')
      .eq('id', winnerName)
      .limit(1)
      .maybeSingle();
    
    if (!slugError && slugMatch) {
      return { name: slugMatch.name, slug: slugMatch.id };
    }
    
    // Try tag team by slug
    const { data: tagTeamMatch, error: tagError } = await supabase
      .from('tag_teams')
      .select('id, name')
      .eq('id', winnerName)
      .limit(1)
      .maybeSingle();
    
    if (!tagError && tagTeamMatch) {
      return { name: tagTeamMatch.name, slug: tagTeamMatch.id };
    }
  }
  
  // Try exact name match
  const { data: exactMatch, error: exactError } = await supabase
    .from('wrestlers')
    .select('id, name')
    .eq('name', winnerName)
    .limit(1)
    .maybeSingle();
  
  if (!exactError && exactMatch) {
    return { name: exactMatch.name, slug: exactMatch.id };
  }
  
  // Try case-insensitive name match
  const { data: caseMatch, error: caseError } = await supabase
    .from('wrestlers')
    .select('id, name')
    .ilike('name', winnerName)
    .limit(1)
    .maybeSingle();
  
  if (!caseError && caseMatch) {
    return { name: caseMatch.name, slug: caseMatch.id };
  }
  
  // Try tag team by name
  const { data: tagTeamNameMatch, error: tagNameError } = await supabase
    .from('tag_teams')
    .select('id, name')
    .ilike('name', winnerName)
    .limit(1)
    .maybeSingle();
  
  if (!tagNameError && tagTeamNameMatch) {
    return { name: tagTeamNameMatch.name, slug: tagTeamNameMatch.id };
  }
  
  // Handle tag team format like "Team Name (slug1 & slug2)"
  const teamMatch = winnerName.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (teamMatch) {
    const teamName = teamMatch[1].trim();
    const slugs = teamMatch[2].split('&').map(s => s.trim());
    
    // Try to find tag team by name
    const { data: tagTeam, error: tagTeamError } = await supabase
      .from('tag_teams')
      .select('id, name')
      .ilike('name', teamName)
      .limit(1)
      .maybeSingle();
    
    if (!tagTeamError && tagTeam) {
      return { name: tagTeam.name, slug: tagTeam.id };
    }
    
    // If no tag team found, return the team name as-is
    return { name: teamName, slug: slugs.join('-') };
  }
  
  // Handle multiple slugs like "slug1 & slug2"
  if (winnerName.includes(' & ')) {
    const slugs = winnerName.split(' & ').map(s => s.trim());
    const names = [];
    
    for (const slug of slugs) {
      const { data: wrestler, error: wrestlerError } = await supabase
        .from('wrestlers')
        .select('id, name')
        .eq('id', slug)
        .limit(1)
        .maybeSingle();
      
      if (!wrestlerError && wrestler) {
        names.push(wrestler.name);
      } else {
        names.push(slug);
      }
    }
    
    return { name: names.join(' & '), slug: slugs.join('-') };
  }
  
  // Fallback: create slug from name, but keep the original as name
  const slug = winnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return { name: winnerName, slug: slug };
}

async function processHistoricalEvents() {
  console.log('Starting historical championship processing...');
  
  try {
    // Fetch all events, ordered by date
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (eventsError) throw eventsError;
    
    if (!events || events.length === 0) {
      console.log('No events found.');
      return;
    }
    
    console.log(`Found ${events.length} events to process.`);
    
    // Track championship states as we process chronologically
    const championshipStates = {};
    
    for (const event of events) {
      if (!event.matches || !Array.isArray(event.matches)) {
        continue;
      }
      
      for (const match of event.matches) {
        const titleName = match.title;
        const titleOutcome = match.titleOutcome;
        const matchResult = match.result;
        
        // Skip if no title or not a title match
        if (!titleName || titleName === 'None' || !titleOutcome || 
            titleOutcome === 'None' || titleOutcome === 'No. 1 Contender') {
          continue;
        }
        
        const championshipId = titleToId[titleName];
        if (!championshipId) {
          console.warn(`Unknown championship: ${titleName}`);
          continue;
        }
        
        if (titleOutcome === 'New Champion') {
          const winnerRaw = extractWinner(matchResult);
          if (!winnerRaw) {
            console.warn(`Could not extract winner from result: ${matchResult}`);
            continue;
          }
          
          // Resolve winner to get proper name and slug
          const winnerInfo = await findWrestlerInfo(winnerRaw);
          if (!winnerInfo.name) {
            console.warn(`Could not resolve winner: ${winnerRaw}`);
            continue;
          }
          
          const previousChampion = championshipStates[championshipId]?.current_champion || 'Unknown';
          const previousChampionSlug = championshipStates[championshipId]?.current_champion_slug || 'unknown';
          
          // Update championship state
          championshipStates[championshipId] = {
            id: championshipId,
            title_name: titleName,
            current_champion: winnerInfo.name,
            current_champion_slug: winnerInfo.slug,
            previous_champion: previousChampion,
            previous_champion_slug: previousChampionSlug,
            date_won: parseDate(event.date),
            event_id: event.id,
            event_name: event.name,
            brand: getBrand(titleName),
            type: getType(titleName)
          };
          
          console.log(`✓ ${titleName}: ${winnerInfo.name} won at ${event.name}`);
          
        } else if (titleOutcome === 'Vacant') {
          const previousChampion = championshipStates[championshipId]?.current_champion || 'Unknown';
          const previousChampionSlug = championshipStates[championshipId]?.current_champion_slug || 'unknown';
          
          championshipStates[championshipId] = {
            id: championshipId,
            title_name: titleName,
            current_champion: 'VACANT',
            current_champion_slug: 'vacant',
            previous_champion: previousChampion,
            previous_champion_slug: previousChampionSlug,
            date_won: parseDate(event.date),
            event_id: event.id,
            event_name: event.name,
            brand: getBrand(titleName),
            type: getType(titleName)
          };
          
          console.log(`✓ ${titleName}: Vacated at ${event.name}`);
        }
        // "Champion Retains" doesn't change the state, so we skip it
      }
    }
    
    // Now update the database with final states
    console.log('\nUpdating database with championship states...');
    
    const championships = Object.values(championshipStates);
    
    for (const champ of championships) {
      const { error: upsertError } = await supabase
        .from('championships')
        .upsert(champ, { onConflict: 'id' });
      
      if (upsertError) {
        console.error(`Error upserting ${champ.title_name}:`, upsertError);
      } else {
        console.log(`✓ Updated ${champ.title_name}`);
      }
    }
    
    console.log(`\n✅ Processing complete! Updated ${championships.length} championships.`);
    
  } catch (error) {
    console.error('Error processing historical events:', error);
    throw error;
  }
}

// Run the script
processHistoricalEvents()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

