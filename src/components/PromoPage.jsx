import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import WrestlerMultiSelect from './WrestlerMultiSelect';

const PROMO_OUTCOMES = [
  'None',
  'Vacated Title',
  'Match Announced',
  'Wrestler Going Inactive',
  'Championship Challenge',
  'Return Announced',
  'Feud Started',
  'Feud Ended',
  'Alliance Formed',
  'Alliance Broken',
  'Retirement Announcement',
  'Contract Signing',
  'Other'
];

export default function PromoPage({ wrestlers = [], events = [] }) {
  const [promos, setPromos] = useState([]);
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedWrestlers, setSelectedWrestlers] = useState([]);
  const [promoContent, setPromoContent] = useState('');
  const [promoOutcome, setPromoOutcome] = useState('None');
  const [outcomeDetails, setOutcomeDetails] = useState('');
  const [promoType, setPromoType] = useState('In-Ring');
  const [promoNotes, setPromoNotes] = useState('');

  // Load promos from localStorage (or Supabase in the future)
  useEffect(() => {
    const savedPromos = localStorage.getItem('wrestling-promos');
    if (savedPromos) {
      setPromos(JSON.parse(savedPromos));
    }
  }, []);

  // Save promos to localStorage
  const savePromos = (newPromos) => {
    setPromos(newPromos);
    localStorage.setItem('wrestling-promos', JSON.stringify(newPromos));
  };

  const resetForm = () => {
    setSelectedEvent('');
    setSelectedWrestlers([]);
    setPromoContent('');
    setPromoOutcome('None');
    setOutcomeDetails('');
    setPromoType('In-Ring');
    setPromoNotes('');
  };

  const handleAddPromo = () => {
    if (selectedWrestlers.length === 0) {
      alert('Please select at least one wrestler for the promo.');
      return;
    }

    if (!promoContent.trim()) {
      alert('Please enter promo content.');
      return;
    }

    const newPromo = {
      id: Date.now().toString(),
      eventId: selectedEvent,
      eventName: events.find(e => e.id === selectedEvent)?.name || 'Unknown Event',
      eventDate: events.find(e => e.id === selectedEvent)?.date || '',
      wrestlers: selectedWrestlers,
      content: promoContent.trim(),
      outcome: promoOutcome,
      outcomeDetails: outcomeDetails.trim(),
      type: promoType,
      notes: promoNotes.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedPromos = [...promos, newPromo];
    savePromos(updatedPromos);
    resetForm();
    setIsAddingPromo(false);
  };

  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setSelectedEvent(promo.eventId);
    setSelectedWrestlers(promo.wrestlers);
    setPromoContent(promo.content);
    setPromoOutcome(promo.outcome);
    setOutcomeDetails(promo.outcomeDetails);
    setPromoType(promo.type);
    setPromoNotes(promo.notes);
    setIsAddingPromo(true);
  };

  const handleUpdatePromo = () => {
    if (selectedWrestlers.length === 0) {
      alert('Please select at least one wrestler for the promo.');
      return;
    }

    if (!promoContent.trim()) {
      alert('Please enter promo content.');
      return;
    }

    const updatedPromo = {
      ...editingPromo,
      eventId: selectedEvent,
      eventName: events.find(e => e.id === selectedEvent)?.name || 'Unknown Event',
      eventDate: events.find(e => e.id === selectedEvent)?.date || '',
      wrestlers: selectedWrestlers,
      content: promoContent.trim(),
      outcome: promoOutcome,
      outcomeDetails: outcomeDetails.trim(),
      type: promoType,
      notes: promoNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    const updatedPromos = promos.map(p => p.id === editingPromo.id ? updatedPromo : p);
    savePromos(updatedPromos);
    resetForm();
    setIsAddingPromo(false);
    setEditingPromo(null);
  };

  const handleDeletePromo = (promoId) => {
    if (window.confirm('Are you sure you want to delete this promo?')) {
      const updatedPromos = promos.filter(p => p.id !== promoId);
      savePromos(updatedPromos);
    }
  };

  const getWrestlerNames = (wrestlerSlugs) => {
    return wrestlerSlugs.map(slug => {
      const wrestler = wrestlers.find(w => w.id === slug);
      return wrestler ? wrestler.name : slug;
    }).join(', ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'Vacated Title': return '#ff6b6b';
      case 'Match Announced': return '#4ecdc4';
      case 'Wrestler Going Inactive': return '#ffa726';
      case 'Championship Challenge': return '#c6a04f';
      case 'Return Announced': return '#66bb6a';
      case 'Feud Started': return '#ef5350';
      case 'Feud Ended': return '#26a69a';
      case 'Alliance Formed': return '#42a5f5';
      case 'Alliance Broken': return '#ab47bc';
      case 'Retirement Announcement': return '#8d6e63';
      case 'Contract Signing': return '#26c6da';
      default: return '#666';
    }
  };

  if (isAddingPromo) {
    return (
      <>
        <Helmet>
          <title>{editingPromo ? 'Edit Promo' : 'Add Promo'} - Wrestling Boxscore</title>
        </Helmet>
        
        <div style={{ color: '#fff', padding: 40, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <button
              onClick={() => {
                resetForm();
                setIsAddingPromo(false);
                setEditingPromo(null);
              }}
              style={{
                background: '#333',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'pointer',
                marginRight: 16
              }}
            >
              ← Back
            </button>
            <h1 style={{ color: '#C6A04F', fontSize: 32, fontWeight: 800, margin: 0 }}>
              {editingPromo ? 'Edit Promo' : 'Add Promo'}
            </h1>
          </div>

          <div style={{ background: '#181818', padding: 24, borderRadius: 12, border: '1px solid #444' }}>
            {/* Event Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Event *
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  fontSize: 16
                }}
              >
                <option value="">Select an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.date}
                  </option>
                ))}
              </select>
            </div>

            {/* Wrestler Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Wrestlers Involved *
              </label>
              <WrestlerMultiSelect
                wrestlers={wrestlers}
                value={selectedWrestlers}
                onChange={setSelectedWrestlers}
                placeholder="Select wrestlers involved in the promo..."
              />
            </div>

            {/* Promo Type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Promo Type
              </label>
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  fontSize: 16
                }}
              >
                <option value="In-Ring">In-Ring Promo</option>
                <option value="Backstage">Backstage Interview</option>
                <option value="Pre-Show">Pre-Show Segment</option>
                <option value="Post-Show">Post-Show Segment</option>
                <option value="Video Package">Video Package</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>

            {/* Promo Content */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Promo Content *
              </label>
              <textarea
                value={promoContent}
                onChange={(e) => setPromoContent(e.target.value)}
                placeholder="Enter the promo content, key quotes, or summary..."
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  fontSize: 16,
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Outcome */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Outcome
              </label>
              <select
                value={promoOutcome}
                onChange={(e) => setPromoOutcome(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  fontSize: 16
                }}
              >
                {PROMO_OUTCOMES.map(outcome => (
                  <option key={outcome} value={outcome}>{outcome}</option>
                ))}
              </select>
            </div>

            {/* Outcome Details */}
            {promoOutcome !== 'None' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                  Outcome Details
                </label>
                <textarea
                  value={outcomeDetails}
                  onChange={(e) => setOutcomeDetails(e.target.value)}
                  placeholder="Provide details about the outcome..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 12,
                    background: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: 4,
                    fontSize: 16,
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#C6A04F' }}>
                Additional Notes
              </label>
              <textarea
                value={promoNotes}
                onChange={(e) => setPromoNotes(e.target.value)}
                placeholder="Any additional notes or context..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 12,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  fontSize: 16,
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  resetForm();
                  setIsAddingPromo(false);
                  setEditingPromo(null);
                }}
                style={{
                  background: '#666',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingPromo ? handleUpdatePromo : handleAddPromo}
                style={{
                  background: '#C6A04F',
                  color: '#000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                {editingPromo ? 'Update Promo' : 'Add Promo'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Promos - Wrestling Boxscore</title>
        <meta name="description" content="Track and manage wrestling promos, interviews, and backstage segments." />
      </Helmet>
      
      <div style={{ color: '#fff', padding: 40, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#C6A04F', fontSize: 36, fontWeight: 800, margin: 0 }}>
            Promos
          </h1>
          <button
            onClick={() => setIsAddingPromo(true)}
            style={{
              background: '#C6A04F',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            + Add Promo
          </button>
        </div>

        {promos.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 60, 
            background: '#181818', 
            borderRadius: 12,
            border: '1px solid #444'
          }}>
            <h3 style={{ color: '#C6A04F', marginBottom: 16 }}>No Promos Yet</h3>
            <p style={{ color: '#ccc', marginBottom: 24 }}>
              Start tracking promos, interviews, and backstage segments.
            </p>
            <button
              onClick={() => setIsAddingPromo(true)}
              style={{
                background: '#C6A04F',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              Add Your First Promo
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {promos.map(promo => (
              <div
                key={promo.id}
                style={{
                  background: '#181818',
                  padding: 24,
                  borderRadius: 12,
                  border: '1px solid #444',
                  position: 'relative'
                }}
              >
                {/* Promo Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ color: '#C6A04F', fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>
                      {promo.eventName}
                    </h3>
                    <div style={{ color: '#ccc', fontSize: 14, marginBottom: 8 }}>
                      {formatDate(promo.eventDate)} • {promo.type}
                    </div>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                      {getWrestlerNames(promo.wrestlers)}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEditPromo(promo)}
                      style={{
                        background: '#333',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      style={{
                        background: '#d32f2f',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Promo Content */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#fff', lineHeight: 1.6, margin: 0 }}>
                    {promo.content}
                  </p>
                </div>

                {/* Promo Details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                  {promo.outcome !== 'None' && (
                    <div style={{ color: getOutcomeColor(promo.outcome), fontSize: 14, fontWeight: 600 }}>
                      <strong>Outcome:</strong> {promo.outcome}
                    </div>
                  )}
                </div>

                {/* Outcome Details */}
                {promo.outcomeDetails && (
                  <div style={{ 
                    background: '#222', 
                    padding: 12, 
                    borderRadius: 6, 
                    marginBottom: 16,
                    borderLeft: `4px solid ${getOutcomeColor(promo.outcome)}`
                  }}>
                    <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
                      {promo.outcomeDetails}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {promo.notes && (
                  <div style={{ 
                    background: '#222', 
                    padding: 12, 
                    borderRadius: 6,
                    borderLeft: '4px solid #666'
                  }}>
                    <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>
                      <strong>Notes:</strong> {promo.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}



