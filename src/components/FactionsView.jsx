import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function FactionsView({ wrestlers = [], isAuthorized = false, onWrestlerUpdate }) {
  const [factions, setFactions] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingFaction, setEditingFaction] = useState(null);
  const [editingStableName, setEditingStableName] = useState(null);
  const [addingToStable, setAddingToStable] = useState(null);
  const [showCreateStable, setShowCreateStable] = useState(false);
  const [newFactionName, setNewFactionName] = useState('');

  // Group wrestlers by stable/faction and include tag teams marked as stables
  useEffect(() => {
    async function loadFactions() {
      const grouped = {};
      
      // First, group wrestlers by their stable field
      wrestlers.forEach(w => {
        const stable = w.stable || w.affiliation;
        if (stable && stable.trim()) {
          if (!grouped[stable]) {
            grouped[stable] = [];
          }
          grouped[stable].push(w);
        }
      });

      // Then, fetch tag teams marked as stables and add their members
      try {
        const { data: stableTagTeams, error } = await supabase
          .from('tag_teams')
          .select('*')
          .eq('is_stable', true)
          .eq('active', true);

        if (!error && stableTagTeams) {
          for (const team of stableTagTeams) {
            // Fetch members of this tag team
            const { data: members } = await supabase
              .from('tag_team_members')
              .select('wrestler_slug, member_order, active')
              .eq('tag_team_id', team.id)
              .eq('active', true)
              .order('member_order');

            if (members) {
              // Get wrestler details for each member
              const memberWrestlers = members
                .map(m => wrestlers.find(w => w.id === m.wrestler_slug))
                .filter(Boolean);

              // Add to grouped, but avoid duplicates
              const stableName = team.name;
              if (!grouped[stableName]) {
                grouped[stableName] = [];
              }

              // Add members that aren't already in the group
              memberWrestlers.forEach(w => {
                if (!grouped[stableName].find(existing => existing.id === w.id)) {
                  grouped[stableName].push(w);
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading tag teams as stables:', err);
      }

      // Sort factions alphabetically and members with leader first
      const sorted = {};
      Object.keys(grouped).sort().forEach(key => {
        const members = grouped[key];
        // Sort: leader first, then alphabetically
        sorted[key] = members.sort((a, b) => {
          const aIsLeader = a.is_stable_leader || false;
          const bIsLeader = b.is_stable_leader || false;
          if (aIsLeader && !bIsLeader) return -1;
          if (!aIsLeader && bIsLeader) return 1;
          return a.name.localeCompare(b.name);
        });
      });
      setFactions(sorted);
    }

    loadFactions();
  }, [wrestlers]);

  const handleRemoveFromFaction = async (wrestler, factionName) => {
    if (!isAuthorized) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('wrestlers')
        .update({ 
          stable: null,
          is_stable_leader: false, // Clear leader flag when removed
        })
        .eq('id', wrestler.id);

      if (error) throw error;

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error removing wrestler from stable:', err);
      alert('Failed to remove wrestler from stable');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFaction = async (wrestler, factionName) => {
    if (!isAuthorized) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('wrestlers')
        .update({ stable: factionName })
        .eq('id', wrestler.id);

      if (error) throw error;

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error adding wrestler to stable:', err);
      alert('Failed to add wrestler to stable');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStable = (stableName) => {
    if (!isAuthorized || !stableName || !stableName.trim()) return;

    // Stable is created by adding wrestlers to it
    // The stable will appear once wrestlers are added
    setShowCreateStable(false);
    // Show a message that they can now add wrestlers
    // The stable will appear in the list once at least one wrestler is added
  };

  const handleAddMemberToStable = async (stableName, wrestlerId) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wrestlers')
        .update({ stable: stableName })
        .eq('id', wrestlerId);

      if (error) throw error;

      setAddingToStable(null);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error adding wrestler to stable:', err);
      alert('Failed to add wrestler to stable');
    } finally {
      setLoading(false);
    }
  };

  const handleSetLeader = async (stableName, wrestlerId) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      // First, unset any existing leader in this stable
      const members = factions[stableName] || [];
      for (const member of members) {
        if (member.is_stable_leader) {
          await supabase
            .from('wrestlers')
            .update({ is_stable_leader: false })
            .eq('id', member.id);
        }
      }

      // Set the new leader
      const { error } = await supabase
        .from('wrestlers')
        .update({ is_stable_leader: true })
        .eq('id', wrestlerId);

      if (error) throw error;

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error setting stable leader:', err);
      alert('Failed to set stable leader');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFaction = async () => {
    if (!isAuthorized || !newFactionName.trim()) return;
    
    setLoading(true);
    try {
      // Stable is created by adding wrestlers to it
      // Just clear the input
      setNewFactionName('');
      alert(`To create "${newFactionName}", add wrestlers to it by editing their stable field.`);
    } catch (err) {
      console.error('Error creating faction:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStable = (stableName) => {
    setEditingStableName({
      oldName: stableName,
      newName: stableName,
    });
  };

  const handleSaveStableEdit = async () => {
    if (!isAuthorized || !editingStableName) return;

    if (!editingStableName.newName || !editingStableName.newName.trim()) {
      alert('Stable name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const oldName = editingStableName.oldName.trim();
      const newName = editingStableName.newName.trim();

      if (oldName === newName) {
        setEditingStableName(null);
        setLoading(false);
        return;
      }

      // Update all wrestlers with the old stable name to have the new stable name
      const members = factions[oldName] || [];
      
      for (const wrestler of members) {
        const { error } = await supabase
          .from('wrestlers')
          .update({ stable: newName })
          .eq('id', wrestler.id);

        if (error) {
          console.error(`Error updating ${wrestler.name} stable:`, error);
        }
      }

      setEditingStableName(null);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error updating stable name:', err);
      alert('Failed to update stable name');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateStable = async (stableName) => {
    if (!isAuthorized) return;

    if (!confirm(`Are you sure you want to deactivate "${stableName}"? This will remove all members from this stable.`)) {
      return;
    }

    setLoading(true);
    try {
      // Get all wrestlers in this stable
      const members = factions[stableName] || [];
      
      // Remove all members from the stable
      for (const wrestler of members) {
        const { error } = await supabase
          .from('wrestlers')
          .update({ stable: null })
          .eq('id', wrestler.id);

        if (error) {
          console.error(`Error removing ${wrestler.name} from stable:`, error);
        }
      }

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error deactivating stable:', err);
      alert('Failed to deactivate stable');
    } finally {
      setLoading(false);
    }
  };

  const allFactionNames = Object.keys(factions);
  
  // Calculate available wrestlers for the add member modal (not displayed)
  const allWrestlersInStables = new Set();
  Object.values(factions).forEach(members => {
    members.forEach(w => allWrestlersInStables.add(w.id));
  });
  const availableWrestlers = wrestlers.filter(w => !allWrestlersInStables.has(w.id));

  return (
    <div>
      {isAuthorized && (
        <div style={{ marginBottom: 24, textAlign: 'right' }}>
          <button
            onClick={() => setShowCreateStable(true)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: '#C6A04F',
              color: '#232323',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            + Create Stable
          </button>
        </div>
      )}

      {allFactionNames.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          No stables found. Create a stable to get started.
        </div>
      )}

      {/* Existing Factions */}
      {allFactionNames.map(factionName => (
        <div
          key={factionName}
          style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, margin: 0, letterSpacing: 1 }}>
              {factionName}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#999', fontSize: 14 }}>
                {factions[factionName].length} {factions[factionName].length === 1 ? 'member' : 'members'}
              </span>
              {isAuthorized && (
                <>
                  <button
                    onClick={() => handleEditStable(factionName)}
                    disabled={loading}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      background: '#C6A04F',
                      color: '#232323',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivateStable(factionName)}
                    disabled={loading}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      background: '#ffa726',
                      color: '#232323',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    Deactivate Stable
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {factions[factionName].map(w => {
              const isLeader = w.is_stable_leader || false;
              return (
                <div
                  key={w.id}
                  style={{
                    position: 'relative',
                    width: 120,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 12,
                      background: '#232323',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                      overflow: 'hidden',
                      border: isLeader ? '3px solid #C6A04F' : '2px solid #333',
                      boxShadow: isLeader ? '0 0 12px #C6A04F44' : 'none',
                    }}
                  >
                    {w.image_url ? (
                      <img
                        src={w.image_url}
                        alt={w.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{ color: '#666', fontSize: 12 }}>No Image</div>
                    )}
                    {isLeader && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: '#C6A04F',
                          color: '#232323',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                        title="Stable Leader"
                      >
                        👑
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', wordBreak: 'break-word' }}>
                    {w.name}
                  </div>
                  {isLeader && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#C6A04F',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      LEADER
                    </div>
                  )}
                  {isAuthorized && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {!isLeader && (
                        <button
                          onClick={() => handleSetLeader(factionName, w.id)}
                          disabled={loading}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            background: '#C6A04F',
                            color: '#232323',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          Set Leader
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFromFaction(w, factionName)}
                        disabled={loading}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          background: '#ff4444',
                          color: '#fff',
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                          opacity: loading ? 0.6 : 1,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Member Button (for authorized users) */}
            {isAuthorized && (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  background: '#232323',
                  border: '2px dashed #666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#C6A04F';
                  e.currentTarget.style.background = '#2a2a2a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#666';
                  e.currentTarget.style.background = '#232323';
                }}
                onClick={() => setAddingToStable(factionName)}
              >
                <div style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
                  + Add Member
                </div>
              </div>
            )}
          </div>

          {/* Add Member Modal */}
          {addingToStable === factionName && (
            <AddMemberToStableModal
              stableName={factionName}
              availableWrestlers={availableWrestlers}
              onAdd={(wrestlerId) => {
                handleAddMemberToStable(factionName, wrestlerId);
              }}
              onClose={() => setAddingToStable(null)}
            />
          )}
        </div>
      ))}

      {/* Edit Stable Name Modal */}
      {editingStableName && (
        <EditStableModal
          stableName={editingStableName}
          onSave={handleSaveStableEdit}
          onClose={() => setEditingStableName(null)}
          onChange={(newName) => {
            setEditingStableName(prev => ({ ...prev, newName }));
          }}
        />
      )}

      {/* Create Stable Modal */}
      {showCreateStable && (
        <CreateStableModal
          onSave={handleCreateStable}
          onClose={() => setShowCreateStable(false)}
        />
      )}
    </div>
  );
}

// Modal for editing stable name
function EditStableModal({ stableName, onSave, onClose, onChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          borderRadius: 14,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 0 24px #C6A04F22',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#C6A04F', marginBottom: 24 }}>
          Edit Stable Name
        </h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Stable Name: *
          </label>
          <input
            type="text"
            value={stableName.newName}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              background: '#232323',
              color: '#fff',
              border: '1px solid #444',
              fontSize: 15,
            }}
            required
          />
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            This will update all members of "{stableName.oldName}" to the new name.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: '#333',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: '#C6A04F',
              color: '#232323',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal for adding members to a stable
function AddMemberToStableModal({ stableName, availableWrestlers, onAdd, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = availableWrestlers.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          borderRadius: 14,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 0 24px #C6A04F22',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#C6A04F', marginBottom: 20 }}>
          Add Member to {stableName}
        </h3>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search wrestlers..."
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            background: '#232323',
            color: '#fff',
            border: '1px solid #444',
            fontSize: 15,
            marginBottom: 12,
          }}
        />
        {showDropdown && filtered.length > 0 && (
          <div style={{
            maxHeight: 300,
            overflow: 'auto',
            border: '1px solid #444',
            borderRadius: 8,
            background: '#232323',
          }}>
            {filtered.map(w => (
              <div
                key={w.id}
                onClick={() => {
                  onAdd(w.id);
                  setShowDropdown(false);
                }}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  color: '#fff',
                  borderBottom: '1px solid #333',
                }}
                onMouseEnter={(e) => e.target.style.background = '#333'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {w.name}
              </div>
            ))}
          </div>
        )}
        {showDropdown && filtered.length === 0 && searchTerm && (
          <div style={{ padding: '12px', color: '#999', fontSize: 13, textAlign: 'center' }}>
            No wrestlers found
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            padding: '10px 24px',
            borderRadius: 8,
            background: '#333',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            width: '100%',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Modal for creating a new stable
function CreateStableModal({ onSave, onClose }) {
  const [stableName, setStableName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stableName.trim()) {
      onSave(stableName.trim());
      setStableName('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          borderRadius: 14,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 0 24px #C6A04F22',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#C6A04F', marginBottom: 24 }}>
          Create New Stable
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Stable Name: *
            </label>
            <input
              type="text"
              value={stableName}
              onChange={(e) => setStableName(e.target.value)}
              placeholder="e.g., The Judgment Day"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                background: '#232323',
                color: '#fff',
                border: '1px solid #444',
                fontSize: 15,
              }}
              required
              autoFocus
            />
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              After creating, you can add wrestlers to this stable.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: '#333',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: '#C6A04F',
                color: '#232323',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Create Stable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

