import { supabase } from './supabaseClient';

async function fixData() {
  try {
    // Fetch all events
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('*');

    if (fetchError) throw fetchError;

    // Process each event
    for (const event of events) {
      const updatedMatches = event.matches.map(match => {
        let updatedMatch = { ...match };

        // Move Money in the Bank winner from stipulation to specialWinnerType
        if (match.stipulation === "Women's Money in the Bank winner") {
          updatedMatch.specialWinnerType = "Women's Money in the Bank winner";
          updatedMatch.stipulation = "None";
        } else if (match.stipulation === "Men's Money in the Bank winner") {
          updatedMatch.specialWinnerType = "Men's Money in the Bank winner";
          updatedMatch.stipulation = "None";
        }

        // Remove title from stipulation if it exists in both fields
        if (match.stipulation === match.title && match.title && match.title !== 'None') {
          updatedMatch.stipulation = 'None';
        }

        return updatedMatch;
      });

      // Update the event with fixed matches
      const { error: updateError } = await supabase
        .from('events')
        .update({ matches: updatedMatches })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Error updating event ${event.id}:`, updateError);
      } else {
        console.log(`Successfully updated event ${event.id}`);
      }
    }

    console.log('Data fix completed successfully');
  } catch (error) {
    console.error('Error fixing data:', error);
  }
}

// Run the fix
fixData(); 