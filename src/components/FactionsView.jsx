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
      // Make sure we include gender information
      wrestlers.forEach(w => {
        const stable = w.stable || w.affiliation;
        if (stable && stable.trim()) {
          if (!grouped[stable]) {
            grouped[stable] = [];
          }
          // Ensure gender is included (default to 'male' if not set)
          grouped[stable].push({
            ...w,
            gender: w.gender || 'male'
          });
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

  const [availableTagTeams, setAvailableTagTeams] = useState([]);

  // Fetch tag teams that could be primary for stables
  useEffect(() => {
    async function fetchTagTeams() {
      try {
        const { data: teams, error } = await supabase
          .from('tag_teams')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) {
          console.error('Error fetching tag teams:', error);
          return;
        }

        setAvailableTagTeams(teams || []);
      } catch (err) {
        console.error('Error fetching tag teams:', err);
      }
    }

    fetchTagTeams();
  }, []);

  const handleEditStable = async (stableName) => {
    // Find the current primary tag teams for this stable (could be men's and/or women's)
    const currentPrimaryTeams = availableTagTeams.filter(t => t.primary_for_stable === stableName);
    
    let primaryMenMember1 = null;
    let primaryMenMember2 = null;
    let primaryWomenMember1 = null;
    let primaryWomenMember2 = null;
    
    // Fetch members for each primary team and determine if they're men's or women's
    for (const team of currentPrimaryTeams) {
      const { data: members } = await supabase
        .from('tag_team_members')
        .select('wrestler_slug, member_order')
        .eq('tag_team_id', team.id)
        .eq('active', true)
        .order('member_order');
      
      if (members && members.length >= 2) {
        // Get wrestler details to check gender
        const member1 = wrestlers.find(w => w.id === members[0].wrestler_slug);
        const member2 = wrestlers.find(w => w.id === members[1].wrestler_slug);
        
        if (member1 && member2) {
          const isWomensTeam = (member1.gender === 'female' || member2.gender === 'female');
          
          if (isWomensTeam) {
            primaryWomenMember1 = members[0].wrestler_slug;
            primaryWomenMember2 = members[1].wrestler_slug;
          } else {
            primaryMenMember1 = members[0].wrestler_slug;
            primaryMenMember2 = members[1].wrestler_slug;
          }
        }
      }
    }
    
    setEditingStableName({
      oldName: stableName,
      newName: stableName,
      primaryMenMember1: primaryMenMember1,
      primaryMenMember2: primaryMenMember2,
      primaryWomenMember1: primaryWomenMember1,
      primaryWomenMember2: primaryWomenMember2,
      stableMembers: factions[stableName] || [],
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

      // If name changed, update all wrestlers with the old stable name to have the new stable name
      if (oldName !== newName) {
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
      }

      // Handle primary tag team selection
      // First, clear primary_for_stable from all tag teams that were set for this stable (or old name)
      const namesToClear = oldName !== newName ? [oldName, newName] : [newName];
      for (const name of namesToClear) {
        const currentPrimaryTeams = availableTagTeams.filter(t => t.primary_for_stable === name);
        for (const team of currentPrimaryTeams) {
          await supabase
            .from('tag_teams')
            .update({ primary_for_stable: null })
            .eq('id', team.id);
        }
      }

      // Helper function to create or update a primary tag team
      const createOrUpdatePrimaryTeam = async (member1Id, member2Id, teamType) => {
        if (!member1Id || !member2Id) return;
        
        const member1 = factions[newName]?.find(w => w.id === member1Id);
        const member2 = factions[newName]?.find(w => w.id === member2Id);
        
        if (!member1 || !member2) return;
        
        // Check if a tag team already exists with these two members
        const { data: existingTeams } = await supabase
          .from('tag_teams')
          .select('id, name');
        
        let tagTeamId = null;
        
        // Check each existing team to see if it has these two members
        if (existingTeams) {
          for (const team of existingTeams) {
            const { data: members } = await supabase
              .from('tag_team_members')
              .select('wrestler_slug')
              .eq('tag_team_id', team.id)
              .eq('active', true);
            
            if (members && members.length === 2) {
              const memberIds = members.map(m => m.wrestler_slug);
              if (memberIds.includes(member1Id) && memberIds.includes(member2Id)) {
                tagTeamId = team.id;
                break;
              }
            }
          }
        }
        
        // If no existing team found, create a new one
        if (!tagTeamId) {
          // Create a tag team name from the stable name
          const teamName = `${newName}`;
          // Create a unique ID using stable name, member IDs, and team type
          const teamId = `${newName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${teamType}-${member1Id}-${member2Id}`.substring(0, 50);
          
          // Check if this ID already exists
          const { data: existingTeam } = await supabase
            .from('tag_teams')
            .select('id')
            .eq('id', teamId)
            .single();
          
          if (existingTeam) {
            tagTeamId = existingTeam.id;
          } else {
            // Create the tag team
            const { data: newTeam, error: createError } = await supabase
              .from('tag_teams')
              .insert({
                id: teamId,
                name: teamName,
                is_stable: false,
                active: true,
                primary_for_stable: newName,
              })
              .select()
              .single();
            
            if (createError) {
              console.error(`Error creating primary ${teamType} tag team:`, createError);
              return;
            } else {
              tagTeamId = newTeam.id;
              
              // Add the two members to the tag team
              const { error: membersError } = await supabase
                .from('tag_team_members')
                .insert([
                  { tag_team_id: tagTeamId, wrestler_slug: member1Id, member_order: 0, active: true },
                  { tag_team_id: tagTeamId, wrestler_slug: member2Id, member_order: 1, active: true },
                ]);
              
              if (membersError) {
                console.error(`Error adding members to ${teamType} tag team:`, membersError);
              }
              
              // Update wrestlers' tag team fields (only if they don't already have a tag team)
              await supabase
                .from('wrestlers')
                .update({ 
                  tag_team_name: teamName,
                  tag_team_partner_slug: member2Id,
                })
                .eq('id', member1Id)
                .is('tag_team_name', null);
              
              await supabase
                .from('wrestlers')
                .update({ 
                  tag_team_name: teamName,
                  tag_team_partner_slug: member1Id,
                })
                .eq('id', member2Id)
                .is('tag_team_name', null);
            }
          }
        }
        
        // Update the tag team to be primary (whether it was existing or newly created)
        if (tagTeamId) {
          const { error: updateError } = await supabase
            .from('tag_teams')
            .update({ primary_for_stable: newName })
            .eq('id', tagTeamId);
          
          if (updateError) {
            console.error(`Error updating primary ${teamType} tag team:`, updateError);
          }
        }
      };

      // Create or update men's primary tag team
      await createOrUpdatePrimaryTeam(
        editingStableName.primaryMenMember1,
        editingStableName.primaryMenMember2,
        'mens'
      );

      // Create or update women's primary tag team
      await createOrUpdatePrimaryTeam(
        editingStableName.primaryWomenMember1,
        editingStableName.primaryWomenMember2,
        'womens'
      );

      setEditingStableName(null);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    } catch (err) {
      console.error('Error updating stable:', err);
      alert('Failed to update stable');
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
          onChange={(field, value) => {
            setEditingStableName(prev => ({ ...prev, [field]: value }));
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
  const stableMembers = stableName.stableMembers || [];
  
  // Separate members by gender
  // Default to 'male' if gender is not set
  const maleMembers = stableMembers.filter(m => {
    const gender = (m.gender || 'male').toLowerCase();
    return gender === 'male';
  });
  const femaleMembers = stableMembers.filter(m => {
    const gender = (m.gender || '').toLowerCase();
    return gender === 'female';
  });
  
  // Debug: Log member counts
  console.log('EditStableModal - Total members:', stableMembers.length);
  console.log('EditStableModal - Male members:', maleMembers.length);
  console.log('EditStableModal - Female members:', femaleMembers.length);
  console.log('EditStableModal - Members with genders:', stableMembers.map(m => ({ name: m.name, gender: m.gender })));
  
  // If no gender separation, show all members in a single section
  const hasGenderData = stableMembers.some(m => m.gender !== undefined && m.gender !== null);
  
  const handleMenMemberSelect = (memberId) => {
    if (!stableName.primaryMenMember1) {
      onChange('primaryMenMember1', memberId);
    } else if (!stableName.primaryMenMember2) {
      if (memberId !== stableName.primaryMenMember1) {
        onChange('primaryMenMember2', memberId);
      }
    } else {
      if (memberId === stableName.primaryMenMember1) {
        onChange('primaryMenMember1', null);
      } else if (memberId === stableName.primaryMenMember2) {
        onChange('primaryMenMember2', null);
      } else {
        onChange('primaryMenMember1', memberId);
      }
    }
  };

  const handleWomenMemberSelect = (memberId) => {
    if (!stableName.primaryWomenMember1) {
      onChange('primaryWomenMember1', memberId);
    } else if (!stableName.primaryWomenMember2) {
      if (memberId !== stableName.primaryWomenMember1) {
        onChange('primaryWomenMember2', memberId);
      }
    } else {
      if (memberId === stableName.primaryWomenMember1) {
        onChange('primaryWomenMember1', null);
      } else if (memberId === stableName.primaryWomenMember2) {
        onChange('primaryWomenMember2', null);
      } else {
        onChange('primaryWomenMember1', memberId);
      }
    }
  };

  const clearMenTagTeam = () => {
    onChange('primaryMenMember1', null);
    onChange('primaryMenMember2', null);
  };

  const clearWomenTagTeam = () => {
    onChange('primaryWomenMember1', null);
    onChange('primaryWomenMember2', null);
  };

  const renderMemberSelection = (members, teamType, selectedMember1, selectedMember2, onSelect, onClear) => {
    if (members.length < 2) {
      return (
        <div style={{ color: '#999', fontSize: 14, padding: 16, background: '#232323', borderRadius: 8 }}>
          Need at least 2 {teamType === 'men' ? 'male' : 'female'} members in the stable to create a primary {teamType} tag team.
        </div>
      );
    }

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: '#999', fontSize: 12 }}>
            Select two {teamType === 'men' ? 'male' : 'female'} members from the stable to form the primary {teamType} tag team.
          </div>
          {(selectedMember1 || selectedMember2) && (
            <button
              onClick={onClear}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                background: '#666',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Clear Selection
            </button>
          )}
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: 12,
          marginBottom: 12,
        }}>
          {members.map(member => {
            const isSelected1 = selectedMember1 === member.id;
            const isSelected2 = selectedMember2 === member.id;
            const isSelected = isSelected1 || isSelected2;
            const isDisabled = !isSelected && selectedMember1 && selectedMember2;
            
            return (
              <div
                key={member.id}
                onClick={() => !isDisabled && onSelect(member.id)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: isSelected ? '#C6A04F' : '#232323',
                  border: isSelected ? '2px solid #C6A04F' : '2px solid #444',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = isSelected ? '#D4B05F' : '#2a2a2a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = isSelected ? '#C6A04F' : '#232323';
                  }
                }}
              >
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: 13, 
                  color: isSelected ? '#232323' : '#fff',
                  wordBreak: 'break-word',
                }}>
                  {member.name}
                </div>
                {isSelected1 && (
                  <div style={{ fontSize: 10, color: '#232323', marginTop: 4, fontWeight: 600 }}>
                    Member 1
                  </div>
                )}
                {isSelected2 && (
                  <div style={{ fontSize: 10, color: '#232323', marginTop: 4, fontWeight: 600 }}>
                    Member 2
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {selectedMember1 && selectedMember2 && (
          <div style={{ 
            padding: 12, 
            background: '#4CAF50', 
            borderRadius: 8, 
            color: '#fff', 
            fontSize: 13,
            textAlign: 'center',
            fontWeight: 600,
            marginBottom: 20,
          }}>
            ✓ Primary {teamType} tag team selected
          </div>
        )}
      </>
    );
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
          Edit Stable
        </h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Stable Name: *
          </label>
          <input
            type="text"
            value={stableName.newName}
            onChange={(e) => onChange('newName', e.target.value)}
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

        {/* Primary Tag Teams */}
        {stableMembers.length > 0 && (
          <>
            {/* Primary Men's Tag Team */}
            {maleMembers.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: '#fff', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
                  Primary Men's Tag Team:
                </label>
                {renderMemberSelection(
                  maleMembers,
                  'men',
                  stableName.primaryMenMember1,
                  stableName.primaryMenMember2,
                  handleMenMemberSelect,
                  clearMenTagTeam
                )}
              </div>
            )}

            {/* Primary Women's Tag Team */}
            {femaleMembers.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#fff', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
                  Primary Women's Tag Team:
                </label>
                {renderMemberSelection(
                  femaleMembers,
                  'womens',
                  stableName.primaryWomenMember1,
                  stableName.primaryWomenMember2,
                  handleWomenMemberSelect,
                  clearWomenTagTeam
                )}
              </div>
            )}

            {/* Fallback: If no gender data, show all members in a single section */}
            {maleMembers.length === 0 && femaleMembers.length === 0 && stableMembers.length >= 2 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#fff', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
                  Primary Tag Team:
                </label>
                {renderMemberSelection(
                  stableMembers,
                  'team',
                  stableName.primaryMenMember1,
                  stableName.primaryMenMember2,
                  handleMenMemberSelect,
                  clearMenTagTeam
                )}
              </div>
            )}
          </>
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

