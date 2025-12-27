import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TagTeamsView({ wrestlers = [], isAuthorized = false, onWrestlerUpdate }) {
  const [tagTeams, setTagTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingTeamDetails, setEditingTeamDetails] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStables, setAvailableStables] = useState([]);

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

  // Fetch available stables for primary selection
  useEffect(() => {
    async function fetchStables() {
      try {
        // Get unique stable names from wrestlers
        const { data: wrestlersData, error } = await supabase
          .from('wrestlers')
          .select('stable')
          .not('stable', 'is', null);

        if (error) {
          console.error('Error fetching stables:', error);
          return;
        }

        // Get unique stable names
        const stableSet = new Set();
        wrestlersData.forEach(w => {
          if (w.stable && w.stable.trim()) {
            stableSet.add(w.stable.trim());
          }
        });

        // Also get stables from tag teams marked as stables
        const { data: stableTagTeams } = await supabase
          .from('tag_teams')
          .select('name')
          .eq('is_stable', true)
          .eq('active', true);

        if (stableTagTeams) {
          stableTagTeams.forEach(team => {
            stableSet.add(team.name);
          });
        }

        setAvailableStables(Array.from(stableSet).sort());
      } catch (err) {
        console.error('Error fetching stables:', err);
      }
    }

    fetchStables();
  }, []);

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
      is_stable: team.is_stable || false,
      primary_for_stable: team.primary_for_stable || '',
    });
  };

  const handleSaveTeamEdit = async () => {
    if (!isAuthorized || !editingTeamDetails) return;

    setLoading(true);
    try {
      // Update tag team
      const updateData = {
        name: editingTeamDetails.name.trim(),
        brand: editingTeamDetails.brand && editingTeamDetails.brand.trim() ? editingTeamDetails.brand.trim() : null,
        description: editingTeamDetails.description && editingTeamDetails.description.trim() ? editingTeamDetails.description.trim() : null,
      };

      // Only set primary_for_stable if is_stable is true
      if (editingTeamDetails.is_stable) {
        updateData.primary_for_stable = editingTeamDetails.primary_for_stable && editingTeamDetails.primary_for_stable.trim() ? editingTeamDetails.primary_for_stable.trim() : null;
      } else {
        updateData.primary_for_stable = null; // Clear if not a stable
      }

      const { error: teamError } = await supabase
        .from('tag_teams')
        .update(updateData)
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

  const handleSetPrimaryForStable = async (teamId, teamName) => {
    if (!isAuthorized) return;

    // Get the stable name (should be the same as team name if is_stable is true)
    const team = tagTeams.find(t => t.id === teamId);
    if (!team || !team.is_stable) {
      alert('This tag team must be marked as a stable first before it can be set as primary.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tag_teams')
        .update({ primary_for_stable: teamName })
        .eq('id', teamId);

      if (error) throw error;

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error setting primary tag team:', err);
      alert('Failed to set primary tag team');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsetPrimaryForStable = async (teamId) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tag_teams')
        .update({ primary_for_stable: null })
        .eq('id', teamId);

      if (error) throw error;

      // Refresh the page
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error unsetting primary tag team:', err);
      alert('Failed to unset primary tag team');
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

  // Filter out inactive teams and teams with no members
  const activeTeams = tagTeams.filter(t => t.active !== false && t.members && t.members.length > 0);
  
  // Remove duplicate team names - keep the one with the most members, or the first one if equal
  const seenNames = new Map();
  const deduplicatedTeams = activeTeams.filter(team => {
    const nameKey = team.name.toLowerCase().trim();
    if (!seenNames.has(nameKey)) {
      seenNames.set(nameKey, team);
      return true;
    } else {
      const existing = seenNames.get(nameKey);
      // Keep the one with more members, or the existing one if equal
      if (team.members.length > existing.members.length) {
        seenNames.set(nameKey, team);
        return true;
      }
      return false;
    }
  });
  
  // Separate primary and non-primary teams
  // Also filter out teams that are marked as stables (they should only appear in primary section)
  const primaryTeams = deduplicatedTeams.filter(t => t.primary_for_stable);
  const nonPrimaryTeams = deduplicatedTeams.filter(t => !t.primary_for_stable && !t.is_stable);
  
  // Group primary teams by stable
  const primaryByStable = {};
  primaryTeams.forEach(team => {
    const stableName = team.primary_for_stable;
    if (!primaryByStable[stableName]) {
      primaryByStable[stableName] = [];
    }
    primaryByStable[stableName].push(team);
  });
  
  const wrestlersInTeams = new Set();
  deduplicatedTeams.forEach(team => {
    team.members.forEach(m => wrestlersInTeams.add(m.id));
  });
  const availableWrestlers = wrestlers.filter(w => !wrestlersInTeams.has(w.id));

  const handleCreateTagTeam = async (teamData) => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      // Ensure we have a team name (should be generated if not provided)
      const teamName = teamData.name || teamData.members.map(id => {
        const wrestler = wrestlers.find(w => w.id === id);
        return wrestler ? wrestler.name : id;
      }).join(' & ');

      // Generate a unique ID from the team name
      const teamId = teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .substring(0, 50);

      // Check if team ID already exists
      const { data: existing } = await supabase
        .from('tag_teams')
        .select('id')
        .eq('id', teamId)
        .single();

      if (existing) {
        alert('A tag team with this name already exists. Please choose a different name.');
        setLoading(false);
        return;
      }

      // Create the tag team
      const { data: newTeam, error: createError } = await supabase
        .from('tag_teams')
        .insert({
          id: teamId,
          name: teamName,
          brand: teamData.brand && teamData.brand.trim() ? teamData.brand.trim() : null,
          description: teamData.description && teamData.description.trim() ? teamData.description.trim() : null,
          is_stable: teamData.is_stable || false,
          primary_for_stable: teamData.primary_for_stable && teamData.primary_for_stable.trim() ? teamData.primary_for_stable.trim() : null,
          active: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add members to the tag team
      if (teamData.members && teamData.members.length >= 2) {
        const memberInserts = teamData.members.map((memberId, index) => ({
          tag_team_id: newTeam.id,
          wrestler_slug: memberId,
          member_order: index,
          active: true,
        }));

        const { error: membersError } = await supabase
          .from('tag_team_members')
          .insert(memberInserts);

        if (membersError) throw membersError;

        // Update wrestlers' tag team fields
        for (let i = 0; i < teamData.members.length; i++) {
          const memberId = teamData.members[i];
          const partnerId = teamData.members[i === 0 ? 1 : 0]; // First member's partner is second, etc.

          await supabase
            .from('wrestlers')
            .update({
              tag_team_id: newTeam.id,
              tag_team_name: teamName,
              tag_team_partner_slug: partnerId,
            })
            .eq('id', memberId);
        }
      }

      setShowAddModal(false);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error creating tag team:', err);
      alert('Failed to create tag team: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isAuthorized && (
        <div style={{ marginBottom: 24, textAlign: 'right' }}>
          <button
            onClick={() => setShowAddModal(true)}
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
            + Add Tag Team
          </button>
        </div>
      )}

      {activeTeams.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          No active tag teams found. {isAuthorized ? 'Click "Add Tag Team" to create one.' : 'Tag teams can be created and managed through the database.'}
        </div>
      )}

      {/* Primary Tag Teams (grouped by stable) */}
      {Object.keys(primaryByStable).length > 0 && (
        <>
          {Object.keys(primaryByStable).sort().map(stableName => (
            <div key={stableName} style={{ marginBottom: 48 }}>
              <h3 style={{ 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: 20, 
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '2px solid #333'
              }}>
                {stableName}
              </h3>
              {primaryByStable[stableName].map(team => (
                <div
                  key={team.id}
                  style={{
                    background: '#181818',
                    borderRadius: 14,
                    boxShadow: '0 0 16px #C6A04F22',
                    marginBottom: 24,
                    padding: '24px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                                {team.is_stable && (
                                  <>
                                    {team.primary_for_stable ? (
                                      <button
                                        onClick={() => handleUnsetPrimaryForStable(team.id)}
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
                                        Unset Primary
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSetPrimaryForStable(team.id, team.name)}
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
                                        Set Primary
                                      </button>
                                    )}
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
                                  </>
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
            </div>
          ))}
        </>
      )}

      {/* Other Tag Teams */}
      {nonPrimaryTeams.length > 0 && (
        <>
          {Object.keys(primaryByStable).length > 0 && (
            <h2 style={{ 
              color: '#C6A04F', 
              fontWeight: 800, 
              fontSize: 32, 
              marginBottom: 24, 
              marginTop: 48,
              letterSpacing: 1 
            }}>
              Other Tag Teams
            </h2>
          )}
          {nonPrimaryTeams.map(team => (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                    <>
                      {team.primary_for_stable ? (
                        <button
                          onClick={() => handleUnsetPrimaryForStable(team.id)}
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
                          Unset Primary
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetPrimaryForStable(team.id, team.name)}
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
                          Set Primary
                        </button>
                      )}
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
                    </>
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
        </>
      )}

      {/* Edit Team Modal */}
      {editingTeamDetails && (
        <EditTeamModal
          team={editingTeamDetails}
          availableStables={availableStables}
          onSave={handleSaveTeamEdit}
          onClose={() => setEditingTeamDetails(null)}
          onChange={(field, value) => {
            setEditingTeamDetails(prev => ({ ...prev, [field]: value }));
          }}
        />
      )}

      {/* Add Tag Team Modal */}
      {showAddModal && (
        <AddTagTeamModal
          wrestlers={wrestlers}
          availableStables={availableStables}
          onSave={handleCreateTagTeam}
          onClose={() => setShowAddModal(false)}
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
function EditTeamModal({ team, availableStables = [], onSave, onClose, onChange }) {
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

        {team.is_stable && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Primary for Stable:
            </label>
            <select
              value={team.primary_for_stable || ''}
              onChange={(e) => onChange('primary_for_stable', e.target.value)}
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
              <option value="">Not a primary tag team</option>
              {availableStables.map(stable => (
                <option key={stable} value={stable}>{stable}</option>
              ))}
            </select>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Select the stable this tag team represents as primary. Leave blank if not primary.
            </div>
          </div>
        )}

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

// Modal for adding a new tag team
function AddTagTeamModal({ wrestlers = [], availableStables = [], onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    is_stable: false,
    primary_for_stable: '',
    members: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedWrestlers, setSelectedWrestlers] = useState([]);

  const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned'];

  // Filter wrestlers not already selected
  const availableWrestlers = wrestlers.filter(w => 
    !selectedWrestlers.find(sw => sw.id === w.id) &&
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = (wrestler) => {
    if (selectedWrestlers.length < 10 && !selectedWrestlers.find(sw => sw.id === wrestler.id)) {
      setSelectedWrestlers([...selectedWrestlers, wrestler]);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  const handleRemoveMember = (wrestlerId) => {
    setSelectedWrestlers(selectedWrestlers.filter(sw => sw.id !== wrestlerId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedWrestlers.length < 2) {
      alert('Please select at least 2 members for the tag team');
      return;
    }

    // If no name provided, generate from member names
    let teamName = formData.name.trim();
    if (!teamName && selectedWrestlers.length >= 2) {
      teamName = selectedWrestlers.map(sw => sw.name).join(' & ');
    }

    if (!teamName) {
      alert('Please provide a team name or select at least 2 members');
      return;
    }

    onSave({
      name: teamName,
      brand: formData.brand || null,
      description: formData.description || null,
      is_stable: formData.is_stable,
      primary_for_stable: formData.primary_for_stable || null,
      members: selectedWrestlers.map(sw => sw.id),
    });
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
          maxWidth: 600,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 0 24px #C6A04F22',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#C6A04F', marginBottom: 24 }}>
          Add New Tag Team
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Team Name:
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Leave blank to auto-generate from member names"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                background: '#232323',
                color: '#fff',
                border: '1px solid #444',
                fontSize: 15,
              }}
            />
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              {selectedWrestlers.length >= 2 
                ? `Will be "${selectedWrestlers.map(sw => sw.name).join(' & ')}" if left blank`
                : 'Select at least 2 members to auto-generate name'}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Brand:
            </label>
            <select
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
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
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.is_stable}
                onChange={(e) => setFormData(prev => ({ ...prev, is_stable: e.target.checked, primary_for_stable: e.target.checked ? prev.primary_for_stable : '' }))}
                style={{ width: 18, height: 18 }}
              />
              Mark as Stable
            </label>
          </div>

          {formData.is_stable && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Primary for Stable:
              </label>
              <select
                value={formData.primary_for_stable}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_for_stable: e.target.value }))}
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
                <option value="">Not a primary tag team</option>
                {availableStables.map(stable => (
                  <option key={stable} value={stable}>{stable}</option>
                ))}
              </select>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                Select the stable this tag team represents as primary. Leave blank if not primary.
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Members: * (Select at least 2)
            </label>
            
            {/* Selected Members */}
            {selectedWrestlers.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 8, 
                marginBottom: 12,
                padding: 12,
                background: '#232323',
                borderRadius: 8,
              }}>
                {selectedWrestlers.map(w => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      background: '#C6A04F',
                      borderRadius: 6,
                      color: '#232323',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {w.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(w.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#232323',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 700,
                        padding: 0,
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search wrestlers to add..."
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

            {/* Dropdown */}
            {showDropdown && availableWrestlers.length > 0 && (
              <div style={{
                maxHeight: 300,
                overflow: 'auto',
                border: '1px solid #444',
                borderRadius: 8,
                background: '#232323',
                marginBottom: 12,
              }}>
                {availableWrestlers.slice(0, 50).map(w => (
                  <div
                    key={w.id}
                    onClick={() => handleAddMember(w)}
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

            <div style={{ color: '#999', fontSize: 12 }}>
              {selectedWrestlers.length} member{selectedWrestlers.length !== 1 ? 's' : ''} selected (minimum 2 required)
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
              disabled={selectedWrestlers.length < 2}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: selectedWrestlers.length >= 2 ? '#C6A04F' : '#666',
                color: selectedWrestlers.length >= 2 ? '#232323' : '#999',
                border: 'none',
                cursor: selectedWrestlers.length >= 2 ? 'pointer' : 'not-allowed',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Create Tag Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

