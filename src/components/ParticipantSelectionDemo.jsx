import React, { useState } from 'react';
import ImprovedParticipantsInput from './ImprovedParticipantsInput';
import VisualMatchBuilder from './VisualMatchBuilder';

export default function ParticipantSelectionDemo({ wrestlers }) {
  const [participants, setParticipants] = useState('');
  const [matchType, setMatchType] = useState('singles');
  const [selectedComponent, setSelectedComponent] = useState('visual'); // 'visual' or 'improved'

  const handleParticipantsChange = (value) => {
    setParticipants(value);
    console.log('Participants changed:', value);
  };

  const handleMatchTypeChange = (type) => {
    setMatchType(type);
    setParticipants(''); // Clear participants when changing match type
  };

  return (
    <div style={{ color: '#fff', padding: 40, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32, color: '#C6A04F' }}>
        Improved Participant Selection Demo
      </h1>
      
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Features</h2>
        <ul style={{ lineHeight: 1.6 }}>
          <li>✅ <strong>Visual match builder</strong> - Build matches visually with opponents and teammates</li>
          <li>✅ <strong>Visual wrestler selection</strong> - Click to add wrestlers with images and names</li>
          <li>✅ <strong>Search functionality</strong> - Type to find wrestlers quickly</li>
          <li>✅ <strong>Multiple match formats</strong> - Singles, Tag Team, Multi-Way, Battle Royal</li>
          <li>✅ <strong>Tag team support</strong> - Add team names and organize wrestlers</li>
          <li>✅ <strong>Error prevention</strong> - No more manual slug entry or typos</li>
          <li>✅ <strong>Real-time preview</strong> - See exactly how the match will be formatted</li>
          <li>✅ <strong>Easy management</strong> - Add, remove, and reorganize participants</li>
        </ul>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Component Selection</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'visual', label: 'Visual Match Builder' },
            { key: 'improved', label: 'Improved Input' }
          ].map(component => (
            <button
              key={component.key}
              onClick={() => setSelectedComponent(component.key)}
              style={{
                padding: '8px 16px',
                background: selectedComponent === component.key ? '#C6A04F' : '#333',
                color: selectedComponent === component.key ? '#232323' : '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: selectedComponent === component.key ? 'bold' : 'normal'
              }}
            >
              {component.label}
            </button>
          ))}
        </div>
      </div>



      {selectedComponent === 'visual' ? (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 16 }}>Visual Match Builder</h2>
          <VisualMatchBuilder
            wrestlers={wrestlers}
            value={participants}
            onChange={handleParticipantsChange}
            maxParticipants={30}
          />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16 }}>Match Type</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { key: 'singles', label: 'Singles' },
                { key: 'tag', label: 'Tag Team' },
                { key: 'multi-way', label: 'Multi-Way' },
                { key: 'battle-royal', label: 'Battle Royal' }
              ].map(type => (
                <button
                  key={type.key}
                  onClick={() => handleMatchTypeChange(type.key)}
                  style={{
                    padding: '8px 16px',
                    background: matchType === type.key ? '#C6A04F' : '#333',
                    color: matchType === type.key ? '#232323' : '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: matchType === type.key ? 'bold' : 'normal'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16 }}>Participant Selection</h2>
            <ImprovedParticipantsInput
              wrestlers={wrestlers}
              value={participants}
              onChange={handleParticipantsChange}
              matchType={matchType}
              maxParticipants={30}
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Current Value</h2>
        <div style={{ 
          padding: 16, 
          background: '#1a1a1a', 
          borderRadius: '4px', 
          border: '1px solid #555',
          fontFamily: 'monospace',
          fontSize: '14px',
          wordBreak: 'break-all'
        }}>
          {participants || 'No participants selected'}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>How It Works</h2>
        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: '8px' }}>
          <h3 style={{ color: '#C6A04F', marginBottom: 12 }}>Visual Match Builder</h3>
          <p>Click "+ Opponent" to add a new side, then "+ Teammate" to add wrestlers to that side. Each wrestler gets their own card with image, name, and brand. Use "VS" separators to see the match structure visually.</p>
          
          <h3 style={{ color: '#C6A04F', marginBottom: 12, marginTop: 16 }}>Singles Match</h3>
          <p>Select one wrestler per side. Format: "wrestler1 vs wrestler2"</p>
          
          <h3 style={{ color: '#C6A04F', marginBottom: 12, marginTop: 16 }}>Tag Team Match</h3>
          <p>Select multiple wrestlers per side with optional team names. Format: "Team A (wrestler1 & wrestler2) vs Team B (wrestler3 & wrestler4)"</p>
          
          <h3 style={{ color: '#C6A04F', marginBottom: 12, marginTop: 16 }}>Multi-Way Match</h3>
          <p>Select multiple wrestlers across multiple sides. Format: "wrestler1 vs wrestler2 vs wrestler3 vs wrestler4"</p>
          
          <h3 style={{ color: '#C6A04F', marginBottom: 12, marginTop: 16 }}>Battle Royal</h3>
          <p>Select multiple wrestlers in a single array. Format: ["wrestler1", "wrestler2", "wrestler3", ...]</p>
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: 16 }}>Benefits</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ background: '#1a1a1a', padding: 16, borderRadius: '8px' }}>
            <h4 style={{ color: '#C6A04F', marginBottom: 8 }}>User Experience</h4>
            <ul style={{ fontSize: '14px', lineHeight: 1.5 }}>
              <li>Visual wrestler selection with images</li>
              <li>Real-time search and filtering</li>
              <li>Clear match format options</li>
              <li>Live preview of final format</li>
            </ul>
          </div>
          
          <div style={{ background: '#1a1a1a', padding: 16, borderRadius: '8px' }}>
            <h4 style={{ color: '#C6A04F', marginBottom: 8 }}>Data Quality</h4>
            <ul style={{ fontSize: '14px', lineHeight: 1.5 }}>
              <li>No more manual slug entry</li>
              <li>Prevents typos and errors</li>
              <li>Consistent data format</li>
              <li>Validates wrestler existence</li>
            </ul>
          </div>
          
          <div style={{ background: '#1a1a1a', padding: 16, borderRadius: '8px' }}>
            <h4 style={{ color: '#C6A04F', marginBottom: 8 }}>Flexibility</h4>
            <ul style={{ fontSize: '14px', lineHeight: 1.5 }}>
              <li>Supports all match types</li>
              <li>Easy tag team management</li>
              <li>Dynamic participant limits</li>
              <li>Backward compatible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 