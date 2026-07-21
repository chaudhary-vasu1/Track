import React, { useState } from 'react';
import api from '../services/api';

export default function LoginForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/auth/parent/login', { email, password });
        localStorage.setItem('parent_token', response.data.token);
        localStorage.setItem('parent_id', response.data.parentId);
        onLoginSuccess(response.data);
      } else {
        const response = await api.post('/auth/parent/signup', { email, password, name, phone });
        localStorage.setItem('parent_token', response.data.token);
        localStorage.setItem('parent_id', response.data.parentId);
        // Prompt login transition or login automatically
        const loginRes = await api.post('/auth/parent/login', { email, password });
        onLoginSuccess(loginRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '80px auto',
      padding: '30px'
    }} className="glass-card">
      <h2 style={{ marginBottom: '8px', textAlign: 'center', fontWeight: '800' }}>
        {isLogin ? 'Parent Sign In' : 'Parent Registration'}
      </h2>
      <p style={{ color: '#a39bb8', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
        {isLogin ? 'Access kid device telemetry and controls' : 'Create an administrative parent account'}
      </p>

      {error && (
        <div style={{
          background: 'rgba(255, 56, 56, 0.15)',
          color: '#ff3838',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '18px',
          textAlign: 'center',
          border: '1px solid rgba(255, 56, 56, 0.2)'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <label style={{ fontSize: '13px', color: '#a39bb8', display: 'block', marginBottom: '6px' }}>Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="John Doe"
            />

            <label style={{ fontSize: '13px', color: '#a39bb8', display: 'block', marginBottom: '6px' }}>Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="+1 (555) 000-0000"
            />
          </>
        )}

        <label style={{ fontSize: '13px', color: '#a39bb8', display: 'block', marginBottom: '6px' }}>Email Address</label>
        <input 
          type="email" 
          className="form-input" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          placeholder="parent@example.com"
        />

        <label style={{ fontSize: '13px', color: '#a39bb8', display: 'block', marginBottom: '6px' }}>Password</label>
        <input 
          type="password" 
          className="form-input" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          placeholder="••••••••"
        />

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? 'Processing...' : isLogin ? 'Sign In Securely' : 'Register Account'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        <span style={{ color: '#a39bb8' }}>
          {isLogin ? "Don't have an account?" : 'Already registered?'}
        </span>{' '}
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#00f2fe', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            fontSize: 'inherit'
          }}
        >
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </div>
    </div>
  );
}
