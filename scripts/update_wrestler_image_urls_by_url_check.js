import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'wrestler-images';
const EXTENSIONS = ['png', 'webp'];

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function updateImageUrls() {
  const { data: wrestlers, error } = await supabase.from('wrestlers').select('id, image_url');
  if (error) {
    console.error('Error fetching wrestlers:', error);
    return;
  }
  for (const w of wrestlers) {
    let found = false;
    for (const ext of EXTENSIONS) {
      const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${w.id}.${ext}`;
      if (await urlExists(url)) {
        const { error: updateError } = await supabase.from('wrestlers').update({ image_url: url }).eq('id', w.id);
        if (updateError) {
          console.error(`Error updating ${w.id}:`, updateError.message);
        } else {
          console.log(`Updated ${w.id} to ${url}`);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      console.warn(`No image found for ${w.id}`);
    }
  }
}

updateImageUrls(); 