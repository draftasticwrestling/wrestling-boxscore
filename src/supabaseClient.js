import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Environment check:');
console.log('VITE_SUPABASE_URL exists:', !!supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('Current URL:', window.location.href);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.from('events').select('count').then(
  ({ data, error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful');
    }
  }
); 

export async function uploadWrestlerImage(file, wrestlerSlug) {
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  // Validate file extension
  if (fileExt !== 'png' && fileExt !== 'webp') {
    throw new Error('File must be a .png or .webp file');
  }
  
  // Use format: wrestler-slug.filetype
  const filePath = `${wrestlerSlug}.${fileExt}`;
  
  // Upload with upsert: true to allow overwriting existing images
  const { data, error } = await supabase.storage
    .from('wrestler-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Return the public URL in the format specified
  const publicUrl = `https://qvbqxietcmweltxoonvh.supabase.co/storage/v1/object/public/wrestler-images/${filePath}`;
  return publicUrl;
} 

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens
} 

