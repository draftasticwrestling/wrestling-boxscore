import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function ChampionshipEditModal({ championship, wrestlers = [], tagTeams = [], tagTeamMembers = {}, onClose, onSave }) {
  const [selectedSlug, setSelectedSlug] = useState(championship.current_champion_slug || '');
  const [championName, setChampionName] = useState(championship.current_champion || '');
  const [brand, setBrand] = useState(championship.brand || '');
  const [dateWon, setDateWon] = useState(championship.date_won || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedWrestlers = useMemo(
    () => [...wrestlers].sort((a, b) => a.name.localeCompare(b.name)),
    [wrestlers]
  );

  const sortedTagTeams = useMemo(
    () => [...(tagTeams || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [tagTeams]
  );

  // Build display label for each tag team: "Team Name (Member1 & Member2)"
  const tagTeamDisplayLabels = useMemo(() => {
    const labels = {};
    const wrestlerById = (wrestlers || []).reduce((acc, w) => { acc[w.id] = w.name; return acc; }, {});
    (tagTeams || []).forEach((team) => {
      const memberSlugs = tagTeamMembers[team.id];
      if (Array.isArray(memberSlugs) && memberSlugs.length > 0) {
        const names = memberSlugs.map((slug) => wrestlerById[slug] || slug);
        labels[team.id] = `${team.name || team.id} (${names.join(' & ')})`;
      } else {
        labels[team.id] = team.name || team.id;
      }
    });
    return labels;
  }, [tagTeams, tagTeamMembers, wrestlers]);

  const handleSelectChange = (slug) => {
    setSelectedSlug(slug);
    if (slug === 'vacant') {
      setChampionName('VACANT');
      return;
    }
    const tagTeam = sortedTagTeams.find((t) => t.id === slug);
    if (tagTeam) {
      setChampionName(tagTeamDisplayLabels[tagTeam.id] ?? tagTeam.name ?? slug);
      return;
    }
    const wrestler = sortedWrestlers.find((w) => w.id === slug);
    if (wrestler) {
      setChampionName(wrestler.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Resolve display name from slug when saving (covers tag team or wrestler selected but override left blank)
      let effectiveChampionName = championName;
      if (!effectiveChampionName && selectedSlug && selectedSlug !== 'vacant') {
        const tagTeam = sortedTagTeams.find((t) => t.id === selectedSlug);
        if (tagTeam) {
          effectiveChampionName = tagTeamDisplayLabels[tagTeam.id] ?? tagTeam.name ?? selectedSlug;
        } else {
          const wrestler = sortedWrestlers.find((w) => w.id === selectedSlug);
          if (wrestler) effectiveChampionName = wrestler.name;
        }
      }

      const updateData = {
        current_champion: effectiveChampionName || null,
        current_champion_slug: selectedSlug || null,
        brand: brand || null,
        date_won: dateWon || null,
      };

      const { data, error: updateError } = await supabase
        .from('championships')
        .update(updateData)
        .eq('id', championship.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating championship:', updateError);
        setError(updateError.message || 'Failed to update championship');
        setSaving(false);
        return;
      }

      if (onSave) {
        onSave(data);
      }
    } catch (err) {
      console.error('Unexpected error updating championship:', err);
      setError(err.message || 'Failed to update championship');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 0 24px #C6A04F55',
          border: '1px solid #444',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, color: '#C6A04F', fontSize: 20 }}>
          Edit Championship
        </h2>
        <div style={{ marginBottom: 16, color: '#ccc', fontSize: 14 }}>
          <div><strong>Title:</strong> {championship.title_name}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#fff', fontSize: 13 }}>
              Champion
            </label>
            <select
              value={selectedSlug || ''}
              onChange={(e) => handleSelectChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
              }}
            >
              <option value="">-- Select champion --</option>
              <option value="vacant">VACANT (Title Vacant)</option>
              {sortedTagTeams.length > 0 && (
                <optgroup label="Tag Teams">
                  {sortedTagTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {tagTeamDisplayLabels[t.id] ?? t.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Wrestlers">
                {sortedWrestlers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#fff', fontSize: 13 }}>
              Champion Name (optional override)
            </label>
            <input
              type="text"
              value={championName || ''}
              onChange={(e) => setChampionName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
              }}
              placeholder="Leave blank to use wrestler's name"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#fff', fontSize: 13 }}>
              Brand
            </label>
            <select
              value={brand || ''}
              onChange={(e) => setBrand(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
              }}
            >
              <option value="">(unchanged)</option>
              <option value="RAW">RAW</option>
              <option value="SmackDown">SmackDown</option>
              <option value="NXT">NXT</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#fff', fontSize: 13 }}>
              Date Won (YYYY-MM-DD)
            </label>
            <input
              type="text"
              value={dateWon || ''}
              onChange={(e) => setDateWon(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#111',
                color: '#fff',
              }}
              placeholder="e.g. 2025-06-01"
            />
          </div>

          {error && (
            <div
              style={{
                background: '#b02a37',
                color: '#fff',
                padding: 8,
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #555',
                background: '#222',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#C6A04F',
                color: '#232323',
                fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


