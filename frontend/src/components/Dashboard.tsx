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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gmail/status`, {
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
      const resOutreach = await fetch(`${import.meta.env.VITE_API_URL}/api/outreach`, {
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
      const resProfile = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
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
        className="flex flex-col gap-0 px-4 sm:px-6 lg:px-12 md:h-[68px] md:flex-row md:items-center md:justify-between"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E6DD',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 0 #E8E6DD',
        }}
      >
        {/* Left: Brand + Nav links */}
        <div className="flex w-full items-center justify-between gap-4 py-3 md:w-auto md:justify-start md:gap-10 md:py-0">
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

          {/* Gmail + avatar ride alongside the brand on mobile so the tab strip
              gets a full row of its own */}
          <div className="flex items-center gap-2 md:hidden">
            {gmailStatus.connected && gmailStatus.gmail_accessible ? (
              <span
                title={gmailStatus.email_address || 'Gmail Synced'}
                style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: '#22C55E', flexShrink: 0,
                }}
              />
            ) : (
              <button
                onClick={handleConnectGmail}
                aria-label="Connect Gmail"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '34px', height: '34px',
                  background: '#FFFFFF', borderRadius: '100px',
                  border: '1px solid #E8E6DD', cursor: 'pointer',
                }}
              >
                <IconBrandGmail style={{ width: '16px', height: '16px', color: '#4285F4' }} />
              </button>
            )}
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
          </div>
        </div>

        {/* Tab strip: own scrollable row on mobile, inline on desktop */}
        <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:ml-8 md:overflow-visible md:border-l md:border-[#E8E6DD] md:pb-0 md:pl-8">
          {[
            { id: 'outreach' as DashboardTab, label: 'Dashboard' },
            { id: 'profile' as DashboardTab, label: 'Profile' },
            { id: 'gmail' as DashboardTab, label: 'Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="shrink-0"
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
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Gmail status + Avatar (desktop only) */}
        <div className="hidden items-center gap-4 md:flex">
          {gmailStatus.connected && gmailStatus.gmail_accessible ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', fontWeight: 500, color: '#166534',
              background: '#F0FDF4', padding: '6px 14px',
              borderRadius: '100px', border: '1px solid #BBF7D0',
              maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap',
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
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 sm:px-6 lg:px-12">

        {/* ─── HERO HEADER (Dashboard tab only) ────────────────────────────────── */}
        {activeTab === 'outreach' && <section className="flex flex-col items-start justify-between gap-8 border-b border-[#E8E6DD] pt-8 pb-8 md:flex-row md:gap-10 md:pt-[52px] md:pb-[52px]">
          {/* Left copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

            <h1
              className="text-[38px] sm:text-[48px] lg:text-[60px]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#1A1A1A', margin: 0 }}
            >
              Automation Flow
            </h1>

            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#666', margin: 0, maxWidth: '520px' }}>
              Powered by Google ADK Integration. Seamlessly analyzing prospects and saving highly targeted messages directly to your Gmail drafts via Automatic Personalization.
            </p>
          </div>

          {/* Right: single Gmail drafts card */}
          <div
            className="w-full shrink-0 px-6 py-5 md:w-auto md:px-7 md:py-6"
            style={{
              background: '#FFFFFF', border: '1px solid #E8E6DD',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', gap: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div className="text-[42px] md:text-[52px]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, lineHeight: 1, color: statsLoading ? '#CCC' : '#1A1A1A', transition: 'color 0.2s' }}>
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
              flexShrink: 0, marginLeft: 'auto',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#4A90E2' }}>mark_email_read</span>
            </div>
          </div>
        </section>}

        {/* ─── METRICS GRID (Dashboard tab only) ───────────────────────────────── */}
        {activeTab === 'outreach' && <section className="border-b border-[#E8E6DD] pt-8 pb-8 md:pt-10 md:pb-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { value: stats.totalCampaigns, label: 'Prospects Analyzed' },
              { value: stats.generatedCount, label: 'Emails Generated' },
              { value: stats.draftsCount,    label: 'Gmail Drafts Created' },
            ].map((metric, i) => (
              <div
                key={i}
                className="px-6 py-5 md:px-7 md:py-6"
                style={{
                  background: '#FFFFFF', border: '1px solid #E8E6DD',
                  borderRadius: '12px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  cursor: 'default',
                }}
              >
                <span className="text-[38px] md:text-[48px]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, lineHeight: 1, color: statsLoading ? '#CCC' : '#1A1A1A', transition: 'color 0.2s' }}>
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
        <div className={`flex-1 pb-16 md:pb-20 ${activeTab === 'outreach' ? 'pt-8 md:pt-12' : 'pt-8 md:pt-10'}`}>
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
              <div
                className="p-6 sm:p-8 md:p-10"
                style={{
                  background: '#FFFFFF', border: '1px solid #E8E6DD',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
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
                  <h2 className="text-[26px] sm:text-[32px]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, color: '#1A1A1A', marginBottom: '10px' }}>
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
                    <div
                      key={i}
                      className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                      style={{
                        background: '#F8F7F3', border: '1px solid #E8E6DD',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, maxWidth: '100%' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '3px' }}>{row.label}</p>
                        <p style={{ fontSize: '12px', color: '#666', fontFamily: i === 0 ? 'monospace' : 'inherit', overflowWrap: 'anywhere' }}>{row.value}</p>
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
                      padding: '13px 20px', borderRadius: '9px', border: 'none',
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#FFFFFF', background: '#1A1A1A', cursor: 'pointer', transition: 'background 0.15s',
                      minHeight: '44px', textAlign: 'center', lineHeight: 1.3,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', flexShrink: 0 }}>sync</span>
                    {gmailStatus.connected ? 'Reconnect' : 'Connect Gmail'}
                  </button>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '44px', height: '44px', borderRadius: '9px',
                      border: '1px solid #E8E6DD', color: '#666',
                      background: '#FFFFFF', transition: 'all 0.15s', textDecoration: 'none',
                      flexShrink: 0,
                    }}
                    title="Manage Google Permissions"
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
