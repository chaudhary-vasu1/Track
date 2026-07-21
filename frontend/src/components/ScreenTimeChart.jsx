import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import api from '../services/api';

export default function ScreenTimeChart({ kidDeviceId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(120);

  useEffect(() => {
    fetchScreenTime();
  }, [kidDeviceId]);

  const fetchScreenTime = async () => {
    try {
      setLoading(true);
      const res = await api.get('/monitoring/screen-time', { params: { kidDeviceId } });
      const breakdown = (res.data && res.data.breakdown) ? res.data.breakdown : {};
      
      const chartData = Object.keys(breakdown).map(key => ({
        name: key,
        minutes: breakdown[key]
      }));

      setData(chartData);
      setTotal(res.data ? res.data.totalMinutes || 0 : 0);
      setLimit(res.data ? res.data.limit || 120 : 120);
    } catch (e) {
      console.error('Failed to get screen time data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#00f2fe', '#9b51e0', '#ff007f', '#00ff87', '#f39c12'];

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3>Screen Time Analytics</h3>
          <p style={{ fontSize: '13px', color: '#a39bb8', marginTop: '4px' }}>
            Daily limit: {limit} mins | Active: <strong style={{ color: total > limit ? '#ff3838' : '#00ff87' }}>{total} mins</strong>
          </p>
        </div>
        {total > limit && (
          <span style={{ 
            alignSelf: 'center', 
            background: 'rgba(255, 56, 56, 0.2)', 
            color: '#ff3838', 
            padding: '4px 8px', 
            borderRadius: '6px', 
            fontSize: '11px', 
            fontWeight: 'bold' 
          }}>
            LIMIT EXCEEDED
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading screen time logs...
        </div>
      ) : data.length > 0 ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#a39bb8" fontSize={11} tickLine={false} />
              <YAxis stroke="#a39bb8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#100a2b', borderColor: 'rgba(255,255,255,0.18)', borderRadius: '8px' }} 
                labelStyle={{ fontWeight: 'bold', color: '#f39c12' }}
              />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a39bb8' }}>
          No app activities logged today.
        </div>
      )}
    </div>
  );
}
