import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SurveillanceHistory({ kidDeviceId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [kidDeviceId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/surveillance/history', {
        params: { kidDeviceId, limit: 10 }
      });
      setSessions((response.data && response.data.sessions) ? response.data.sessions : []);
    } catch (error) {
      console.error('Failed to load history:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mock sessions list for demonstration/hackathon purposes
  const mockSessions = [
    {
      id: 'mock_1',
      type: 'camera',
      startedAt: new Date(Date.now() - 4 * 3600000),
      endedAt: new Date(Date.now() - 4 * 3600000 + 45000),
      duration: 45,
      isRecorded: true,
      recordingUrl: 'https://s3.amazonaws.com/cropcure-recordings/mock-video.mp4'
    },
    {
      id: 'mock_2',
      type: 'microphone',
      startedAt: new Date(Date.now() - 10 * 3600000),
      endedAt: new Date(Date.now() - 10 * 3600000 + 120000),
      duration: 120,
      isRecorded: true,
      recordingUrl: 'https://s3.amazonaws.com/cropcure-recordings/mock-audio.mp3'
    },
    {
      id: 'mock_3',
      type: 'camera',
      startedAt: new Date(Date.now() - 25 * 3600000),
      endedAt: new Date(Date.now() - 25 * 3600000 + 30000),
      duration: 30,
      isRecorded: false,
      recordingUrl: null
    }
  ];

  const displayList = sessions.length > 0 ? sessions : mockSessions;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="glass-card" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3>Surveillance Audit Trail</h3>
        <button onClick={loadHistory} className="btn-ctrl" style={{ padding: '6px 12px', fontSize: '12px' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center' }}>Loading log history...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Access Type</th>
                <th>Session Duration</th>
                <th>Captured Media</th>
                <th>Download Link</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map(session => (
                <tr key={session.id}>
                  <td>{formatDate(session.startedAt)}</td>
                  <td>
                    <span style={{ 
                      color: session.type === 'camera' ? '#00f2fe' : '#9b51e0',
                      fontWeight: 'bold'
                    }}>
                      {session.type.toUpperCase()}
                    </span>
                  </td>
                  <td>{session.duration}s</td>
                  <td>{session.isRecorded ? '✅ Recorded' : '❌ Live Stream Only'}</td>
                  <td>
                    {session.isRecorded && session.recordingUrl ? (
                      <a href={session.recordingUrl} className="download-link" target="_blank" rel="noopener noreferrer">
                        📥 Download File
                      </a>
                    ) : (
                      <span style={{ color: '#a39bb8', fontSize: '12px' }}>No storage saved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
