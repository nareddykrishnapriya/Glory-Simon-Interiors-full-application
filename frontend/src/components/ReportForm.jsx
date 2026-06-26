import React, { useState, useEffect } from 'react';

export default function ReportForm({ user, onCancel, onSubmitSuccess, backendUrl }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [workUpdates, setWorkUpdates] = useState('');
  
  // Interactive Task List
  const [tasks, setTasks] = useState([]);
  const [currentTaskInput, setCurrentTaskInput] = useState('');
  
  // Issues & Plan
  const [issuesList, setIssuesList] = useState([]);
  const [currentIssueInput, setCurrentIssueInput] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [status, setStatus] = useState('On Track');
  
  // Photos
  const [uploadedPhotos, setUploadedPhotos] = useState([]); // Array of { name, caption, url }
  
  // States
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState('');

  // Load Projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch(`${backendUrl}/api/projects`);
        if (!response.ok) throw new Error('Failed to load active projects list');
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setBackendError(err.message);
      } finally {
        setProjectsLoading(false);
      }
    }
    fetchProjects();
  }, [backendUrl]);

  // Sync status if issues are added
  useEffect(() => {
    if (issuesList.length > 0) {
      setStatus('Action Required');
    } else {
      setStatus('On Track');
    }
  }, [issuesList]);

  // Add Task
  const handleAddTask = () => {
    if (currentTaskInput.trim()) {
      setTasks([...tasks, currentTaskInput.trim()]);
      setCurrentTaskInput('');
      setErrors((prev) => ({ ...prev, completed_tasks: '' }));
    }
  };

  // Remove Task
  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, idx) => idx !== index));
  };

  // Add Issue
  const handleAddIssue = () => {
    if (currentIssueInput.trim()) {
      setIssuesList([...issuesList, currentIssueInput.trim()]);
      setCurrentIssueInput('');
    }
  };

  // Remove Issue
  const handleRemoveIssue = (index) => {
    setIssuesList(issuesList.filter((_, idx) => idx !== index));
  };

  // File Upload Handling — convert to Base64 so the image persists in DB
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedPhotos(prev => [...prev, {
          name: file.name,
          caption: `Progress snapshot: ${file.name.split('.')[0].replace(/[-_]/g, ' ')}`,
          url: ev.target.result  // Base64 data URL — permanent, works after reload
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Trigger file browser
  const triggerFileInput = () => {
    document.getElementById('file-upload-input').click();
  };

  // Remove photo preview
  const handleRemovePhoto = (index) => {
    setUploadedPhotos(uploadedPhotos.filter((_, idx) => idx !== index));
  };

  // Submit Report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBackendError('');

    // Client-side validations (Mandatory checks for Daily Work Updates)
    const newErrors = {};
    if (!selectedProjectId) newErrors.project_id = 'Project selection is required.';
    if (!workUpdates.trim()) newErrors.work_updates = 'Daily Work Updates field is required and cannot be empty.';
    if (tasks.length === 0) newErrors.completed_tasks = 'At least one completed task must be added.';
    if (!nextDayPlan.trim()) newErrors.next_day_plan = 'Next day plan details are required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const reportData = {
      project_id: parseInt(selectedProjectId),
      user_id: user.user_id,
      work_details: workUpdates.trim(),
      completed_tasks: tasks,
      issues_reported: issuesList.length > 0 ? issuesList.join('\n') : null,
      next_day_plans: nextDayPlan.trim(),
      photo_url: uploadedPhotos.length > 0 ? uploadedPhotos[0].url : null,
      status: status
    };

    try {
      const response = await fetch(`${backendUrl}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server rejected the report submission.');
      }

      onSubmitSuccess();
    } catch (err) {
      setBackendError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add dummy/sample photo for demo convenience
  const handleAddSamplePhoto = () => {
    const sampleImages = [
      { name: 'living_room_plaster.jpg', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80', caption: 'False ceiling board installation' },
      { name: 'kitchen_counter_marble.jpg', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', caption: 'Italian marble countertop alignment' },
      { name: 'electrical_conduits.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', caption: 'Ceiling wiring inspection and testing' }
    ];
    
    // Choose one at random
    const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    setUploadedPhotos([...uploadedPhotos, {
      ...randomImg,
      // Unique name to avoid clashes
      name: `${Date.now()}_${randomImg.name}`
    }]);
  };

  return (
    <div className="form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', color: 'var(--primary-color)' }}>
            Submit Daily Progress Update
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Documenting site activities as <span style={{ fontWeight: 600, color: 'var(--accent-gold-hover)' }}>{user.name} ({user.role})</span>
          </p>
        </div>
        <button className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>

      {backendError && (
        <div className="auth-error" style={{ marginBottom: '2rem' }}>
          <span>⚠️</span>
          <span>{backendError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Project Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-project">Select Project *</label>
            {projectsLoading ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading projects...</div>
            ) : (
              <select
                id="form-project"
                className="form-select"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setErrors(prev => ({ ...prev, project_id: '' }));
                }}
                disabled={loading}
              >
                <option value="">-- Choose Active Project --</option>
                {projects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.project_name} ({proj.project_type})
                  </option>
                ))}
              </select>
            )}
            {errors.project_id && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.project_id}</span>}
          </div>

          {/* Report Date (Auto-Logged Today) */}
          <div className="form-group">
            <label className="form-label">Report Date</label>
            <input
              type="text"
              className="form-input"
              value={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              disabled
            />
          </div>

          {/* Daily Work Updates */}
          <div className="form-group form-grid-full">
            <label className="form-label" htmlFor="form-updates">Daily Work Updates (What was done today) *</label>
            <textarea
              id="form-updates"
              className="form-textarea"
              placeholder="Describe the detailed carpentry, masonry, painting or cleaning updates carried out on site today..."
              value={workUpdates}
              onChange={(e) => {
                setWorkUpdates(e.target.value);
                setErrors(prev => ({ ...prev, work_updates: '' }));
              }}
              disabled={loading}
            />
            {errors.work_updates && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.work_updates}</span>}
          </div>

          {/* Interactive Completed Tasks Builder */}
          <div className="form-group form-grid-full">
            <label className="form-label">Completed Milestones / Tasks (Today) *</label>
            <div className="tasks-builder-container">
              <div className="task-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electrical wiring completed in Living Room"
                  value={currentTaskInput}
                  onChange={(e) => setCurrentTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  disabled={loading}
                />
                <button type="button" className="btn-add-task" onClick={handleAddTask} disabled={loading}>
                  + Add
                </button>
              </div>

              {tasks.length > 0 ? (
                <div className="task-items-list">
                  {tasks.map((task, index) => (
                    <div key={index} className="task-item">
                      <span>✓ {task}</span>
                      <button type="button" className="btn-remove-task" onClick={() => handleRemoveTask(index)} disabled={loading}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No completed tasks listed. Add at least one task above.
                </div>
              )}
            </div>
            {errors.completed_tasks && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.completed_tasks}</span>}
          </div>

          {/* Next Day Plan */}
          <div className="form-group form-grid-full">
            <label className="form-label" htmlFor="form-next-plan">Next-Day Scheduled Action Plan *</label>
            <textarea
              id="form-next-plan"
              className="form-textarea"
              placeholder="Outline the designated milestones for the upcoming working hours..."
              value={nextDayPlan}
              onChange={(e) => {
                setNextDayPlan(e.target.value);
                setErrors(prev => ({ ...prev, next_day_plan: '' }));
              }}
              disabled={loading}
            />
            {errors.next_day_plan && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.next_day_plan}</span>}
          </div>

          {/* Dynamic Reported Issues/Snags Builder */}
          <div className="form-group form-grid-full">
            <label className="form-label">Reported Issues / Snags / Blockers (If any)</label>
            <div className="tasks-builder-container" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'rgba(201, 87, 80, 0.2)' }}>
              <div className="task-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electrical conduit clash with AC duct path"
                  value={currentIssueInput}
                  onChange={(e) => setCurrentIssueInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIssue();
                    }
                  }}
                  disabled={loading}
                />
                <button type="button" className="btn-add-task" style={{ backgroundColor: 'var(--color-danger)' }} onClick={handleAddIssue} disabled={loading}>
                  + Add
                </button>
              </div>

              {issuesList.length > 0 ? (
                <div className="task-items-list">
                  {issuesList.map((issue, index) => (
                    <div key={index} className="task-item" style={{ borderColor: 'rgba(201, 87, 80, 0.2)' }}>
                      <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>⚠️ {issue}</span>
                      <button type="button" className="btn-remove-task" onClick={() => handleRemoveIssue(index)} disabled={loading}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No issues or snags listed. Add any active blockers above.
                </div>
              )}
            </div>

          </div>

          {/* Photo Upload Zone */}
          <div className="form-group form-grid-full">
            <label className="form-label">Progress Photo Uploads</label>
            <div className="dropzone" onClick={triggerFileInput}>
              <div className="dropzone-icon">📷</div>
              <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                Drag & Drop or Click to browse photos
              </p>
              <p>Supports JPG, JPEG, PNG formats</p>
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="refresh-button"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                onClick={handleAddSamplePhoto}
                disabled={loading}
              >
                🖼️ Add High-Res Sample Progress Photo
              </button>
            </div>

            {uploadedPhotos.length > 0 && (
              <div className="dropzone-preview-grid">
                {uploadedPhotos.map((photo, idx) => (
                  <div key={idx} className="preview-thumbnail">
                    <img src={photo.url} alt={`Preview ${idx}`} />
                    <button
                      type="button"
                      className="remove-preview-btn"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-accent"
            disabled={loading}
          >
            {loading ? 'Submitting Report...' : 'Publish Update'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}
