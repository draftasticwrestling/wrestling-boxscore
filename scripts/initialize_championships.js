import { supabase } from '../src/supabaseClient.js';

// Current champions as of June 2025 - UPDATED WITH REAL DATA
const currentChampions = [
  {
    id: 'undisputed-wwe-championship',
    title_name: 'Undisputed WWE Championship',
    current_champion: 'John Cena',
    current_champion_slug: 'john-cena',
    date_won: '2025-04-20',
    event_id: 'wrestlemania-41-night-2-2025',
    match_order: 1
  },
  {
    id: 'world-heavyweight-championship',
    title_name: 'World Heavyweight Championship',
    current_champion: 'Gunther',
    current_champion_slug: 'gunther',
    date_won: '2025-06-09',
    event_id: 'raw-2025-06-09',
    match_order: 1
  },
  {
    id: 'mens-us-championship',
    title_name: "Men's U.S. Championship",
    current_champion: 'Solo Sikoa',
    current_champion_slug: 'solo-sikoa',
    date_won: '2025-06-28',
    event_id: 'night-of-champions-2025',
    match_order: 1
  },
  {
    id: 'mens-ic-championship',
    title_name: "Men's IC Championship",
    current_champion: 'Dominik Mysterio',
    current_champion_slug: 'dominik-mysterio',
    date_won: '2025-04-20',
    event_id: 'wrestlemania-41-2025',
    match_order: 1
  },
  {
    id: 'raw-tag-team-championship',
    title_name: 'Raw Tag Team Championship',
    current_champion: 'The New Day (Kofi Kingston & Xavier Woods)',
    current_champion_slug: 'the-new-day', // This will need to be handled specially for tag teams
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'smackdown-tag-team-championship',
    title_name: 'SmackDown Tag Team Championship',
    current_champion: 'The Street Profits (Angelo Dawkins & Montez Ford)',
    current_champion_slug: 'the-street-profits', // This will need to be handled specially for tag teams
    date_won: '2025-01-01', // Need actual date
    event_id: 'smackdown-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'mens-speed-championship',
    title_name: "Men's Speed Championship",
    current_champion: 'El Grande Americano',
    current_champion_slug: 'el-grande-americano',
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'wwe-womens-championship',
    title_name: "WWE Women's Championship",
    current_champion: 'Tiffany Stratton',
    current_champion_slug: 'tiffany-stratton',
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'womens-world-championship',
    title_name: "Women's World Championship",
    current_champion: 'Iyo Sky',
    current_champion_slug: 'iyo-sky',
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'womens-ic-championship',
    title_name: "Women's IC Championship",
    current_champion: 'Becky Lynch',
    current_champion_slug: 'becky-lynch',
    date_won: '2025-06-07',
    event_id: 'money-in-the-bank-2025',
    match_order: 1
  },
  {
    id: 'womens-us-championship',
    title_name: "Women's U.S. Championship",
    current_champion: 'Giulia',
    current_champion_slug: 'giulia',
    date_won: '2025-06-27',
    event_id: 'smackdown-2025-06-27',
    match_order: 1
  },
  {
    id: 'womens-tag-team-championship',
    title_name: 'Women\'s Tag Team Championship',
    current_champion: 'Liv Morgan & Raquel Rodriguez',
    current_champion_slug: 'liv-morgan-raquel-rodriguez', // This will need to be handled specially for tag teams
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  },
  {
    id: 'womens-speed-championship',
    title_name: "Women's Speed Championship",
    current_champion: 'Sol Ruca',
    current_champion_slug: 'sol-ruca',
    date_won: '2025-01-01', // Need actual date
    event_id: 'raw-2025-01-01', // Need actual event
    match_order: 1
  }
];

async function initializeChampionships() {
  try {
    console.log('Initializing championships...');
    
    for (const championship of currentChampions) {
      console.log(`Setting up ${championship.title_name}...`);
      
      // Insert championship record
      const { data: champData, error: champError } = await supabase
        .from('championships')
        .upsert([championship], { onConflict: 'id' });
      
      if (champError) {
        console.error(`Error inserting championship ${championship.title_name}:`, champError);
        continue;
      }
      
      // Insert initial history record
      const { data: historyData, error: historyError } = await supabase
        .from('championship_history')
        .insert([{
          championship_id: championship.id,
          title_name: championship.title_name,
          champion: championship.current_champion,
          champion_slug: championship.current_champion_slug,
          date_won: championship.date_won,
          event_id: championship.event_id,
          match_order: championship.match_order
        }]);
      
      if (historyError) {
        console.error(`Error inserting history for ${championship.title_name}:`, historyError);
      } else {
        console.log(`✅ Successfully set up ${championship.title_name} - ${championship.current_champion}`);
      }
    }
    
    console.log('Championship initialization complete!');
    console.log('\nNOTE: Some championships have placeholder dates/events. Please update these with actual data.');
  } catch (error) {
    console.error('Error initializing championships:', error);
  }
}

// Run the initialization
initializeChampionships(); 