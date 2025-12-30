/**
 * Script to fix World Heavyweight Championship status
 * This will check the current state and update it based on the match where CM Punk won on November 1st
 * 
 * Run with: node scripts/fix_world_heavyweight_championship.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixWorldHeavyweightChampionship() {
  try {
    console.log('Checking World Heavyweight Championship status...\n');
    
    // 1. Check current championship record
    const { data: currentChamp, error: champError } = await supabase
      .from('championships')
      .select('*')
      .eq('title_name', 'World Heavyweight Championship')
      .single();
    
    if (champError && champError.code !== 'PGRST116') {
      console.error('Error fetching championship:', champError);
      return;
    }
    
    console.log('Current championship record:');
    console.log(JSON.stringify(currentChamp, null, 2));
    console.log('\n');
    
    // 2. Find the event on November 1st where CM Punk won
    // We need to search for events around November 1st (could be 2024 or 2025)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .like('date', '%11-01%')
      .order('date', { ascending: false });
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return;
    }
    
    console.log(`Found ${events.length} events on November 1st:\n`);
    
    // 3. Search for the match where CM Punk won the World Heavyweight Championship
    let foundMatch = null;
    let foundEvent = null;
    
    for (const event of events) {
      if (!event.matches || !Array.isArray(event.matches)) continue;
      
      for (const match of event.matches) {
        if (
          match.title === 'World Heavyweight Championship' &&
          match.status === 'completed' &&
          (match.winner?.toLowerCase().includes('cm punk') || 
           match.winner?.toLowerCase().includes('punk') ||
           match.result?.toLowerCase().includes('cm punk') ||
           match.result?.toLowerCase().includes('punk'))
        ) {
          foundMatch = match;
          foundEvent = event;
          break;
        }
      }
      
      if (foundMatch) break;
    }
    
    if (!foundMatch) {
      console.log('❌ Could not find the match where CM Punk won the World Heavyweight Championship on November 1st.');
      console.log('Please check:');
      console.log('1. Is the event date correct?');
      console.log('2. Is the match status set to "completed"?');
      console.log('3. Is the title field set to "World Heavyweight Championship"?');
      console.log('4. Is the titleOutcome set to "New Champion"?');
      console.log('5. Does the winner field contain "CM Punk" or "punk"?');
      return;
    }
    
    console.log('✅ Found the match:');
    console.log(`   Event: ${foundEvent.name} (${foundEvent.date})`);
    console.log(`   Match: ${JSON.stringify(foundMatch, null, 2)}\n`);
    
    // 4. Extract winner information
    const winnerName = foundMatch.winner || 'CM Punk';
    const winnerSlug = foundMatch.winner?.toLowerCase().replace(/\s+/g, '-') || 'cm-punk';
    
    // Try to find the actual wrestler slug from wrestlers table
    const { data: wrestlers, error: wrestlersError } = await supabase
      .from('wrestlers')
      .select('id, name')
      .ilike('name', '%punk%');
    
    if (!wrestlersError && wrestlers && wrestlers.length > 0) {
      const punkWrestler = wrestlers.find(w => w.name.toLowerCase().includes('punk'));
      if (punkWrestler) {
        console.log(`   Found wrestler: ${punkWrestler.name} (${punkWrestler.id})`);
        // Use the actual slug from the database
        const actualSlug = punkWrestler.id;
        const actualName = punkWrestler.name;
        
        // 5. Update the championship record
        const previousChampion = currentChamp?.current_champion || 'VACANT';
        const previousChampionSlug = currentChamp?.current_champion_slug || 'vacant';
        
        // Convert event date to YYYY-MM-DD format
        const eventDate = foundEvent.date;
        const formattedDate = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate;
        
        console.log('\n📝 Updating championship record:');
        console.log(`   New Champion: ${actualName} (${actualSlug})`);
        console.log(`   Previous Champion: ${previousChampion} (${previousChampionSlug})`);
        console.log(`   Date Won: ${formattedDate}`);
        console.log(`   Event: ${foundEvent.id}`);
        console.log(`   Match Order: ${foundMatch.order || 1}\n`);
        
        const { error: updateError } = await supabase
          .from('championships')
          .upsert({
            id: 'world-heavyweight-championship',
            title_name: 'World Heavyweight Championship',
            current_champion: actualName,
            current_champion_slug: actualSlug,
            previous_champion: previousChampion,
            previous_champion_slug: previousChampionSlug,
            date_won: formattedDate,
            event_id: foundEvent.id
          }, {
            onConflict: 'id'
          });
        
        if (updateError) {
          console.error('❌ Error updating championship:', updateError);
        } else {
          console.log('✅ Successfully updated World Heavyweight Championship!');
          console.log(`   Champion: ${actualName}`);
          console.log(`   Date Won: ${formattedDate}`);
        }
        
        return;
      }
    }
    
    // Fallback if we can't find the wrestler
    console.log('⚠️  Could not find CM Punk in wrestlers table. Using fallback values.');
    console.log('   Please verify the wrestler slug is correct.\n');
    
    const previousChampion = currentChamp?.current_champion || 'VACANT';
    const previousChampionSlug = currentChamp?.current_champion_slug || 'vacant';
    const eventDate = foundEvent.date;
    const formattedDate = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate;
    
    const { error: updateError } = await supabase
      .from('championships')
      .upsert({
        id: 'world-heavyweight-championship',
        title_name: 'World Heavyweight Championship',
        current_champion: winnerName,
        current_champion_slug: winnerSlug,
        previous_champion: previousChampion,
        previous_champion_slug: previousChampionSlug,
        date_won: formattedDate,
        event_id: foundEvent.id
      }, {
        onConflict: 'id'
      });
    
    if (updateError) {
      console.error('❌ Error updating championship:', updateError);
    } else {
      console.log('✅ Successfully updated World Heavyweight Championship!');
      console.log(`   Champion: ${winnerName}`);
      console.log(`   Date Won: ${formattedDate}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixWorldHeavyweightChampionship();

