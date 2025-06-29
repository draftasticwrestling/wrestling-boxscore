// scripts/convert_participants_to_slugs.js
// This script converts match participant names to wrestler slugs (ids) in your Supabase events table.
// BACK UP YOUR DATA BEFORE RUNNING!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  // Fetch all wrestlers and build a name-to-id map
  const { data: wrestlers, error: wrestlersError } = await supabase.from('wrestlers').select('id, name');
  if (wrestlersError) throw wrestlersError;
  const nameToId = {};
  wrestlers.forEach(w => {
    nameToId[w.name.toLowerCase()] = w.id;
    nameToId[slugify(w.name)] = w.id; // for extra safety
  });

  // Fetch all events
  const { data: events, error: eventsError } = await supabase.from('events').select('*');
  if (eventsError) throw eventsError;

  for (const event of events) {
    let changed = false;
    const newMatches = event.matches.map(match => {
      // Convert participants string to slugs
      const teams = match.participants.split(' vs ').map(side =>
        side.split('&').map(name => name.trim().toLowerCase())
      );
      const slugTeams = teams.map(team =>
        team.map(name => nameToId[name] || slugify(name) || name)
      );
      const newParticipants = slugTeams.map(team => team.join(' & ')).join(' vs ');
      if (newParticipants !== match.participants) changed = true;
      return { ...match, participants: newParticipants };
    });
    if (changed) {
      console.log(`Updating event ${event.id}`);
      const { error } = await supabase.from('events').update({ matches: newMatches }).eq('id', event.id);
      if (error) console.error(`Error updating event ${event.id}:`, error.message);
    }
  }
  console.log('Done!');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 