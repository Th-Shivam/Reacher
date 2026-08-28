import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { IconPlus, IconArrowRight, IconX } from '@tabler/icons-react';

/** Derive a short target role label from a free-text job description */
function extractRole(jd: string): string {
  if (!jd) return 'Target Role';
  // Take first line or first 40 chars, whichever is shorter
  const first = jd.split('\n')[0].trim();
  return first.length > 44 ? first.slice(0, 42) + '…' : first;
}

interface OutreachCampaign {
  _id: string;
  company_name: string;
  contact_email: string;
  job_description: string;
  status: string;
  jd_analysis?: any;
  candidate_analysis?: any;
  company_research?: string;
  generated_draft?: string;
  is_saved_in_drafts?: boolean;
  pipeline_status?: string;
  pipeline_error?: string;
  created_at?: string;
}

interface OutreachFormProps {
  gmailStatus?: { connected: boolean; gmail_accessible?: boolean; email_address?: string; loading: boolean; };
  onConnectGmail?: (e: React.MouseEvent) => void;
  onUpdateStats?: () => void;
  showCreateModal?: boolean;
  setShowCreateModal?: (show: boolean) => void;
}



const pill = (label: string, colors: { bg: string; text: string; border: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '3px 10px', borderRadius: '100px',
    background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
  }}>{label}</span>
);

