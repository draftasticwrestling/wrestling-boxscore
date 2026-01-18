import React from 'react';
import Select from 'react-select';
import countries from '../data/countries';

export default function CountrySelect({ value, onChange, placeholder = 'Select country…' }) {
  const options = countries;

  const selected = options.find((c) => c.name === value) || null;

  return (
    <Select
      options={options}
      value={selected}
      onChange={(option) => onChange(option ? option.name : '')}
      placeholder={placeholder}
      isClearable
      getOptionLabel={(option) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {option.flagImage ? (
            <img
              src={option.flagImage}
              alt={option.name}
              style={{
                width: 20,
                height: 14,
                objectFit: 'cover',
                borderRadius: 2,
                marginRight: 6,
                boxShadow: '0 0 2px #000',
              }}
            />
          ) : (
            <span style={{ marginRight: 6 }}>{option.flag}</span>
          )}
          <span>{option.name}</span>
        </div>
      )}
      getOptionValue={(option) => option.name}
      classNamePrefix="country-select"
      styles={{
        control: (base) => ({
          ...base,
          background: '#232323',
          borderColor: '#444',
          minHeight: '36px',
        }),
        singleValue: (base) => ({
          ...base,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
        }),
        menu: (base) => ({ ...base, background: '#222' }),
        option: (base, state) => ({
          ...base,
          color: state.isSelected ? '#232323' : '#fff',
          backgroundColor: state.isSelected ? '#C6A04F' : state.isFocused ? '#333' : '#222',
          fontSize: 14,
        }),
        placeholder: (base) => ({ ...base, color: '#999', fontSize: 14 }),
        input: (base) => ({ ...base, color: '#fff' }),
        dropdownIndicator: (base) => ({ ...base, padding: 4 }),
        clearIndicator: (base) => ({ ...base, padding: 4 }),
      }}
    />
  );
}


