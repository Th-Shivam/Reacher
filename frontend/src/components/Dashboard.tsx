import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useSession, useUser, UserButton } from '@clerk/react';
import {
  IconArrowUpRight,
  IconBrandGmail,
  IconBriefcase,
  IconCheck,
  IconChevronRight,
  IconFileCv,
  IconLayoutDashboard,
  IconMailCheck,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconUserCircle,
} from '@tabler/icons-react';
import { OutreachForm } from './OutreachForm';
import ProfileForm from './ProfileForm';
import './Dashboard.css';

export type DashboardTab = 'outreach' | 'profile' | 'gmail';

type GmailStatus = {
  connected: boolean;
  gmail_accessible?: boolean;
  email_address?: string;
  loading: boolean;
};

type CampaignOverview = {
  generated_draft?: string;
  is_saved_in_drafts?: boolean;
  status?: string;
};

type ProfileOverview = {
  name?: string;
  headline?: string;
  resume?: unknown;
  skills?: unknown[];
};

const initialStats = {
  totalCampaigns: 0,
  draftsCount: 0,
  sentCount: 0,
  generatedCount: 0,
  profileCompleted: false,
  profileSkillsCount: 0,
};

const navItems = [
  { id: 'outreach' as DashboardTab, label: 'Dashboard', icon: IconLayoutDashboard },
  { id: 'profile' as DashboardTab, label: 'Profile', icon: IconUserCircle },
  { id: 'gmail' as DashboardTab, label: 'Gmail', icon: IconBrandGmail },
];

function greetingForCurrentTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { getToken } = useAuth();
  const { session } = useSession();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<DashboardTab>('outreach');
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    connected: false,
    loading: true,
  });

  const fetchGmailStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gmail/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setGmailStatus((previous) => ({ ...previous, loading: false }));
        return;
      }

      const data = await response.json() as Omit<GmailStatus, 'loading'>;
      setGmailStatus({ ...data, loading: false });
    } catch {
      setGmailStatus((previous) => ({ ...previous, loading: false }));
    }
  }, [getToken]);

  const fetchOverviewStats = useCallback(async () => {
    setStatsLoading(true);
    setOverviewError(false);

    try {
      const token = await getToken();
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const [outreachResponse, profileResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/outreach`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/profile`, { headers }),
      ]);

      if (outreachResponse.ok) {
        const campaigns = await outreachResponse.json() as CampaignOverview[];
        const generatedCount = campaigns.filter((campaign) => Boolean(campaign.generated_draft)).length;
        const draftsCount = campaigns.filter((campaign) => (
          campaign.status === 'draft_created'
          || campaign.status === 'synced'
          || campaign.is_saved_in_drafts
        )).length;
        const sentCount = campaigns.filter((campaign) => (
          campaign.status === 'sent' || campaign.status === 'completed'
        )).length;

        setStats((previous) => ({
          ...previous,
          totalCampaigns: campaigns.length,
          generatedCount,
          draftsCount,
          sentCount,
        }));
      } else {
        setOverviewError(true);
      }

      if (profileResponse.ok) {
        const profile = await profileResponse.json() as ProfileOverview;
        setStats((previous) => ({
          ...previous,
          profileCompleted: Boolean(profile.name && profile.headline && profile.resume),
          profileSkillsCount: Array.isArray(profile.skills) ? profile.skills.length : 0,
        }));
      } else if (profileResponse.status !== 404) {
        setOverviewError(true);
      }
    } catch {
      setOverviewError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [getToken]);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([fetchGmailStatus(), fetchOverviewStats()]);
  }, [fetchGmailStatus, fetchOverviewStats]);

  useEffect(() => {
    if (!session) return;

    const refreshTimer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [session, refreshDashboard]);

  const handleConnectGmail = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!user) return;

    try {
      const googleAccount = user.externalAccounts.find(
        (account) => account.provider === 'google' || account.verification?.strategy === 'oauth_google',
      );

      if (googleAccount) {
        const updated = await googleAccount.reauthorize({
          additionalScopes: ['https://www.googleapis.com/auth/gmail.compose'],
          redirectUrl: window.location.href,
        });
        if (updated.verification?.externalVerificationRedirectURL) {
          window.location.href = updated.verification.externalVerificationRedirectURL.toString();
        }
        return;
      }

      const newAccount = await user.createExternalAccount({
        strategy: 'oauth_google',
        redirectUrl: window.location.href,
        additionalScopes: ['https://www.googleapis.com/auth/gmail.compose'],
      });
      if (newAccount?.verification?.externalVerificationRedirectURL) {
        window.location.href = newAccount.verification.externalVerificationRedirectURL.toString();
      }
    } catch (error) {
      console.error('Failed to connect Gmail', error);
    }
  };

  const gmailReady = Boolean(gmailStatus.connected && gmailStatus.gmail_accessible);
  const setupSteps = Number(stats.profileCompleted) + Number(gmailReady);
  const setupProgress = setupSteps * 50;
  const firstName = user?.firstName || user?.username || 'there';

  const metrics = useMemo(() => [
    {
      label: 'Prospects',
      value: stats.totalCampaigns,
      helper: 'Total outreach flows',
      icon: IconBriefcase,
      tone: 'ink',
    },
    {
      label: 'Emails ready',
      value: stats.generatedCount,
      helper: 'Personalized drafts generated',
      icon: IconSparkles,
      tone: 'violet',
    },
    {
      label: 'Saved to Gmail',
      value: stats.draftsCount,
      helper: 'Ready for your final review',
      icon: IconMailCheck,
      tone: 'blue',
    },
    {
      label: 'Completed',
      value: stats.sentCount,
      helper: 'Outreach flows finished',
      icon: IconSend,
      tone: 'green',
    },
  ], [stats]);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <button
            type="button"
            className="dashboard-brand"
            onClick={() => setActiveTab('outreach')}
            aria-label="Open Reacher dashboard"
          >
            <img src="/reacher-icon-192.png" alt="" />
            <span className="dashboard-brand-name">REACHER</span>
            <span className="dashboard-brand-badge">PRO</span>
          </button>

          <nav className="dashboard-nav" aria-label="Workspace navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dashboard-nav-item ${activeTab === item.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="dashboard-account">
            <button
              type="button"
              className={`dashboard-connection ${gmailReady ? 'is-connected' : ''}`}
              onClick={gmailReady ? () => setActiveTab('gmail') : handleConnectGmail}
            >
              <span className="dashboard-connection-dot" aria-hidden="true" />
              <span className="dashboard-connection-copy">
                {gmailStatus.loading
                  ? 'Checking Gmail'
                  : gmailReady
                    ? gmailStatus.email_address || 'Gmail connected'
                    : 'Connect Gmail'}
              </span>
            </button>
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9' } }} />
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {activeTab === 'outreach' && (
          <>
            <section className="dashboard-welcome" aria-labelledby="dashboard-heading">
              <div className="dashboard-welcome-copy">
                <p className="dashboard-eyebrow">Workspace overview</p>
                <h1 id="dashboard-heading">{greetingForCurrentTime()}, {firstName}.</h1>
                <p>Review your pipeline, prepare personalized emails, and move the next opportunity forward.</p>
              </div>

              <div className="dashboard-welcome-actions">
                <button
                  type="button"
                  className="dashboard-icon-button"
                  onClick={() => void refreshDashboard()}
                  aria-label="Refresh dashboard"
                  title="Refresh dashboard"
                  disabled={statsLoading}
                >
                  <IconRefresh className={statsLoading ? 'is-spinning' : ''} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="dashboard-primary-button"
                  onClick={() => setShowNewFlowModal(true)}
                >
                  <IconPlus aria-hidden="true" />
                  New outreach
                </button>
              </div>
            </section>

            {overviewError && (
              <div className="dashboard-data-notice" role="status">
                Live totals could not be refreshed. Your existing workspace is still available below.
                <button type="button" onClick={() => void refreshDashboard()}>Try again</button>
              </div>
            )}

            <section className="dashboard-metrics" aria-label="Outreach metrics">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article key={metric.label} className="dashboard-metric">
                    <div className={`dashboard-metric-icon tone-${metric.tone}`}>
                      <Icon aria-hidden="true" />
                    </div>
                    <div className="dashboard-metric-content">
                      <span className="dashboard-metric-label">{metric.label}</span>
                      <strong>{statsLoading ? '-' : metric.value}</strong>
                      <span className="dashboard-metric-helper">{metric.helper}</span>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="dashboard-readiness" aria-labelledby="readiness-heading">
              <div className="dashboard-readiness-summary">
                <div className="dashboard-section-heading">
                  <p className="dashboard-eyebrow">Workspace readiness</p>
                  <h2 id="readiness-heading">{setupSteps === 2 ? 'You are ready to reach out' : 'Finish setting up your workspace'}</h2>
                </div>
                <div className="dashboard-progress-row">
                  <div className="dashboard-progress-track" aria-hidden="true">
                    <span style={{ width: `${setupProgress}%` }} />
                  </div>
                  <span>{setupSteps} of 2 complete</span>
                </div>
              </div>

              <div className="dashboard-readiness-steps">
                <button type="button" onClick={() => setActiveTab('profile')}>
                  <span className={`dashboard-step-icon ${stats.profileCompleted ? 'is-complete' : ''}`}>
                    {stats.profileCompleted ? <IconCheck aria-hidden="true" /> : <IconFileCv aria-hidden="true" />}
                  </span>
                  <span className="dashboard-step-copy">
                    <strong>Candidate profile</strong>
                    <small>{stats.profileCompleted ? `${stats.profileSkillsCount} skills added` : 'Add your resume, role, and skills'}</small>
                  </span>
                  <span className={`dashboard-step-status ${stats.profileCompleted ? 'is-complete' : ''}`}>
                    {stats.profileCompleted ? 'Complete' : 'Set up'}
                  </span>
                  <IconChevronRight className="dashboard-step-arrow" aria-hidden="true" />
                </button>

                <button type="button" onClick={gmailReady ? () => setActiveTab('gmail') : handleConnectGmail}>
                  <span className={`dashboard-step-icon ${gmailReady ? 'is-complete' : ''}`}>
                    {gmailReady ? <IconCheck aria-hidden="true" /> : <IconBrandGmail aria-hidden="true" />}
                  </span>
                  <span className="dashboard-step-copy">
                    <strong>Gmail connection</strong>
                    <small>{gmailReady ? gmailStatus.email_address || 'Compose access active' : 'Connect Gmail to save drafts'}</small>
                  </span>
                  <span className={`dashboard-step-status ${gmailReady ? 'is-complete' : ''}`}>
                    {gmailReady ? 'Connected' : 'Connect'}
                  </span>
                  <IconChevronRight className="dashboard-step-arrow" aria-hidden="true" />
                </button>
              </div>
            </section>

            <section className="dashboard-workspace" aria-label="Outreach workspace">
              <OutreachForm
                gmailStatus={gmailStatus}
                onConnectGmail={handleConnectGmail}
                onUpdateStats={fetchOverviewStats}
                showCreateModal={showNewFlowModal}
                setShowCreateModal={setShowNewFlowModal}
              />
            </section>
          </>
        )}

        {activeTab === 'profile' && (
          <section className="dashboard-tab-page" aria-labelledby="profile-heading">
            <div className="dashboard-page-heading">
              <div>
                <p className="dashboard-eyebrow">Personalization source</p>
                <h1 id="profile-heading">Your candidate profile</h1>
                <p>Keep this current so every outreach email reflects your strongest, most relevant experience.</p>
              </div>
              <button type="button" className="dashboard-secondary-button" onClick={() => setActiveTab('outreach')}>
                <IconLayoutDashboard aria-hidden="true" />
                Back to dashboard
              </button>
            </div>
            <ProfileForm onUpdateStats={fetchOverviewStats} />
          </section>
        )}

        {activeTab === 'gmail' && (
          <section className="dashboard-tab-page" aria-labelledby="gmail-heading">
            <div className="dashboard-page-heading">
              <div>
                <p className="dashboard-eyebrow">Delivery connection</p>
                <h1 id="gmail-heading">Gmail integration</h1>
                <p>Manage the account Reacher uses to save personalized emails to your drafts.</p>
              </div>
              <button type="button" className="dashboard-secondary-button" onClick={() => setActiveTab('outreach')}>
                <IconLayoutDashboard aria-hidden="true" />
                Back to dashboard
              </button>
            </div>

            <div className="dashboard-gmail-panel">
              <div className="dashboard-gmail-status">
                <div className={`dashboard-gmail-mark ${gmailReady ? 'is-connected' : ''}`}>
                  <IconBrandGmail aria-hidden="true" />
                </div>
                <div>
                  <span className={`dashboard-status-badge ${gmailReady ? 'is-connected' : ''}`}>
                    <span aria-hidden="true" />
                    {gmailStatus.loading ? 'Checking connection' : gmailReady ? 'Connection active' : 'Not connected'}
                  </span>
                  <h2>{gmailReady ? 'Gmail is ready for drafts' : 'Connect your Gmail account'}</h2>
                  <p>
                    {gmailReady
                      ? `Reacher can save drafts to ${gmailStatus.email_address || 'your connected account'}.`
                      : 'Authorize compose-only access so Reacher can create drafts without reading or sending your email.'}
                  </p>
                </div>
              </div>

              <dl className="dashboard-gmail-details">
                <div>
                  <dt>Connected account</dt>
                  <dd>{gmailStatus.email_address || 'No account linked'}</dd>
                </div>
                <div>
                  <dt>Permission</dt>
                  <dd>Compose drafts only</dd>
                </div>
                <div>
                  <dt>Sending</dt>
                  <dd>Always controlled by you</dd>
                </div>
              </dl>

              <div className="dashboard-gmail-actions">
                <button type="button" className="dashboard-primary-button" onClick={handleConnectGmail}>
                  <IconRefresh aria-hidden="true" />
                  {gmailReady ? 'Reconnect Gmail' : 'Connect Gmail'}
                </button>
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-secondary-button"
                >
                  Manage Google access
                  <IconArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
