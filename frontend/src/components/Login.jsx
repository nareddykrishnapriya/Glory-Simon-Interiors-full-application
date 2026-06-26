import React, { useState } from 'react';
import './Login.css';

const ROLE_DEFAULTS = {
  'Admin': 'admin@glorysimon.com',
  'Interior Designer': 'designer@glorysimon.com',
  'Project Manager': 'pm@glorysimon.com',
  'Site Engineer': 'engineer@glorysimon.com',
  'Vendor Coordinator': 'vendor@glorysimon.com',
  'Client': 'client@gmail.com'
};



export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (ROLE_DEFAULTS[selectedRole]) {
      setEmail(ROLE_DEFAULTS[selectedRole]);
      setPassword('password123');
    } else {
      setEmail('');
      setPassword('');
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) return setError('Email address is required.');
    if (!password) return setError('Password is required.');
    if (!role) return setError('Please choose a security access role.');

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Connection failed. Please verify credentials.');
      }

      // Execute Parent App-level State Update
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-auth-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-mark">G</div>
          <h2 className="login-title">Glory Simon Interiors</h2>
          <p className="login-subtitle">Operations Login Portal</p>
        </div>

        {error && (
          <div className="login-error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="login-form-input"
              placeholder="e.g. designer@glorysimon.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-form-group">
            <label className="login-form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="login-form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-form-group">
            <label className="login-form-label" htmlFor="login-role">System Role</label>
            <select
              id="login-role"
              className="login-form-select"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Choose Access Role --</option>
              <option value="Admin">Admin (Director)</option>
              <option value="Interior Designer">Interior Designer</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Site Engineer">Site Engineer</option>
              <option value="Vendor Coordinator">Vendor Coordinator</option>
              <option value="Client">Client (Owner)</option>
            </select>
          </div>

          <button type="submit" className="login-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner"></span>
                Authenticating...
              </>
            ) : (
              'Secure Sign In'
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
