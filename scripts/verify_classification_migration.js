import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials (using same pattern as other scripts)
const supabaseUrl = 'https://qvbqxietcmweltxoonvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF4aWV0Y213ZWx0eG9vbnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTAsImV4cCI6MjA2NTQxOTg1MH0.SIgB4EYV1zKeihZT6xVIlAFKTwuyWEScvCFec_RrtsI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verifying wrestler classification migration...\n');

  try {
    // Check if classification column exists
    console.log('1. Checking if classification column exists...');
    const { data: wrestlers, error: fetchError } = await supabase
      .from('wrestlers')
      .select('id, name, brand, "Status", classification')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching wrestlers:', fetchError.message);
      if (fetchError.message.includes('column "classification" does not exist')) {
        console.log('\n⚠️  The classification column does not exist yet.');
        console.log('   Please run the migration script: add_wrestler_classification.sql');
        return;
      }
      return;
    }

    if (wrestlers && wrestlers.length > 0 && wrestlers[0].hasOwnProperty('classification')) {
      console.log('✅ Classification column exists!\n');
    } else {
      console.log('⚠️  Classification column may not exist. Checking...\n');
    }

    // Get classification distribution
    console.log('2. Checking classification distribution...');
    const { data: allWrestlers, error: allError } = await supabase
      .from('wrestlers')
      .select('classification, brand, "Status"');

    if (allError) {
      console.error('❌ Error:', allError.message);
      return;
    }

    const distribution = {};
    allWrestlers.forEach(w => {
      const classification = w.classification || 'NULL';
      if (!distribution[classification]) {
        distribution[classification] = {
          total: 0,
          withBrand: 0,
          withStatus: 0
        };
      }
      distribution[classification].total++;
      if (w.brand) distribution[classification].withBrand++;
      if (w.Status) distribution[classification].withStatus++;
    });

    console.log('\n📊 Classification Distribution:');
    console.log('─────────────────────────────────────────');
    Object.keys(distribution).sort().forEach(classification => {
      const stats = distribution[classification];
      console.log(`${classification.padEnd(20)} | Total: ${stats.total.toString().padStart(4)} | Brand: ${stats.withBrand.toString().padStart(4)} | Status: ${stats.withStatus.toString().padStart(4)}`);
    });
    console.log('─────────────────────────────────────────\n');

    // Check for wrestlers without classification
    const withoutClassification = allWrestlers.filter(w => !w.classification);
    if (withoutClassification.length > 0) {
      console.log(`⚠️  Found ${withoutClassification.length} wrestlers without classification:`);
      console.log('   (These will default to "Active" in the UI)');
      
      // Show first 10
      const sample = withoutClassification.slice(0, 10);
      sample.forEach(w => {
        console.log(`   - ${w.brand || 'No brand'}: ${w.Status || 'No status'}`);
      });
      if (withoutClassification.length > 10) {
        console.log(`   ... and ${withoutClassification.length - 10} more`);
      }
      console.log('');
    }

    // Check for data inconsistencies
    console.log('3. Checking for data inconsistencies...');
    const issues = [];

    // Active wrestlers without brands
    const activeNoBrand = allWrestlers.filter(w => w.classification === 'Active' && !w.brand);
    if (activeNoBrand.length > 0) {
      issues.push(`⚠️  ${activeNoBrand.length} Active wrestlers without brand assignment`);
    }

    // Alumni/Celebrity Guests with status
    const alumniWithStatus = allWrestlers.filter(w => 
      (w.classification === 'Alumni' || w.classification === 'Celebrity Guests') && w.Status
    );
    if (alumniWithStatus.length > 0) {
      issues.push(`⚠️  ${alumniWithStatus.length} Alumni/Celebrity Guests with status (should be NULL)`);
    }

    // Alumni/Celebrity Guests with brand
    const alumniWithBrand = allWrestlers.filter(w => 
      (w.classification === 'Alumni' || w.classification === 'Celebrity Guests') && w.brand
    );
    if (alumniWithBrand.length > 0) {
      issues.push(`⚠️  ${alumniWithBrand.length} Alumni/Celebrity Guests with brand (should be NULL)`);
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Data inconsistencies found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ No data inconsistencies found!');
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyMigration();

