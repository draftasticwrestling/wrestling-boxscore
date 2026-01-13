import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and service role key (or anon key with update permissions)
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOldParticipants() {
  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  let totalFixed = 0;

  for (const event of events) {
    let changed = false;
    if (!Array.isArray(event.matches)) continue;

    for (const match of event.matches) {
      if (Array.isArray(match.participants)) {
        // Check if this is an array of match objects (bad nesting)
        if (match.participants.length && typeof match.participants[0] === 'object' && match.participants[0] !== null && match.participants[0].result) {
          console.warn(`Match order ${match.order} in event ${event.id} has participants as an array of match objects. Manual review needed!`);
          // Optionally, you could set match.participants = "" or null here to avoid crashes
          match.participants = "";
          changed = true;
          continue;
        }
        // Otherwise, treat as array of slugs/names
        const teamStrings = match.participants.map(teamArr => Array.isArray(teamArr) ? teamArr.join(' & ') : String(teamArr));
        match.participants = teamStrings.join(' vs ');
        changed = true;
        totalFixed++;
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

fixOldParticipants();