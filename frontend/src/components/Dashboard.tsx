import React, { useState, useEffect } from 'react';
import { useAuth, useSession, useUser, UserButton } from '@clerk/react';
import { OutreachForm } from './OutreachForm';
import ProfileForm from './ProfileForm';
import { IconArrowUpRight, IconBrandGmail } from '@tabler/icons-react';

export type DashboardTab = 'outreach' | 'profile' | 'gmail';

export default function Dashboard() {
  const { getToken } = useAuth();
  const { session } = useSession();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<DashboardTab>('outreach');
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);

  const [stats, setStats] = useState({
    totalCampaigns: 0,
    draftsCount: 0,
    sentCount: 0,
    generatedCount: 0,
    profileCompleted: false,
    profileSkillsCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    gmail_accessible?: boolean;
    email_address?: string;
    loading: boolean;
  }>({ connected: false, loading: true });

  const fetchGmailStatus = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('http://localhost:8000/api/gmail/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGmailStatus({ ...data, loading: false });
      } else {
        setGmailStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setGmailStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const resOutreach = await fetch('http://localhost:8000/api/outreach', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resOutreach.ok) {
        const campaigns = await resOutreach.json();
        const generated = campaigns.filter((c: any) => Boolean(c.generated_draft)).length;
        const drafts = campaigns.filter((c: any) => c.status === 'draft_created' || c.status === 'synced' || c.is_saved_in_drafts).length;
        const sent = campaigns.filter((c: any) => c.status === 'sent' || c.status === 'completed').length;
        setStats(prev => ({
          ...prev,
          totalCampaigns: campaigns.length,
          generatedCount: generated,
          draftsCount: drafts,
          sentCount: sent
        }));
      }
      const resProfile = await fetch('http://localhost:8000/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resProfile.ok) {
        const prof = await resProfile.json();
        setStats(prev => ({
          ...prev,
          profileCompleted: Boolean(prof.name && prof.headline && prof.resume),
          profileSkillsCount: prof.skills ? prof.skills.length : 0
        }));
      }
    } catch (err) {
      console.error('Failed to fetch overview stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchGmailStatus();
      fetchOverviewStats();
    }
  }, [session]);

  const handleConnectGmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const googleAccount = user.externalAccounts.find(
        a => a.provider === 'google' || a.verification?.strategy === 'oauth_google'
      );
      if (googleAccount) {
        const updated = await googleAccount.reauthorize({
          additionalScopes: ['https://www.googleapis.com/auth/gmail.compose'],
          redirectUrl: window.location.href
        });
        if (updated.verification?.externalVerificationRedirectURL) {
          window.location.href = updated.verification.externalVerificationRedirectURL.toString();
        }
      } else {
        const newAcc = await user.createExternalAccount({
          strategy: 'oauth_google',
          redirectUrl: window.location.href,
          additionalScopes: ['https://www.googleapis.com/auth/gmail.compose']
        });
        if (newAcc?.verification?.externalVerificationRedirectURL) {
          window.location.href = newAcc.verification.externalVerificationRedirectURL.toString();
        }
      }
    } catch (err) {
      console.error('Failed to connect Gmail', err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F7F3] text-[#1A1A1A] flex flex-col" style={{ fontFamily: "'Lato', system-ui, sans-serif" }}>

      {/* ═══ NAV ═══════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          height: '68px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E6DD',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          boxShadow: '0 1px 0 #E8E6DD',
        }}
      >
        {/* Left: Brand + Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 700, letterSpacing: '0.04em', color: '#1A1A1A' }}>
              REACHER
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
              background: '#1A1A1A', color: '#FDFCF8', padding: '2px 7px',
              borderRadius: '3px', textTransform: 'uppercase'
            }}>PRO</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '32px', borderLeft: '1px solid #E8E6DD' }}>
            {[
              { id: 'outreach' as DashboardTab, label: 'Dashboard' },
              { id: 'profile' as DashboardTab, label: 'Profile' },
              { id: 'gmail' as DashboardTab, label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  letterSpacing: '0.03em',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeTab === tab.id ? '#1A1A1A' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#6B6B6B',
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EFE9';
                    (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A';
                  }
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#6B6B6B';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Gmail status + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {gmailStatus.connected && gmailStatus.gmail_accessible ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', fontWeight: 500, color: '#166534',
              background: '#F0FDF4', padding: '6px 14px',
              borderRadius: '100px', border: '1px solid #BBF7D0'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
              {gmailStatus.email_address || 'Gmail Synced'}
            </div>
          ) : (
            <button
              onClick={handleConnectGmail}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', fontWeight: 600, color: '#1A1A1A',
                background: '#FFFFFF', padding: '7px 16px',
                borderRadius: '100px', border: '1px solid #E8E6DD',
                cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F0EFE9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <IconBrandGmail style={{ width: '15px', height: '15px', color: '#4285F4' }} />
              Connect Gmail
            </button>
          )}
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
        </div>
      </nav>

      {/* ═══ PAGE BODY ══════════════════════════════════════════════════════════ */}
      <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '0 48px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ─── HERO HEADER (Dashboard tab only) ────────────────────────────────── */}
        {activeTab === 'outreach' && <section style={{ paddingTop: '52px', paddingBottom: '52px', borderBottom: '1px solid #E8E6DD', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '40px', flexWrap: 'wrap' }}>
          {/* Left copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888' }}>
                Pipeline Overview
              </span>
              <span style={{ fontSize: '10px', color: '#CCC' }}>·</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: '#F0FDF4', color: '#166534', padding: '3px 10px',
                borderRadius: '100px', border: '1px solid #BBF7D0'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                System Active
              </span>
            </div>

            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '60px', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#1A1A1A', margin: 0 }}>
              Automation Flow
            </h1>

            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#666', margin: 0, maxWidth: '520px' }}>
              Powered by Google ADK Integration. Seamlessly analyzing prospects and saving highly targeted messages directly to your Gmail drafts via Automatic Personalization.
            </p>
          </div>

          {/* Right: single Gmail drafts card */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #E8E6DD',
            borderRadius: '14px', padding: '24px 28px',
            display: 'flex', alignItems: 'center', gap: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '52px', fontWeight: 500, lineHeight: 1, color: statsLoading ? '#CCC' : '#1A1A1A', transition: 'color 0.2s' }}>
                {statsLoading ? '—' : stats.draftsCount}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginTop: '8px' }}>
                {statsLoading ? 'Retrieving…' : 'Gmail Drafts Saved'}
              </div>
            </div>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#EEF4FF', border: '1px solid #C7D8FA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#4A90E2' }}>mark_email_read</span>
            </div>
          </div>
        </section>}

        {/* ─── METRICS GRID (Dashboard tab only) ───────────────────────────────── */}
        {activeTab === 'outreach' && <section style={{ paddingTop: '40px', paddingBottom: '48px', borderBottom: '1px solid #E8E6DD' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { value: stats.totalCampaigns, label: 'Prospects Analyzed' },
              { value: stats.generatedCount, label: 'Emails Generated' },
              { value: stats.draftsCount,    label: 'Gmail Drafts Created' },
            ].map((metric, i) => (
              <div
                key={i}
                style={{
                  background: '#FFFFFF', border: '1px solid #E8E6DD',
                  borderRadius: '12px', padding: '24px 28px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#C5C3BA';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E6DD';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              >
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '48px', fontWeight: 500, lineHeight: 1, color: statsLoading ? '#CCC' : '#1A1A1A', transition: 'color 0.2s' }}>
                  {statsLoading ? '—' : metric.value}
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888' }}>
                  {statsLoading ? 'Retrieving…' : metric.label}
                </span>
              </div>
            ))}
          </div>
        </section>}

        {/* ─── MAIN TAB CONTENT ─────────────────────────────────────────────────── */}
        <div style={{ paddingTop: activeTab === 'outreach' ? '48px' : '40px', paddingBottom: '80px', flex: 1 }}>
          {activeTab === 'outreach' && (
            <OutreachForm
              gmailStatus={gmailStatus}
              onConnectGmail={handleConnectGmail}
              onUpdateStats={fetchOverviewStats}
              showCreateModal={showNewFlowModal}
              setShowCreateModal={setShowNewFlowModal}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileForm onUpdateStats={fetchOverviewStats} />
          )}
          {activeTab === 'gmail' && (
            <div style={{ maxWidth: '720px' }}>
              <div style={{
                background: '#FFFFFF', border: '1px solid #E8E6DD',
                borderRadius: '16px', padding: '40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ borderBottom: '1px solid #E8E6DD', paddingBottom: '28px', marginBottom: '28px' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: '#EEF4FF', color: '#4A90E2', padding: '4px 12px',
                    borderRadius: '100px', border: '1px solid #C7D8FA', marginBottom: '16px'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>mail</span>
                    Direct Gmail Drafts API
                  </div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 500, color: '#1A1A1A', marginBottom: '10px' }}>
                    Gmail Integration
                  </h2>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#666' }}>
                    Reacher connects securely via Google OAuth to create personalized cold outreach drafts directly in your primary Gmail account.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  {[
                    {
                      label: 'OAuth Permission Scope',
                      value: 'https://www.googleapis.com/auth/gmail.compose',
                      badge: 'Compose Only · Safe',
                      badgeColor: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' }
                    },
                    {
                      label: 'Connected Account',
                      value: gmailStatus.connected && gmailStatus.email_address ? gmailStatus.email_address : 'No Gmail account linked yet',
                      badge: gmailStatus.connected && gmailStatus.gmail_accessible ? 'Active' : 'Disconnected',
                      badgeColor: gmailStatus.connected && gmailStatus.gmail_accessible
                        ? { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' }
                        : { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' }
                    }
                  ].map((row, i) => (
                    <div key={i} style={{
                      background: '#F8F7F3', border: '1px solid #E8E6DD',
                      borderRadius: '10px', padding: '16px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
                    }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '3px' }}>{row.label}</p>
                        <p style={{ fontSize: '12px', color: '#666', fontFamily: i === 0 ? 'monospace' : 'inherit' }}>{row.value}</p>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                        padding: '4px 12px', borderRadius: '100px',
                        background: row.badgeColor.bg, color: row.badgeColor.text, border: `1px solid ${row.badgeColor.border}`,
                        whiteSpace: 'nowrap', flexShrink: 0
                      }}>
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleConnectGmail}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '12px 24px', borderRadius: '9px', border: 'none',
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#FFFFFF', background: '#1A1A1A', cursor: 'pointer', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1A1A1A')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
                    {gmailStatus.connected ? 'Reconnect / Reauthorize' : 'Connect Gmail Account'}
                  </button>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '44px', height: '44px', borderRadius: '9px',
                      border: '1px solid #E8E6DD', color: '#666',
                      background: '#FFFFFF', transition: 'all 0.15s', textDecoration: 'none'
                    }}
                    title="Manage Google Permissions"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = '#F0EFE9';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#1A1A1A';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = '#FFFFFF';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#666';
                    }}
                  >
                    <IconArrowUpRight style={{ width: '18px', height: '18px' }} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