const COMPLETED = { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
const PROGRESS  = { bg: '#EEF4FF', text: '#2563EB', border: '#BFDBFE' };
const PENDING   = { bg: '#F5F5F4', text: '#6B7280', border: '#E7E5E4' };

export const OutreachForm = ({ gmailStatus, onUpdateStats, showCreateModal, setShowCreateModal }: OutreachFormProps) => {
  const { getToken } = useAuth();
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ company_name: '', contact_email: '', job_description: '' });

  const fetchCampaigns = async () => {
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/outreach', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setCampaigns(await res.json()); if (onUpdateStats) onUpdateStats(); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  // Auto-poll every 4 s while any campaign has an active pipeline
  useEffect(() => {
    const ACTIVE = ['analyzing_jd','analyzing_candidate','researching_company','generating_draft','pushing_to_gmail'];
    const hasActive = campaigns.some(c => ACTIVE.includes(c.pipeline_status || ''));
    if (!hasActive) return;
    const id = setInterval(fetchCampaigns, 4000);
    return () => clearInterval(id);
  }, [campaigns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(''); setError('');
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to create outreach campaign');
      setMessage('Flow created!');
      setForm({ company_name: '', contact_email: '', job_description: '' });
      if (setShowCreateModal) setShowCreateModal(false);
      await fetchCampaigns();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const runStep = async (id: string, label: string, endpoint: string) => {
    setLoadingActions(p => ({ ...p, [`${id}-${label}`]: true }));
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { await fetchCampaigns(); setMessage(`${label} complete!`); }
      else { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `Failed: ${label}`); }
    } catch (err: any) { setError(err.message); }
    finally { setLoadingActions(p => { const n = { ...p }; delete n[`${id}-${label}`]; return n; }); }
  };

  const pushToDraft = async (id: string, email: string, body: string) => {
    if (!gmailStatus?.connected || !gmailStatus?.gmail_accessible) { setError('Gmail not connected.'); return; }
    if (!email) { setError('No contact email.'); return; }
    setLoadingActions(p => ({ ...p, [`${id}-gmail`]: true }));
    try {
      const lines = body.split('\n');
      let subject = 'Outreach Email';
      const bodyLines: string[] = [];
      for (const l of lines) {
        if (l.toLowerCase().startsWith('subject:')) subject = l.substring(8).trim();
        else bodyLines.push(l);
      }
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/gmail/draft', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: email,
          subject,
          body_text: bodyLines.join('\n').trim(),
          outreach_id: id,   // ← tell backend which campaign to mark
        })
      });
      if (res.ok) { const d = await res.json(); setMessage(`Draft saved! ID: ${d.draft_id}`); await fetchCampaigns(); }
      else { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Failed to create draft'); }
    } catch (err: any) { setError(err.message); }
    finally { setLoadingActions(p => { const n = { ...p }; delete n[`${id}-gmail`]; return n; }); }
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF', border: '1px solid #E8E6DD',
    borderRadius: '14px', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flex: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#999',
  };

  const btnDark: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 16px', borderRadius: '8px', border: 'none',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    background: '#1A1A1A', color: '#FFFFFF', cursor: 'pointer', transition: 'background 0.15s',
  };

  const btnOutline: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '8px', border: '1px solid #E8E6DD',
    fontSize: '11px', fontWeight: 600, color: '#555', cursor: 'pointer',
    background: 'transparent', transition: 'all 0.15s',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F8F7F3', border: '1px solid #E8E6DD',
    borderRadius: '9px', padding: '10px 14px',
    fontSize: '13px', color: '#1A1A1A', outline: 'none',
    fontFamily: "'Lato', system-ui, sans-serif",
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const FallbackRow = ({ company, role, stage }: { company: string; role: string; stage: 'sent' | 'progress' }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
      {/* Research */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F0EFE9' }}>
          <span style={labelStyle}>01 · Research</span>
          {pill('✓ Completed', COMPLETED)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
          {/* Company initial badge */}
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F0EFE9', border: '1px solid #E8E6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
              {company.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.15 }}>{company}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', fontWeight: 500 }}>{role}</div>
          </div>
        </div>
        <div style={{ paddingTop: '12px', borderTop: '1px solid #F0EFE9', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnOutline}>View Research →</button>
        </div>
      </div>
      {/* Generate */}
      <div style={{ ...cardStyle, background: '#FDFCF8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F0EFE9' }}>
          <span style={labelStyle}>02 · Generate</span>
          {pill('✓ Completed', COMPLETED)}
        </div>
        <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#555', lineHeight: 1.6, fontStyle: 'italic' }}>
          "Angle identified: Blog post on scaling design systems and desktop app UI layout..."
        </div>
        <div style={{ paddingTop: '12px', borderTop: '1px solid #F0EFE9', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnOutline}>View Email →</button>
        </div>
      </div>
      {/* Reach Out */}
      <div style={{ ...cardStyle, background: stage === 'sent' ? '#F5F4EF' : '#EEF4FF', border: stage === 'sent' ? '1px solid #1A1A1A' : '1px solid #BFDBFE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: `1px solid ${stage === 'sent' ? '#D6D4CC' : '#BFDBFE'}` }}>
          <span style={{ ...labelStyle, color: stage === 'sent' ? '#555' : '#2563EB' }}>03 · Reach Out</span>
          {stage === 'sent' ? pill('✓ Sent', COMPLETED) : pill('● In Progress', PROGRESS)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' }}>
            {stage === 'sent' ? 'Gmail Draft Created' : 'Saving to Gmail Drafts'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {stage === 'sent' ? '2 hours ago · STATUS: DELIVERED' : 'Syncing OAuth session'}
          </div>
        </div>
        <div style={{ paddingTop: '12px', borderTop: `1px solid ${stage === 'sent' ? '#D6D4CC' : '#BFDBFE'}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnOutline}>View Status →</button>
        </div>
      </div>
    </div>
  );

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* Alerts */}
      {message && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '16px', lineHeight: 1 }}>×</button>
        </div>
      )}
      {error && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#9F1239' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9F1239', fontSize: '16px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ─── Section Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A1A1A', margin: 0 }}>Active Pipeline</h2>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
            {campaigns.length > 0 ? campaigns.length : 2} prospects currently processing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal ? setShowCreateModal(!showCreateModal) : undefined}
          style={btnDark}
        >
          <IconPlus style={{ width: '14px', height: '14px' }} />
          New Flow
        </button>
      </div>

      {/* ─── Create New Flow Form ─── */}
      {(showCreateModal || campaigns.length === 0) && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E8E6DD',
          borderRadius: '16px', padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #F0EFE9' }}>
            <div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
                Create New Prospect Flow
              </h3>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                Start a personalized outreach workflow for a prospect.
              </p>
            </div>
            {showCreateModal && setShowCreateModal && (
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '4px' }}>
                <IconX style={{ width: '18px', height: '18px' }} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text" required
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Linear, OpenAI, Stripe"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                  onBlur={e => (e.target.style.borderColor = '#E8E6DD')}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={labelStyle}>Contact Email *</label>
                <input
                  type="email" required
                  value={form.contact_email}
                  onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="alex@company.com"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                  onBlur={e => (e.target.style.borderColor = '#E8E6DD')}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label style={labelStyle}>Job / Role / Target Angle *</label>
              <textarea
                required rows={3}
                value={form.job_description}
                onChange={e => setForm({ ...form, job_description: e.target.value })}
                placeholder="Paste the role, company context, or targeted outreach angle..."
                style={{ ...inputStyle, height: '110px', resize: 'vertical' }}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#E8E6DD')}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button type="submit" disabled={isSubmitting} style={{ ...btnDark, opacity: isSubmitting ? 0.6 : 1, padding: '10px 24px', fontSize: '12px' }}>
                {isSubmitting ? 'Initializing...' : 'Start Prospect Pipeline'}
                <IconArrowRight style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Pipeline Rows ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {campaigns.map((c) => {
          const isJdDone = Boolean(c.jd_analysis);
          const isCandidateDone = Boolean(c.candidate_analysis);
          const isResearchDone = Boolean(c.company_research);
          const isResearchComplete = isJdDone && isCandidateDone && isResearchDone;
          const isDraftReady = Boolean(c.generated_draft);
          const isSynced = c.status === 'draft_created' || c.status === 'synced';
          const isSent = c.status === 'sent' || c.status === 'completed';
          const isExpanded = Boolean(expanded[c._id]);
          const targetRole = extractRole(c.job_description);

          return (
            <div key={c._id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'stretch' }}>

                {/* Research — company-centric */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F0EFE9' }}>
                    <span style={labelStyle}>01 · Research</span>
                    {isResearchComplete ? pill('✓ Completed', COMPLETED) : pill('Pending', PENDING)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    {/* Company initial badge */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F0EFE9', border: '1px solid #E8E6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
                        {c.company_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.15 }}>{c.company_name}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', fontWeight: 500 }}>{targetRole}</div>
                    </div>
                  </div>

                  {/* Step progress indicators */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { done: isJdDone,        label: 'JD' },
                      { done: isCandidateDone, label: 'Candidate' },
                      { done: isResearchDone,  label: 'Company' },
                    ].map(step => (
                      <span key={step.label} style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '100px', letterSpacing: '0.06em',
                        background: step.done ? '#F0FDF4' : '#F5F5F4',
                        color:      step.done ? '#166534' : '#9CA3AF',
                        border: `1px solid ${step.done ? '#BBF7D0' : '#E5E7EB'}`,
                      }}>
                        {step.done ? '✓' : '·'} {step.label}
                      </span>
                    ))}
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid #F0EFE9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => runStep(c._id, 'JD Analysis', 'analyze-jd')}
                      disabled={Boolean(loadingActions[`${c._id}-JD Analysis`])}
                      style={{ ...btnOutline, opacity: isJdDone ? 0.55 : 1 }}
                    >
                      {loadingActions[`${c._id}-JD Analysis`] ? 'Running…' : isJdDone ? '✓ JD' : 'Analyze JD'}
                    </button>
                    <button
                      onClick={() => runStep(c._id, 'Candidate Analysis', 'analyze-candidate')}
                      disabled={Boolean(loadingActions[`${c._id}-Candidate Analysis`])}
                      style={{ ...btnOutline, opacity: isCandidateDone ? 0.55 : 1 }}
                    >
                      {loadingActions[`${c._id}-Candidate Analysis`] ? 'Running…' : isCandidateDone ? '✓ Candidate' : 'Analyze Candidate'}
                    </button>
                    <button
                      onClick={() => runStep(c._id, 'Company Research', 'research-company')}
                      disabled={Boolean(loadingActions[`${c._id}-Company Research`])}
                      style={{ ...btnOutline, opacity: isResearchDone ? 0.55 : 1 }}
                    >
                      {loadingActions[`${c._id}-Company Research`] ? 'Running…' : isResearchDone ? '✓ Research' : 'Research'}
                    </button>
                  </div>
                </div>

                {/* Generate */}
                <div style={{ ...cardStyle, background: '#FDFCF8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F0EFE9' }}>
                    <span style={labelStyle}>02 · Generate</span>
                    {isDraftReady ? pill('✓ Completed', COMPLETED) : pill('Pending', PENDING)}
                  </div>
                  <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#555', lineHeight: 1.6, fontStyle: 'italic', overflow: 'hidden' }}>
                    {c.company_research
                      ? `"${c.company_research.slice(0, 110)}..."`
                      : c.job_description
                      ? `"${c.job_description.slice(0, 110)}..."`
                      : '"Angle identified..."'}
                  </div>
                  <div style={{ paddingTop: '12px', borderTop: '1px solid #F0EFE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => runStep(c._id, 'Generate Draft', 'generate-draft')}
                      disabled={Boolean(loadingActions[`${c._id}-Generate Draft`])}
                      style={btnDark}
                    >
                      {isDraftReady ? 'Regenerate' : 'Generate Email'}
                    </button>
                    {isDraftReady && (
                      <button onClick={() => setExpanded(p => ({ ...p, [c._id]: !p[c._id] }))} style={{ ...btnOutline, border: 'none', color: '#2563EB' }}>
                        {isExpanded ? 'Hide Draft' : 'View Email →'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reach Out */}
                <div style={{ ...cardStyle, background: isSent ? '#F5F4EF' : isSynced ? '#EEF4FF' : '#FFFFFF', border: `1px solid ${isSent ? '#1A1A1A' : isSynced ? '#BFDBFE' : '#E8E6DD'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: `1px solid ${isSent ? '#D6D4CC' : isSynced ? '#BFDBFE' : '#F0EFE9'}` }}>
                    <span style={{ ...labelStyle, color: isSynced ? '#2563EB' : '#999' }}>03 · Reach Out</span>
                    {isSent ? pill('✓ Sent', COMPLETED) : isSynced ? pill('● In Progress', PROGRESS) : pill('Ready', PENDING)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' }}>
                        {isSent ? 'Outreach Sent' : isSynced ? 'Gmail Draft Created' : 'Awaiting Email Draft'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {isSent ? '2 hours ago · STATUS: DELIVERED' : isSynced ? 'Active in Gmail Drafts' : 'Run Generate step first'}
                      </div>
                    </div>
                    {/* is_saved_in_drafts badge */}
                    {c.is_saved_in_drafts && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px', borderRadius: '100px',
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        fontSize: '11px', fontWeight: 700, color: '#166534',
                        alignSelf: 'flex-start',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                        Saved to Gmail Drafts
                      </div>
                    )}
                  </div>
                  <div style={{ paddingTop: '12px', borderTop: `1px solid ${isSent ? '#D6D4CC' : isSynced ? '#BFDBFE' : '#F0EFE9'}`, display: 'flex', justifyContent: 'flex-end' }}>
                    {isDraftReady && (
                      <button
                        onClick={() => pushToDraft(c._id, c.contact_email, c.generated_draft || '')}
                        disabled={Boolean(loadingActions[`${c._id}-gmail`])}
                        style={btnDark}
                      >
                        {loadingActions[`${c._id}-gmail`] ? 'Saving...' : c.is_saved_in_drafts ? 'Re-push to Gmail →' : 'Push to Gmail →'}
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Expanded Draft */}
              {isExpanded && c.generated_draft && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #F0EFE9' }}>
                    <span style={labelStyle}>Generated Outreach Email</span>
                    <button onClick={() => { navigator.clipboard.writeText(c.generated_draft || ''); setMessage('Copied!'); }} style={{ ...btnOutline, color: '#2563EB', border: 'none', fontSize: '11px' }}>
                      Copy Text
                    </button>
                  </div>
                  <pre style={{ fontFamily: "'Lato', system-ui, sans-serif", fontSize: '13px', lineHeight: 1.7, color: '#1A1A1A', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {c.generated_draft}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {/* Fallback placeholder rows when no real campaigns */}
        {campaigns.length === 0 && (
          <>
            <FallbackRow company="Linear" role="Head of Growth" stage="sent" />
            <FallbackRow company="OpenAI" role="Marketing Manager" stage="progress" />
          </>
        )}
      </div>
    </section>
  );
};
