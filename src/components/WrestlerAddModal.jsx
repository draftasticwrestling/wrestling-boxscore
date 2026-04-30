import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, uploadWrestlerImage, uploadWrestlerFullBodyImage } from '../supabaseClient';
import CountrySelect from './CountrySelect';

const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned', 'N/A'];
const CLASSIFICATION_OPTIONS = ['Active', 'Part-timer', 'Celebrity Guests', 'Alumni', 'Non-wrestlers', 'Inactive'];
const PERSON_TYPE_OPTIONS = ['Wrestler', 'Head of Creative', 'GM', 'Manager', 'Announcer'];
const STATUS_OPTIONS = ['', 'Injured', 'On Hiatus', 'Inactive', 'Non-wrestler'];
const GENDER_OPTIONS = ['', 'male', 'female', 'other'];
const GENDER_TOGGLE_OPTIONS = ['male', 'female', 'other'];

// Helper function to generate slug from name
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function WrestlerAddModal({ onClose, onSave, allWrestlers = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    dob: '',
    nationality: '',
    brand: '',
    classification: 'Active',
    status: '',
    tag_team_name: '',
    tag_team_partner_slug: '',
    stable: '',
    billed_from: '',
    height: '',
    weight: '',
    accomplishments: '',
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
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fullBodyImageFile, setFullBodyImageFile] = useState(null);

  const isDirty =
    (formData.name && formData.name.trim() !== '') ||
    (formData.slug && formData.slug.trim() !== '') ||
    (formData.dob && formData.dob.trim() !== '') ||
    (formData.nationality && formData.nationality.trim() !== '') ||
    (formData.brand && formData.brand.trim() !== '') ||
    (formData.status && formData.status.trim() !== '') ||
    (formData.tag_team_name && formData.tag_team_name.trim() !== '') ||
    (formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() !== '') ||
    (formData.stable && formData.stable.trim() !== '') ||
    (formData.billed_from && formData.billed_from.trim() !== '') ||
    (formData.height && formData.height.trim() !== '') ||
    (formData.weight && formData.weight.trim() !== '') ||
    (formData.accomplishments && formData.accomplishments.trim() !== '') ||
    (formData.nickname && formData.nickname.trim() !== '') ||
    (formData.gender && formData.gender.trim() !== '') ||
    formData.classification !== 'Active' ||
    formData.person_type !== 'Wrestler' ||
    !!imageFile ||
    !!fullBodyImageFile;

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

  // Shared toggle button styling to visually match the edit profile modal
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

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && formData.name) {
      setFormData(prev => ({
        ...prev,
        slug: slugify(formData.name)
      }));
    }
  }, [formData.name, slugManuallyEdited]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If classification changes, update brand and status accordingly
      if (field === 'classification') {
        if (value === 'Alumni' || value === 'Celebrity Guests' || value === 'Non-wrestlers' || value === 'Inactive') {
          // Alumni, Celebrity Guests, Non-wrestlers, and Inactive shouldn't have brand or status
          updated.brand = '';
          updated.status = '';
        } else if (value === 'Part-timer') {
          // Part-timers can still have a brand; leave brand as-is
        } else if (value === 'Active') {
          // Active wrestlers should have a brand, default to RAW
          if (!BRAND_OPTIONS.includes(updated.brand)) {
            updated.brand = 'RAW';
          }
        }
      }
      
      return updated;
    });

    // Track if slug was manually edited
    if (field === 'slug') {
      setSlugManuallyEdited(true);
    }
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

    const baseId = slugify(normalizedTeamName).slice(0, 42) || `tag-team-${Date.now()}`;
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

  async function syncTagTeamDataForWrestler({ wrestlerSlug, teamName, partnerSlug, brand, stableName }) {
    const normalizedTeamName = (teamName || '').trim();
    const normalizedPartnerSlug = (partnerSlug || '').trim();

    if (!normalizedTeamName || !normalizedPartnerSlug || normalizedPartnerSlug === wrestlerSlug) return;

    const { data: partner, error: partnerLookupError } = await supabase
      .from('wrestlers')
      .select('id, tag_team_name, tag_team_partner_slug')
      .eq('id', normalizedPartnerSlug)
      .maybeSingle();
    if (partnerLookupError) throw partnerLookupError;
    if (!partner) return;

    const tagTeam = await getOrCreateTagTeam({ teamName: normalizedTeamName, brand, stableName });
    if (!tagTeam) return;

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
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        setError('Wrestler name is required');
        setLoading(false);
        return;
      }

      if (!formData.slug || !formData.slug.trim()) {
        setError('Wrestler slug is required');
        setLoading(false);
        return;
      }

      // Check if slug already exists
      const { data: existingWrestler, error: checkError } = await supabase
        .from('wrestlers')
        .select('id')
        .eq('id', formData.slug.trim())
        .single();

      if (existingWrestler) {
        setError(`A wrestler with the slug "${formData.slug}" already exists. Please choose a different slug.`);
        setLoading(false);
        return;
      }

      // Validate based on classification
      if (formData.classification === 'Active' || formData.classification === 'Part-timer') {
        if (!formData.brand || !BRAND_OPTIONS.includes(formData.brand)) {
          setError('Active and Part-timer wrestlers must have a brand selected');
          setLoading(false);
          return;
        }
      }

      if (formData.person_type === 'Wrestler' && !formData.gender) {
        setError('Gender is required for wrestler profiles.');
        setLoading(false);
        return;
      }

      // Validate image file if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop().toLowerCase();
        if (fileExt !== 'png' && fileExt !== 'webp') {
          setError('Image must be a .png or .webp file');
          setLoading(false);
          return;
        }
      }

      // Upload images if provided
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await uploadWrestlerImage(imageFile, formData.slug.trim());
        } catch (uploadError) {
          setError(uploadError.message || 'Failed to upload image');
          setLoading(false);
          return;
        }
      }
      let fullBodyImageUrl = null;
      if (formData.person_type === 'Wrestler' && fullBodyImageFile) {
        try {
          fullBodyImageUrl = await uploadWrestlerFullBodyImage(fullBodyImageFile, formData.slug.trim());
        } catch (uploadError) {
          setError(uploadError.message || 'Failed to upload full-body image');
          setLoading(false);
          return;
        }
      }

      const insertData = {
        id: formData.slug.trim(),
        name: formData.name.trim(),
        dob: formData.dob && formData.dob.trim() ? formData.dob.trim() : null,
        nationality: formData.nationality && formData.nationality.trim() ? formData.nationality.trim() : null,
        brand: formData.brand && formData.brand.trim() && formData.brand !== 'Unassigned' && formData.brand !== 'N/A' ? formData.brand.trim() : null,
        classification: formData.classification || null,
        "Status": formData.status && formData.status.trim() ? formData.status.trim() : null,
        tag_team_name: formData.tag_team_name && formData.tag_team_name.trim() ? formData.tag_team_name.trim() : null,
        tag_team_partner_slug: formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() ? formData.tag_team_partner_slug.trim() : null,
        stable: formData.stable && formData.stable.trim() ? formData.stable.trim() : null,
        billed_from: formData.person_type === 'Wrestler' && formData.billed_from && formData.billed_from.trim() ? formData.billed_from.trim() : null,
        height: formData.person_type === 'Wrestler' && formData.height && formData.height.trim() ? formData.height.trim() : null,
        weight: formData.person_type === 'Wrestler' && formData.weight && formData.weight.trim() ? formData.weight.trim() : null,
        accomplishments: formData.person_type === 'Wrestler' && formData.accomplishments && formData.accomplishments.trim() ? formData.accomplishments.trim() : null,
        nickname: formData.nickname && formData.nickname.trim() ? formData.nickname.trim() : null,
        person_type: formData.person_type || 'Wrestler',
        gender: formData.gender || null,
        image_url: imageUrl,
        full_body_image_url: fullBodyImageUrl,
      };

      // Clean up data based on classification
      if (formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests' || formData.classification === 'Non-wrestlers' || formData.classification === 'Inactive') {
        insertData.brand = null;
        insertData["Status"] = null;
      }

      console.log('Creating wrestler with data:', insertData);

      const { data: newWrestler, error: insertError } = await supabase
        .from('wrestlers')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        
        if (insertError.code === '42501' || insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
          setError('Permission denied. You may need to set up Row Level Security policies for the wrestlers table.');
        } else if (insertError.code === '23505') {
          setError('A wrestler with this slug already exists. Please choose a different slug.');
        } else {
          setError(insertError.message || 'Failed to create wrestler');
        }
        
        throw insertError;
      }

      console.log('Wrestler created successfully:', newWrestler);

      await syncTagTeamDataForWrestler({
        wrestlerSlug: newWrestler.id,
        teamName: formData.tag_team_name,
        partnerSlug: formData.tag_team_partner_slug,
        brand: formData.brand,
        stableName: formData.stable,
      });

      // Call onSave callback with new wrestler data
      onSave(newWrestler);

      // Small delay to ensure database write completes
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (err) {
      console.error('Error creating wrestler:', err);
      if (!error) {
        setError(err.message || 'Failed to create wrestler');
      }
    } finally {
      setLoading(false);
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
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
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
              Add New Wrestler
            </h2>
            <div style={{ color: '#aaa', fontSize: 12 }}>
              Set up this wrestler&apos;s slug, bio, roster, health, and status.
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
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Name: *</label>
            <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., John Cena" style={compactInputStyle} required />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Slug (URL identifier): *</label>
            <input type="text" value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} placeholder="e.g., john-cena" style={compactInputStyle} required />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Nickname:</label>
            <input type="text" value={formData.nickname || ''} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="e.g., The American Nightmare" style={compactInputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Gender{formData.person_type === 'Wrestler' ? ': *' : ':'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GENDER_TOGGLE_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => handleChange('gender', formData.gender === opt ? '' : opt)} style={getToggleStyle(formData.gender === opt)} aria-pressed={formData.gender === opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
              <button type="button" onClick={() => handleChange('gender', '')} style={getToggleStyle(!formData.gender, '#666')} aria-pressed={!formData.gender}>Clear</button>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Type:</label>
            <select value={formData.person_type || 'Wrestler'} onChange={(e) => handleChange('person_type', e.target.value)} style={compactInputStyle}>
              {PERSON_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>Classification: *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CLASSIFICATION_OPTIONS.map(opt => {
                const isActive = formData.classification === opt;
                let color = '#C6A04F';
                if (opt === 'Alumni') color = '#8e44ad';
                if (opt === 'Celebrity Guests') color = '#e67e22';
                if (opt === 'Non-wrestlers') color = '#9e9e9e';
                if (opt === 'Inactive') color = '#757575';
                return <button key={opt} type="button" onClick={() => handleChange('classification', opt)} style={getToggleStyle(isActive, color)}>{opt}</button>;
              })}
            </div>
          </div>

          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>Brand / Roster: *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['RAW', 'SmackDown', 'NXT', 'AAA'].map(brand => (
                  <button key={brand} type="button" onClick={() => handleChange('brand', brand)} style={getToggleStyle(formData.brand === brand)}>{brand}</button>
                ))}
              </div>
            </div>
          )}

          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>Health & Availability:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => handleChange('status', '')} style={getToggleStyle(!formData.status)}>Active</button>
                <button type="button" onClick={() => handleChange('status', 'Injured')} style={getToggleStyle(formData.status === 'Injured', '#ff4444')}>Injured</button>
                <button type="button" onClick={() => handleChange('status', 'On Hiatus')} style={getToggleStyle(formData.status === 'On Hiatus', '#ffa726')}>On Hiatus</button>
                <button type="button" onClick={() => handleChange('status', 'Inactive')} style={getToggleStyle(formData.status === 'Inactive', '#757575')}>Inactive</button>
              </div>
            </div>
          )}

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>Height:</label>
                <input type="text" value={formData.height || ''} onChange={(e) => handleChange('height', e.target.value)} placeholder="6'2&quot;" style={{ ...compactInputStyle, maxWidth: 150 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabelStyle}>Weight:</label>
                <input type="text" value={formData.weight || ''} onChange={(e) => handleChange('weight', e.target.value)} placeholder="200 lb" style={{ ...compactInputStyle, maxWidth: 150 }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Date of Birth:</label>
            <input type="date" value={formData.dob || ''} onChange={(e) => handleChange('dob', e.target.value)} style={compactInputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Nationality:</label>
            <CountrySelect value={formData.nationality || ''} onChange={(val) => handleChange('nationality', val)} placeholder="Select country…" />
          </div>

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabelStyle}>Billed From (Hometown):</label>
              <input type="text" value={formData.billed_from || ''} onChange={(e) => handleChange('billed_from', e.target.value)} placeholder="e.g., Atlanta, Georgia" style={compactInputStyle} />
            </div>
          )}

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabelStyle}>Accomplishments:</label>
              <textarea value={formData.accomplishments || ''} onChange={(e) => handleChange('accomplishments', e.target.value)} placeholder={"One per line, e.g.:\n2X Undisputed WWE Champion"} style={{ ...compactInputStyle, minHeight: 80, resize: 'vertical' }} rows={3} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Tag Team Name:</label>
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
          </div>

          <div style={{ marginBottom: 14, position: 'relative' }} ref={partnerDropdownRef}>
            <label style={fieldLabelStyle}>Tag Team Partner:</label>
            <input
              type="text"
              value={partnerSearchTerm}
              onChange={(e) => { setPartnerSearchTerm(e.target.value); setShowPartnerDropdown(true); if (!e.target.value) handleChange('tag_team_partner_slug', ''); }}
              onFocus={() => setShowPartnerDropdown(true)}
              placeholder="Search for partner..."
              style={compactInputStyle}
            />
            {showPartnerDropdown && partnerSearchTerm && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#232323', border: '1px solid #444', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto', zIndex: 100 }}>
                {allWrestlers.filter(w => w.name.toLowerCase().includes(partnerSearchTerm.toLowerCase())).slice(0, 10).map(w => (
                  <div key={w.id} onClick={() => { handleChange('tag_team_partner_slug', w.id); setPartnerSearchTerm(w.name); setShowPartnerDropdown(false); }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #333' }}>
                    {w.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Stable/Affiliation:</label>
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
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelStyle}>Wrestler Headshot:</label>
            <input
              type="file"
              accept=".png,.webp"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) { setImageFile(null); setImagePreview(null); return; }
                const fileExt = file.name.split('.').pop().toLowerCase();
                if (fileExt !== 'png' && fileExt !== 'webp') { setError('Image must be a .png or .webp file'); e.target.value = ''; return; }
                setImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result);
                reader.readAsDataURL(file);
              }}
              style={compactInputStyle}
            />
          </div>

          {formData.person_type === 'Wrestler' && (
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabelStyle}>Full-Body Image:</label>
              <input type="file" accept=".png,.webp" onChange={(e) => setFullBodyImageFile(e.target.files[0] || null)} style={compactInputStyle} />
            </div>
          )}

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
              {loading ? 'Creating...' : 'Create Wrestler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

