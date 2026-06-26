import React, { useState, useEffect } from 'react';
import './../App.css';

export default function DetailView({ projectId, onBack, backendUrl }) {
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjectAndReports = async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Project Profile details
      const projectRes = await fetch(`${backendUrl}/api/projects/detail/${id}`);
      if (!projectRes.ok) {
        throw new Error('Could not retrieve project profile details');
      }
      const projectData = await projectRes.json();
      setProject(projectData);

      // 2. Fetch Daily Progress Reports for this project
      const reportsRes = await fetch(`${backendUrl}/api/reports/list?project_id=${id}`);
      if (!reportsRes.ok) {
        throw new Error('Could not retrieve daily progress logs for this project');
      }
      const reportsData = await reportsRes.json();
      setReports(reportsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndReports(projectId);
  }, [projectId, backendUrl]);

  if (!projectId) {
    return (
      <div className="dashboard-container">
        <div className="no-data-card" style={{ padding: '6rem 2rem', border: '1px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div className="no-data-icon" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📁</div>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.75rem', fontWeight: 600 }}>No Project Selected</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 2rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            To view sequential daily progress reports, timeline updates, and photographic logs, please select an active project from the main dashboard.
          </p>
          <button className="btn-accent" onClick={onBack}>
            ➔ Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Retrieving project timeline and reports...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="dashboard-container">
        <div className="auth-error" style={{ margin: '2rem 0' }}>
          <span>⚠️</span>
          <span>{error || 'Selected project details could not be loaded.'}</span>
        </div>
        <button className="btn-secondary" onClick={onBack}>
          ➔ Back to Dashboard
        </button>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Control */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={onBack}>
          🡨 Back to Main Dashboard
        </button>
        <span className={`badge badge-${(project.status || 'In Progress').toLowerCase().replace(' ', '-')}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          {project.status || 'In Progress'}
        </span>
      </div>

      {/* Selected Project Profile Card */}
      <div className="sidebar-panel" style={{ width: '100%', marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>
        <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>{project.project_name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Project Type: <strong>{project.project_type}</strong> | Client: <strong>{project.client_name}</strong>
          </p>
        </div>
        <div>
          <div className="meta-details-list">
            <div className="meta-detail-item">
              <span className="meta-detail-label">Scope / Room Details</span>
              <span className="meta-detail-value">{project.room_details || 'N/A'}</span>
            </div>
            <div className="meta-detail-item">
              <span className="meta-detail-label">Start Date</span>
              <span className="meta-detail-value">{formatDate(project.start_date)}</span>
            </div>
            <div className="meta-detail-item">
              <span className="meta-detail-label">Scheduled Completion Date</span>
              <span className="meta-detail-value">{formatDate(project.end_date)}</span>
            </div>
          </div>
        </div>
        </div>

      {/* Sequential Feed of Daily Progress Reports */}
      <div>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', borderBottom: '2px solid var(--accent-gold)', paddingBottom: '0.5rem', display: 'inline-block' }}>
          Daily Progress Reports Feed ({reports.length})
        </h2>

        {reports.length > 0 ? (
          <div className="timeline-feed" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {reports.map((report, index) => {
              const reportDateFormatted = new Date(report.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const reportTimeFormatted = new Date(report.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={report.report_id} className="detail-main" style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', position: 'relative' }}>
                  
                  {/* Report Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{reportDateFormatted}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Submitted at {reportTimeFormatted} by <strong>{report.reporter_name}</strong> ({report.reporter_role})
                      </p>
                    </div>
                    <span className={`badge badge-${report.status.toLowerCase().replace(' ', '-')}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      {report.status}
                    </span>
                  </div>

                  {/* Issues Encountered Alerts */}
                  {report.issues_reported && (
                    <div className="issue-alert-box" style={{ marginBottom: '1.25rem' }}>
                      <div className="issue-alert-icon">⚠️</div>
                      <div className="issue-alert-content">
                        <h4 style={{ margin: 0, fontWeight: 700 }}>Site Blocker / Issue Reported</h4>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                          {report.issues_reported.split('\n').map((issue, idx) => (
                            <div key={idx} style={{ marginBottom: '0.25rem' }}>• {issue}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ gridColumn: window.innerWidth < 768 ? 'span 2' : 'span 1' }}>
                      {/* Work Details */}
                      <div className="detail-section">
                        <h4 className="detail-section-title" style={{ fontSize: '0.9rem', color: 'var(--accent-gold-hover)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Today's Work Updates
                        </h4>
                        <p className="detail-text" style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {report.work_details}
                        </p>
                      </div>

                      {/* Next Day Plan */}
                      <div className="detail-section">
                        <h4 className="detail-section-title" style={{ fontSize: '0.9rem', color: 'var(--accent-gold-hover)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Next Day Scheduled Plan
                        </h4>
                        <p className="detail-text" style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {report.next_day_plans}
                        </p>
                      </div>
                    </div>

                    <div style={{ gridColumn: window.innerWidth < 768 ? 'span 2' : 'span 1' }}>
                      {/* Completed Milestones */}
                      <div className="detail-section">
                        <h4 className="detail-section-title" style={{ fontSize: '0.9rem', color: 'var(--accent-gold-hover)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Completed Milestones & Tasks
                        </h4>
                        {report.completed_tasks && report.completed_tasks.length > 0 ? (
                          <ul className="detail-list" style={{ paddingLeft: '0.25rem' }}>
                            {report.completed_tasks.map((task, idx) => (
                              <li key={idx} style={{ marginBottom: '0.4rem', fontSize: '0.95rem' }}>✓ {task}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No completed tasks recorded.
                          </p>
                        )}
                      </div>

                      {/* Photo Gallery with Placeholder Slot */}
                      <div className="detail-section" style={{ marginBottom: 0 }}>
                        <h4 className="detail-section-title" style={{ fontSize: '0.9rem', color: 'var(--accent-gold-hover)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Progress Photo Attachments
                        </h4>
                        {report.photo_url ? (
                          <div className="detail-photo-gallery">
                            <div className="gallery-card">
                              <img
                                className="gallery-image"
                                src={report.photo_url}
                                alt="Site Progress Photo"
                                onClick={() => window.open(report.photo_url, '_blank')}
                                style={{ cursor: 'zoom-in', maxHeight: '180px', objectFit: 'cover', width: '100%', borderRadius: '4px' }}
                              />
                              <div className="gallery-caption" title="Site Progress Photo">
                                Progress snapshot
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '4px', backgroundColor: '#faf9f6', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', display: 'block' }}>
                              Camera details / Site photograph slot
                            </span>
                            <span style={{ color: '#a0a2a5', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                              (No attachment uploaded)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-data-card" style={{ padding: '4rem 2rem' }}>
            <div className="no-data-icon">📝</div>
            <h3>No Progress Reports Logged</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              The site team hasn't submitted any daily progress logs for this project yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
