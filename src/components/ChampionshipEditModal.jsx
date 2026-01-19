import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function ChampionshipEditModal({ championship, wrestlers = [], onClose, onSave }) {
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

  const handleSelectChange = (slug) => {
    setSelectedSlug(slug);
    if (slug === 'vacant') {
      setChampionName('VACANT');
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
      if (!championName && selectedSlug && selectedSlug !== 'vacant') {
        const wrestler = sortedWrestlers.find((w) => w.id === selectedSlug);
        if (wrestler) {
          setChampionName(wrestler.name);
        }
      }

      const updateData = {
        current_champion: championName || null,
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
              {sortedWrestlers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
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


