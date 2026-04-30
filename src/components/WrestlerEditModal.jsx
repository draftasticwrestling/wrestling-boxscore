import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, uploadWrestlerImage, uploadWrestlerFullBodyImage } from '../supabaseClient';
import CountrySelect from './CountrySelect';

const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned', 'N/A'];
const CLASSIFICATION_OPTIONS = ['Active', 'Part-timer', 'Celebrity Guests', 'Alumni', 'Non-wrestlers', 'Inactive'];
const PERSON_TYPE_OPTIONS = ['Wrestler', 'Head of Creative', 'GM', 'Manager', 'Announcer'];
const STATUS_OPTIONS = ['', 'Injured', 'On Hiatus', 'Inactive', 'Non-wrestler'];
const GENDER_TOGGLE_OPTIONS = ['male', 'female', 'other'];

export default function WrestlerEditModal({ wrestler, onClose, onSave, allWrestlers = [] }) {
  const [formData, setFormData] = useState({
    slug: '',
    dob: '',
    nationality: '',
    brand: '',
    classification: '',
    status: '',
    tag_team_name: '',
    tag_team_partner_slug: '',
    stable: '',
    accomplishments: '',
    billed_from: '',
    height: '',
    weight: '',
    nickname: '',
    person_type: 'Wrestler',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const partnerDropdownRef = useRef(null);
  const [tagTeamNameSearchTerm, setTagTeamNameSearchTerm] = useState('');
  const [showTagTeamNameDropdown, setShowTagTeamNameDropdown] = useState(false);
  const tagTeamNameDropdownRef = useRef(null);
  const [stableSearchTerm, setStableSearchTerm] = useState('');
  const [showStableDropdown, setShowStableDropdown] = useState(false);
  const stableDropdownRef = useRef(null);
  const [existingTagTeamNames, setExistingTagTeamNames] = useState([]);
  const [existingStableNames, setExistingStableNames] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [fullBodyImageFile, setFullBodyImageFile] = useState(null);
  const [fullBodyImagePreview, setFullBodyImagePreview] = useState(null);
  const [fullBodyImageRemoved, setFullBodyImageRemoved] = useState(false);
  const initialFormDataRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target)) {
        setShowPartnerDropdown(false);
      }
      if (tagTeamNameDropdownRef.current && !tagTeamNameDropdownRef.current.contains(event.target)) {
        setShowTagTeamNameDropdown(false);
      }
      if (stableDropdownRef.current && !stableDropdownRef.current.contains(event.target)) {
        setShowStableDropdown(false);
      }
    }
    if (showPartnerDropdown || showTagTeamNameDropdown || showStableDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPartnerDropdown, showTagTeamNameDropdown, showStableDropdown]);

  useEffect(() => {
    let isMounted = true;
    async function loadAutocompleteOptions() {
      try {
        const [{ data: teams }, { data: stableTeams }] = await Promise.all([
          supabase.from('tag_teams').select('name').eq('active', true),
          supabase.from('tag_teams').select('name').eq('active', true).eq('is_stable', true),
        ]);

        const tagTeamSet = new Set((teams || []).map((t) => (t.name || '').trim()).filter(Boolean));
        allWrestlers.forEach((w) => {
          const team = (w.tag_team_name || '').trim();
          if (team) tagTeamSet.add(team);
        });

        const stableSet = new Set((stableTeams || []).map((t) => (t.name || '').trim()).filter(Boolean));
        allWrestlers.forEach((w) => {
          const stable = (w.stable || w.affiliation || '').trim();
          if (stable) stableSet.add(stable);
        });

        if (!isMounted) return;
        setExistingTagTeamNames(Array.from(tagTeamSet).sort((a, b) => a.localeCompare(b)));
        setExistingStableNames(Array.from(stableSet).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.error('Failed loading team/stable autocomplete options:', err);
      }
    }
    loadAutocompleteOptions();
    return () => {
      isMounted = false;
    };
  }, [allWrestlers]);

  const filteredTagTeamNames = useMemo(() => {
    const q = (tagTeamNameSearchTerm || '').trim().toLowerCase();
    if (!q) return existingTagTeamNames.slice(0, 10);
    return existingTagTeamNames.filter((name) => name.toLowerCase().includes(q)).slice(0, 10);
  }, [existingTagTeamNames, tagTeamNameSearchTerm]);

  const filteredStableNames = useMemo(() => {
    const q = (stableSearchTerm || '').trim().toLowerCase();
    if (!q) return existingStableNames.slice(0, 10);
    return existingStableNames.filter((name) => name.toLowerCase().includes(q)).slice(0, 10);
  }, [existingStableNames, stableSearchTerm]);

  useEffect(() => {
    if (wrestler) {
      const initial = {
        slug: wrestler.id || '',
        dob: wrestler.dob || '',
        nationality: wrestler.nationality || '',
        brand: wrestler.brand || 'Unassigned',
        classification: wrestler.classification || 'Active',
        status: wrestler.status || wrestler.Status || '',
        tag_team_name: wrestler.tag_team_name || '',
        tag_team_partner_slug: wrestler.tag_team_partner_slug || '',
        stable: wrestler.stable || wrestler.affiliation || '',
        accomplishments: wrestler.accomplishments || '',
        billed_from: wrestler.billed_from || '',
        height: wrestler.height || '',
        weight: wrestler.weight || '',
        nickname: wrestler.nickname || '',
        person_type: wrestler.person_type || 'Wrestler',
        gender: wrestler.gender || '',
      };
      setFormData(initial);
      initialFormDataRef.current = initial;
      setTagTeamNameSearchTerm(initial.tag_team_name || '');
      setStableSearchTerm(initial.stable || '');

      // Set partner search term to current partner's name if exists
      if (wrestler.tag_team_partner_slug) {
        const partner = allWrestlers.find(w => w.id === wrestler.tag_team_partner_slug);
        if (partner) {
          setPartnerSearchTerm(partner.name);
        }
      }
      
      // Set image preview if wrestler has an image
      if (wrestler.image_url) {
        setImagePreview(wrestler.image_url);
      } else {
        setImagePreview(null);
      }
      
      // Reset image file
      setImageFile(null);
      setImageRemoved(false);
      setFullBodyImageFile(null);
      setFullBodyImageRemoved(false);
      setFullBodyImagePreview(wrestler.full_body_image_url || null);
    }
  }, [wrestler, allWrestlers]);

  // Shared toggle button styling for the quick-edit controls
  const baseToggleStyle = {
    flex: '0 0 auto',
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid #444',
    background: '#232323',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease-out',
  };

  const getToggleStyle = (isActive, activeColor = '#C6A04F') => ({
    ...baseToggleStyle,
    background: isActive ? activeColor : '#232323',
    color: isActive ? '#232323' : '#fff',
    borderColor: isActive ? activeColor : '#444',
    boxShadow: isActive ? '0 0 0 1px #000 inset' : 'none',
    opacity: isActive ? 1 : 0.9,
  });
  const fieldLabelStyle = { display: 'block', color: '#fff', marginBottom: 6, fontWeight: 600, fontSize: 13 };
  const compactInputStyle = {
    width: '100%',
    padding: 8,
    borderRadius: 8,
    background: '#232323',
    color: '#fff',
    border: '1px solid #444',
    fontSize: 13,
  };
  const fieldHintStyle = { color: '#999', fontSize: 11, marginTop: 4 };

  const isDirty =
    initialFormDataRef.current != null &&
    (JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current) ||
      !!imageFile ||
      !!fullBodyImageFile ||
      imageRemoved ||
      fullBodyImageRemoved);

  const handleRequestClose = useCallback(() => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) return;
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleRequestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRequestClose]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If classification changes, update brand and status accordingly
      if (field === 'classification') {
        if (value === 'Alumni' || value === 'Celebrity Guests' || value === 'Non-wrestlers' || value === 'Inactive') {
          // Alumni, Celebrity Guests, Non-wrestlers, and Inactive shouldn't have brand or status
          updated.brand = '';
          updated.status = '';
        } else if (value === 'Active') {
          // Active wrestlers should have a brand, but status is optional
          // Keep existing brand if it's valid
          if (!BRAND_OPTIONS.includes(updated.brand)) {
            updated.brand = 'RAW'; // Default to RAW
          }
        }
      }
      
      // If brand changes for Active or Part-timer wrestlers, keep classification as-is
      
      return updated;
    });
  };

  async function getOrCreateTagTeam({ teamName, brand, stableName }) {
    const normalizedTeamName = (teamName || '').trim();
    if (!normalizedTeamName) return null;

    const cleanBrand =
      brand && brand.trim() && brand !== 'Unassigned' && brand !== 'N/A' ? brand.trim() : null;

    const { data: existingTeam, error: lookupError } = await supabase
      .from('tag_teams')
      .select('*')
      .eq('name', normalizedTeamName)
      .eq('active', true)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingTeam) return existingTeam;

    const baseId = normalizedTeamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 42) || `tag-team-${Date.now()}`;
    let teamId = baseId;
    for (let i = 2; i < 100; i += 1) {
      const { data: idCollision, error: idError } = await supabase
        .from('tag_teams')
        .select('id')
        .eq('id', teamId)
        .maybeSingle();
      if (idError) throw idError;
      if (!idCollision) break;
      teamId = `${baseId}-${i}`.slice(0, 50);
    }

    const { data: createdTeam, error: createError } = await supabase
      .from('tag_teams')
      .insert({
        id: teamId,
        name: normalizedTeamName,
        brand: cleanBrand,
        is_stable: !!stableName && stableName.trim().toLowerCase() === normalizedTeamName.toLowerCase(),
        active: true,
      })
      .select()
      .single();
    if (createError) throw createError;
    return createdTeam;
  }

  async function upsertTagTeamMember(tagTeamId, wrestlerSlug, memberOrder) {
    const { data: existingMember, error: memberLookupError } = await supabase
      .from('tag_team_members')
      .select('tag_team_id, wrestler_slug')
      .eq('tag_team_id', tagTeamId)
      .eq('wrestler_slug', wrestlerSlug)
      .maybeSingle();
    if (memberLookupError) throw memberLookupError;

    if (existingMember) {
      const { error: memberUpdateError } = await supabase
        .from('tag_team_members')
        .update({ member_order: memberOrder, active: true })
        .eq('tag_team_id', tagTeamId)
        .eq('wrestler_slug', wrestlerSlug);
      if (memberUpdateError) throw memberUpdateError;
      return;
    }

    const { error: memberInsertError } = await supabase
      .from('tag_team_members')
      .insert({
        tag_team_id: tagTeamId,
        wrestler_slug: wrestlerSlug,
        member_order: memberOrder,
        active: true,
      });
    if (memberInsertError) throw memberInsertError;
  }

  async function syncTagTeamDataForEditedWrestler({ oldSlug, wrestlerSlug, teamName, partnerSlug, brand, stableName }) {
    const normalizedTeamName = (teamName || '').trim();
    const normalizedPartnerSlug = (partnerSlug || '').trim();

    if (oldSlug && oldSlug !== wrestlerSlug) {
      const { error: slugMemberUpdateError } = await supabase
        .from('tag_team_members')
        .update({ wrestler_slug: wrestlerSlug })
        .eq('wrestler_slug', oldSlug);
      if (slugMemberUpdateError) throw slugMemberUpdateError;
    }

    if (!normalizedTeamName || !normalizedPartnerSlug || normalizedPartnerSlug === wrestlerSlug) {
      const { error: memberDeactivateError } = await supabase
        .from('tag_team_members')
        .update({ active: false })
        .eq('wrestler_slug', wrestlerSlug)
        .eq('active', true);
      if (memberDeactivateError) throw memberDeactivateError;

      const { error: clearWrestlerTeamError } = await supabase
        .from('wrestlers')
        .update({ tag_team_id: null, tag_team_name: null, tag_team_partner_slug: null })
        .eq('id', wrestlerSlug);
      if (clearWrestlerTeamError) throw clearWrestlerTeamError;
      return;
    }

    const { data: partner, error: partnerLookupError } = await supabase
      .from('wrestlers')
      .select('id')
      .eq('id', normalizedPartnerSlug)
      .maybeSingle();
    if (partnerLookupError) throw partnerLookupError;
    if (!partner) return;

    const tagTeam = await getOrCreateTagTeam({ teamName: normalizedTeamName, brand, stableName });
    if (!tagTeam) return;

    // Remove active membership from other teams before assigning the new one.
    const { error: deactivateOtherTeamsError } = await supabase
      .from('tag_team_members')
      .update({ active: false })
      .eq('wrestler_slug', wrestlerSlug)
      .neq('tag_team_id', tagTeam.id)
      .eq('active', true);
    if (deactivateOtherTeamsError) throw deactivateOtherTeamsError;

    await upsertTagTeamMember(tagTeam.id, wrestlerSlug, 0);
    await upsertTagTeamMember(tagTeam.id, normalizedPartnerSlug, 1);

    const { error: wrestlerSyncError } = await supabase
      .from('wrestlers')
      .update({
        tag_team_id: tagTeam.id,
        tag_team_name: tagTeam.name,
        tag_team_partner_slug: normalizedPartnerSlug,
      })
      .eq('id', wrestlerSlug);
    if (wrestlerSyncError) throw wrestlerSyncError;

    const { error: partnerSyncError } = await supabase
      .from('wrestlers')
      .update({
        tag_team_id: tagTeam.id,
        tag_team_name: tagTeam.name,
        tag_team_partner_slug: wrestlerSlug,
      })
      .eq('id', normalizedPartnerSlug);
    if (partnerSyncError) throw partnerSyncError;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate slug (ID) - allow editing but keep it well-formed
      const rawSlug = (formData.slug || wrestler.id || '').trim();
      if (!rawSlug) {
        setError('Slug (ID) is required');
        setLoading(false);
        return;
      }

      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(rawSlug)) {
        setError('Slug can only contain lowercase letters, numbers, and hyphens.');
        setLoading(false);
        return;
      }

      if (formData.person_type === 'Wrestler' && !formData.gender) {
        setError('Gender is required for wrestler profiles.');
        setLoading(false);
        return;
      }

      const slugChanged = rawSlug !== wrestler.id;

      // If slug changed, ensure it is unique
      if (slugChanged) {
        const { data: existingWrestler } = await supabase
          .from('wrestlers')
          .select('id')
          .eq('id', rawSlug)
          .single();

        if (existingWrestler && existingWrestler.id !== wrestler.id) {
          setError(`A wrestler with the slug "${rawSlug}" already exists. Please choose a different slug.`);
          setLoading(false);
          return;
        }
      }

      // Prepare update data - convert empty strings to null
      const updateData = {
        // Allow updating the primary ID/slug when changed
        ...(slugChanged ? { id: rawSlug } : {}),
        dob: formData.dob && formData.dob.trim() ? formData.dob.trim() : null,
        nationality: formData.nationality && formData.nationality.trim() ? formData.nationality.trim() : null,
        brand: formData.brand && formData.brand.trim() && formData.brand !== 'Unassigned' && formData.brand !== 'N/A' ? formData.brand.trim() : null,
        classification: formData.classification || null,
        "Status": formData.status && formData.status.trim() ? formData.status.trim() : null, // Use "Status" with capital S for database
        tag_team_name: formData.tag_team_name && formData.tag_team_name.trim() ? formData.tag_team_name.trim() : null,
        tag_team_partner_slug: formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() ? formData.tag_team_partner_slug.trim() : null,
        stable: formData.stable && formData.stable.trim() ? formData.stable.trim() : null,
        accomplishments: formData.person_type === 'Wrestler' && formData.accomplishments && formData.accomplishments.trim() ? formData.accomplishments.trim() : null,
        billed_from: formData.person_type === 'Wrestler' && formData.billed_from && formData.billed_from.trim() ? formData.billed_from.trim() : null,
        height: formData.person_type === 'Wrestler' && formData.height && formData.height.trim() ? formData.height.trim() : null,
        weight: formData.person_type === 'Wrestler' && formData.weight && formData.weight.trim() ? formData.weight.trim() : null,
        nickname: formData.nickname && formData.nickname.trim() ? formData.nickname.trim() : null,
        person_type: formData.person_type || 'Wrestler',
        gender: formData.gender || null,
      };

      // Validate based on classification
      if (formData.classification === 'Active' || formData.classification === 'Part-timer') {
        if (!formData.brand || !BRAND_OPTIONS.includes(formData.brand)) {
          setError('Active and Part-timer wrestlers must have a brand selected');
          setLoading(false);
          return;
        }
      } else if (formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests' || formData.classification === 'Non-wrestlers' || formData.classification === 'Inactive') {
        // Alumni, Celebrity Guests, Non-wrestlers, and Inactive shouldn't have brand or status
        updateData.brand = null;
        updateData["Status"] = null;
      }

      // If the user explicitly removed the image and did not upload a new one,
      // clear the image_url field in the database.
      if (imageRemoved && !imageFile) {
        updateData.image_url = null;
      }
      if (fullBodyImageRemoved && !fullBodyImageFile) {
        updateData.full_body_image_url = null;
      }

      // Validate and upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop().toLowerCase();
        if (fileExt !== 'png' && fileExt !== 'webp') {
          setError('Image must be a .png or .webp file');
          setLoading(false);
          return;
        }
        
        try {
          // Use the (possibly updated) slug when saving the image
          const imageUrl = await uploadWrestlerImage(imageFile, rawSlug);
          console.log('Image uploaded successfully:', imageUrl);
          updateData.image_url = imageUrl;
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError(uploadError.message || 'Failed to upload image');
          setLoading(false);
          return;
        }
      }
      if (formData.person_type === 'Wrestler' && fullBodyImageFile) {
        try {
          const fullBodyUrl = await uploadWrestlerFullBodyImage(fullBodyImageFile, rawSlug);
          updateData.full_body_image_url = fullBodyUrl;
        } catch (uploadError) {
          setError(uploadError.message || 'Failed to upload full-body image');
          setLoading(false);
          return;
        }
      }
      if (formData.person_type !== 'Wrestler') {
        updateData.full_body_image_url = null;
        updateData.billed_from = null;
        updateData.height = null;
        updateData.weight = null;
        updateData.accomplishments = null;
      }

      // Update wrestler in database
      console.log('Updating wrestler:', wrestler.id, 'with data:', updateData);
      
      // Remove null values that might cause issues, but keep them for fields that should be cleared
      const cleanUpdateData = { ...updateData };
      
      // First, try the update without select to see if it works
      console.log('Attempting to update wrestler with ID:', wrestler.id);
      console.log('Update data being sent:', cleanUpdateData);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('wrestlers')
        .update(cleanUpdateData)
        .eq('id', wrestler.id)
        .select();

      if (updateError) {
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        
        // Check for common RLS/permission errors
        if (updateError.code === '42501' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
          setError('Permission denied. You may need to set up Row Level Security policies for the wrestlers table. Check the console for details.');
        }
        
        throw updateError;
      }

      await syncTagTeamDataForEditedWrestler({
        oldSlug: wrestler.id,
        wrestlerSlug: rawSlug,
        teamName: formData.tag_team_name,
        partnerSlug: formData.tag_team_partner_slug,
        brand: formData.brand,
        stableName: formData.stable,
      });

      console.log('Update result:', updateResult);
      
      // Check if update actually affected any rows
      if (!updateResult || updateResult.length === 0) {
        console.warn('Update returned no rows - wrestler may not exist or update had no effect');
        // Don't throw - might still have worked
      }

      // Verify the update by fetching the wrestler
      const { data: verifyData, error: verifyError } = await supabase
        .from('wrestlers')
        .select('*')
        .eq('id', slugChanged ? rawSlug : wrestler.id)
        .single();

      if (verifyError) {
        console.error('Verify error:', verifyError);
        // Don't throw - the update might have worked even if we can't verify
        console.warn('Update may have succeeded but could not verify');
      } else {
        console.log('Update verified, wrestler data:', verifyData);
      }

      // Show success message briefly before closing
      setError(''); // Clear any previous errors
      
      // Call onSave callback with updated data
      // Use verified data if available, otherwise use what we tried to update
      const finalData = verifyData || {
        ...wrestler,
        ...updateData,
        status: updateData["Status"], // Also set lowercase status for consistency
        tag_team_name: updateData.tag_team_name,
        tag_team_partner_slug: updateData.tag_team_partner_slug,
        stable: updateData.stable,
      };
      
      console.log('Calling onSave with data:', finalData);
      onSave(finalData);

      // Small delay to ensure database write completes
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (err) {
      console.error('Error updating wrestler:', err);
      setError(err.message || 'Failed to update wrestler');
    } finally {
      setLoading(false);
    }
  };

  if (!wrestler) return null;

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
      onClick={handleRequestClose}
    >
      <div
        style={{
          background: '#181818',
          borderRadius: 14,
          padding: 24,
          maxWidth: 560,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 0 24px #C6A04F22',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          {wrestler.image_url && (
            <img
              src={wrestler.image_url}
              alt={wrestler.name}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #C6A04F',
              }}
            />
          )}
          <div>
            <h2 style={{ color: '#C6A04F', marginBottom: 2, fontSize: 22 }}>
              {wrestler.name}
            </h2>
            <div style={{ color: '#aaa', fontSize: 12 }}>
              Quick-edit this wrestler&apos;s slug, roster, health, and status.
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#ff4444',
            color: '#fff',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Name:
            </label>
            <input
              type="text"
              value={wrestler.name || ''}
              readOnly
              style={{ ...compactInputStyle, opacity: 0.85, cursor: 'not-allowed' }}
            />
          </div>

          {/* Slug / ID */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Slug (URL identifier):
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g., john-cena"
              style={compactInputStyle}
            />
            <div style={fieldHintStyle}>
              Used as this wrestler&apos;s ID in URLs and data. Changing it may affect existing links and references.
            </div>
          </div>

          {/* Nickname */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Nickname:
            </label>
            <input
              type="text"
              value={formData.nickname || ''}
              onChange={(e) => handleChange('nickname', e.target.value)}
              placeholder='e.g., The American Nightmare'
              style={compactInputStyle}
            />
            <div style={fieldHintStyle}>
              Displayed under the wrestler&apos;s name on their profile.
            </div>
          </div>

          {/* Gender */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Gender{formData.person_type === 'Wrestler' ? ': *' : ':'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GENDER_TOGGLE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange('gender', formData.gender === opt ? '' : opt)}
                  style={getToggleStyle(formData.gender === opt)}
                  aria-pressed={formData.gender === opt}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleChange('gender', '')}
                style={getToggleStyle(!formData.gender, '#666')}
                aria-pressed={!formData.gender}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Person type */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Type:
            </label>
            <select
              value={formData.person_type || 'Wrestler'}
              onChange={(e) => handleChange('person_type', e.target.value)}
              style={compactInputStyle}
            >
              {PERSON_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div style={fieldHintStyle}>
              Wrestler = full profile. GM / Manager / Announcer = simplified profile.
            </div>
          </div>

          {/* Classification quick toggles */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Classification:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CLASSIFICATION_OPTIONS.map(opt => {
                const isActive = formData.classification === opt;
                let color = '#C6A04F';
                if (opt === 'Alumni') color = '#8e44ad';
                if (opt === 'Celebrity Guests') color = '#e67e22';
                if (opt === 'Non-wrestlers') color = '#9e9e9e';
                if (opt === 'Inactive') color = '#757575';
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange('classification', opt)}
                    style={getToggleStyle(isActive, color)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
              Active / Part-timer = on a roster (RAW, SmackDown, NXT, AAA), Alumni / Celebrity Guests / Non-wrestlers / Inactive = no brand or status.
            </div>
          </div>

          {/* Brand / roster quick toggles */}
          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Brand / Roster:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['RAW', 'SmackDown', 'NXT', 'AAA'].map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => handleChange('brand', brand)}
                    style={getToggleStyle(formData.brand === brand)}
                  >
                    {brand}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleChange('brand', 'Unassigned')}
                  style={getToggleStyle(formData.brand === '' || formData.brand === 'Unassigned')}
                >
                  Unassigned
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('brand', 'N/A')}
                  style={getToggleStyle(formData.brand === 'N/A')}
                >
                  N/A
                </button>
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                Tap to quickly move this wrestler between rosters. Active and Part-timer wrestlers should have a brand.
              </div>
            </div>
          )}

          {/* Health / availability quick toggles */}
          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Health & Availability:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleChange('status', '')}
                  style={getToggleStyle(!formData.status)}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('status', 'Injured')}
                  style={getToggleStyle(formData.status === 'Injured', '#ff4444')}
                >
                  Injured
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('status', 'On Hiatus')}
                  style={getToggleStyle(formData.status === 'On Hiatus', '#ffa726')}
                >
                  On Hiatus
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('status', 'Inactive')}
                  style={getToggleStyle(formData.status === 'Inactive', '#757575')}
                >
                  Inactive
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('status', 'Non-wrestler')}
                  style={getToggleStyle(formData.status === 'Non-wrestler', '#9e9e9e')}
                >
                  Non-wrestler
                </button>
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                Only Active and Part-timer wrestlers can have a status.
              </div>
            </div>
          )}

          {(formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests' || formData.classification === 'Non-wrestlers' || formData.classification === 'Inactive') && (
            <div style={{
              background: '#2a2a2a',
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              color: '#C6A04F',
              fontSize: 13,
            }}>
              {formData.classification === 'Alumni' 
                ? 'Alumni wrestlers do not have brand assignments or status.'
                : formData.classification === 'Celebrity Guests'
                ? 'Celebrity Guests do not have brand assignments or status.'
                : formData.classification === 'Non-wrestlers'
                ? 'Non-wrestlers do not have brand assignments or status.'
                : 'Inactive wrestlers do not have brand assignments or status.'}
            </div>
          )}

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>
                  Height:
                </label>
                <input
                  type="text"
                  value={formData.height || ''}
                  onChange={(e) => handleChange('height', e.target.value)}
                  placeholder="6'2&quot;"
                  style={{ ...compactInputStyle, maxWidth: 150 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>
                  Weight:
                </label>
                <input
                  type="text"
                  value={formData.weight || ''}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="200 lb"
                  style={{ ...compactInputStyle, maxWidth: 150 }}
                />
              </div>
            </div>
          )}

          {/* Date of Birth */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Date of Birth:
            </label>
            <input
              type="date"
              value={formData.dob || ''}
              onChange={(e) => handleChange('dob', e.target.value)}
              style={compactInputStyle}
            />
            <div style={fieldHintStyle}>
              Optional. Stores a simple date (YYYY-MM-DD) for this wrestler.
            </div>
          </div>

          {/* Nationality */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Nationality:
            </label>
            <CountrySelect
              value={formData.nationality || ''}
              onChange={(val) => handleChange('nationality', val)}
              placeholder="Select country…"
            />
            <div style={fieldHintStyle}>
              Optional. Choose the wrestler&apos;s country; the flag will be shown automatically.
            </div>
          </div>

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabelStyle}>
                Billed From (Hometown):
              </label>
              <input
                type="text"
                value={formData.billed_from || ''}
                onChange={(e) => handleChange('billed_from', e.target.value)}
                placeholder="e.g., Atlanta, Georgia"
                style={compactInputStyle}
              />
            </div>
          )}

          {/* Accomplishments */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>
              Accomplishments:
            </label>
            <textarea
              value={formData.accomplishments}
              onChange={(e) => handleChange('accomplishments', e.target.value)}
              placeholder="e.g., 2X Undisputed WWE Champion\n2024 Men's Royal Rumble Winner"
              style={{ ...compactInputStyle, minHeight: 80, resize: 'vertical' }}
              rows={4}
            />
            <div style={fieldHintStyle}>
              One accomplishment per line. Shown on the wrestler profile page.
            </div>
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Wrestler Headshot:
            </label>
            {imagePreview && (
              <div
                style={{
                  marginBottom: 12,
                  textAlign: 'center',
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                <img
                  src={imagePreview}
                  alt="Current or preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: 8,
                    border: '1px solid #444',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setImageRemoved(true);
                    setError('');
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 4px rgba(0,0,0,0.6)',
                  }}
                  aria-label="Remove wrestler image"
                >
                  ×
                </button>
              </div>
            )}
            <input
              type="file"
              accept=".png,.webp"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const fileExt = file.name.split('.').pop().toLowerCase();
                  if (fileExt !== 'png' && fileExt !== 'webp') {
                    setError('Image must be a .png or .webp file');
                    e.target.value = '';
                    return;
                  }
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result);
                  };
                  reader.readAsDataURL(file);
                  setError('');
                } else {
                  setImageFile(null);
                  if (wrestler.image_url) {
                    setImagePreview(wrestler.image_url);
                  }
                }
              }}
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
          </div>

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Full-Body Image:
              </label>
              {(fullBodyImagePreview || wrestler.full_body_image_url) && !fullBodyImageRemoved && (
                <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
                  <img
                    src={fullBodyImagePreview || wrestler.full_body_image_url}
                    alt="Full body"
                    style={{ maxHeight: 180, borderRadius: 8, border: '1px solid #444' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFullBodyImagePreview(null);
                      setFullBodyImageFile(null);
                      setFullBodyImageRemoved(true);
                    }}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
                      border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Remove full-body image"
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                accept=".png,.webp"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFullBodyImageFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setFullBodyImagePreview(reader.result);
                    reader.readAsDataURL(file);
                    setFullBodyImageRemoved(false);
                  }
                  e.target.value = '';
                }}
                style={{ width: '100%', padding: 10, borderRadius: 8, background: '#232323', color: '#fff', border: '1px solid #444', fontSize: 15 }}
              />
            </div>
          )}

          {/* Tag Team Information */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Tag Team Name:
            </label>
            <div style={{ position: 'relative' }} ref={tagTeamNameDropdownRef}>
              <input
                type="text"
                value={tagTeamNameSearchTerm || formData.tag_team_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setTagTeamNameSearchTerm(value);
                  handleChange('tag_team_name', value);
                  setShowTagTeamNameDropdown(true);
                }}
                onFocus={() => {
                  setTagTeamNameSearchTerm(formData.tag_team_name || '');
                  setShowTagTeamNameDropdown(true);
                }}
                placeholder="Type to create or select an existing tag team..."
                style={compactInputStyle}
              />
              {showTagTeamNameDropdown && filteredTagTeamNames.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#232323', border: '1px solid #444', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto', zIndex: 100 }}>
                  {filteredTagTeamNames.map((name) => (
                    <div
                      key={name}
                      onClick={() => {
                        handleChange('tag_team_name', name);
                        setTagTeamNameSearchTerm(name);
                        setShowTagTeamNameDropdown(false);
                      }}
                      style={{ padding: '10px 12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #333' }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Leave empty if not in a tag team
            </div>
          </div>

          {/* Tag Team Partner */}
          <div style={{ marginBottom: 14, position: 'relative' }} ref={partnerDropdownRef}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Tag Team Partner:
            </label>
            <input
              type="text"
              value={partnerSearchTerm}
              onChange={(e) => {
                setPartnerSearchTerm(e.target.value);
                setShowPartnerDropdown(true);
                // Clear partner if search is cleared
                if (!e.target.value) {
                  handleChange('tag_team_partner_slug', '');
                }
              }}
              onFocus={() => setShowPartnerDropdown(true)}
              placeholder="Search for partner..."
              style={compactInputStyle}
            />
            {showPartnerDropdown && partnerSearchTerm && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#232323',
                border: '1px solid #444',
                borderRadius: 8,
                marginTop: 4,
                maxHeight: 200,
                overflow: 'auto',
                zIndex: 100,
              }}>
                {allWrestlers
                  .filter(w => 
                    w.id !== wrestler.id && 
                    w.name.toLowerCase().includes(partnerSearchTerm.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(w => (
                    <div
                      key={w.id}
                      onClick={() => {
                        handleChange('tag_team_partner_slug', w.id);
                        setPartnerSearchTerm(w.name);
                        setShowPartnerDropdown(false);
                      }}
                      style={{
                        padding: '10px 12px',
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
                {allWrestlers.filter(w => 
                  w.id !== wrestler.id && 
                  w.name.toLowerCase().includes(partnerSearchTerm.toLowerCase())
                ).length === 0 && (
                  <div style={{ padding: '10px 12px', color: '#999', fontSize: 13 }}>
                    No wrestlers found
                  </div>
                )}
              </div>
            )}
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Leave empty if not in a tag team
            </div>
          </div>

          {/* Stable/Affiliation */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Stable/Affiliation:
            </label>
            <div style={{ position: 'relative' }} ref={stableDropdownRef}>
              <input
                type="text"
                value={stableSearchTerm || formData.stable}
                onChange={(e) => {
                  const value = e.target.value;
                  setStableSearchTerm(value);
                  handleChange('stable', value);
                  setShowStableDropdown(true);
                }}
                onFocus={() => {
                  setStableSearchTerm(formData.stable || '');
                  setShowStableDropdown(true);
                }}
                placeholder="Type to create or select an existing stable..."
                style={compactInputStyle}
              />
              {showStableDropdown && filteredStableNames.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#232323', border: '1px solid #444', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto', zIndex: 100 }}>
                  {filteredStableNames.map((name) => (
                    <div
                      key={name}
                      onClick={() => {
                        handleChange('stable', name);
                        setStableSearchTerm(name);
                        setShowStableDropdown(false);
                      }}
                      style={{ padding: '10px 12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #333' }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Leave empty if not in a stable
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
            <button
              type="button"
              onClick={handleRequestClose}
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
              disabled={loading}
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
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 15,
                fontWeight: 600,
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

