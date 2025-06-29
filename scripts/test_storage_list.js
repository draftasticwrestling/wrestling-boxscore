import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testList() {
    const prefixes = [undefined, '', '/'];
    for (const prefix of prefixes) {
      const { data, error } = await supabase.storage.from('wrestler-images1').list(prefix);
      console.log(`prefix: ${JSON.stringify(prefix)} -> data:`, data, 'error:', error);
    }
  }
  
  testList();
  
  // updateImageUrls(); 
  