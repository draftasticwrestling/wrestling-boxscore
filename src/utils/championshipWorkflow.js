import { supabase } from '../supabaseClient';

function computeDaysHeld(dateWon, dateLost) {
  if (!dateWon || !dateLost) return null;
  const start = new Date(dateWon);
  const end = new Date(dateLost);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export async function applyChampionshipUpdate({
  championshipId,
  selectedSlug,
  championName,
  brand,
  dateWon,
  eventName,
}) {
  const normalizedSlug = (selectedSlug || '').trim() || null;
  const normalizedName = (championName || '').trim() || null;
  const normalizedDateWon = (dateWon || '').trim() || null;
  const normalizedEventName = (eventName || '').trim() || null;

  if (!championshipId || !normalizedName || !normalizedDateWon) {
    throw new Error('Champion and Date won are required.');
  }

  const { data: championship, error: championshipError } = await supabase
    .from('championships')
    .select('*')
    .eq('id', championshipId)
    .single();
  if (championshipError) throw championshipError;

  const { data: openReigns, error: openReignError } = await supabase
    .from('championship_history')
    .select('*')
    .eq('championship_id', championshipId)
    .is('date_lost', null)
    .order('date_won', { ascending: false })
    .limit(1);
  if (openReignError) throw openReignError;
  const openReign = openReigns?.[0] || null;

  const sameChampionAsOpenReign =
    openReign &&
    ((normalizedSlug && openReign.champion_slug === normalizedSlug) ||
      (!normalizedSlug && openReign.champion === normalizedName));

  if (sameChampionAsOpenReign) {
    const { error: currentReignUpdateError } = await supabase
      .from('championship_history')
      .update({
        champion: normalizedName,
        champion_slug: normalizedSlug,
        date_won: normalizedDateWon,
        event_name: normalizedEventName,
      })
      .eq('id', openReign.id);
    if (currentReignUpdateError) throw currentReignUpdateError;
  } else {
    if (openReign) {
      const { error: closePreviousError } = await supabase
        .from('championship_history')
        .update({
          date_lost: normalizedDateWon,
          event_lost: normalizedEventName,
          days_held: computeDaysHeld(openReign.date_won, normalizedDateWon),
        })
        .eq('id', openReign.id);
      if (closePreviousError) throw closePreviousError;
    }

    const previousChampion = openReign?.champion || championship.current_champion || null;
    const previousChampionSlug = openReign?.champion_slug || championship.current_champion_slug || null;

    const { data: duplicateReign, error: duplicateCheckError } = await supabase
      .from('championship_history')
      .select('id')
      .eq('championship_id', championshipId)
      .eq('champion', normalizedName)
      .eq('date_won', normalizedDateWon)
      .maybeSingle();
    if (duplicateCheckError) throw duplicateCheckError;

    if (!duplicateReign) {
      const { error: insertReignError } = await supabase
        .from('championship_history')
        .insert({
          championship_id: championshipId,
          champion: normalizedName,
          champion_slug: normalizedSlug,
          previous_champion: previousChampion,
          previous_champion_slug: previousChampionSlug,
          date_won: normalizedDateWon,
          event_name: normalizedEventName,
          date_lost: null,
          event_lost: null,
          days_held: null,
        });
      if (insertReignError) throw insertReignError;
    }
  }

  const { data: updatedChampionship, error: championshipUpdateError } = await supabase
    .from('championships')
    .update({
      current_champion: normalizedName,
      current_champion_slug: normalizedSlug,
      previous_champion: openReign?.champion || championship.current_champion || null,
      previous_champion_slug: openReign?.champion_slug || championship.current_champion_slug || null,
      brand: brand || null,
      date_won: normalizedDateWon,
      event_name: normalizedEventName,
    })
    .eq('id', championshipId)
    .select()
    .single();
  if (championshipUpdateError) throw championshipUpdateError;

  return updatedChampionship;
}
