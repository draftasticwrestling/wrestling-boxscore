import { supabase } from '../src/supabaseClient.js';

async function checkExistingWrestlers() {
  try {
    console.log('Fetching existing wrestlers...');
    
    const { data: wrestlers, error } = await supabase
      .from('wrestlers')
      .select('id, name, brand')
      .order('name');
    
    if (error) {
      console.error('Error fetching wrestlers:', error);
      return;
    }
    
    console.log(`Found ${wrestlers.length} wrestlers in database:`);
    console.log('\nWrestler IDs (for tag team schema):');
    
    const wrestlerIds = wrestlers.map(w => w.id);
    wrestlerIds.forEach(id => {
      console.log(`'${id}',`);
    });
    
    console.log('\nWrestlers by brand:');
    const byBrand = {};
    wrestlers.forEach(w => {
      const brand = w.brand || 'Unassigned';
      if (!byBrand[brand]) byBrand[brand] = [];
      byBrand[brand].push(w);
    });
    
    Object.keys(byBrand).forEach(brand => {
      console.log(`\n${brand} (${byBrand[brand].length} wrestlers):`);
      byBrand[brand].forEach(w => {
        console.log(`  ${w.name} (${w.id})`);
      });
    });
    
    // Save to file for reference
    const fs = await import('fs');
    const wrestlerData = {
      total: wrestlers.length,
      wrestlers: wrestlers,
      ids: wrestlerIds
    };
    
    fs.writeFileSync('existing_wrestlers.json', JSON.stringify(wrestlerData, null, 2));
    console.log('\nWrestler data saved to existing_wrestlers.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExistingWrestlers(); 