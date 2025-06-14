import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { events as initialEvents } from './events';
import { supabase } from './supabaseClient';

// Event List Component
function EventList({ events }) {
  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>WWE Event Results</h1>
      <Link to="/add-event" style={{ display: 'inline-block', marginBottom: 16 }}>+ Add Event</Link>
      <ul>
        {events.map(event => (
          <li key={event.id} style={{ marginBottom: 16 }}>
            <Link to={`/event/${event.id}`}>
              <strong>{event.name}</strong>
            </Link>
            <br />
            {event.date} — {event.location}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Event Box Score Component (with discreet Edit/Delete below the match card)
function EventBoxScore({ events, onDelete }) {
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  const matchesWithCardType = event.matches.map((match, idx, arr) => ({
    ...match,
    cardType: idx === arr.length - 1 ? "Main Event" : "Undercard"
  }));

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <Link to="/">← Back to Events</Link>
      <h2>{event.name}</h2>
      <div>
        <strong>{event.date}</strong> — {event.location}
      </div>
      <h3 style={{ marginTop: 24 }}>Match Results</h3>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Card</th>
            <th>Match</th>
            <th>Result</th>
            <th>Method</th>
            <th>Time</th>
            <th>Stipulation</th>
            <th>Title Outcome</th>
          </tr>
        </thead>
        <tbody>
          {matchesWithCardType.map((match) => (
            <tr key={match.order}>
              <td>{match.order}</td>
              <td>{match.cardType}</td>
              <td>{match.participants}</td>
              <td>{match.result}</td>
              <td>{match.method}</td>
              <td>{match.time}</td>
              <td>{match.stipulation}</td>
              <td>{match.titleOutcome || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Discreet Edit/Delete buttons below the match card */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 24,
        justifyContent: 'flex-end'
      }}>
        <Link
          to={`/edit-event/${event.id}`}
          style={{
            fontSize: 14,
            padding: '4px 12px',
            border: '1px solid #bbb',
            borderRadius: 4,
            background: '#f8f8f8',
            color: '#333',
            textDecoration: 'none',
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#eee'}
          onMouseOut={e => e.currentTarget.style.background = '#f8f8f8'}
        >
          Edit
        </Link>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this event?')) {
              onDelete(event.id);
              navigate('/');
            }
          }}
          style={{
            fontSize: 14,
            padding: '4px 12px',
            border: '1px solid #f5c2c7',
            borderRadius: 4,
            background: '#fff',
            color: '#b02a37',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#f8d7da'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Add Event Form Component (separate forms for event and match)
function AddEvent({ addEvent }) {
  const EVENT_TYPES = [
    "RAW",
    "SmackDown",
    "Backlash",
    "Bad Blood",
    "Clash in Paris",
    "Crown Jewel",
    "Elimination Chamber",
    "Evolution",
    "Money in the Bank",
    "Night of Champions",
    "Royal Rumble",
    "Saturday Night's Main Event",
    "Summer Slam",
    "Survivor Series"
  ];

  const STIPULATION_OPTIONS = [
    "None",
    "Undisputed WWE Championship",
    "World Heavyweight Championship",
    "Men's IC Championship",
    "Men's U.S. Championship",
    "Raw Tag Team Championship",
    "SmackDown Tag Team Championship",
    "Men's Speed Championship",
    "WWE Women's Championship",
    "World Women's Championship",
    "Women's IC Championship",
    "Women's U.S. Championship",
    "Women's Tag Team Championship",
    "Women's Speed Championship",
    "Custom/Other"
  ];

  const SPECIAL_WINNER_OPTIONS = [
    "None",
    "Women's Money in the Bank winner",
    "Men's Money in the Bank winner",
    "Men's Royal Rumble winner",
    "Women's Royal Rumble winner",
    "Men's Elimination Chamber winner",
    "Women's Elimination Chamber winner",
    "King of the Ring winner",
    "Queen of the Ring winner",
    "Men's Ultimate Survivor",
    "Women's Ultimate Survivor"
  ];

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [matches, setMatches] = useState([]);
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    stipulation: '',
    customStipulation: '',
    titleOutcome: ''
  });
  const [specialWinnerType, setSpecialWinnerType] = useState("None");
  const [specialWinnerName, setSpecialWinnerName] = useState('');
  const navigate = useNavigate();

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    let finalStipulation = match.stipulation === "Custom/Other" ? match.customStipulation : 
                          match.stipulation === "None" ? "" : match.stipulation;
    setMatches([
      ...matches,
      { ...match, stipulation: finalStipulation, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      customStipulation: '',
      titleOutcome: ''
    });
  };

  // Save the event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventType || !date || !location || matches.length === 0) {
      alert('Please fill out all event fields and add at least one match.');
      return;
    }
    const id = eventType.toLowerCase().replace(/\s+/g, '-') + '-' + date.replace(/[^0-9]/g, '');
    const eventData = {
      id,
      name: eventType,
      date,
      location,
      matches
    };
    if (specialWinnerType !== "None" && specialWinnerName.trim() !== "") {
      eventData.specialWinner = {
        type: specialWinnerType,
        name: specialWinnerName
      };
    }
    addEvent(eventData);
    navigate('/');
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
      <Link to="/">← Back to Events</Link>
      <h2>Add New Event</h2>
      {/* Event fields form */}
      <form>
        <div>
          <label>
            Event Type:<br />
            <select 
              value={eventType} 
              onChange={e => setEventType(e.target.value)} 
              required 
              style={{ width: '100%', marginBottom: 16 }}
            >
              <option value="">Select an event type</option>
              {EVENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            Date:<br />
            <input value={date} onChange={e => setDate(e.target.value)} required placeholder="e.g. June 9, 2025" style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Location:<br />
            <input value={location} onChange={e => setLocation(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>
        <h3 style={{ marginTop: 24 }}>Add Matches</h3>
        {matches.length > 0 && (
          <ol>
            {matches.map((m, idx) => (
              <li key={idx}>
                <strong>{m.participants}</strong> — {m.result} ({m.stipulation})
              </li>
            ))}
          </ol>
        )}
      </form>
      {/* Match fields form */}
      <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
        <div>
          <label>
            Participants:<br />
            <input value={match.participants} onChange={e => setMatch({ ...match, participants: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Result:<br />
            <input value={match.result} onChange={e => setMatch({ ...match, result: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Method:<br />
            <input value={match.method} onChange={e => setMatch({ ...match, method: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Time:<br />
            <input value={match.time} onChange={e => setMatch({ ...match, time: e.target.value })} style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Stipulation:<br />
            <select
              value={match.stipulation}
              onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulation: '' })}
              style={{ width: '100%' }}
            >
              {STIPULATION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        </div>
        {match.stipulation === "Custom/Other" && (
          <div>
            <label>
              Custom Stipulation:<br />
              <input
                value={match.customStipulation}
                onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </label>
          </div>
        )}
        <div>
          <label>
            Title Outcome:<br />
            <select value={match.titleOutcome} onChange={e => setMatch({ ...match, titleOutcome: e.target.value })} style={{ width: '100%' }}>
              <option value="">None</option>
              <option value="Successful Defense">Successful Defense</option>
              <option value="New Champion">New Champion</option>
            </select>
          </label>
        </div>
        <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
      </form>
      {/* Special Match Winner section */}
      <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 24 }}>
        <label>
          Special Match Winner:<br />
          <select
            value={specialWinnerType}
            onChange={e => setSpecialWinnerType(e.target.value)}
            style={{ width: '100%' }}
          >
            {SPECIAL_WINNER_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        {specialWinnerType !== "None" && (
          <div style={{ marginTop: 8 }}>
            <label>
              Winner Name:<br />
              <input
                value={specialWinnerName}
                onChange={e => setSpecialWinnerName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </label>
          </div>
        )}
      </div>
      {/* Save Event button */}
      <button
        type="button"
        style={{ marginTop: 24 }}
        disabled={matches.length === 0}
        onClick={handleSaveEvent}
      >
        Save Event
      </button>
    </div>
  );
}

// Edit Event Form Component
function EditEvent({ events, updateEvent }) {
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [matches, setMatches] = useState(event.matches);
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    stipulation: '',
    titleOutcome: ''
  });

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    setMatches([
      ...matches,
      { ...match, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      titleOutcome: ''
    });
  };

  // Remove a match from the matches list
  const handleDeleteMatch = (order) => {
    setMatches(matches.filter(m => m.order !== order).map((m, idx) => ({ ...m, order: idx + 1 })));
  };

  // Save the edited event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!name || !date || !location || matches.length === 0) {
      alert('Please fill out all event fields and add at least one match.');
      return;
    }
    updateEvent({
      id: event.id,
      name,
      date,
      location,
      matches
    });
    navigate('/');
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
      <Link to="/">← Back to Events</Link>
      <h2>Edit Event</h2>
      {/* Event fields form */}
      <form>
        <div>
          <label>
            Event Name:<br />
            <input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Date:<br />
            <input value={date} onChange={e => setDate(e.target.value)} required placeholder="e.g. June 9, 2025" style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Location:<br />
            <input value={location} onChange={e => setLocation(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>
        <h3 style={{ marginTop: 24 }}>Matches</h3>
        {matches.length > 0 && (
          <ol>
            {matches.map((m, idx) => (
              <li key={idx}>
                <strong>{m.participants}</strong> — {m.result} ({m.stipulation})
                <button type="button" onClick={() => handleDeleteMatch(m.order)} style={{ color: 'red', marginLeft: 8 }}>Delete</button>
              </li>
            ))}
          </ol>
        )}
      </form>
      {/* Match fields form */}
      <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
        <div>
          <label>
            Participants:<br />
            <input value={match.participants} onChange={e => setMatch({ ...match, participants: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Result:<br />
            <input value={match.result} onChange={e => setMatch({ ...match, result: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Method:<br />
            <input value={match.method} onChange={e => setMatch({ ...match, method: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Time:<br />
            <input value={match.time} onChange={e => setMatch({ ...match, time: e.target.value })} style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Stipulation:<br />
            <input value={match.stipulation} onChange={e => setMatch({ ...match, stipulation: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Title Outcome:<br />
            <select value={match.titleOutcome} onChange={e => setMatch({ ...match, titleOutcome: e.target.value })} style={{ width: '100%' }}>
              <option value="">None</option>
              <option value="Successful Defense">Successful Defense</option>
              <option value="New Champion">New Champion</option>
            </select>
          </label>
        </div>
        <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
      </form>
      {/* Save Event button */}
      <button
        type="button"
        style={{ marginTop: 24 }}
        disabled={matches.length === 0}
        onClick={handleSaveEvent}
      >
        Save Changes
      </button>
    </div>
  );
}

// Main App with Routing and Supabase persistence
function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load events from Supabase
  useEffect(() => {
    console.log('App mounted, fetching events...');
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Attempting to fetch from Supabase...');
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched data:', data);
      if (!data || data.length === 0) {
        console.log('No data returned from Supabase, using initial events');
        setEvents(initialEvents);
      } else {
        // Sort events by date (newest first)
        const sortedEvents = data.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA;
        });
        setEvents(sortedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error.message);
      console.log('Falling back to initial events');
      setEvents(initialEvents);
    } finally {
      setLoading(false);
    }
  };

  // Add new event to Supabase
  const addEvent = async (event) => {
    try {
      console.log('Attempting to add event to Supabase:', event);
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Successfully added event:', data);
      setEvents([data[0], ...events]);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
      // Fallback to local state update if Supabase fails
      setEvents([event, ...events]);
    }
  };

  // Delete event from Supabase
  const deleteEvent = async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Update event in Supabase
  const updateEvent = async (updatedEvent) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updatedEvent)
        .eq('id', updatedEvent.id)
        .select();

      if (error) throw error;
      setEvents(events.map(e => e.id === updatedEvent.id ? data[0] : e));
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleEditMatch = (eventId, updatedMatches) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, matches: updatedMatches }
        : event
    ));
  };

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h2>Loading events...</h2>
        <p>Please wait while we fetch the latest events.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h2>Error loading events</h2>
        <p>{error}</p>
        <button 
          onClick={fetchEvents}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventList events={events} />} />
        <Route path="/event/:eventId" element={<EventBoxScore events={events} onDelete={deleteEvent} />} />
        <Route path="/add-event" element={<AddEvent addEvent={addEvent} />} />
        <Route path="/edit-event/:eventId" element={<EditEvent events={events} updateEvent={updateEvent} />} />
      </Routes>
    </Router>
  );
}

export default App;