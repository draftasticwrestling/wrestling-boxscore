import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const BRAND_OPTIONS = ['RAW', 'SmackDown', 'NXT', 'AAA'];
const CLASSIFICATION_OPTIONS = ['Active', 'Part-timer', 'Celebrity Guests', 'Alumni'];
const STATUS_OPTIONS = ['', 'Injured', 'On Hiatus'];

export default function WrestlerEditModal({ wrestler, onClose, onSave, allWrestlers = [] }) {
  const [formData, setFormData] = useState({
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
        brand: wrestler.brand || '',
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
    }
  }, [wrestler, allWrestlers]);

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
          // Part-timers shouldn't have brand
          updated.brand = '';
        } else if (value === 'Active') {
          // Active wrestlers should have a brand, but status is optional
          // Keep existing brand if it's valid
          if (!BRAND_OPTIONS.includes(updated.brand)) {
            updated.brand = 'RAW'; // Default to RAW
          }
        }
      }
      
      // If brand changes and classification is Active, keep it Active
      if (field === 'brand' && formData.classification === 'Active') {
        // Brand change is fine for Active wrestlers
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare update data - convert empty strings to null
      const updateData = {
        brand: formData.brand && formData.brand.trim() ? formData.brand.trim() : null,
        classification: formData.classification || null,
        "Status": formData.status && formData.status.trim() ? formData.status.trim() : null, // Use "Status" with capital S for database
        tag_team_name: formData.tag_team_name && formData.tag_team_name.trim() ? formData.tag_team_name.trim() : null,
        tag_team_partner_slug: formData.tag_team_partner_slug && formData.tag_team_partner_slug.trim() ? formData.tag_team_partner_slug.trim() : null,
        stable: formData.stable && formData.stable.trim() ? formData.stable.trim() : null,
      };

      // Validate based on classification
      if (formData.classification === 'Active') {
        if (!formData.brand || !BRAND_OPTIONS.includes(formData.brand)) {
          setError('Active wrestlers must have a brand (RAW, SmackDown, NXT, or AAA)');
          setLoading(false);
          return;
        }
      } else if (formData.classification === 'Part-timer') {
        // Part-timers shouldn't have brand
        updateData.brand = null;
        // Status is optional for Part-timers
      } else if (formData.classification === 'Alumni' || formData.classification === 'Celebrity Guests') {
        // Alumni and Celebrity Guests shouldn't have brand or status
        updateData.brand = null;
        updateData["Status"] = null;
      }

      // Update wrestler in database
      console.log('Updating wrestler:', wrestler.id, 'with data:', updateData);
      
      // Remove null values that might cause issues, but keep them for fields that should be cleared
      const cleanUpdateData = { ...updateData };
      
      // First, try the update without select to see if it works
      const { error: updateError } = await supabase
        .from('wrestlers')
        .update(cleanUpdateData)
        .eq('id', wrestler.id);

      if (updateError) {
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw updateError;
      }

      // Verify the update by fetching the wrestler
      const { data: verifyData, error: verifyError } = await supabase
        .from('wrestlers')
        .select('*')
        .eq('id', wrestler.id)
        .single();

      if (verifyError) {
        console.error('Verify error:', verifyError);
        // Don't throw - the update might have worked even if we can't verify
        console.warn('Update may have succeeded but could not verify');
      } else {
        console.log('Update verified, wrestler data:', verifyData);
      }

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
      
      onSave(finalData);

      onClose();
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
        <h2 style={{ color: '#C6A04F', marginBottom: 24, fontSize: 24 }}>
          Edit {wrestler.name}
        </h2>

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
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              Classification:
            </label>
            <select
              value={formData.classification}
              onChange={(e) => handleChange('classification', e.target.value)}
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
            >
              {CLASSIFICATION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {formData.classification === 'Active' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Brand:
              </label>
              <select
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
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
              >
                <option value="">Select brand</option>
                {BRAND_OPTIONS.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          )}

          {(formData.classification === 'Active' || formData.classification === 'Part-timer') && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: 8, fontWeight: 600 }}>
                Status:
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
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
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {status || 'Active (No Status)'}
                  </option>
                ))}
              </select>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                Only Active and Part-timer wrestlers can have a status
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

