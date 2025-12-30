/**
 * Script to fix Raw Tag Team Championship status
 * This will check the current state and update it based on the most recent RAW event
 * 
 * Run with: node scripts/fix_raw_tag_team_championship.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRawTagTeamChampionship() {
  try {
    console.log('Checking Raw Tag Team Championship status...\n');
    
    // 1. Check current championship record
    const { data: currentChamp, error: champError } = await supabase
      .from('championships')
      .select('*')
      .eq('title_name', 'Raw Tag Team Championship')
      .single();
    
    if (champError && champError.code !== 'PGRST116') {
      console.error('Error fetching championship:', champError);
      return;
    }
    
    console.log('Current championship record:');
    console.log(JSON.stringify(currentChamp, null, 2));
    console.log('\n');
    
    // 2. Find the most recent RAW events (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .or('name.ilike.%RAW%,name.ilike.%Raw%')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(5);
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return;
    }
    
    console.log(`Found ${events.length} recent RAW events:\n`);
    events.forEach(e => console.log(`  - ${e.name} (${e.date})`));
    console.log('\n');
    
    // 3. Search for the match where Raw Tag Team Championship changed
    let foundMatch = null;
    let foundEvent = null;
    
    for (const event of events) {
      if (!event.matches || !Array.isArray(event.matches)) continue;
      
      for (const match of event.matches) {
        if (
          match.title === 'Raw Tag Team Championship' &&
          match.status === 'completed' &&
          match.titleOutcome === 'New Champion'
        ) {
          foundMatch = match;
          foundEvent = event;
          break;
        }
      }
      
      if (foundMatch) break;
    }
    
    if (!foundMatch) {
      console.log('❌ Could not find a match where Raw Tag Team Championship changed hands in recent RAW events.');
      console.log('Please check:');
      console.log('1. Is the event a RAW event?');
      console.log('2. Is the match status set to "completed"?');
      console.log('3. Is the title field set to "Raw Tag Team Championship"?');
      console.log('4. Is the titleOutcome set to "New Champion"?');
      return;
    }
    
    console.log('✅ Found the match:');
    console.log(`   Event: ${foundEvent.name} (${foundEvent.date})`);
    console.log(`   Match: ${JSON.stringify(foundMatch, null, 2)}\n`);
    
    // 4. Extract winner information
    // For tag teams, the winner might be in different formats
    let winnerName = null;
    let winnerSlug = null;
    
    // Try to extract from winner field
    if (foundMatch.winner) {
      winnerName = foundMatch.winner;
      // Try to find the tag team by name
      const { data: tagTeams, error: tagTeamError } = await supabase
        .from('tag_teams')
        .select('id, name')
        .ilike('name', `%${foundMatch.winner}%`);
      
      if (!tagTeamError && tagTeams && tagTeams.length > 0) {
        winnerSlug = tagTeams[0].id;
        winnerName = tagTeams[0].name;
        console.log(`   Found tag team: ${winnerName} (${winnerSlug})`);
      } else {
        // If not found as tag team, try to construct slug from name
        winnerSlug = foundMatch.winner.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
    }
    
    // Try to extract from result field
    if (!winnerName && foundMatch.result) {
      if (foundMatch.result.includes(' def. ')) {
        winnerName = foundMatch.result.split(' def. ')[0].trim();
      } else if (foundMatch.result.includes(' won ')) {
        winnerName = foundMatch.result.split(' won ')[0].trim();
      }
      
      // Try to find tag team
      if (winnerName) {
        const { data: tagTeams, error: tagTeamError } = await supabase
          .from('tag_teams')
          .select('id, name')
          .ilike('name', `%${winnerName}%`);
        
        if (!tagTeamError && tagTeams && tagTeams.length > 0) {
          winnerSlug = tagTeams[0].id;
          winnerName = tagTeams[0].name;
          console.log(`   Found tag team from result: ${winnerName} (${winnerSlug})`);
        } else {
          winnerSlug = winnerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
      }
    }
    
    // Try to extract from participants if winner is not clear
    if (!winnerName && foundMatch.participants) {
      // For tag team matches, participants might be in format "team1 vs team2"
      if (foundMatch.participants.includes(' vs ')) {
        const parts = foundMatch.participants.split(' vs ');
        // The winner should be the first part if result says "def."
        if (foundMatch.result && foundMatch.result.includes(' def. ')) {
          const resultWinner = foundMatch.result.split(' def. ')[0].trim();
          // Try to match with participants
          for (const part of parts) {
            if (part.toLowerCase().includes(resultWinner.toLowerCase()) || 
                resultWinner.toLowerCase().includes(part.toLowerCase())) {
              winnerName = part.trim();
              break;
            }
          }
        }
      }
    }
    
    if (!winnerName) {
      console.log('❌ Could not extract winner information from match.');
      console.log('   Match data:', JSON.stringify(foundMatch, null, 2));
      return;
    }
    
    console.log(`   Winner: ${winnerName} (${winnerSlug || 'unknown slug'})\n`);
    
    // 5. Update the championship record
    const previousChampion = currentChamp?.current_champion || 'VACANT';
    const previousChampionSlug = currentChamp?.current_champion_slug || 'vacant';
    
    // Convert event date to YYYY-MM-DD format
    const eventDate = foundEvent.date;
    const formattedDate = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate;
    
    console.log('📝 Updating championship record:');
    console.log(`   New Champion: ${winnerName} (${winnerSlug || 'unknown'})`);
    console.log(`   Previous Champion: ${previousChampion} (${previousChampionSlug})`);
    console.log(`   Date Won: ${formattedDate}`);
    console.log(`   Event: ${foundEvent.id}\n`);
    
    const { error: updateError } = await supabase
      .from('championships')
      .upsert({
        id: 'raw-tag-team-championship',
        title_name: 'Raw Tag Team Championship',
        current_champion: winnerName,
        current_champion_slug: winnerSlug || 'unknown',
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
      console.log('✅ Successfully updated Raw Tag Team Championship!');
      console.log(`   Champion: ${winnerName}`);
      console.log(`   Date Won: ${formattedDate}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixRawTagTeamChampionship();

