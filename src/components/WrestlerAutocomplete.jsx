import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function WrestlerAutocomplete({ onSelect, label = 'Select Wrestler', placeholder = 'Type to search...' }) {
  const [wrestlers, setWrestlers] = useState([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchWrestlers() {
      const { data, error } = await supabase.from('wrestlers').select('id, name');
      if (!error) setWrestlers(data);
    }
    fetchWrestlers();
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      wrestlers.filter(w => w.name.toLowerCase().includes(q))
    );
    setShowDropdown(true);
  }, [query, wrestlers]);

  const handleSelect = (wrestler) => {
    setQuery(wrestler.name);
    setShowDropdown(false);
    if (onSelect) onSelect(wrestler);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ color: '#fff', fontWeight: 500, marginBottom: 4, display: 'block' }}>{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff', marginBottom: 4 }}
        onFocus={() => { if (filtered.length > 0) setShowDropdown(true); }}
        autoComplete="off"
      />
      {showDropdown && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 10,
          width: '100%',
          background: '#232323',
          border: '1px solid #444',
          borderRadius: 4,
          maxHeight: 180,
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}>
          {filtered.map(w => (
            <li
              key={w.id}
              onClick={() => handleSelect(w)}
              style={{ padding: 8, cursor: 'pointer', color: '#fff' }}
              onMouseDown={e => e.preventDefault()}
            >
              {w.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 