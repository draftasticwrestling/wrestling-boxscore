import React from 'react';
import Select from 'react-select';

export default function WrestlerAutocomplete({ wrestlers, value, onChange, placeholder = 'Select wrestler...' }) {
  // Map wrestlers to react-select options
  const options = wrestlers.map(w => ({ value: w.id || w.slug, label: w.name }));
  // Find the selected option
  const selected = options.find(opt => opt.value === value) || null;

  return (
    <Select
      options={options}
      value={selected}
      onChange={opt => onChange(opt ? opt.value : null)}
      placeholder={placeholder}
      isClearable
      styles={{
        control: (base) => ({ ...base, background: '#222', color: '#fff', borderColor: '#444' }),
        menu: (base) => ({ ...base, background: '#222', color: '#fff' }),
        singleValue: (base) => ({ ...base, color: '#fff' }),
        option: (base, state) => ({ ...base, color: state.isSelected ? '#232323' : '#fff', background: state.isSelected ? '#C6A04F' : '#222' }),
        placeholder: (base) => ({ ...base, color: '#bbb' }),
      }}
    />
  );
} 