import { createClient } from '@supabase/supabase-js';

// Set your Supabase credentials here or use environment variables
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseParticipants(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    return input
      .split(/\s+vs\s+/i)
      .map(side =>
        side
          .split(/\s*&\s*/i)
          .map(slug => slug.trim())
          .filter(Boolean)
      );
  }
  return [];
}

async function migrate() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, matches');

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  for (const event of events) {
    let updated = false;
    const newMatches = (event.matches || []).map(match => {
      if (typeof match.participants === 'string') {
        updated = true;
        return {
          ...match,
          participants: parseParticipants(match.participants)
        };
      }
      return match;
    });

    if (updated) {
      const { error: updateError } = await supabase
        .from('events')
        .update({ matches: newMatches })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Error updating event ${event.id}:`, updateError);
      } else {
        console.log(`Updated event ${event.id}`);
      }
    }
  }
}

migrate(); 