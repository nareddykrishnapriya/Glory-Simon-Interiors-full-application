import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import DetailView from './components/DetailView';

// Backend URL: set VITE_BACKEND_URL in Netlify environment variables to point to your hosted backend.
// For local dev, it falls back to http://127.0.0.1:5000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

export default function App() {
  const [user, setUser] = useState(null); // stores { user_id, name, email, role }
  const [token, setToken] = useState('');
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'form', 'detail', or 'projects'
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Restore authenticated session on page reload/refresh
  useEffect(() => {
    const savedUser = sessionStorage.getItem('gsi_user');
    const savedToken = sessionStorage.getItem('gsi_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      setCurrentView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    sessionStorage.setItem('gsi_user', JSON.stringify(userData));
    sessionStorage.setItem('gsi_token', userToken);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    sessionStorage.removeItem('gsi_user');
    sessionStorage.removeItem('gsi_token');
    setCurrentView('dashboard');
    setSelectedProjectId(null);
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('detail');
  };

  const handleCreateReportSuccess = () => {
    setCurrentView('dashboard');
  };

  // If user session is not active, force Login Card rendering
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} backendUrl={BACKEND_URL} />;
  }

  // Render content depending on client-side routing state
  const renderViewContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onSelectProject={handleSelectProject}
            onOpenNewReportForm={() => setCurrentView('form')}
            backendUrl={BACKEND_URL}
          />
        );
      case 'projects':
      case 'detail':
        return (
          <DetailView
            projectId={selectedProjectId}
            onBack={() => setCurrentView('dashboard')}
            backendUrl={BACKEND_URL}
          />
        );
      case 'form':
        return (
          <ReportForm
            user={user}
            onCancel={() => setCurrentView('dashboard')}
            onSubmitSuccess={handleCreateReportSuccess}
            backendUrl={BACKEND_URL}
          />
        );
      default:
        return (
          <Dashboard
            user={user}
            onSelectProject={handleSelectProject}
            onOpenNewReportForm={() => setCurrentView('form')}
            backendUrl={BACKEND_URL}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Persistent Navigation Header */}
      <header className="app-header">
        <div className="logo-container" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-mark">G</div>
          <div>
            <h1 className="logo-text">Glory Simon Interiors</h1>
            <div className="logo-sub">Site Progress System</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="header-nav" style={{ display: 'flex', gap: '1.5rem', marginRight: 'auto', marginLeft: '2.5rem' }}>
          <button 
            className={`nav-link-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: currentView === 'dashboard' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              color: currentView === 'dashboard' ? 'var(--accent-gold)' : '#cfd1d4',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '0.25rem 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'var(--transition)'
            }}
          >
            Dashboard
          </button>
          
          {user.role !== 'Client' && (
            <button 
              className={`nav-link-btn ${currentView === 'form' ? 'active' : ''}`}
              onClick={() => setCurrentView('form')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: currentView === 'form' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                color: currentView === 'form' ? 'var(--accent-gold)' : '#cfd1d4',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.25rem 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'var(--transition)'
              }}
            >
              New Update Form
            </button>
          )}
        </nav>

        {/* User Identity & Logout Button */}
        <div className="header-user">
          <div className="user-badge">
            <span>👤</span>
            <span>
              {user.name} | <span className="role-tag">{user.role}</span>
            </span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* View Switch Cases */}
      <main style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
        {renderViewContent()}
      </main>
    </div>
  );
}
