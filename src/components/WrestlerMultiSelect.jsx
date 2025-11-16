import React, { useState, useEffect } from 'react';

export default function WrestlerMultiSelect({
  value = [],
  onChange,
  label = 'Select Wrestlers',
  placeholder = 'Type to search...',
  wrestlers = []
}) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState([]);

  // Sync local selected objects with incoming value ids
  useEffect(() => {
    const selectedObjects = Array.isArray(value)
      ? value
          .map(id => safeWrestlers.find(w => w.id === id))
          .filter(Boolean)
      : [];

    const idsMatch =
      selectedObjects.length === selected.length &&
      selectedObjects.every((obj, idx) => obj.id === selected[idx]?.id);

    if (!idsMatch) {
      setSelected(selectedObjects);
    }
  }, [value, safeWrestlers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (query.trim() === '') {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      safeWrestlers.filter(
        w => w.name.toLowerCase().includes(q) && (!Array.isArray(selected) || !selected.some(sel => sel.id === w.id))
      )
    );
    setShowDropdown(true);
  }, [query, safeWrestlers, selected]);

  const handleSelect = (wrestler) => {
    if (!wrestler) return;
    const newIds = Array.from(new Set([...(Array.isArray(value) ? value : []), wrestler.id]));
    const newSelected = newIds
      .map(id => safeWrestlers.find(w => w.id === id))
      .filter(Boolean);
    setSelected(newSelected);
    setQuery('');
    setShowDropdown(false);
    if (onChange) onChange(newIds);
  };

  const handleRemove = (id) => {
    const updatedIds = (Array.isArray(value) ? value : []).filter(wId => wId !== id);
    const updatedSelected = updatedIds
      .map(wId => safeWrestlers.find(w => w.id === wId))
      .filter(Boolean);
    setSelected(updatedSelected);
    if (onChange) onChange(updatedIds);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ color: '#fff', fontWeight: 500, marginBottom: 4, display: 'block' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {selected.map(w => (
          <span key={w.id} style={{
            background: '#444', color: '#fff', borderRadius: 12, padding: '4px 10px', display: 'flex', alignItems: 'center'
          }}>
            {w.name}
            <button
              type="button"
              onClick={() => handleRemove(w.id)}
              style={{
                marginLeft: 6, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
              }}
              aria-label={`Remove ${w.name}`}
            >×</button>
          </span>
        ))}
      </div>
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