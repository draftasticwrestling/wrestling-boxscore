import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadWrestlerImage } from '../supabaseClient';

const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned'];
const CLASSIFICATION_OPTIONS = ['Active', 'Part-timer', 'Celebrity Guests', 'Alumni'];
const STATUS_OPTIONS = ['', 'Injured', 'On Hiatus'];

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const partnerDropdownRef = useRef(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Shared toggle button styling to visually match the edit profile modal
  const baseToggleStyle = {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 999,
    border: '1px solid #444',
    background: '#232323',
    color: '#fff',
    fontSize: 13,
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target)) {
        setShowPartnerDropdown(false);
      }
    }
    if (showPartnerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPartnerDropdown]);

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
        if (value === 'Alumni' || value === 'Celebrity Guests') {
          // Alumni and Celebrity Guests shouldn't have brand or status
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

      // Validate image file if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop().toLowerCase();
        if (fileExt !== 'png' && fileExt !== 'webp') {
          setError('Image must be a .png or .webp file');
          setLoading(false);
          return;
        }
      }

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await uploadWrestlerImage(imageFile, formData.slug.trim());
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError(uploadError.message || 'Failed to upload image');
          setLoading(false);
          return;
        }
      }

      // Prepare insert data
      const insertData = {
        id: formData.slug.trim(),
        name: formData.name.trim(),
        dob: formData.dob && formData.dob.trim() ? formData.dob.trim() : null,
        nationality: formData.nationality && formData.nationality.trim() ? formData.nationality.trim() : null,
        brand: formData.brand && formData.brand.trim() && formData.brand !== 'Unassigned' ? formData.brand.trim() : null,
        classification: formData.classification || null,
        "Status": formData.status && formData.status.trim() ? formData.status.trim() : null,
        tag_team_name: formData.tag_team_name && formData.tag_team_name.trim() ? formData.tag_team_name.trim() : null,
        tag_team_partner_slug: formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() ? formData.tag_team_partner_slug.trim() : null,
        stable: formData.stable && formData.stable.trim() ? formData.stable.trim() : null,
        image_url: imageUrl,
      };

      // Clean up data based on classification
      if (formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests') {
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
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
            <h2 style={{ color: '#C6A04F', marginBottom: 4, fontSize: 24 }}>
              Add New Wrestler
            </h2>
            <div style={{ color: '#aaa', fontSize: 13 }}>
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
          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Name: *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., John Cena"
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

          {/* Slug */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Slug (URL identifier): *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g., john-cena"
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
              Auto-generated from name, but you can edit it. Must be unique.
            </div>
          </div>

          {/* Date of Birth */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Date of Birth:
            </label>
            <input
              type="date"
              value={formData.dob || ''}
              onChange={(e) => handleChange('dob', e.target.value)}
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
              Optional. Stores a simple date (YYYY-MM-DD) for this wrestler.
            </div>
          </div>

          {/* Nationality */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Nationality:
            </label>
            <input
              type="text"
              value={formData.nationality || ''}
              onChange={(e) => handleChange('nationality', e.target.value)}
              placeholder="e.g., American, Canadian, Japanese"
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
              Optional. Free-form text for country or nationality.
            </div>
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Wrestler Image:
            </label>
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
                  // Create preview
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result);
                  };
                  reader.readAsDataURL(file);
                  setError('');
                } else {
                  setImageFile(null);
                  setImagePreview(null);
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
            {imagePreview && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: 8,
                    border: '1px solid #444',
                  }}
                />
              </div>
            )}
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Upload a .png or .webp image. File will be saved as: {formData.slug || 'wrestler-slug'}.{imageFile ? imageFile.name.split('.').pop().toLowerCase() : 'png'}
            </div>
          </div>

          {/* Classification quick toggles */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Classification: *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CLASSIFICATION_OPTIONS.map(opt => {
                const isActive = formData.classification === opt;
                let color = '#C6A04F';
                if (opt === 'Alumni') color = '#8e44ad';
                if (opt === 'Celebrity Guests') color = '#e67e22';
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
              Active / Part-timer = on a roster (RAW, SmackDown, NXT, AAA), Alumni / Celebrity Guests = no brand or status.
            </div>
          </div>

          {/* Brand / roster quick toggles */}
          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Brand / Roster: *
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
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                Tap to quickly assign this wrestler to a roster.
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
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                Only Active and Part-timer wrestlers can have a status.
              </div>
            </div>
          )}

          {(formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests') && (
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
                : 'Celebrity Guests do not have brand assignments or status.'}
            </div>
          )}

          {/* Tag Team Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Tag Team Name:
            </label>
            <input
              type="text"
              value={formData.tag_team_name}
              onChange={(e) => handleChange('tag_team_name', e.target.value)}
              placeholder="e.g., The New Day, The Usos"
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
              Leave empty if not in a tag team
            </div>
          </div>

          {/* Tag Team Partner */}
          <div style={{ marginBottom: 20, position: 'relative' }} ref={partnerDropdownRef}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Tag Team Partner:
            </label>
            <input
              type="text"
              value={partnerSearchTerm}
              onChange={(e) => {
                setPartnerSearchTerm(e.target.value);
                setShowPartnerDropdown(true);
                if (!e.target.value) {
                  handleChange('tag_team_partner_slug', '');
                }
              }}
              onFocus={() => setShowPartnerDropdown(true)}
              placeholder="Search for partner..."
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
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Stable/Affiliation:
            </label>
            <input
              type="text"
              value={formData.stable}
              onChange={(e) => handleChange('stable', e.target.value)}
              placeholder="e.g., The Judgment Day, The Bloodline"
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
              Leave empty if not in a stable
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

