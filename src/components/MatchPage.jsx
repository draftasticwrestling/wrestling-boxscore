import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvents } from '../App'; // We'll use context or pass events as prop if needed

const gold = '#C6A04F';
const sectionStyle = {
  background: 'rgba(20, 20, 20, 0.98)',
  borderRadius: 12,
  boxShadow: '0 0 24px #C6A04F22',
  padding: '24px 40px',
  margin: '24px auto',
  maxWidth: 600,
};

const tableStyle = {
  width: '100%',
  background: 'rgba(34, 34, 34, 0.98)',
  color: gold,
  borderCollapse: 'collapse',
  boxShadow: '0 0 12px #C6A04F22',
};
const thStyle = {
  background: '#222',
  color: gold,
  fontWeight: 700,
  borderBottom: '2px solid #C6A04F',
  padding: 10,
  textAlign: 'left',
  minWidth: 120,
};
const tdStyle = {
  background: 'rgba(34, 34, 34, 0.98)',
  color: '#fff8e1',
  borderBottom: '1px solid #444',
  padding: 10,
  verticalAlign: 'top',
};

export default function MatchPage({ events }) {
  const { eventId, matchOrder } = useParams();
  const event = events.find(e => e.id === eventId);
  const match = event ? event.matches.find(m => String(m.order) === String(matchOrder)) : null;

  if (!event || !match) {
    return <div style={{ padding: 24 }}>Match not found.</div>;
  }

  return (
    <div style={sectionStyle}>
      <Link to={`/event/${event.id}`} style={{ color: gold }}>← Back to Event</Link>
      <h2 style={{ color: gold, marginTop: 24 }}>Match Details</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Participants</td><td style={tdStyle}>{match.participants}</td></tr>
          <tr><td style={tdStyle}>Winner</td><td style={tdStyle}>{
            match.result && match.result.includes(' def. ')
              ? match.result.split(' def. ')[0]
              : (match.result || 'None')
          }</td></tr>
          <tr><td style={tdStyle}>Method</td><td style={tdStyle}>{match.method || 'None'}</td></tr>
          <tr><td style={tdStyle}>Time</td><td style={tdStyle}>{match.time || 'None'}</td></tr>
          <tr><td style={tdStyle}>Stipulation</td><td style={tdStyle}>{match.stipulation || 'None'}</td></tr>
          <tr><td style={tdStyle}>Title</td><td style={tdStyle}>{match.title || 'None'}</td></tr>
          <tr><td style={tdStyle}>Title Outcome</td><td style={tdStyle}>{match.titleOutcome || 'None'}</td></tr>
        </tbody>
      </table>
      {match.notes && (
        <div style={{ marginBottom: 24 }}>
          <strong style={{ color: gold }}>Notes:</strong>
          <div style={{ color: '#fff', marginTop: 4 }}>{match.notes}</div>
        </div>
      )}
      {match.isLive && Array.isArray(match.commentary) && match.commentary.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ color: gold, fontWeight: 600, marginBottom: 6 }}>Live Commentary</div>
          <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 4, background: '#232323', padding: 8 }}>
            {match.commentary.map((c, idx) => {
              let elapsed = 0;
              if (match.liveStart) {
                elapsed = Math.ceil((c.timestamp - match.liveStart) / 60000);
              }
              return (
                <div key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: gold, minWidth: 32 }}>{elapsed}'</span>
                  <span style={{ color: '#fff' }}>{c.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 