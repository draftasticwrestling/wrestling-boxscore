import React from 'react';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import '@webscopeio/react-textarea-autocomplete/style.css';

export default function SmartParticipantsInput({ wrestlers, value, onChange, placeholder = "Type participants, e.g. Aleister Black vs Seth Rollins & Buddy Murphy" }) {
  // Wrestler names for autocomplete
  const wrestlerNames = wrestlers.map(w => w.name);

  return (
    <ReactTextareaAutocomplete
      value={value}
      onChange={e => onChange(e.target.value)}
      minChar={1}
      trigger={{
        '': {
          dataProvider: token => {
            if (!token) return [];
            return wrestlerNames.filter(name =>
              name.toLowerCase().includes(token.toLowerCase())
            ).slice(0, 8);
          },
          component: ({ entity: name }) => <div style={{ color: '#fff', padding: 4 }}>{name}</div>,
          output: (item) => item,
        }
      }}
      style={{
        width: '100%',
        minHeight: 40,
        fontSize: 16,
        background: '#222',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: 4,
        padding: 8,
      }}
      containerStyle={{ width: '100%' }}
      placeholder={placeholder}
      className="smart-participants-input"
    />
  );
} 