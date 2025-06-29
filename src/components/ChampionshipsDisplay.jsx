import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const gold = '#C6A04F';

const ChampionshipsDisplay = ({ wrestlerMap }) => {
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChampionships();
  }, []);

  const fetchChampionships = async () => {
    try {
      const { data, error } = await supabase
        .from('championships')
        .select('*')
        .order('title_name');

      if (error) {
        console.error('Error fetching championships:', error);
        return;
      }

      setChampionships(data || []);
    } catch (error) {
      console.error('Error fetching championships:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatReignDuration = (dateWon) => {
    if (!dateWon) return '';
    
    const wonDate = new Date(dateWon);
    const now = new Date();
    const diffTime = Math.abs(now - wonDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    const remainingMonths = Math.floor(remainingDays / 30);
    
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ color: gold, fontSize: 18 }}>Loading current champions...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(20, 20, 20, 0.98)', 
      borderRadius: 12, 
      padding: 24, 
      margin: '24px auto',
      maxWidth: 1200,
      boxShadow: '0 0 24px #C6A04F22'
    }}>
      <h2 style={{ color: gold, textAlign: 'center', marginBottom: 24, fontSize: 28 }}>
        🏆 Current Champions
      </h2>
      
      {championships.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 16 }}>
          No championship data available. Please run the initialization script.
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 20 
        }}>
          {championships.map((championship) => {
            const wrestler = wrestlerMap[championship.current_champion_slug];
            const reignDuration = formatReignDuration(championship.date_won);
            
            return (
              <div key={championship.id} style={{
                background: 'rgba(34, 34, 34, 0.98)',
                borderRadius: 8,
                padding: 20,
                border: '1px solid #444',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                {/* Championship Title */}
                <div style={{ 
                  color: gold, 
                  fontWeight: 700, 
                  fontSize: 16, 
                  marginBottom: 16,
                  textAlign: 'center',
                  lineHeight: 1.3
                }}>
                  {championship.title_name}
                </div>
                
                {/* Champion Image */}
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  overflow: 'hidden'
                }}>
                  {wrestler?.image_url ? (
                    <img 
                      src={wrestler.image_url} 
                      alt={wrestler.name} 
                      style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  ) : (
                    <span style={{ fontSize: 40, color: '#7da2c1' }}>👤</span>
                  )}
                </div>
                
                {/* Champion Name */}
                <div style={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  fontSize: 18, 
                  marginBottom: 8 
                }}>
                  {championship.current_champion}
                </div>
                
                {/* Reign Duration */}
                <div style={{ 
                  color: '#bbb', 
                  fontSize: 14, 
                  marginBottom: 8 
                }}>
                  {reignDuration && `Reign: ${reignDuration}`}
                </div>
                
                {/* Date Won */}
                <div style={{ 
                  color: '#888', 
                  fontSize: 12 
                }}>
                  Won: {championship.date_won ? new Date(championship.date_won).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChampionshipsDisplay; 