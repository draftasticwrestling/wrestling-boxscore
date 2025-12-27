import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials (using same pattern as other scripts)
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWrestlers() {
  console.log('🔍 Checking wrestlers that may need classification updates...\n');

  try {
    // Get all wrestlers
    const { data: wrestlers, error } = await supabase
      .from('wrestlers')
      .select('id, name, brand, "Status", classification')
      .order('name');

    if (error) {
      console.error('❌ Error fetching wrestlers:', error.message);
      return;
    }

    console.log(`📋 Total wrestlers: ${wrestlers.length}\n`);

    // Wrestlers without classification
    const withoutClassification = wrestlers.filter(w => !w.classification);
    if (withoutClassification.length > 0) {
      console.log(`⚠️  Wrestlers without classification (${withoutClassification.length}):`);
      withoutClassification.forEach(w => {
        console.log(`   - ${w.name} (${w.id}) - Brand: ${w.brand || 'None'}, Status: ${w.Status || 'None'}`);
      });
      console.log('');
    }

    // Potential Part-timers (no brand, but might be signed)
    const noBrand = wrestlers.filter(w => !w.brand && w.classification !== 'Alumni' && w.classification !== 'Celebrity Guests');
    if (noBrand.length > 0) {
      console.log(`💡 Potential Part-timers or unclassified (${noBrand.length}):`);
      console.log('   (These have no brand - might be Part-timers, Alumni, or need classification)');
      noBrand.slice(0, 20).forEach(w => {
        console.log(`   - ${w.name} (${w.id}) - Current: ${w.classification || 'NULL'}, Status: ${w.Status || 'None'}`);
      });
      if (noBrand.length > 20) {
        console.log(`   ... and ${noBrand.length - 20} more`);
      }
      console.log('');
    }

    // Wrestlers with 'Inactive' status (should be 'On Hiatus')
    const inactiveStatus = wrestlers.filter(w => w.Status === 'Inactive');
    if (inactiveStatus.length > 0) {
      console.log(`⚠️  Wrestlers with 'Inactive' status (should be 'On Hiatus') (${inactiveStatus.length}):`);
      inactiveStatus.forEach(w => {
        console.log(`   - ${w.name} (${w.id}) - Classification: ${w.classification || 'NULL'}`);
      });
      console.log('');
    }

    // Summary by classification
    console.log('📊 Summary by Classification:');
    const byClassification = {};
    wrestlers.forEach(w => {
      const classification = w.classification || 'NULL';
      if (!byClassification[classification]) {
        byClassification[classification] = [];
      }
      byClassification[classification].push(w);
    });

    Object.keys(byClassification).sort().forEach(classification => {
      console.log(`   ${classification}: ${byClassification[classification].length} wrestlers`);
    });

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWrestlers();

