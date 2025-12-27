import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TagTeamsView({ wrestlers = [], isAuthorized = false, onWrestlerUpdate }) {
  const [tagTeams, setTagTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingTeamDetails, setEditingTeamDetails] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch tag teams and their members
  useEffect(() => {
    async function fetchTagTeams() {
      setLoading(true);
      try {
        // Fetch all tag teams
        const { data: teams, error: teamsError } = await supabase
          .from('tag_teams')
          .select('*')
          .order('name');

        if (teamsError) throw teamsError;

        // Fetch members for each team
        const teamsWithMembers = await Promise.all(
          (teams || []).map(async (team) => {
            const { data: members, error: membersError } = await supabase
              .from('tag_team_members')
              .select('wrestler_slug, member_order, active')
              .eq('tag_team_id', team.id)
              .eq('active', true)
              .order('member_order');

            if (membersError) {
              console.error('Error fetching members for team:', team.id, membersError);
              return { ...team, members: [] };
            }

            // Get wrestler details for each member
            const memberWrestlers = (members || [])
              .map(m => wrestlers.find(w => w.id === m.wrestler_slug))
              .filter(Boolean);

            return {
              ...team,
              members: memberWrestlers,
            };
          })
        );

        setTagTeams(teamsWithMembers);
      } catch (err) {
        console.error('Error fetching tag teams:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTagTeams();
  }, [wrestlers]);

  const handleRemoveMember = async (teamId, wrestlerSlug) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      // Deactivate the member instead of deleting
      const { error } = await supabase
        .from('tag_team_members')
        .update({ active: false })
        .eq('tag_team_id', teamId)
        .eq('wrestler_slug', wrestlerSlug);

      if (error) throw error;

      // Also update the wrestler's tag team fields
      await supabase
        .from('wrestlers')
        .update({ 
          tag_team_id: null,
          tag_team_name: null,
          tag_team_partner_slug: null,
        })
        .eq('id', wrestlerSlug);

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error removing member from tag team:', err);
      alert('Failed to remove member from tag team');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeamDetails({
      id: team.id,
      name: team.name,
      brand: team.brand || '',
      description: team.description || '',
    });
  };

  const handleSaveTeamEdit = async () => {
    if (!isAuthorized || !editingTeamDetails) return;

    setLoading(true);
    try {
      // Update tag team
      const { error: teamError } = await supabase
        .from('tag_teams')
        .update({
          name: editingTeamDetails.name.trim(),
          brand: editingTeamDetails.brand && editingTeamDetails.brand.trim() ? editingTeamDetails.brand.trim() : null,
          description: editingTeamDetails.description && editingTeamDetails.description.trim() ? editingTeamDetails.description.trim() : null,
        })
        .eq('id', editingTeamDetails.id);

      if (teamError) throw teamError;

      // Update all wrestlers' tag_team_name field
      const team = tagTeams.find(t => t.id === editingTeamDetails.id);
      if (team && team.members) {
        for (const member of team.members) {
          await supabase
            .from('wrestlers')
            .update({ tag_team_name: editingTeamDetails.name.trim() })
            .eq('id', member.id);
        }
      }

      setEditingTeamDetails(null);
      
      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error updating tag team:', err);
      alert('Failed to update tag team');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsStable = async (teamId, teamName) => {
    if (!isAuthorized) return;

    if (!confirm(`Mark "${teamName}" as a stable? This will sync all members' stable field to match the tag team name.`)) {
      return;
    }

    setLoading(true);
    try {
      // Mark tag team as stable
      const { error: teamError } = await supabase
        .from('tag_teams')
        .update({ is_stable: true })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Sync all members' stable field
      const team = tagTeams.find(t => t.id === teamId);
      if (team && team.members) {
        for (const member of team.members) {
          await supabase
            .from('wrestlers')
            .update({ stable: teamName })
            .eq('id', member.id);
        }
      }

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error marking tag team as stable:', err);
      alert('Failed to mark tag team as stable');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmarkAsStable = async (teamId) => {
    if (!isAuthorized) return;

    if (!confirm('Unmark this tag team as a stable? This will remove the stable field from all members.')) {
      return;
    }

    setLoading(true);
    try {
      // Unmark tag team as stable
      const { error: teamError } = await supabase
        .from('tag_teams')
        .update({ is_stable: false })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Remove stable field from all members
      const team = tagTeams.find(t => t.id === teamId);
      if (team && team.members) {
        for (const member of team.members) {
          await supabase
            .from('wrestlers')
            .update({ stable: null })
            .eq('id', member.id);
        }
      }

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error unmarking tag team as stable:', err);
      alert('Failed to unmark tag team as stable');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInactive = async (teamId) => {
    if (!isAuthorized) return;

    if (!confirm('Are you sure you want to mark this tag team as inactive?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tag_teams')
        .update({ active: false })
        .eq('id', teamId);

      if (error) throw error;

      // Also remove tag team info from all members
      const team = tagTeams.find(t => t.id === teamId);
      if (team && team.members) {
        for (const member of team.members) {
          await supabase
            .from('wrestlers')
            .update({
              tag_team_id: null,
              tag_team_name: null,
              tag_team_partner_slug: null,
            })
            .eq('id', member.id);
        }
      }

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error marking tag team as inactive:', err);
      alert('Failed to mark tag team as inactive');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (teamId, wrestlerSlug) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      // Check if member already exists
      const { data: existing } = await supabase
        .from('tag_team_members')
        .select('*')
        .eq('tag_team_id', teamId)
        .eq('wrestler_slug', wrestlerSlug)
        .single();

      if (existing) {
        // Reactivate if exists
        await supabase
          .from('tag_team_members')
          .update({ active: true })
          .eq('tag_team_id', teamId)
          .eq('wrestler_slug', wrestlerSlug);
      } else {
        // Get current max member_order
        const { data: members } = await supabase
          .from('tag_team_members')
          .select('member_order')
          .eq('tag_team_id', teamId)
          .order('member_order', { ascending: false })
          .limit(1);

        const nextOrder = members && members.length > 0 ? (members[0].member_order || 0) + 1 : 0;

        // Add new member
        await supabase
          .from('tag_team_members')
          .insert({
            tag_team_id: teamId,
            wrestler_slug: wrestlerSlug,
            member_order: nextOrder,
            active: true,
          });
      }

      // Update wrestler's tag team info
      const team = tagTeams.find(t => t.id === teamId);
      if (team) {
        // Get partner (first other member)
        const otherMembers = team.members.filter(m => m.id !== wrestlerSlug);
        const partner = otherMembers.length > 0 ? otherMembers[0] : null;

        await supabase
          .from('wrestlers')
          .update({
            tag_team_id: teamId,
            tag_team_name: team.name,
            tag_team_partner_slug: partner ? partner.id : null,
          })
          .eq('id', wrestlerSlug);
      }

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error adding member to tag team:', err);
      alert('Failed to add member to tag team');
    } finally {
      setLoading(false);
    }
  };

  if (loading && tagTeams.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#C6A04F', padding: 40 }}>
        Loading tag teams...
      </div>
    );
  }

  const activeTeams = tagTeams.filter(t => t.active !== false);
  const wrestlersInTeams = new Set();
  tagTeams.forEach(team => {
    team.members.forEach(m => wrestlersInTeams.add(m.id));
  });
  const availableWrestlers = wrestlers.filter(w => !wrestlersInTeams.has(w.id));

  return (
    <div>
      {activeTeams.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          No active tag teams found. Tag teams can be created and managed through the database.
        </div>
      )}

      {/* Tag Teams */}
      {activeTeams.map(team => (
        <div
          key={team.id}
          style={{
            background: '#181818',
            borderRadius: 14,
            boxShadow: '0 0 16px #C6A04F22',
            marginBottom: 36,
            padding: '24px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ color: '#C6A04F', fontWeight: 800, fontSize: 26, margin: 0, letterSpacing: 1 }}>
                  {team.name}
                </h3>
                {team.is_stable && (
                  <span
                    style={{
                      background: '#C6A04F',
                      color: '#232323',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                    title="Also a Stable"
                  >
                    Stable
                  </span>
                )}
              </div>
              {team.brand && (
                <div style={{ color: '#999', fontSize: 14, marginTop: 4 }}>
                  {team.brand}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#999', fontSize: 14 }}>
                {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
              </span>
              {isAuthorized && (
                <>
                  <button
                    onClick={() => handleEditTeam(team)}
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
                  {team.is_stable ? (
                    <button
                      onClick={() => handleUnmarkAsStable(team.id)}
                      disabled={loading}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 6,
                        background: '#666',
                        color: '#fff',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      Unmark Stable
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkAsStable(team.id, team.name)}
                      disabled={loading}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 6,
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      Mark as Stable
                    </button>
                  )}
                  <button
                    onClick={() => handleMarkInactive(team.id)}
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
                    Mark Inactive
                  </button>
                </>
              )}
            </div>
          </div>

          {team.description && (
            <div style={{ color: '#ccc', fontSize: 14, marginBottom: 18, fontStyle: 'italic' }}>
              {team.description}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {team.members.map(w => (
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
                    border: '2px solid #333',
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
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', wordBreak: 'break-word' }}>
                  {w.name}
                </div>
                {isAuthorized && (
                  <button
                    onClick={() => handleRemoveMember(team.id, w.id)}
                    disabled={loading}
                    style={{
                      marginTop: 8,
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
                )}
              </div>
            ))}

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
                onClick={() => setEditingTeam(team)}
              >
                <div style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
                  + Add Member
                </div>
              </div>
            )}
          </div>

          {/* Add Member Modal */}
          {editingTeam && editingTeam.id === team.id && (
            <AddMemberModal
              team={team}
              availableWrestlers={availableWrestlers}
              onAdd={(wrestlerSlug) => {
                handleAddMember(team.id, wrestlerSlug);
                setEditingTeam(null);
              }}
              onClose={() => setEditingTeam(null)}
            />
          )}
        </div>
      ))}

      {/* Edit Team Modal */}
      {editingTeamDetails && (
        <EditTeamModal
          team={editingTeamDetails}
          onSave={handleSaveTeamEdit}
          onClose={() => setEditingTeamDetails(null)}
          onChange={(field, value) => {
            setEditingTeamDetails(prev => ({ ...prev, [field]: value }));
          }}
        />
      )}

    </div>
  );
}

// Simple modal for adding members
function AddMemberModal({ team, availableWrestlers, onAdd, onClose }) {
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
          Add Member to {team.name}
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

// Modal for editing tag team details
function EditTeamModal({ team, onSave, onClose, onChange }) {
  const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned'];

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
          Edit Tag Team
        </h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Team Name: *
          </label>
          <input
            type="text"
            value={team.name}
            onChange={(e) => onChange('name', e.target.value)}
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
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Brand:
          </label>
          <select
            value={team.brand || ''}
            onChange={(e) => onChange('brand', e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              background: '#232323',
              color: '#fff',
              border: '1px solid #444',
              fontSize: 15,
            }}
          >
            <option value="">No Brand</option>
            {BRAND_OPTIONS.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Description:
          </label>
          <textarea
            value={team.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              background: '#232323',
              color: '#fff',
              border: '1px solid #444',
              fontSize: 15,
              resize: 'vertical',
            }}
          />
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

