import React from 'react';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';

export default function SmartParticipantsInput({ wrestlers, value, onChange }) {
  // Wrestler names for autocomplete
  const wrestlerNames = wrestlers.map(w => w.name);

  return (
    <ReactTextareaAutocomplete
      value={value}
      onChange={e => onChange(e.target.value)}
      minChar={1}
      trigger={{
        '': { // empty string = autocomplete on any word
          dataProvider: token =>
            wrestlerNames.filter(name =>
              name.toLowerCase().includes(token.toLowerCase())
            ),
          component: ({ entity: name }) => <div>{name}</div>,
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
      placeholder="Type participants, e.g. Aleister Black vs Seth Rollins & Buddy Murphy"
    />
  );
}
