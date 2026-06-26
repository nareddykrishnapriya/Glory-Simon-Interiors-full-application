import React, { useState, useEffect } from 'react';
import './../App.css';

export default function Dashboard({ user, onSelectProject, onOpenNewReportForm, backendUrl }) {
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // KPIs
  const [kpis, setKpis] = useState({
    totalReports: 0,
    openIssues: 0,
    activeProjects: 0
  });

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  // Project Form States
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectType, setProjectType] = useState('Residential');
  const [roomDetails, setRoomDetails] = useState('');
  const [projectStatus, setProjectStatus] = useState('In Progress');
  const [projectProgress, setProjectProgress] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Check roles authorized to perform CRUD on Projects (All roles except Client)
  const canManageProjects = user.role !== 'Client';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const reportsRes = await fetch(`${backendUrl}/api/reports/list`);
      if (!reportsRes.ok) throw new Error('Failed to load daily progress reports');
      const reportsData = await reportsRes.json();
      setReports(reportsData);

      const projectsRes = await fetch(`${backendUrl}/api/projects`);
      if (!projectsRes.ok) throw new Error('Failed to load projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData);

      // Compute dashboard KPIs
      const total = reportsData.length;
      const issues = reportsData.filter(r => r.status === 'Action Required' || r.issues_reported).length;
      const activeProjCount = projectsData.filter(p => p.status === 'In Progress').length;

      setKpis({
        totalReports: total,
        openIssues: issues,
        activeProjects: activeProjCount
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [backendUrl]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Open modal to Create Project
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectName('');
    setClientName('');
    setProjectType('Residential');
    setRoomDetails('');
    setProjectStatus('Planning');
    setProjectProgress(0);
    setStartDate('');
    setEndDate('');
    setModalError('');
    setShowProjectModal(true);
  };

  // Open modal to Edit Project
  const handleOpenEditProject = (proj) => {
    setEditingProject(proj);
    setProjectName(proj.project_name || '');
    setClientName(proj.client_name || '');
    setProjectType(proj.project_type || 'Residential');
    setRoomDetails(proj.room_details || '');
    setProjectStatus(proj.status || 'In Progress');
    setProjectProgress(proj.progress || 0);
    
    // Format dates to YYYY-MM-DD for date inputs
    const fmtDate = (dStr) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return '';
      }
    };
    setStartDate(fmtDate(proj.start_date));
    setEndDate(fmtDate(proj.end_date));
    
    setModalError('');
    setShowProjectModal(true);
  };

  // Submit Project Form
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!projectName.trim() || !clientName.trim() || !projectType.trim()) {
      setModalError('Project Name, Client Name, and Project Type are required.');
      return;
    }

    setModalLoading(true);
    const url = editingProject 
      ? `${backendUrl}/api/projects/update/${editingProject.project_id}`
      : `${backendUrl}/api/projects/create`;
    const method = editingProject ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName.trim(),
          client_name: clientName.trim(),
          project_type: projectType,
          room_details: roomDetails.trim(),
          status: projectStatus,
          progress: parseInt(projectProgress) || 0,
          start_date: startDate || null,
          end_date: endDate || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save project.');

      setShowProjectModal(false);
      fetchData(); // Refresh list
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? All associated daily progress reports will be permanently deleted.")) {
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/projects/delete/${projectId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete project.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Upper Dashboard Controls */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Interior Site Operations</h1>
          <p>Real-time progress overview and active projects</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canManageProjects && (
            <button className="btn-accent" onClick={handleOpenCreateProject}>
              <span>+</span> Add New Project
            </button>
          )}
          {user.role !== 'Client' && (
            <button className="btn-primary" style={{ marginTop: 0 }} onClick={onOpenNewReportForm}>
              📝 Log Site Progress
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card reports">
          <div className="kpi-info">
            <h3>Active Projects</h3>
            <div className="kpi-val">{kpis.activeProjects}</div>
          </div>
          <div className="kpi-icon-wrapper">📁</div>
        </div>

        <div className="kpi-card milestones">
          <div className="kpi-info">
            <h3>Total Submissions</h3>
            <div className="kpi-val">{kpis.totalReports}</div>
          </div>
          <div className="kpi-icon-wrapper">📝</div>
        </div>

        <div className="kpi-card issues">
          <div className="kpi-info">
            <h3>Active Issues / Snags</h3>
            <div className="kpi-val">{kpis.openIssues}</div>
          </div>
          <div className="kpi-icon-wrapper">⚠️</div>
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Projects Tracker Section */}
      <div className="table-responsive" style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem auto', width: '35px', height: '35px' }}></div>
            Retrieving projects directory...
          </div>
        ) : projects.length > 0 ? (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Project Details</th>
                <th>Client Name</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => (
                <tr key={proj.project_id}>
                  <td>
                    <div className="project-cell-name">{proj.project_name}</div>
                    <div className="project-cell-type">{proj.project_type}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{proj.client_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{proj.room_details || 'N/A'}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${(proj.status || 'In Progress').toLowerCase().replace(/ /g, '-')}`}>
                      {proj.status || 'In Progress'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-table-action" 
                        style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold-hover)' }}
                        onClick={() => onSelectProject(proj.project_id)}
                      >
                        Reports ➔
                      </button>
                      {canManageProjects && (
                        <>
                          <button className="btn-table-action" onClick={() => handleOpenEditProject(proj)}>
                            Edit
                          </button>
                          <button 
                            className="btn-table-action" 
                            style={{ color: 'var(--color-danger)', borderColor: 'rgba(201, 87, 80, 0.3)' }}
                            onClick={() => handleDeleteProject(proj.project_id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data-card">
            <div className="no-data-icon">📂</div>
            <h3>No Projects Registered</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Create a new project by clicking the "+ Add New Project" button above.
            </p>
          </div>
        )}
      </div>


      {/* Overlay Modal for Adding/Editing Projects */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingProject ? 'Modify Project Profile' : 'Register New Project'}</h2>
              <button className="modal-close-btn" onClick={() => setShowProjectModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleProjectSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
                    <span>⚠️</span>
                    <span>{modalError}</span>
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Project Title *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Luxury Penthouse - Hiranandani" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Client Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Alice Vance" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Project Type *</label>
                    <select 
                      className="form-select" 
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      disabled={modalLoading}
                      required
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Room / Scope Details</label>
                    <textarea 
                      className="form-textarea" 
                      style={{ minHeight: '80px' }}
                      placeholder="e.g. Living Room, Modular Kitchen, Master Bedroom" 
                      value={roomDetails}
                      onChange={(e) => setRoomDetails(e.target.value)}
                      disabled={modalLoading}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Project Status</label>
                    <select 
                      className="form-select" 
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                      disabled={modalLoading}
                    >
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Not Completed">Not Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  
                  
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={modalLoading}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Scheduled End Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={modalLoading}
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowProjectModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-accent"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : (editingProject ? 'Save Changes' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
