import React from 'react';

// Utility to calculate age from dob
function calculateAge(dob) {
  if (!dob) return '—';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

// Utility to display last 5 matches as icons
function Last5Matches({ results }) {
  // results: array of 'W', 'L', 'D'
  const colorMap = { W: '#4CAF50', L: '#E53935', D: '#FFC107' };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {results && results.length > 0 ? results.map((r, i) => (
        <span key={i} style={{
          display: 'inline-block',
          width: 22, height: 22, borderRadius: '50%',
          background: colorMap[r] || '#bbb',
          color: '#222', fontWeight: 700, textAlign: 'center', lineHeight: '22px'
        }}>{r}</span>
      )) : <span style={{ color: '#bbb' }}>—</span>}
    </div>
  );
}

function WrestlerInfoBlock({ wrestler = {}, titleStatus, last5 }) {
  return (
    <div style={{ flex: 1, minWidth: 220, textAlign: 'center', color: '#fff' }}>
      <img src={wrestler.image_url} alt={wrestler.name} style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 2 }}>{wrestler.name || '—'}</div>
      {titleStatus && <div style={{ color: '#FFD700', fontWeight: 600, marginBottom: 8 }}>{titleStatus}</div>}
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        <b>Age:</b> {calculateAge(wrestler.dob)} &nbsp; <b>Nationality:</b> {wrestler.nationality || '—'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        <b>Promotion:</b> {wrestler.promotion || '—'} &nbsp; <b>Brand:</b> {wrestler.brand || '—'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        <b>Current title held:</b> {wrestler.currentTitle || 'None'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        <b>Most recent title held:</b> {wrestler.recentTitle || 'None'}
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        <b>Last 5 matches:</b> <Last5Matches results={last5} />
      </div>
    </div>
  );
}

export default function MatchPageNew({ match, wrestlers = [], onEdit }) {
  // wrestlers: array of full wrestler objects in match order
  // last5Results: array of arrays, one per wrestler, e.g. [['W','L','W','W','D'], ...]
  // titleStatus: e.g. 'Successful Defense', 'New Champion', etc.

  return (
    <div style={{ background: '#181818', color: '#fff', borderRadius: 12, maxWidth: 1100, margin: '32px auto', padding: 32 }}>
      <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        {match.title}
      </div>
      <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
        {match.stipulation} {match.cardType ? `- ${match.cardType}` : ''}
      </div>
      <div style={{ textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 24, marginBottom: 2 }}>
        {match.result && match.result !== 'No winner' ? 'Final' : match.result}
      </div>
      <div style={{ textAlign: 'center', color: '#bbb', fontSize: 16, marginBottom: 24 }}>
        {match.method}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 24 }}>
        <WrestlerInfoBlock wrestler={wrestlers[0]} titleStatus={wrestlers[0]?.titleStatus} last5={wrestlers[0]?.last5Results} />
        <WrestlerInfoBlock wrestler={wrestlers[1]} titleStatus={wrestlers[1]?.titleStatus} last5={wrestlers[1]?.last5Results} />
      </div>
      <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Details</div>
        <div><b>Participants:</b> {match.participantsDisplay || match.participants}</div>
        <div><b>Winner:</b> {match.winnerDisplay || match.winner}</div>
        <div><b>Method:</b> {match.method}</div>
        <div><b>Time:</b> {match.time}</div>
        <div><b>Stipulation:</b> {match.stipulation}</div>
        <div><b>Title:</b> {match.title}</div>
        <div><b>Title Outcome:</b> {match.titleOutcome}</div>
      </div>
      <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Commentary</div>
        {match.commentary && match.commentary.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {match.commentary.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#C6A04F', marginRight: 8 }}>{c.time}</span>
                {c.text}
              </li>
            ))}
          </ul>
        ) : <div style={{ color: '#bbb' }}>No commentary yet.</div>}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onEdit} style={{
          background: '#C6A04F', color: '#232323', border: 'none', borderRadius: 4,
          fontWeight: 700, fontSize: 16, padding: '10px 32px', cursor: 'pointer'
        }}>
          Edit Match
        </button>
      </div>
    </div>
  );
} 