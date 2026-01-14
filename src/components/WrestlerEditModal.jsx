import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadWrestlerImage } from '../supabaseClient';
import CountrySelect from './CountrySelect';

const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA', 'Unassigned'];
const CLASSIFICATION_OPTIONS = ['Active', 'Part-timer', 'Celebrity Guests', 'Alumni'];
const STATUS_OPTIONS = ['', 'Injured', 'On Hiatus'];

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const partnerDropdownRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);

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

  useEffect(() => {
    if (wrestler) {
      setFormData({
        slug: wrestler.id || '',
        dob: wrestler.dob || '',
        nationality: wrestler.nationality || '',
        brand: wrestler.brand || 'Unassigned',
        classification: wrestler.classification || 'Active',
        status: wrestler.status || wrestler.Status || '',
        tag_team_name: wrestler.tag_team_name || '',
        tag_team_partner_slug: wrestler.tag_team_partner_slug || '',
        stable: wrestler.stable || wrestler.affiliation || '',
      });
      
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
    }
  }, [wrestler, allWrestlers]);

  // Shared toggle button styling for the quick-edit controls
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

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If classification changes, update brand and status accordingly
      if (field === 'classification') {
        if (value === 'Alumni' || value === 'Celebrity Guests') {
          // Alumni and Celebrity Guests shouldn't have brand or status
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
        brand: formData.brand && formData.brand.trim() && formData.brand !== 'Unassigned' ? formData.brand.trim() : null,
        classification: formData.classification || null,
        "Status": formData.status && formData.status.trim() ? formData.status.trim() : null, // Use "Status" with capital S for database
        tag_team_name: formData.tag_team_name && formData.tag_team_name.trim() ? formData.tag_team_name.trim() : null,
        tag_team_partner_slug: formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() ? formData.tag_team_partner_slug.trim() : null,
        stable: formData.stable && formData.stable.trim() ? formData.stable.trim() : null,
      };

      // Validate based on classification
      if (formData.classification === 'Active' || formData.classification === 'Part-timer') {
        if (!formData.brand || !BRAND_OPTIONS.includes(formData.brand)) {
          setError('Active and Part-timer wrestlers must have a brand selected');
          setLoading(false);
          return;
        }
      } else if (formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests') {
        // Alumni and Celebrity Guests shouldn't have brand or status
        updateData.brand = null;
        updateData["Status"] = null;
      }

      // If the user explicitly removed the image and did not upload a new one,
      // clear the image_url field in the database.
      if (imageRemoved && !imageFile) {
        updateData.image_url = null;
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
            <h2 style={{ color: '#C6A04F', marginBottom: 4, fontSize: 24 }}>
              {wrestler.name}
            </h2>
            <div style={{ color: '#aaa', fontSize: 13 }}>
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
          {/* Slug / ID */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Slug (URL identifier):
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
            />
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Used as this wrestler&apos;s ID in URLs and data. Changing it may affect existing links and references.
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
            <CountrySelect
              value={formData.nationality || ''}
              onChange={(val) => handleChange('nationality', val)}
              placeholder="Select country…"
            />
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Optional. Choose the wrestler&apos;s country; the flag will be shown automatically.
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

          {/* Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Wrestler Image:
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
                  // Create preview
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result);
                  };
                  reader.readAsDataURL(file);
                  setError('');
                } else {
                  setImageFile(null);
                  // Keep existing image preview if no new file selected
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
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              Upload a .png or .webp image to replace the current image. File will be saved as: {wrestler.id}.{imageFile ? imageFile.name.split('.').pop().toLowerCase() : 'png'}
            </div>
          </div>

          {/* Tag Team Information */}
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
                // Clear partner if search is cleared
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

