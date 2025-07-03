import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and service role key (or anon key with update permissions)
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

const eventId = 'raw-20250602'; // <-- Replace with your event's ID

const correctedMatches = [
  {
    "time": "10:18",
    "notes": "",
    "order": 1,
    "title": "",
    "isLive": false,
    "method": "Pinfall",
    "result": "stephanie-vaquer def. ivy-nile & liv-morgan",
    "status": "completed",
    "liveEnd": null,
    "tagTeams": {},
    "liveStart": null,
    "commentary": [],
    "stipulation": "Women's Money in the Bank qualifier",
    "participants": "stephanie-vaquer vs ivy-nile vs liv-morgan",
    "titleOutcome": "",
    "customStipulation": "",
    "specialWinnerType": "",
    "customStipulationType": ""
  },
  {
    "time": "11:07",
    "notes": "",
    "order": 2,
    "title": "",
    "isLive": false,
    "method": "Pinfall",
    "result": "The Judgement Day (finn-balor & jd-mcdonagh) def. The War Raiders",
    "status": "completed",
    "liveEnd": null,
    "tagTeams": {"1": "The War Raiders"},
    "liveStart": null,
    "commentary": [],
    "stipulation": "",
    "participants": "The Judgement Day (finn-balor & jd-mcdonagh) vs The War Raiders (erik & ivar)",
    "titleOutcome": "",
    "customStipulation": "",
    "specialWinnerType": "",
    "customStipulationType": ""
  },
  {
    "time": "9:01",
    "notes": "",
    "order": 3,
    "title": "",
    "isLive": false,
    "method": "DQ",
    "result": "jey-uso & sami-zayn def. bron-breakker & bronson-reed",
    "status": "completed",
    "liveEnd": null,
    "tagTeams": {},
    "liveStart": null,
    "commentary": [],
    "stipulation": "",
    "participants": "jey-uso & sami-zayn vs bron-breakker & bronson-reed",
    "titleOutcome": "",
    "customStipulation": "",
    "specialWinnerType": "",
    "customStipulationType": ""
  },
  {
    "time": "6:01",
    "notes": "",
    "order": 4,
    "title": "",
    "isLive": false,
    "method": "Pinfall",
    "result": "kairi-sane def. raquel-rodriguez",
    "status": "completed",
    "liveEnd": null,
    "tagTeams": {},
    "liveStart": null,
    "commentary": [],
    "stipulation": "",
    "participants": "kairi-sane vs raquel-rodriguez",
    "titleOutcome": "",
    "customStipulation": "",
    "specialWinnerType": "",
    "customStipulationType": ""
  },
  {
    "time": "11:49",
    "notes": "",
    "order": 5,
    "title": "",
    "isLive": false,
    "method": "Pinfall",
    "result": "el-grande-americano def. aj-styles and cm-punk",
    "status": "completed",
    "liveEnd": null,
    "tagTeams": {},
    "liveStart": null,
    "commentary": [],
    "stipulation": "Men's Money in the Bank qualifier",
    "participants": "el-grande-americano vs aj-styles vs cm-punk",
    "titleOutcome": "",
    "customStipulation": "",
    "specialWinnerType": "",
    "customStipulationType": ""
  }
];

async function updateEventMatches() {
  const { error } = await supabase
    .from('events')
    .update({ matches: correctedMatches })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event:', error);
  } else {
    console.log('Event matches updated successfully!');
  }
}

updateEventMatches();