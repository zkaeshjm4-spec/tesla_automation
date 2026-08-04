'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  Key, 
  Clock, 
  Settings, 
  ExternalLink, 
  Zap,
  Lock,
  MonitorPlay,
  Globe
} from 'lucide-react';

export default function Dashboard() {
  // Settings state (Defaults to repo owner/name)
  const [owner, setOwner] = useState('zkaeshjm4-spec');
  const [repo, setRepo] = useState('tesla_automation');
  const [pat, setPat] = useState('');
  
  // App state
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState(null);
  const [visualRunning, setVisualRunning] = useState(false);
  
  // Secret modal state
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [storageStateJson, setStorageStateJson] = useState('');
  const [syncingSecret, setSyncingSecret] = useState(false);
  const [secretMessage, setSecretMessage] = useState(null);

  const teslaFleetUrl = "https://www.tesla.com/teslaaccount/business/fleets/landing/1d567283-8292-40a7-8bbe-224aa88e85f8";

  // Load saved settings or fetch automatically via server env
  useEffect(() => {
    const savedOwner = localStorage.getItem('gh_owner') || 'zkaeshjm4-spec';
    const savedRepo = localStorage.getItem('gh_repo') || 'tesla_automation';
    const savedPat = localStorage.getItem('gh_pat') || '';

    setOwner(savedOwner);
    setRepo(savedRepo);
    setPat(savedPat);

    fetchRuns(savedOwner, savedRepo, savedPat);
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
    setLoadingRuns(true);
    try {
      const url = `/api/github/runs?owner=${encodeURIComponent(o)}&repo=${encodeURIComponent(r)}${p ? `&pat=${encodeURIComponent(p)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  // 1. VISUAL LOCAL AUTOMATION: Opens Tesla in New Tab & Spawns Local Playwright Automation
  const runVisualLocalAutomation = async () => {
    setVisualRunning(true);
    setTriggerMessage(null);

    // Open Tesla Fleet landing page in a new browser tab immediately
    window.open(teslaFleetUrl, '_blank');

    try {
      const res = await fetch('/api/local/run', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setTriggerMessage({ 
          type: 'success', 
          text: '🖥️ Tesla tab opened! Visual automation is running live in your Chrome window...' 
        });
      } else {
        setTriggerMessage({ 
          type: 'error', 
          text: data.error || 'Could not start visual local process.' 
        });
      }
    } catch (err) {
      setTriggerMessage({ type: 'error', text: err.message });
    } finally {
      setVisualRunning(false);
    }
  };

  // 2. CLOUD GITHUB ACTIONS TRIGGER
  const triggerWorkflow = async () => {
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
        setTriggerMessage({ type: 'success', text: '⚡ Cloud workflow triggered on GitHub Actions!' });
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
            Visual Local Automation & Cloud GitHub Actions Driver Payment System
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

      {/* Main Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Visual Live Local Automation Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(232, 33, 39, 0.4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MonitorPlay size={24} color="var(--accent-red)" />
                <h3 style={{ fontSize: '1.15rem' }}>Run Visual Automation</h3>
              </div>
              <span className="badge badge-success">Live Visual</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Opens Tesla Fleet portal in a <strong>new tab</strong> and executes visual Playwright automation on screen so you can watch row traversal and driver payment updates live.
            </p>
          </div>

          <div>
            <button 
              className="btn-primary" 
              onClick={runVisualLocalAutomation} 
              disabled={visualRunning}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '14px 20px' }}
            >
              <Globe size={18} />
              {visualRunning ? 'Opening Tab & Automating...' : 'Open Tesla Tab & Run Visual Automation'}
            </button>
          </div>
        </div>

        {/* Cloud GitHub Actions Automation Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={24} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.15rem' }}>Trigger Cloud Action</h3>
              </div>
              <span className="badge badge-running">3-Hour Cron</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Launches headless Python automation in the cloud on GitHub Actions runners (Also runs automatically every 3 hours).
            </p>
          </div>

          <div>
            <button 
              className="btn-secondary" 
              onClick={triggerWorkflow} 
              disabled={triggering || isLatestRunRunning}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '14px 20px' }}
            >
              <Play size={18} fill="currentColor" />
              {triggering ? 'Launching Cloud Workflow...' : 'Trigger Cloud Run on GitHub'}
            </button>
          </div>
        </div>

        {/* Tesla Auth / Session State Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={24} color="var(--accent-yellow)" />
                <h3 style={{ fontSize: '1.15rem' }}>Tesla Session Manager</h3>
              </div>
              <span className={isLatestRunFailed ? "badge badge-failed" : "badge badge-success"}>
                {isLatestRunFailed ? 'Session Alert' : 'Session Ready'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Manages your Tesla SSO session cookies (`storage_state.json`) synced with GitHub Repository Secrets.
            </p>
          </div>

          <div>
            <button 
              className="btn-secondary" 
              onClick={() => setShowSecretModal(true)}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '14px 20px' }}
            >
              <Lock size={16} />
              Re-authenticate / Sync Secret
            </button>
          </div>
        </div>

      </div>

      {/* Global Status Message */}
      {triggerMessage && (
        <div style={{ 
          marginBottom: '28px', 
          fontSize: '0.9rem', 
          padding: '14px 18px', 
          borderRadius: '12px',
          background: triggerMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: triggerMessage.type === 'success' ? '#34d399' : '#f87171',
          border: `1px solid ${triggerMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {triggerMessage.text}
        </div>
      )}

      {/* Execution History Table */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Execution History</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Repo: {owner}/{repo}
          </span>
        </div>

        {loadingRuns ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading workflow execution history...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No workflow runs recorded yet. Click <strong>Run Visual Automation</strong> or <strong>Trigger Cloud Run</strong> to start!
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
              If your Tesla session expires or logs out, run visual local automation or export your browser state (`storage_state.json`), paste the JSON below, and click <strong>Sync Session Secret</strong>.
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
              Enter your GitHub PAT token or configure <code>GITHUB_PAT</code> in environment variables:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>GitHub Owner</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="zkaeshjm4-spec" 
                  value={owner} 
                  onChange={(e) => setOwner(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Repository Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="tesla_automation" 
                  value={repo} 
                  onChange={(e) => setRepo(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>GitHub PAT Token</label>
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
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
