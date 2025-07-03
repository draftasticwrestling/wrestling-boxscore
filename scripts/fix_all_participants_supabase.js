import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and service role key (or anon key with update permissions)
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Script started");

function isArrayOfArrays(val) {
  return Array.isArray(val) && val.length > 0 && val.every(item => Array.isArray(item));
}

async function fixAllParticipants() {
  const { data: events, error } = await supabase.from('events').select('*');
  console.log("Fetched events:", events ? events.length : 0, "Error:", error);
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  let totalFixed = 0;

  for (const event of events) {
    let changed = false;
    if (!Array.isArray(event.matches)) continue;

    for (const match of event.matches) {
      // Fix array of arrays of slugs/names
      if (isArrayOfArrays(match.participants)) {
        const teamStrings = match.participants.map(teamArr => teamArr.join(' & '));
        match.participants = teamStrings.join(' vs ');
        changed = true;
        totalFixed++;
        console.log(`Fixed array-of-arrays participants in event ${event.id}, match order ${match.order}`);
        continue;
      }
      // Fix array of match objects (bad nesting)
      if (
        Array.isArray(match.participants) &&
        match.participants.length &&
        typeof match.participants[0] === 'object' &&
        match.participants[0] !== null &&
        match.participants[0].participants
      ) {
        const nested = match.participants.find(m => typeof m.participants === 'string');
        if (nested) {
          match.participants = nested.participants;
          changed = true;
          totalFixed++;
          console.log(`Fixed nested participants in event ${event.id}, match order ${match.order}`);
          continue;
        } else {
          match.participants = "";
          changed = true;
          console.warn(`Could not fix nested participants in event ${event.id}, match order ${match.order}`);
          continue;
        }
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from('events')
        .update({ matches: event.matches })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Error updating event ${event.id}:`, updateError);
      } else {
        console.log(`Updated event ${event.id} with fixed participants.`);
      }
    }
  }

  console.log(`Done! Fixed participants in ${totalFixed} matches.`);
}

fixAllParticipants();
console.log("Script finished");