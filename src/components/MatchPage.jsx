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
      <table style={{ width: '100%', color: gold, marginBottom: 24 }}>
        <tbody>
          <tr><td>Participants:</td><td>{match.participants}</td></tr>
          <tr><td>Winner:</td><td>{match.result || 'None'}</td></tr>
          <tr><td>Method:</td><td>{match.method || 'None'}</td></tr>
          <tr><td>Time:</td><td>{match.time || 'None'}</td></tr>
          <tr><td>Stipulation:</td><td>{match.stipulation || 'None'}</td></tr>
          <tr><td>Title:</td><td>{match.title || 'None'}</td></tr>
          <tr><td>Title Outcome:</td><td>{match.titleOutcome || 'None'}</td></tr>
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