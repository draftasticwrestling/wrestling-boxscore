import React from 'react';
import WrestlerAutocomplete from './WrestlerAutocomplete';

export default function ParticipantsInput({ wrestlers = [], value, onChange, mode = 'singles' }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  // Parse initial value
  const parseValue = () => {
    if (!value) {
      if (mode === 'singles') return [[null], [null]];
      if (mode === 'tag') return [[null, null], [null, null]];
    }
    // Parse string like "slug1 vs slug2" or "slug1 & slug2 vs slug3 & slug4" or "Team (slug1 & slug2) vs ..."
    const sides = value.split(' vs ').map(side => {
      const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (teamMatch) {
        // Team name, slugs
        const slugs = teamMatch[2].split('&').map(s => s.trim());
        return { teamName: teamMatch[1].trim(), members: slugs };
      }
      // Just slugs
      return { teamName: '', members: side.split('&').map(s => s.trim()) };
    });
    // Pad to 2 sides, 2 members each for tag
    if (mode === 'singles') {
      return [ [sides[0]?.members?.[0] || null], [sides[1]?.members?.[0] || null] ];
    }
    if (mode === 'tag') {
      return [
        [sides[0]?.members?.[0] || null, sides[0]?.members?.[1] || null],
        [sides[1]?.members?.[0] || null, sides[1]?.members?.[1] || null]
      ];
    }
    return [[null], [null]];
  };

  // For tag, also parse team names
  const parseTeamNames = () => {
    if (!value || mode !== 'tag') return ['', ''];
    const sides = value.split(' vs ').map(side => {
      const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
      return teamMatch ? teamMatch[1].trim() : '';
    });
    return [sides[0] || '', sides[1] || ''];
  };

  const [participants, setParticipants] = React.useState(parseValue());
  const [teamNames, setTeamNames] = React.useState(parseTeamNames());

  // Update parent when participants/teamNames change
  React.useEffect(() => {
    let val = '';
    if (mode === 'singles') {
      val = `${participants[0][0] || ''} vs ${participants[1][0] || ''}`;
    } else if (mode === 'tag') {
      const side = idx => {
        const names = participants[idx].filter(Boolean).join(' & ');
        return teamNames[idx] ? `${teamNames[idx]} (${names})` : names;
      };
      val = `${side(0)} vs ${side(1)}`;
    }
    onChange(val);
  }, [participants, teamNames, mode, onChange]);

  // Handlers
  const handleParticipantChange = (sideIdx, memberIdx, slug) => {
    setParticipants(prev => {
      const updated = prev.map(arr => [...arr]);
      updated[sideIdx][memberIdx] = slug;
      return updated;
    });
  };
  const handleTeamNameChange = (sideIdx, name) => {
    setTeamNames(prev => {
      const updated = [...prev];
      updated[sideIdx] = name;
      return updated;
    });
  };

  // Render
  return (
    <div>
      {[0, 1].map(sideIdx => (
        <div key={sideIdx} style={{ marginBottom: 16 }}>
          {mode === 'tag' && (
            <input
              type="text"
              value={teamNames[sideIdx]}
              onChange={e => handleTeamNameChange(sideIdx, e.target.value)}
              placeholder={`Team ${sideIdx + 1} name (optional)`}
              style={{ marginBottom: 8, padding: 6, borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff', width: 220 }}
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {participants[sideIdx].map((slug, memberIdx) => (
              <WrestlerAutocomplete
                key={memberIdx}
                wrestlers={safeWrestlers}
                value={slug}
                onChange={val => handleParticipantChange(sideIdx, memberIdx, val)}
                placeholder={`Select wrestler ${memberIdx + 1}`}
              />
            ))}
            {mode === 'tag' && participants[sideIdx].length < 4 && (
              <button type="button" onClick={() => setParticipants(prev => {
                const updated = prev.map(arr => [...arr]);
                updated[sideIdx].push(null);
                return updated;
              })} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 4, padding: '0 10px', fontSize: 18 }}>+</button>
            )}
            {mode === 'tag' && participants[sideIdx].length > 2 && (
              <button type="button" onClick={() => setParticipants(prev => {
                const updated = prev.map(arr => [...arr]);
                updated[sideIdx].pop();
                return updated;
              })} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 4, padding: '0 10px', fontSize: 18 }}>-</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 