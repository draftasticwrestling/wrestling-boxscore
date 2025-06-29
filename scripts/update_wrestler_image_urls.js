import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'wrestler-images';
const EXTENSIONS = ['png', 'webp'];

async function listAllFiles() {
  let files = [];
  let page = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(undefined, { limit: pageSize, offset: page * pageSize });
    if (error) {
      console.error('Error listing files:', error);
      break;
    }
    if (!data || data.length === 0) break;
    files = files.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return files;
}

async function updateImageUrls() {
  // List all files in the bucket (with pagination)
  const files = await listAllFiles();
  console.log('Files in bucket:', files.map(f => f.name)); // Debug log
  const fileSet = new Set(files.map(f => f.name));

  // Fetch all wrestlers
  const { data: wrestlers, error } = await supabase.from('wrestlers').select('id, image_url');
  if (error) {
    console.error('Error fetching wrestlers:', error);
    return;
  }

  for (const w of wrestlers) {
    let found = false;
    for (const ext of EXTENSIONS) {
      const filename = `${w.id}.${ext}`;
      if (fileSet.has(filename)) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;
        // Update wrestler's image_url
        const { error: updateError } = await supabase.from('wrestlers').update({ image_url: publicUrl }).eq('id', w.id);
        if (updateError) {
          console.error(`Error updating ${w.id}:`, updateError.message);
        } else {
          console.log(`Updated ${w.id} to ${publicUrl}`);
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