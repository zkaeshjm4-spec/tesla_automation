'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Settings, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Terminal,
  FileCode,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  // Settings state (Persisted in localStorage)
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [pat, setPat] = useState('');
  
  // App state
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState(null);
  
  // Secret modal state
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [storageStateJson, setStorageStateJson] = useState('');
  const [syncingSecret, setSyncingSecret] = useState(false);
  const [secretMessage, setSecretMessage] = useState(null);

  // Load settings on mount
  useEffect(() => {
    const savedOwner = localStorage.getItem('gh_owner') || '';
    const savedRepo = localStorage.getItem('gh_repo') || '';
    const savedPat = localStorage.getItem('gh_pat') || '';

    setOwner(savedOwner);
    setRepo(savedRepo);
    setPat(savedPat);

    if (savedOwner && savedRepo && savedPat) {
      fetchRuns(savedOwner, savedRepo, savedPat);
    } else {
      setShowSettingsModal(true);
    }
  }, []);

  const saveSettings = (newOwner, newRepo, newPat) => {
    localStorage.setItem('gh_owner', newOwner);
    localStorage.setItem('gh_repo', newRepo);
    localStorage.setItem('gh_pat', newPat);
    setOwner(newOwner);
    setRepo(newRepo);
    setPat(newPat);
    setShowSettingsModal(false);
    fetchRuns(newOwner, newRepo, newPat);
  };

  const fetchRuns = async (o = owner, r = repo, p = pat) => {
    if (!o || !r || !p) return;
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/github/runs?owner=${encodeURIComponent(o)}&repo=${encodeURIComponent(r)}&pat=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (res.ok) {
        setRuns(data.runs || []);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const triggerWorkflow = async () => {
    if (!owner || !repo || !pat) {
      setShowSettingsModal(true);
      return;
    }

    setTriggering(true);
    setTriggerMessage(null);

    try {
      const res = await fetch('/api/github/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, pat }),
      });

      const data = await res.json();
      if (res.ok) {
        setTriggerMessage({ type: 'success', text: '⚡ Workflow triggered! Starting on GitHub Actions...' });
        setTimeout(() => fetchRuns(), 3000);
      } else {
        setTriggerMessage({ type: 'error', text: data.error || 'Failed to trigger workflow.' });
      }
    } catch (err) {
      setTriggerMessage({ type: 'error', text: err.message });
    } finally {
      setTriggering(false);
    }
  };

  const syncSecret = async () => {
    if (!storageStateJson.trim()) {
      setSecretMessage({ type: 'error', text: 'Please paste your storage_state.json content.' });
      return;
    }

    setSyncingSecret(true);
    setSecretMessage(null);

    try {
      const res = await fetch('/api/github/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, pat, secretValue: storageStateJson }),
      });

      const data = await res.json();
      if (res.ok) {
        setSecretMessage({ type: 'success', text: '✅ Tesla Session updated in GitHub Secrets successfully!' });
        setTimeout(() => setShowSecretModal(false), 2000);
      } else {
        setSecretMessage({ type: 'error', text: data.error || 'Failed to update secret.' });
      }
    } catch (err) {
      setSecretMessage({ type: 'error', text: err.message });
    } finally {
      setSyncingSecret(false);
    }
  };

  const latestRun = runs[0];
  const isLatestRunSuccess = latestRun?.conclusion === 'success';
  const isLatestRunFailed = latestRun?.conclusion === 'failure';
  const isLatestRunRunning = latestRun?.status === 'in_progress' || latestRun?.status === 'queued';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e82127', display: 'inline-block', boxShadow: '0 0 12px #e82127' }}></span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Tesla Automation Control Center</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            GitHub Actions + Vercel Fleet Driver Payment Automation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => fetchRuns()}>
            <RefreshCw size={16} className={loadingRuns ? 'animate-spin' : ''} />
            Refresh Status
          </button>
          <button className="btn-secondary" onClick={() => setShowSettingsModal(true)}>
            <Settings size={16} />
            Config
          </button>
        </div>
      </header>

      {/* Main Grid Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Trigger Automation Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} color="var(--accent-red)" />
                <h3 style={{ fontSize: '1.1rem' }}>Run Automation</h3>
              </div>
              <span className="badge badge-running">Cloud Trigger</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Execute Playwright driver payment responsibility automation on GitHub Actions runners immediately.
            </p>
          </div>

          <div>
            <button 
              className="btn-primary" 
              onClick={triggerWorkflow} 
              disabled={triggering || isLatestRunRunning}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Play size={18} fill="currentColor" />
              {triggering ? 'Launching Workflow...' : 'Trigger Automation Now'}
            </button>
            
            {triggerMessage && (
              <div style={{ 
                marginTop: '14px', 
                fontSize: '0.85rem', 
                padding: '10px 14px', 
                borderRadius: '8px',
                background: triggerMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: triggerMessage.type === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${triggerMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {triggerMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* Auth / Session State Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={22} color="var(--accent-yellow)" />
                <h3 style={{ fontSize: '1.1rem' }}>Tesla Session Auth</h3>
              </div>
              <span className={isLatestRunFailed ? "badge badge-failed" : "badge badge-success"}>
                {isLatestRunFailed ? 'Session Alert' : 'Session Ready'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Manages your Tesla account SSO authentication state (`storage_state.json`) synced to GitHub Repository Secrets.
            </p>
          </div>

          <div>
            <button 
              className="btn-secondary" 
              onClick={() => setShowSecretModal(true)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Lock size={16} />
              Re-authenticate / Sync Cookies
            </button>
          </div>
        </div>

        {/* Latest Run Status Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.1rem' }}>Latest Execution</h3>
              </div>
              {latestRun && (
                <span className={`badge ${
                  isLatestRunRunning ? 'badge-running' : isLatestRunSuccess ? 'badge-success' : 'badge-failed'
                }`}>
                  {latestRun.status === 'in_progress' ? 'Running' : latestRun.conclusion || latestRun.status}
                </span>
              )}
            </div>

            {latestRun ? (
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>
                  Run #{latestRun.run_number} ({latestRun.event})
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Started: {new Date(latestRun.created_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No recent workflow runs found.</p>
            )}
          </div>

          {latestRun && (
            <div style={{ marginTop: '16px' }}>
              <a 
                href={latestRun.html_url} 
                target="_blank" 
                rel="noreferrer"
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                View Logs on GitHub <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Run History Table */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Execution History</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Repo: {owner}/{repo || 'Not configured'}
          </span>
        </div>

        {loadingRuns ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading workflow execution history...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No workflow runs recorded yet. Click <strong>Trigger Automation Now</strong> to start!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Run #</th>
                  <th style={{ padding: '12px 16px' }}>Event Source</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>#{run.run_number}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{run.event}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${
                        run.status === 'in_progress' ? 'badge-running' : 
                        run.conclusion === 'success' ? 'badge-success' : 'badge-failed'
                      }`}>
                        {run.status === 'in_progress' ? 'In Progress' : run.conclusion}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <a 
                        href={run.html_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Logs <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secret / Cookie Re-authentication Modal */}
      {showSecretModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={22} color="var(--accent-yellow)" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Tesla Session & Cookie Sync</h2>
              </div>
              <button className="btn-secondary" onClick={() => setShowSecretModal(false)} style={{ padding: '6px 12px' }}>✕</button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              If your Tesla session expires or logs out, run your local script or export your browser state (`storage_state.json`), paste the JSON below, and click <strong>Sync Session Secret</strong>.
            </p>

            <textarea 
              className="input-field"
              rows={8}
              placeholder='Paste storage_state.json content here (e.g. { "cookies": [...], "origins": [...] })'
              value={storageStateJson}
              onChange={(e) => setStorageStateJson(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '16px' }}
            />

            {secretMessage && (
              <div style={{ 
                marginBottom: '16px', 
                fontSize: '0.85rem', 
                padding: '10px 14px', 
                borderRadius: '8px',
                background: secretMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: secretMessage.type === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${secretMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {secretMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setShowSecretModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={syncSecret} disabled={syncingSecret}>
                {syncingSecret ? 'Syncing to GitHub Secret...' : 'Sync Session Secret'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color="var(--accent-red)" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>GitHub Integration Settings</h2>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Enter your GitHub repository details and Personal Access Token (PAT) so Vercel can trigger your Actions workflows.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>GitHub Owner (Username or Org)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. myusername" 
                  value={owner} 
                  onChange={(e) => setOwner(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Repository Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. tesla-automation" 
                  value={repo} 
                  onChange={(e) => setRepo(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>GitHub Personal Access Token (PAT with repo & workflow scopes)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                  value={pat} 
                  onChange={(e) => setPat(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-primary" 
                onClick={() => saveSettings(owner, repo, pat)}
                disabled={!owner || !repo || !pat}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Save Settings & Connect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
